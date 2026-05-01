/**
 * API Route: POST /api/messages/start-conversation
 *
 * Crée ou retrouve une conversation entre l'utilisateur courant et un destinataire,
 * avec un message initial optionnel.
 *
 * Remplace les appels directs à conversation_participants / conversations / messages
 * qui échouent à cause de la récursion infinie dans les politiques RLS.
 *
 * Body:
 *   {
 *     ownerId:     string,        // UUID du destinataire (doit exister dans profiles)
 *     subject?:    string,        // Sujet affiché dans l'UI (défaut: "Conversation")
 *     relatedType: string | null, // Contexte métier : 'listing', 'equipment', 'general'…
 *     relatedId:   string | null, // UUID de l'objet lié, ou null si pas de contexte
 *     initialMsg:  string | null, // Premier message, optionnel
 *   }
 *
 * Réponse 200 :
 *   { conversationId: string, isNew: boolean }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-DUPLICATION — ARCHITECTURE À DEUX COUCHES
 * ─────────────────────────────────────────────────────────────────────────────
 * La déduplication repose sur deux couches complémentaires :
 *
 * Couche 1 — Garde applicatif (`findExistingConversation` ci-dessous) :
 *   Cherche les conversations partagées entre les deux participants,
 *   puis filtre par contexte (related_type + related_id).
 *   Correct en conditions normales, mais non atomique : deux requêtes
 *   simultanées pour la même paire peuvent toutes deux passer → doublon.
 *
 * Couche 2 — Contrainte DB (20260412_conversations_unique.sql) :
 *   La migration est committée dans le repo :
 *     supabase/migrations/20260412_conversations_unique.sql
 *   Elle crée la table `conversation_pairs` avec :
 *     1. UNIQUE (participant_a, participant_b, related_type, related_id)
 *     2. Index BTREE sur (LEAST(a,b), GREATEST(a,b), related_type, related_id)
 *     3. CHECK participant_a < participant_b (canonicité de la paire)
 *     4. Trigger fn_maintain_conversation_pairs pour maintenir la table
 *   Si une race condition passe le garde applicatif, l'INSERT de step 2
 *   lève un code Postgres `23505` (unique_violation). Le handler en bas
 *   de ce fichier capture déjà ce code et retourne `{ isNew: false }`.
 *
 * ⚠️  ÉTAT DE DÉPLOIEMENT — À vérifier
 * ─────────────────────────────────────────────────────────────────────────────
 * La migration est committée dans le repo mais son application effective sur
 * l'instance Supabase de production n'est pas confirmée automatiquement.
 * Avant de considérer la couche 2 active, vérifier dans Supabase → SQL Editor :
 *
 *   SELECT COUNT(*) FROM information_schema.tables
 *   WHERE table_name = 'conversation_pairs';         -- doit retourner 1
 *
 *   SELECT COUNT(*) FROM information_schema.triggers
 *   WHERE trigger_name = 'trg_maintain_conversation_pairs'; -- doit retourner 1
 *
 * Si ces vérifications retournent 0 → la migration n'est pas encore appliquée
 * en prod. La couche 1 (garde applicatif) reste seule active.
 *
 * Prérequis avant application (si pas encore fait) :
 *   □ Exécuter la section A de la migration (détection des doublons existants).
 *   □ Dédupliquer si la section A renvoie des lignes (section B).
 *   □ Tester sur un dump de staging d'abord.
 *   □ Mettre à jour docs/db/SCHEMA.md après déploiement réussi.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';

// ── Constantes et schéma ────────────────────────────────────────────────────

/**
 * Valeurs autorisées pour related_type.
 * Doit rester synchronisé avec la contrainte CHECK de la table `conversations`.
 * Si une nouvelle valeur est ajoutée côté client, l'ajouter ici ET dans la migration
 * SQL qui élargit la contrainte CHECK (voir migration_conversations_related_type.sql).
 */
const RELATED_TYPES = [
  'listing', 'equipment', 'help_request', 'association',
  'collection_item', 'outing', 'event', 'service_request',
  'lost_found', 'artisan', 'community', 'general',
] as const;

type RelatedType = (typeof RELATED_TYPES)[number];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const StartConversationSchema = z.object({
  /** UUID du profil destinataire — doit exister en base */
  ownerId: z.string().regex(UUID_REGEX, 'ownerId doit être un UUID valide'),

  /** Sujet affiché dans l'UI */
  subject: z
    .string()
    .trim()
    .min(1, 'subject requis')
    .max(200, 'subject trop long (max 200)')
    .optional()
    .default('Conversation'),

  /** Type de contexte métier — whitelist stricte */
  relatedType: z
    .enum(RELATED_TYPES)
    .nullable()
    .optional()
    .default('general'),

  /** UUID de l'objet lié — null si pas de contexte */
  relatedId: z
    .string()
    .regex(UUID_REGEX, 'relatedId doit être un UUID valide')
    .nullable()
    .optional()
    .default(null),

  /** Message d'ouverture facultatif */
  initialMsg: z
    .string()
    .trim()
    .max(5_000, 'initialMsg trop long (max 5000)')
    .nullable()
    .optional()
    .default(null),
});

function zodError(err: z.ZodError) {
  return NextResponse.json(
    { error: 'Paramètres invalides', details: err.flatten().fieldErrors },
    { status: 400 }
  );
}

// ── Garde anti-duplication ───────────────────────────────────────────────────

/**
 * Cherche une conversation existante partagée entre `userA` et `userB`
 * qui correspond au contexte donné (relatedType / relatedId).
 *
 * Stratégie de correspondance (du plus précis au plus large) :
 *   1. Si `relatedId` est fourni  → match exact sur (related_type, related_id).
 *   2. Sinon, si `relatedType` non-général → match sur related_type seul.
 *   3. Sinon → toute conversation partagée (fallback paire générique).
 *
 * Retourne l'`id` de la conversation trouvée ou `null`.
 *
 * NOTE : Ce garde applicatif n'est pas atomique (voir section "ANTI-DUPLICATION" en haut).
 * Si la migration 20260412_conversations_unique est appliquée en prod, la table
 * `conversation_pairs` fournit une couche atomique de secours via le code PG 23505.
 */
async function findExistingConversation(
  admin: SupabaseClient,
  userA: string,
  userB: string,
  relatedType: RelatedType | null,
  relatedId: string | null,
): Promise<string | null> {
  // Étape 1 — IDs des conversations de chaque participant (en parallèle)
  const [resA, resB] = await Promise.all([
    admin.from('conversation_participants').select('conversation_id').eq('user_id', userA),
    admin.from('conversation_participants').select('conversation_id').eq('user_id', userB),
  ]);

  const idsA = new Set((resA.data ?? []).map((r: { conversation_id: string }) => r.conversation_id));
  const idsB = new Set((resB.data ?? []).map((r: { conversation_id: string }) => r.conversation_id));

  // Intersection : conversations où les DEUX participent
  const sharedIds = Array.from(idsA).filter(id => idsB.has(id));
  if (sharedIds.length === 0) return null;

  // Étape 2 — Filtrage par contexte sur les conversations partagées
  let query = admin
    .from('conversations')
    .select('id')
    .in('id', sharedIds)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (relatedId && relatedType) {
    // Correspondance EXACTE : même type ET même objet lié — aucun fallback sur d'autres types
    query = query.eq('related_type', relatedType).eq('related_id', relatedId);
  } else if (relatedType && relatedType !== 'general') {
    // Correspondance par type de contexte uniquement (sans relatedId)
    query = query.eq('related_type', relatedType);
  } else {
    // Cas 'general' ou sans contexte : chercher uniquement les convs 'general' (pas toute conv partagée)
    query = query.eq('related_type', 'general');
  }

  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  // ── CSRF — doit précéder l'auth pour bloquer les requêtes cross-site cookie-only
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  // ── Auth ────────────────────────────────────────────────────────────────────
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ── Validation du corps ─────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const parsed = StartConversationSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);

  const { ownerId, subject, relatedType, relatedId, initialMsg } = parsed.data;

  // Log de diagnostic (visible dans Vercel Functions logs)
  console.log('[start-conversation] payload reçu:', { userId, ownerId, relatedType, relatedId: relatedId ?? null, subject });

  // Empêcher une conversation avec soi-même
  if (ownerId === userId) {
    return NextResponse.json(
      { error: 'Impossible de démarrer une conversation avec soi-même' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // ── Vérification destinataire ───────────────────────────────────────────────
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', ownerId)
    .maybeSingle();

  if (!ownerProfile) {
    return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 });
  }

  // ── Garde anti-duplication (applicatif) ────────────────────────────────────
  // Couche 1 — garde applicatif. Voir section "ANTI-DUPLICATION" en tête de fichier.
  const existingId = await findExistingConversation(
    admin, userId, ownerId, relatedType ?? null, relatedId ?? null
  );
  console.log('[start-conversation] existingId trouvé:', existingId ?? 'aucun');
  if (existingId) {
    console.log('[start-conversation] → retour conv existante:', existingId);
    return NextResponse.json({ conversationId: existingId, isNew: false });
  }

  // ── Step 1 : Créer la conversation ─────────────────────────────────────────
  const convPayload: Record<string, unknown> = {
    subject,
    related_type: relatedType ?? 'general',
    updated_at: new Date().toISOString(),
  };
  if (relatedId) convPayload.related_id = relatedId;

  const { data: newConv, error: convError } = await admin
    .from('conversations')
    .insert(convPayload)
    .select('id')
    .single();

  // Gestion de la unique_violation (23505) si la contrainte DB est déjà en place
  // et que deux requêtes concurrentes ont passé le garde applicatif simultanément.
  if (convError) {
    if (convError.code === '23505') {
      // Race condition gagnée par l'autre requête — on retrouve la conv existante.
      const raceId = await findExistingConversation(
        admin, userId, ownerId, relatedType ?? null, relatedId ?? null
      );
      if (raceId) return NextResponse.json({ conversationId: raceId, isNew: false });
    }
    console.error('[start-conversation] create error:', convError.message);
    return NextResponse.json(
      { error: convError.message || 'Erreur création conversation' },
      { status: 500 }
    );
  }

  if (!newConv?.id) {
    return NextResponse.json({ error: 'Erreur création conversation' }, { status: 500 });
  }

  const convId = newConv.id;

  // ── Step 2 : Ajouter les participants ───────────────────────────────────────
  // On utilise des INSERT individuels plutôt qu'un upsert groupé :
  //   - L'upsert avec onConflict nécessite une contrainte UNIQUE nommée en DB
  //     qui peut ne pas exister sur toutes les instances (migration non appliquée).
  //   - Les INSERT individuels avec gestion du code 23505 (unique_violation)
  //     sont robustes quelle que soit l'état des migrations.
  const now = new Date().toISOString();

  const [insertSelf, insertOwner] = await Promise.all([
    admin.from('conversation_participants')
      .insert({ conversation_id: convId, user_id: userId,  joined_at: now })
      .select('user_id')
      .maybeSingle(),
    admin.from('conversation_participants')
      .insert({ conversation_id: convId, user_id: ownerId, joined_at: now })
      .select('user_id')
      .maybeSingle(),
  ]);

  // Code 23505 = déjà présent (contrainte unique) → acceptable, pas une erreur
  const selfOk  = !insertSelf.error  || insertSelf.error.code  === '23505';
  const ownerOk = !insertOwner.error || insertOwner.error.code === '23505';

  if (insertSelf.error && insertSelf.error.code !== '23505') {
    console.error('[start-conversation] insert self error:',
      insertSelf.error.message, insertSelf.error.code,
      '| convId:', convId, '| userId:', userId,
    );
  }
  if (insertOwner.error && insertOwner.error.code !== '23505') {
    console.error('[start-conversation] insert owner error:',
      insertOwner.error.message, insertOwner.error.code,
      '| convId:', convId, '| ownerId:', ownerId,
    );
  }

  // Si l'utilisateur courant ne peut pas être ajouté → il n'aura pas accès (403) → erreur bloquante
  if (!selfOk) {
    // Nettoyer la conv créée pour éviter les orphelins
    await admin.from('conversations').delete().eq('id', convId);
    return NextResponse.json(
      { error: `Impossible d'ajouter le participant (${insertSelf.error?.message ?? 'erreur inconnue'}) [code: ${insertSelf.error?.code}]` },
      { status: 500 }
    );
  }

  // Si le destinataire ne peut pas être ajouté → conv créée mais incomplète
  if (!ownerOk) {
    console.warn('[start-conversation] destinataire non ajouté comme participant',
      '| convId:', convId, '| ownerId:', ownerId,
      '| erreur:', insertOwner.error?.message, '| code:', insertOwner.error?.code,
    );
    // On ne bloque pas : l'utilisateur courant peut accéder, le destinataire recevra une notif
    // et pourra être ajouté ultérieurement via un autre mécanisme.
  }

  // ── Step 3 : Message initial ────────────────────────────────────────────────
  if (initialMsg) {
    const { error: msgError } = await admin
      .from('messages')
      .insert({ conversation_id: convId, sender_id: userId, content: initialMsg });

    if (msgError) {
      console.warn('[start-conversation] initial message error:', msgError.message);
    }

    // Notification pour le destinataire
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const senderName =
      (senderProfile as { full_name: string | null } | null)?.full_name ?? "Quelqu'un";
    const preview = initialMsg.length > 60 ? initialMsg.slice(0, 60) + '…' : initialMsg;

    await admin
      .from('notifications')
      .insert({
        user_id: ownerId,
        type: 'new_message',
        title: `Message de ${senderName}`,
        message: preview,
        link: `/messages/${convId}`,
      })
      .then(({ error: ne }) => {
        if (ne) console.warn('[start-conversation] notification error:', ne.message);
      });
  }

  return NextResponse.json({ conversationId: convId, isNew: true });
}

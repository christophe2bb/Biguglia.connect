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
 * ANTI-DUPLICATION — ÉTAT ACTUEL
 * ─────────────────────────────────────────────────────────────────────────────
 * La déduplication repose sur un **garde applicatif** (voir `findExistingConversation`
 * ci-dessous) : on cherche les conversations partagées entre les deux participants,
 * puis on filtre par contexte (related_type + related_id).
 *
 * Ce garde est **correct en conditions normales**, mais il n'est pas atomique :
 * deux requêtes simultanées pour la même paire (userId, ownerId, relatedId) peuvent
 * toutes deux passer le check → créer deux conversations en doublon.
 *
 * TODO(DB) — migration 20260412_conversations_unique.sql
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour rendre la contrainte d'unicité atomique et définitive, appliquer la
 * migration SQL suivante :
 *
 *   supabase/migrations/20260412_conversations_unique.sql
 *
 * Elle ajoute :
 *   1. UNIQUE (participant_a, participant_b, related_type, related_id)
 *      sur une vue ou table de normalisation des paires participant (paire triée).
 *   2. Index fonctionnel BTREE sur (LEAST(a,b), GREATEST(a,b), related_type, related_id).
 *   3. Contrainte CHECK participant_a < participant_b (canonicité de la paire).
 *
 * Une fois la migration appliquée, l'INSERT de step 2 retournera un code Postgres
 * `23505` (unique_violation) si la course applicative est perdue. Le handler en
 * bas de ce fichier gère déjà ce cas et retourne `{ conversationId, isNew: false }`.
 *
 * NE PAS appliquer sans :
 *   □ Vérifier l'absence de doublons existants (script de nettoyage dans la migration).
 *   □ Tester sur un dump de staging d'abord.
 *   □ Mettre à jour docs/db/SCHEMA.md après déploiement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

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
 * NOTE : Ce garde applicatif n'est pas atomique (voir TODO(DB) en haut du fichier).
 * La contrainte DB en attente (`20260412_conversations_unique`) le rendra race-proof.
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
    // Correspondance exacte : même objet lié
    query = query.eq('related_type', relatedType).eq('related_id', relatedId);
  } else if (relatedType && relatedType !== 'general') {
    // Correspondance par type de contexte (ex : toutes les convs 'artisan' avec ce profil)
    query = query.eq('related_type', relatedType);
  }
  // Sinon : toute conversation partagée (cas 'general' ou sans contexte)

  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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
  // Voir TODO(DB) en haut du fichier pour rendre ce garde atomique.
  const existingId = await findExistingConversation(
    admin, userId, ownerId, relatedType ?? null, relatedId ?? null
  );
  if (existingId) {
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
  const { error: partError } = await admin
    .from('conversation_participants')
    .upsert(
      [
        { conversation_id: convId, user_id: userId },
        { conversation_id: convId, user_id: ownerId },
      ],
      { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
    );

  if (partError) {
    console.error('[start-conversation] add participants error:', partError.message);
    // Non bloquant — la conv est créée; on continue (les participants sont critiques
    // mais le client peut toujours être redirigé)
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

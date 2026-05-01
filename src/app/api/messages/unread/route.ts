/**
 * API Route: GET /api/messages/unread
 *
 * Retourne le nombre de messages non lus et de notifications pour l'utilisateur.
 * Utilise l'admin client pour contourner la récursion infinie dans les RLS
 * de conversation_participants et messages.
 *
 * Authentification : Authorization: Bearer <access_token>
 *
 * Réponse :
 *   {
 *     participations: Array<{ conversation_id, last_read_at, joined_at }>,
 *     messages: Array<{ id, conversation_id, created_at, sender_id, is_system }>,
 *     notifications: number   (count non lus)
 *   }
 *
 * ─── OPTIMISATIONS PERFORMANCES ──────────────────────────────────────────────
 *
 *   1. Cache-Control: private, max-age=5, stale-while-revalidate=10
 *      → Le navigateur réutilise la réponse pour 5 s, puis la revalide en arrière-plan.
 *      → Réduit drastiquement les appels réseau lors du polling 30 s.
 *
 *   2. Filtre `since` affiné : si le client n'a pas encore de readMap (1970),
 *      on utilise le `joined_at` minimal des participations comme borne basse.
 *      → Évite un scan complet de la table messages depuis l'époque Unix.
 *
 *   3. `content` retiré du SELECT messages — remplacé par `is_system` calculé
 *      côté serveur (ILIKE patterns) pour réduire la taille du payload JSON.
 *
 * ─── SÉCURITÉ — GARANTIE D'ISOLATION ─────────────────────────────────────────
 *
 * L'isolation entre utilisateurs repose sur deux invariants :
 *
 *   1. ÉTAPE 1 : On récupère UNIQUEMENT les conversation_ids de l'utilisateur
 *      authentifié, via le filtre `.eq('user_id', userId)` sur
 *      `conversation_participants`. Un utilisateur ne peut donc jamais obtenir
 *      les conversation_ids d'un autre utilisateur.
 *
 *   2. ÉTAPE 2 : La requête sur `messages` est toujours filtrée avec
 *      `.in('conversation_id', convIds)`, où `convIds` est le résultat
 *      de l'étape 1. Sans ce filtre, la requête retournerait les messages
 *      de TOUTES les conversations (fuite de données).
 *
 *   3. GARDE-FOU : Si l'étape 1 échoue ou renvoie une erreur DB, on retourne
 *      immédiatement `{ participations: [], messages: [], notifications: 0 }`
 *      — jamais un fetch global non filtré.
 *
 *   4. LIMITE : `convIds` est plafonné à MAX_CONV_IDS entrées avant l'appel `.in()`,
 *      pour éviter une clause `IN (…)` Postgres de plusieurs milliers d'ids.
 *
 * Ces invariants sont couverts par les tests dans :
 *   src/app/api/messages/unread/route.test.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { MAX_CONV_IDS } from './constants';

// Augmente la limite Vercel à 30 s (défaut : 10 s Hobby / 15 s Pro)
export const maxDuration = 30;

/** Marqueurs identifiant les messages système (générés automatiquement). */
const SYSTEM_PREFIXES = ['👋', '✅', '🤝'];
const SYSTEM_SUBSTRINGS = [
  'je vous contacte',
  'échange confirmé',
  'echange confirme',
  'conversation créée',
  'conversation creee',
  'via biguglia connect',
];

function isSystemContent(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    SYSTEM_PREFIXES.some(p => content.startsWith(p)) ||
    SYSTEM_SUBSTRINGS.some(s => lower.includes(s))
  );
}

// ── Headers de cache HTTP ─────────────────────────────────────────────────────
// private  : ne pas mettre en cache par un CDN intermédiaire (données utilisateur)
// max-age=5 : le navigateur réutilise la réponse jusqu'à 5 s sans requête réseau
// stale-while-revalidate=10 : revalide silencieusement pendant 10 s supplémentaires
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
};

export async function GET(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // `since` envoyé par le client (date de la dernière lecture connue)
  // Valeur défaut : 0 (sera affiné si les participations ont un joined_at récent)
  const clientSince = searchParams.get('since') ?? null;

  const admin = createAdminClient();

  // ── Étape 1 : participations + notifications en parallèle ─────────────────
  // CRITIQUE : on filtre TOUJOURS par userId ici — c'est la seule source des
  // conversation_ids autorisés. Ne jamais supprimer le .eq('user_id', userId).
  const [participRes, notifRes] = await Promise.all([
    admin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, joined_at')
      .eq('user_id', userId),          // ← filtre d'isolation obligatoire

    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ]);

  // ── Garde-fou erreur DB ───────────────────────────────────────────────────
  // Si la requête participations échoue, on retourne vide plutôt que de
  // tenter un fetch global non filtré (qui serait une fuite de données).
  if (participRes.error) {
    console.error('[unread API] participations DB error:', participRes.error.message);
    return NextResponse.json(
      { participations: [], messages: [], notifications: 0 },
      { status: 200, headers: CACHE_HEADERS }
    );
  }

  // ── Étape 2 : extraire les conversation_ids de l'utilisateur ─────────────
  // Plafonnement à MAX_CONV_IDS pour éviter une clause IN Postgres trop large.
  const allConvIds: string[] = (participRes.data ?? []).map(
    (p: { conversation_id: string }) => p.conversation_id
  );
  const convIds = allConvIds.slice(0, MAX_CONV_IDS);

  // ── Optimisation : si aucune conversation, on court-circuite ─────────────
  if (convIds.length === 0) {
    return NextResponse.json(
      { participations: [], messages: [], notifications: notifRes.count ?? 0 },
      { headers: CACHE_HEADERS }
    );
  }

  // ── Affinage du filtre `since` ────────────────────────────────────────────
  // Si le client envoie since=1970 (première charge, readMap vide), on utilise
  // plutôt le plus ancien joined_at des participations comme borne inférieure.
  // Cela évite un scan complet de la table messages depuis l'époque Unix.
  let effectiveSince: string;
  if (clientSince && clientSince !== new Date(0).toISOString()) {
    effectiveSince = clientSince;
  } else {
    // Calculer le joined_at/last_read_at minimum parmi les participations
    const timestamps = (participRes.data ?? []).map((p: { last_read_at: string | null; joined_at: string | null }) => {
      const ref = p.last_read_at || p.joined_at;
      return ref ? new Date(ref).getTime() : 0;
    });
    const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    // On soustrait 60 s pour absorber les messages arrivés juste avant la lecture
    effectiveSince = new Date(Math.max(minTs - 60_000, 0)).toISOString();
  }

  // ── Étape 3 : messages UNIQUEMENT dans les conversations de l'utilisateur ─
  // CRITIQUE : .in('conversation_id', convIds) est le filtre de sécurité
  // principal. Ne jamais le supprimer ni le conditionner.
  // On sélectionne `content` uniquement pour calculer is_system côté serveur,
  // puis on le retire du payload retourné au client.
  const { data: rawMessages, error: msgError } = await admin
    .from('messages')
    .select('id, conversation_id, created_at, content, sender_id')
    .in('conversation_id', convIds)    // ← filtre de sécurité obligatoire
    .neq('sender_id', userId)
    .gt('created_at', effectiveSince)
    .order('created_at', { ascending: false })
    .limit(500);

  if (msgError) {
    console.error('[unread API] messages DB error:', msgError.message);
    // On retourne les participations sans messages plutôt que 500
    return NextResponse.json(
      {
        participations: participRes.data ?? [],
        messages: [],
        notifications: notifRes.count ?? 0,
      },
      { headers: CACHE_HEADERS }
    );
  }

  // Calculer is_system côté serveur et retirer `content` du payload
  const messages = (rawMessages ?? []).map(
    (m: { id: string; conversation_id: string; created_at: string; content: string; sender_id: string }) => ({
      id:              m.id,
      conversation_id: m.conversation_id,
      created_at:      m.created_at,
      sender_id:       m.sender_id,
      is_system:       isSystemContent(m.content ?? ''),
    })
  );

  return NextResponse.json(
    {
      participations: participRes.data ?? [],
      messages,
      notifications: notifRes.count ?? 0,
    },
    { headers: CACHE_HEADERS }
  );
}

/**
 * PATCH /api/messages/unread
 * Body: { conversationId: string, lastReadAt?: string }
 *
 * Persiste last_read_at pour une conversation (marquer comme lu).
 * SÉCURITÉ : le filtre `.eq('user_id', userId)` garantit qu'un utilisateur
 * ne peut marquer comme lu que ses propres participations.
 */
export async function PATCH(req: NextRequest) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: { conversationId?: string; lastReadAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const { conversationId, lastReadAt } = body;
  if (!conversationId || typeof conversationId !== 'string') {
    return NextResponse.json({ error: 'conversationId requis (string)' }, { status: 400 });
  }

  // Valider lastReadAt si fourni
  if (lastReadAt !== undefined) {
    const ts = Date.parse(lastReadAt);
    if (isNaN(ts)) {
      return NextResponse.json({ error: 'lastReadAt doit être un ISO 8601 valide' }, { status: 400 });
    }
  }

  const newISO = lastReadAt ?? new Date().toISOString();
  const admin = createAdminClient();

  // SÉCURITÉ : .eq('user_id', userId) garantit que seule la participation
  // de cet utilisateur peut être mise à jour — pas celle d'un autre.
  const { error } = await admin
    .from('conversation_participants')
    .update({ last_read_at: newISO })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);            // ← filtre d'isolation obligatoire

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

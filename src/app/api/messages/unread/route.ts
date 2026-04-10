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
 *     messages: Array<{ id, conversation_id, created_at, content, sender_id }>,
 *     notifications: number   (count non lus)
 *   }
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
 *   4. LIMITE : `convIds` est plafonné à 500 entrées avant l'appel `.in()`,
 *      pour éviter une clause `IN (…)` Postgres de plusieurs milliers d'ids.
 *
 * Ces invariants sont couverts par les tests dans :
 *   src/app/api/messages/unread/route.test.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { MAX_CONV_IDS } from './constants';

export async function GET(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const oldestISO = searchParams.get('since') || new Date(0).toISOString();

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
      { status: 200 }
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
    return NextResponse.json({
      participations: [],
      messages: [],
      notifications: notifRes.count ?? 0,
    });
  }

  // ── Étape 3 : messages UNIQUEMENT dans les conversations de l'utilisateur ─
  // CRITIQUE : .in('conversation_id', convIds) est le filtre de sécurité
  // principal. Ne jamais le supprimer ni le conditionner.
  const { data: messagesData, error: msgError } = await admin
    .from('messages')
    .select('id, conversation_id, created_at, content, sender_id')
    .in('conversation_id', convIds)    // ← filtre de sécurité obligatoire
    .neq('sender_id', userId)
    .gt('created_at', oldestISO)
    .limit(500);

  if (msgError) {
    console.error('[unread API] messages DB error:', msgError.message);
    // On retourne les participations sans messages plutôt que 500
    return NextResponse.json({
      participations: participRes.data ?? [],
      messages: [],
      notifications: notifRes.count ?? 0,
    });
  }

  return NextResponse.json({
    participations: participRes.data ?? [],
    messages: messagesData ?? [],
    notifications: notifRes.count ?? 0,
  });
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

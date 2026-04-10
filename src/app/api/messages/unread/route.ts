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
 * SÉCURITÉ : les messages sont TOUJOURS filtrés par les conversation_ids de
 * l'utilisateur. Un fetch global non filtré constituerait une fuite de données.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export async function GET(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const oldestISO = searchParams.get('since') || new Date(0).toISOString();

  const admin = createAdminClient();

  // Étape 1 — participations + notifications en parallèle (pas de dépendance entre elles)
  const [participRes, notifRes] = await Promise.all([
    admin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, joined_at')
      .eq('user_id', userId),

    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ]);

  // Étape 2 — extraire les conversation_ids de l'utilisateur
  // CRITIQUE : ne jamais requêter messages sans ce filtre — fuite de données sinon.
  const convIds: string[] = (participRes.data ?? []).map(
    (p: { conversation_id: string }) => p.conversation_id
  );

  // Si l'utilisateur n'a aucune conversation, inutile d'interroger messages
  if (convIds.length === 0) {
    return NextResponse.json({
      participations: [],
      messages: [],
      notifications: notifRes.count ?? 0,
    });
  }

  // Étape 3 — messages UNIQUEMENT dans les conversations de l'utilisateur
  const { data: messagesData } = await admin
    .from('messages')
    .select('id, conversation_id, created_at, content, sender_id')
    .in('conversation_id', convIds)   // ← filtre de sécurité obligatoire
    .neq('sender_id', userId)
    .gt('created_at', oldestISO)
    .limit(500);

  return NextResponse.json({
    participations: participRes.data ?? [],
    messages: messagesData ?? [],
    notifications: notifRes.count ?? 0,
  });
}

/**
 * PATCH /api/messages/unread
 * Body: { conversationId: string, lastReadAt: string }
 * Persiste last_read_at pour une conversation (marquer comme lu).
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
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId requis' }, { status: 400 });
  }

  const newISO = lastReadAt ?? new Date().toISOString();
  const admin = createAdminClient();

  const { error } = await admin
    .from('conversation_participants')
    .update({ last_read_at: newISO })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

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
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: { user } } = await client.auth.getUser(token);
      if (user) return user.id;
    } catch { /* ignore */ }
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user.id;
  } catch { /* ignore */ }

  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const oldestISO = searchParams.get('since') || new Date(0).toISOString();

  const admin = createAdminClient();

  // Fetch in parallel
  const [participRes, msgRes, notifRes] = await Promise.all([
    // 1. Participations (last_read_at, joined_at)
    admin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, joined_at')
      .eq('user_id', userId),

    // 2. Messages candidats (plus récents que oldestISO, non envoyés par l'utilisateur)
    admin
      .from('messages')
      .select('id, conversation_id, created_at, content, sender_id')
      .neq('sender_id', userId)
      .gt('created_at', oldestISO)
      .limit(500),

    // 3. Notifications non lues
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ]);

  return NextResponse.json({
    participations: participRes.data ?? [],
    messages: msgRes.data ?? [],
    notifications: notifRes.count ?? 0,
  });
}

/**
 * PATCH /api/messages/unread
 * Body: { conversationId: string, lastReadAt: string }
 * Persiste last_read_at pour une conversation (marquer comme lu).
 */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
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

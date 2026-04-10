/**
 * API Route: GET /api/messages/conversations
 *
 * Retourne la liste des conversations de l'utilisateur connecté.
 * Utilise l'admin client pour contourner la récursion infinie dans les
 * politiques RLS de conversation_participants / messages / conversations.
 *
 * Authentification : Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function getUserId(req: NextRequest): Promise<string | null> {
  // Priorité 1 : Bearer token
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

  // Priorité 2 : cookies SSR
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
    return NextResponse.json({ error: 'Non authentifié', status: 'guest' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Récupérer les participations + conversations + participants + derniers messages
  // via admin client (bypass RLS recursion)
  const { data: participations, error } = await admin
    .from('conversation_participants')
    .select(`
      conversation_id,
      last_read_at,
      joined_at,
      conversation:conversations(
        id, subject, related_type, related_id, updated_at,
        participants:conversation_participants(
          user_id,
          profile:profiles(id, full_name, avatar_url)
        ),
        last_msg:messages(content, created_at, sender_id)
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('[api/messages/conversations] DB error:', error.message);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ participations: participations ?? [] });
}

/**
 * PATCH /api/messages/conversations
 * Body: { conversationId: string, lastReadAt: string }
 * Met à jour le last_read_at d'une participation (marquer comme lu)
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

  const admin = createAdminClient();
  const { error } = await admin
    .from('conversation_participants')
    .update({ last_read_at: lastReadAt ?? new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/messages/conversations?conversationId=xxx
 * Quitter une conversation (supprime la participation + messages de l'utilisateur)
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId requis' }, { status: 400 });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Supprimer la participation et les messages de l'utilisateur
  await Promise.all([
    admin.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', userId),
    admin.from('messages').delete().eq('conversation_id', conversationId).eq('sender_id', userId),
  ]);

  return NextResponse.json({ ok: true });
}

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

  // Étape 1 : participations de l'utilisateur
  const { data: myParticipations, error: partErr } = await admin
    .from('conversation_participants')
    .select('conversation_id, last_read_at, joined_at')
    .eq('user_id', userId);

  if (partErr) {
    console.error('[api/messages/conversations] participations error:', partErr.message);
    return NextResponse.json({ error: partErr.message, code: partErr.code }, { status: 500 });
  }

  if (!myParticipations || myParticipations.length === 0) {
    return NextResponse.json({ participations: [] });
  }

  const convIds = myParticipations.map((p: { conversation_id: string }) => p.conversation_id);

  // Étape 2 : conversations + tous participants + derniers messages (requêtes parallèles)
  const [
    { data: conversations, error: convErr },
    { data: allParticipants, error: partAllErr },
    { data: recentMessages, error: msgErr },
  ] = await Promise.all([
    // Données de la conversation
    admin
      .from('conversations')
      .select('id, subject, related_type, related_id, updated_at')
      .in('id', convIds),
    // Tous les participants de toutes les conversations
    admin
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds),
    // Derniers messages pour le preview (max 10 par conv, cap global à 500)
    admin
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(Math.min(convIds.length * 10, 500)),
  ]);

  if (convErr) {
    console.error('[api/messages/conversations] conversations error:', convErr.message);
    return NextResponse.json({ error: convErr.message, code: convErr.code }, { status: 500 });
  }

  if (partAllErr) {
    console.error('[api/messages/conversations] allParticipants error:', partAllErr.message);
    // Ne pas planter — continuer avec une liste vide de participants
  }

  if (msgErr) {
    console.error('[api/messages/conversations] messages error:', msgErr.message);
    // Ne pas planter — continuer sans messages de prévisualisation
  }

  // Étape 3 : profils de tous les participants
  // On inclut TOUJOURS l'utilisateur courant dans la liste pour éviter un profil manquant
  const participantUserIds = (allParticipants ?? []).map((p: { user_id: string }) => p.user_id);
  const allUserIds = Array.from(new Set([...participantUserIds, userId]));

  let profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null }> = [];
  if (allUserIds.length > 0) {
    const { data: profileData, error: profileErr } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', allUserIds);

    if (profileErr) {
      console.error('[api/messages/conversations] profiles error:', profileErr.message);
      // Ne pas planter — continuer sans profils
    } else {
      profiles = profileData ?? [];
    }
  }

  // Construire un index rapide
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const convMap    = new Map((conversations ?? []).map(c => [c.id, c]));
  const msgsByConv = new Map<string, Array<{ id: string; conversation_id: string; sender_id: string; content: string; created_at: string }>>();
  for (const msg of (recentMessages ?? [])) {
    const arr = msgsByConv.get(msg.conversation_id) ?? [];
    arr.push(msg);
    msgsByConv.set(msg.conversation_id, arr);
  }
  const partsByConv = new Map<string, Array<{ conversation_id: string; user_id: string }>>();
  for (const p of (allParticipants ?? [])) {
    const arr = partsByConv.get(p.conversation_id) ?? [];
    arr.push(p);
    partsByConv.set(p.conversation_id, arr);
  }

  // Assembler la réponse dans le même format attendu par le client
  const participations = myParticipations.map((mp: { conversation_id: string; last_read_at: string | null; joined_at: string | null }) => {
    const conv = convMap.get(mp.conversation_id);
    if (!conv) return null;

    const convParticipants = (partsByConv.get(mp.conversation_id) ?? []).map(p => ({
      user_id: p.user_id,
      profile: profileMap.get(p.user_id) ?? null,
    }));

    // Fallback : si les participants n'incluent pas l'utilisateur courant,
    // construire une liste minimale avec l'autre côté
    const participantsList = convParticipants.length > 0
      ? convParticipants
      : [{ user_id: userId, profile: profileMap.get(userId) ?? null }];

    const msgs = msgsByConv.get(mp.conversation_id) ?? [];
    // Déjà trié DESC par la requête; ré-assurer le tri côté serveur
    msgs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return {
      conversation_id: mp.conversation_id,
      last_read_at: mp.last_read_at,
      joined_at: mp.joined_at,
      conversation: {
        ...conv,
        participants: participantsList,
        last_msg: msgs,
      },
    };
  }).filter(Boolean);

  return NextResponse.json({ participations });
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

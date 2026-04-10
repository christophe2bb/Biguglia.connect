/**
 * API Route: GET /api/messages/conversation/[id]
 *
 * Retourne les données d'une conversation spécifique :
 * - Infos de la conversation (sujet, related_type, etc.)
 * - Liste des participants + profils
 * - Messages paginés
 *
 * Utilise l'admin client pour contourner la récursion RLS.
 * Vérifie que l'utilisateur est bien participant avant de renvoyer les données.
 *
 * Authentification : Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  if (!conversationId) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est participant
  const { data: participation, error: partError } = await admin
    .from('conversation_participants')
    .select('user_id, last_read_at, joined_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  if (!participation) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Récupérer les données en parallèle
  const [
    { data: participants, error: participantsError },
    { data: conversation, error: convError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
    admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId),
    admin
      .from('conversations')
      .select('id, subject, related_type, related_id, exchange_status, exchange_confirmed_by, exchange_confirmed_at, owner_id, created_by, updated_at')
      .eq('id', conversationId)
      .single(),
    admin
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, is_deleted, deleted_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ]);

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  // Récupérer les profils des participants
  const participantIds = (participants ?? []).map((p: { user_id: string }) => p.user_id);
  let profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null }> = [];
  if (participantIds.length > 0) {
    const { data: profileData } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', participantIds);
    profiles = profileData ?? [];
  }

  return NextResponse.json({
    conversation,
    participants: participantIds,
    profiles,
    messages: messages ?? [],
    myParticipation: participation,
  });
}

/**
 * PATCH /api/messages/conversation/[id]
 * Actions sur la conversation : marquer comme lu, etc.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: { action?: string; lastReadAt?: string; exchangeStatus?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.action === 'mark_read') {
    const { error } = await admin
      .from('conversation_participants')
      .update({ last_read_at: body.lastReadAt ?? new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'update_exchange_status') {
    // Vérifier d'abord que l'utilisateur est participant
    const { data: part } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!part) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { error } = await admin
      .from('conversations')
      .update({
        exchange_status: body.exchangeStatus,
        exchange_confirmed_by: userId,
        exchange_confirmed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

/**
 * POST /api/messages/conversation/[id]
 * Envoyer un message dans la conversation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Vérifier participation
  const { data: part } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!part) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { data: msg, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: body.content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // En parallèle : mettre à jour updated_at + envoyer notification aux autres participants
  const [, participantsRes, senderProfileRes] = await Promise.all([
    // 1. Mettre à jour updated_at de la conversation
    admin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId),
    // 2. Récupérer les autres participants pour la notification
    admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId),
    // 3. Profil de l'expéditeur pour le nom
    admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  // Envoyer une notification aux autres participants (pas pour les messages système)
  const contentTrimmed = body.content!.trim();
  const isSystem = contentTrimmed.startsWith('👋') || contentTrimmed.startsWith('✅') || contentTrimmed.startsWith('🤝');
  if (!isSystem && participantsRes.data && participantsRes.data.length > 0) {
    const senderName = (senderProfileRes.data as { full_name: string | null } | null)?.full_name || 'Quelqu\'un';
    const preview = contentTrimmed.length > 60 ? contentTrimmed.slice(0, 60) + '…' : contentTrimmed;
    const notifications = participantsRes.data.map((p: { user_id: string }) => ({
      user_id: p.user_id,
      type: 'new_message',
      title: `Message de ${senderName}`,
      message: preview,
      link: `/messages/${conversationId}`,
    }));
    await admin.from('notifications').insert(notifications).then(({ error: ne }) => {
      if (ne) console.warn('[conversation POST] notification insert error:', ne.message);
    });
  }

  return NextResponse.json({ message: msg });
}

/**
 * DELETE /api/messages/conversation/[id]?messageId=xxx
 * Supprimer un message spécifique (l'utilisateur doit en être l'auteur)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json({ error: 'messageId requis' }, { status: 400 });
  }

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est bien l'auteur du message
  const { data: msg } = await admin
    .from('messages')
    .select('id, sender_id, conversation_id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });
  if (msg.sender_id !== userId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { error } = await admin.from('messages').delete().eq('id', messageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

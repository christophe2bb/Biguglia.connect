/**
 * API Route: GET/PATCH/POST/DELETE /api/messages/conversation/[id]
 *
 * GET    — Données complètes d'une conversation (infos, participants, messages).
 * PATCH  — Marquer comme lu | mettre à jour exchange_status.
 * POST   — Envoyer un message.
 * DELETE — Supprimer un message (auteur uniquement).
 *
 * Utilise le client admin pour contourner la récursion RLS.
 * Vérifie systématiquement que l'utilisateur est participant avant d'agir.
 *
 * Authentification : Authorization: Bearer <access_token>
 * Réponse typée : ConversationApiResponse (src/app/messages/[id]/_types.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import type { ConversationApiResponse } from '@/app/(private)/messages/[id]/_types';
import {
  zodError,
  parseJsonBody,
  verifyParticipant,
  getParticipantIds,
  fetchAndBuildProfiles,
  sendNewMessageNotifications,
  PatchBodySchema,
  PostMessageSchema,
  CONVERSATION_SELECT,
  MESSAGES_SELECT,
} from './_helpers';

const UNAUTH = NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
const FORBIDDEN = NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const conversationId = id;
  if (!conversationId) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  const userId = await getUserIdBearerFirst(req);
  if (!userId) return UNAUTH;

  const admin = createAdminClient();
  let participation;
  try {
    participation = await verifyParticipant(admin, conversationId, userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur DB';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!participation) return FORBIDDEN;

  const [
    { data: participantRows, error: participantsError },
    { data: conversation,    error: convError },
    { data: messages,        error: messagesError },
  ] = await Promise.all([
    admin.from('conversation_participants').select('user_id').eq('conversation_id', conversationId),
    admin.from('conversations').select(CONVERSATION_SELECT).eq('id', conversationId).single(),
    admin.from('messages').select(MESSAGES_SELECT).eq('conversation_id', conversationId).order('created_at', { ascending: true }),
  ]);

  if (convError) {
    console.error('[api/conversation/GET] conversation error:', convError.message);
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }
  if (messagesError)   console.error('[api/conversation/GET] messages error:', messagesError.message);
  if (participantsError) console.error('[api/conversation/GET] participants error:', participantsError.message);

  const participantIds     = getParticipantIds(participantRows, userId);
  const otherParticipantId = participantIds.find(uid => uid !== userId) ?? null;
  const profiles           = await fetchAndBuildProfiles(admin, participantIds, otherParticipantId);

  const body: ConversationApiResponse = {
    conversation,
    participants: participantIds,
    profiles,
    other_user_id: otherParticipantId,
    messages: messages ?? [],
    myParticipation: participation,
    messages_fetch_error: messagesError ? messagesError.message : null,
  };

  return NextResponse.json(body);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const conversationId = id;
  const userId = await getUserIdBearerFirst(req);
  if (!userId) return UNAUTH;

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = PatchBodySchema.safeParse(raw.data);
  if (!parsed.success) return zodError(parsed.error);

  const body  = parsed.data;
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
    let part;
    try { part = await verifyParticipant(admin, conversationId, userId); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur DB' }, { status: 500 }); }
    if (!part) return FORBIDDEN;

    const { error } = await admin
      .from('conversations')
      .update({ exchange_status: body.exchangeStatus, exchange_confirmed_by: userId, exchange_confirmed_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const conversationId = id;
  const userId = await getUserIdBearerFirst(req);
  if (!userId) return UNAUTH;

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = PostMessageSchema.safeParse(raw.data);
  if (!parsed.success) return zodError(parsed.error);

  const { content } = parsed.data;
  const admin = createAdminClient();

  let part;
  try { part = await verifyParticipant(admin, conversationId, userId); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur DB' }, { status: 500 }); }
  if (!part) return FORBIDDEN;

  const { data: msg, error } = await admin
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await Promise.all([
    admin.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId),
    sendNewMessageNotifications(admin, conversationId, userId, content),
  ]);

  return NextResponse.json({ message: msg });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const conversationId = id;
  const messageId = new URL(req.url).searchParams.get('messageId');
  if (!messageId) return NextResponse.json({ error: 'messageId requis' }, { status: 400 });

  const userId = await getUserIdBearerFirst(req);
  if (!userId) return UNAUTH;

  const admin = createAdminClient();

  const { data: msg } = await admin
    .from('messages')
    .select('id, sender_id, conversation_id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });
  if (msg.sender_id !== userId) return FORBIDDEN;

  const { error } = await admin.from('messages').delete().eq('id', messageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

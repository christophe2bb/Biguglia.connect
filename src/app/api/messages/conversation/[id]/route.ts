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
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import type { ConversationApiResponse } from '@/app/(private)/messages/[id]/_types';

// Augmente la limite Vercel à 30 s (défaut : 10 s Hobby / 15 s Pro)
export const maxDuration = 30;
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
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

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

    // Le client peut demander une confirmation, mais il ne choisit pas le
    // statut final. La RPC verrouille la ligne et ajoute l'UUID dans un uuid[]
    // avant de marquer l'échange terminé après les DEUX confirmations.
    const { data: exchange, error } = await admin
      .rpc('confirm_conversation_exchange', {
        p_conversation_id: conversationId,
        p_actor_id: userId,
      })
      .single();
    if (error) {
      if (error.code === '42501') return FORBIDDEN;
      if (error.code === 'P0002') return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
      if (error.code === '23514') return NextResponse.json({ error: 'Deux participants requis' }, { status: 409 });
      console.error('[conversation PATCH] confirmation RPC:', error.code);
      return NextResponse.json({ error: 'Confirmation temporairement indisponible' }, { status: 503 });
    }
    // La RPC n'est pas encore présente dans les types TypeScript générés.
    // Valider sa structure à l'exécution avant de la transmettre au client.
    const confirmed = exchange as {
      exchange_status: 'pending_confirmation' | 'done';
      confirmed_by: string[];
      confirmed_at: string | null;
    } | null;
    if (!confirmed || !Array.isArray(confirmed.confirmed_by)
        || !['pending_confirmation', 'done'].includes(confirmed.exchange_status)) {
      return NextResponse.json({ error: 'Réponse de confirmation invalide' }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      exchangeStatus: confirmed.exchange_status,
      confirmedBy: confirmed.confirmed_by,
      confirmedAt: confirmed.confirmed_at,
    });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

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

  // Un blocage postérieur à l'ouverture du fil doit interdire les messages.
  // Le contrôle doit être refait avant chaque INSERT, dans les deux sens.
  const { data: members, error: memberError } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', userId);
  if (memberError) return NextResponse.json({ error: 'Participants indisponibles' }, { status: 503 });
  const others = [...new Set((members ?? []).map(m => m.user_id).filter(id => id !== userId))];
  if (!others.length) return NextResponse.json({ error: 'Destinataire manquant' }, { status: 409 });

  // Une conversation ancienne ne donne pas le droit de contacter un compte
  // suspendu, désactivé ou supprimé. Le contrôle est effectué à chaque envoi
  // car les comptes peuvent changer d'état après l'ouverture de la discussion.
  const partyIds = [userId, ...others];
  const { data: activeParties, error: partiesError } = await admin
    .from('profiles')
    .select('id, status, is_active')
    .in('id', partyIds);
  if (partiesError) {
    return NextResponse.json({ error: 'Vérification des comptes indisponible' }, { status: 503 });
  }
  const partyStates = new Map((activeParties ?? []).map(p => [p.id, p]));
  if (partyIds.some(id => {
    const account = partyStates.get(id);
    return !account || account.status !== 'active' || account.is_active !== true;
  })) {
    return NextResponse.json({ error: 'Messagerie indisponible pour un participant' }, { status: 403 });
  }

  const blockPairs = others.flatMap(other => [
    `and(user_id.eq.${userId},target_user_id.eq.${other})`,
    `and(user_id.eq.${other},target_user_id.eq.${userId})`,
  ]);
  const { data: blocks, error: blockError } = await admin
    .from('user_blocks')
    .select('id')
    .or(blockPairs.join(','))
    .limit(1);
  if (blockError) return NextResponse.json({ error: 'Vérification des blocages indisponible' }, { status: 503 });
  if (blocks?.length) return NextResponse.json({ error: 'Message interdit : utilisateur bloqué' }, { status: 403 });

  const { data: msg, error } = await admin
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Le message est déjà enregistré. Une notification défaillante ne doit
  // surtout pas renvoyer 500 et pousser l'utilisateur à envoyer un doublon.
  const sideEffects = await Promise.allSettled([
    admin.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId),
    sendNewMessageNotifications(admin, conversationId, userId, content, true),
  ]);
  if (sideEffects.some(result => result.status === 'rejected')) {
    console.warn('[conversation POST] échec d\'une opération secondaire après enregistrement');
  }

  return NextResponse.json({ message: msg });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

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

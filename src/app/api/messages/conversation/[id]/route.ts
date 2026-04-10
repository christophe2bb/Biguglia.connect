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
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

// ── Schémas de validation ───────────────────────────────────────────────────

/** Valeurs autorisées pour exchange_status (contrainte SQL + logique métier) */
const EXCHANGE_STATUS_VALUES = ['pending_confirmation', 'done'] as const;
type ExchangeStatusValue = typeof EXCHANGE_STATUS_VALUES[number];

const PatchMarkReadSchema = z.object({
  action: z.literal('mark_read'),
  lastReadAt: z.string().datetime({ offset: true }).optional(),
});

const PatchExchangeStatusSchema = z.object({
  action: z.literal('update_exchange_status'),
  exchangeStatus: z.enum(EXCHANGE_STATUS_VALUES),
});

/** Union discriminée — chaque action a son propre schéma */
const PatchBodySchema = z.discriminatedUnion('action', [
  PatchMarkReadSchema,
  PatchExchangeStatusSchema,
]);

const PostMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message vide').max(10_000, 'Message trop long'),
});

/** Helper : retourne une 400 avec le détail Zod formaté */
function zodError(err: z.ZodError) {
  return NextResponse.json(
    { error: 'Paramètres invalides', details: err.flatten().fieldErrors },
    { status: 400 }
  );
}

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
    console.error('[api/conversation/GET] conversation error:', convError.message);
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  // messagesError : on log mais on ne bloque pas — retourner la convers sans messages
  if (messagesError) {
    console.error('[api/conversation/GET] messages error:', messagesError.message);
    // Ne pas retourner 500 pour une erreur de messages seuls — l'UI peut gérer [].
    // Le client affichera « Démarrez la conversation ! » plutôt qu'une erreur.
  }

  // Récupérer les profils des participants
  // On garantit que userId EST dans la liste même si participantsError est non-null
  // (récursion RLS possible sur conversation_participants)
  const participantIds = Array.from(new Set([
    userId,
    ...(participants ?? []).map((p: { user_id: string }) => p.user_id),
  ]));

  if (participantsError) {
    console.error('[api/conversation/GET] participants error:', participantsError.message);
  }

  let profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null; email: string | null }> = [];
  if (participantIds.length > 0) {
    const { data: profileData, error: profileErr } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', participantIds);
    if (profileErr) {
      console.error('[api/conversation/GET] profiles error:', profileErr.message);
    }
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);

  const body = parsed.data;
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

    // exchangeStatus est garanti dans EXCHANGE_STATUS_VALUES par le schéma Zod
    const newStatus: ExchangeStatusValue = body.exchangeStatus;

    const { error } = await admin
      .from('conversations')
      .update({
        exchange_status: newStatus,
        exchange_confirmed_by: userId,
        exchange_confirmed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // TypeScript exhaustiveness — ne devrait jamais être atteint grâce à z.discriminatedUnion
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const parsed = PostMessageSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);

  const { content } = parsed.data; // déjà trimmé par z.string().trim()

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
      content,
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
  const isSystem = content.startsWith('👋') || content.startsWith('✅') || content.startsWith('🤝');
  if (!isSystem && participantsRes.data && participantsRes.data.length > 0) {
    const senderName = (senderProfileRes.data as { full_name: string | null } | null)?.full_name || 'Quelqu\'un';
    const preview = content.length > 60 ? content.slice(0, 60) + '…' : content;
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

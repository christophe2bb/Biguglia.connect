/**
 * API Route: GET /api/messages/conversation/[id]
 *
 * Retourne les données d'une conversation spécifique :
 * - Infos de la conversation (sujet, related_type, etc.)
 * - Liste des participants + profils enrichis (display_name calculé serveur)
 * - UUID de l'autre participant (other_user_id) — résolution côté serveur
 * - Messages paginés
 *
 * Utilise l'admin client pour contourner la récursion RLS.
 * Vérifie que l'utilisateur est bien participant avant de renvoyer les données.
 *
 * Authentification : Authorization: Bearer <access_token>
 *
 * Réponse typée : ConversationApiResponse (src/app/messages/[id]/_types.ts)
 * — le type est la source de vérité partagée serveur ↔ client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import type {
  ConversationApiResponse,
  ConversationParticipantApi,
} from '@/app/messages/[id]/_types';

// ─── Utilitaire display_name (miroir de lib/utils.displayName) ────────────────
// Dupliqué intentionnellement pour garder la route pure Node.js sans importer
// lib/utils (qui peut avoir des dépendances browser).
// Règle : full_name non vide → partie locale de l'email → fallback.
function computeDisplayName(
  full_name: string | null | undefined,
  email: string | null | undefined,
  fallback = 'Utilisateur'
): string {
  if (full_name?.trim()) return full_name.trim();
  if (email?.trim()) {
    const local = email.trim().split('@')[0];
    if (local) return local;
  }
  return fallback;
}

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

// ─── GET ──────────────────────────────────────────────────────────────────────

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
    { data: participantRows, error: participantsError },
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
  }

  // Construire la liste dédupliquée des IDs participants.
  // On garantit que userId EST dans la liste même si participantsError est non-null
  // (récursion RLS possible sur conversation_participants).
  const participantIds = Array.from(new Set([
    userId,
    ...(participantRows ?? []).map((p: { user_id: string }) => p.user_id),
  ]));

  if (participantsError) {
    console.error('[api/conversation/GET] participants error:', participantsError.message);
  }

  // Récupérer les profils bruts
  let rawProfiles: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  }> = [];

  if (participantIds.length > 0) {
    const { data: profileData, error: profileErr } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', participantIds);
    if (profileErr) {
      console.error('[api/conversation/GET] profiles error:', profileErr.message);
    }
    rawProfiles = profileData ?? [];
  }

  // ── Calcul de display_name côté serveur ───────────────────────────────────
  // Chaque profil reçoit un display_name calculé une fois pour toutes.
  // Le client n'a plus à implémenter la logique full_name → email → fallback.
  const profiles: ConversationParticipantApi[] = rawProfiles.map(p => ({
    id: p.id,
    display_name: computeDisplayName(p.full_name, p.email),
    avatar_url: p.avatar_url,
    email: p.email,
  }));

  // ── Résolution de other_user_id côté serveur ──────────────────────────────
  // Évite que le client ait à faire `participants.filter(uid => uid !== myId)[0]`
  // et le fallback fetch supplémentaire si le profil est absent.
  const otherParticipantId = participantIds.find(uid => uid !== userId) ?? null;

  // Si le profil de l'autre participant n'est pas dans la réponse (anomalie rare),
  // on tente un fetch direct sur profiles pour compléter la liste.
  if (otherParticipantId && !profiles.find(p => p.id === otherParticipantId)) {
    const { data: fallback } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', otherParticipantId)
      .maybeSingle();
    if (fallback) {
      profiles.push({
        id: fallback.id,
        display_name: computeDisplayName(fallback.full_name, fallback.email),
        avatar_url: fallback.avatar_url,
        email: fallback.email,
      });
    }
  }

  // ── Réponse typée ─────────────────────────────────────────────────────────
  const body: ConversationApiResponse = {
    conversation,
    participants: participantIds,
    profiles,
    other_user_id: otherParticipantId,
    messages: messages ?? [],
    myParticipation: participation,
    // Signaler au client si le chargement des messages a échoué (erreur Supabase silencieuse).
    // Le client peut ainsi distinguer "conversation vide" de "erreur de chargement".
    messages_fetch_error: messagesError ? messagesError.message : null,
  };

  return NextResponse.json(body);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/messages/conversation/[id]
 * Actions sur la conversation : marquer comme lu, mettre à jour exchange_status.
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

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/messages/conversation/[id]
 * Envoyer un message dans la conversation.
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
    // 3. Profil de l'expéditeur pour le nom affiché dans la notification
    admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  // Envoyer une notification aux autres participants (pas pour les messages système)
  const isSystem = content.startsWith('👋') || content.startsWith('✅') || content.startsWith('🤝');
  if (!isSystem && participantsRes.data && participantsRes.data.length > 0) {
    const rawSender = senderProfileRes.data as { full_name: string | null; email: string | null } | null;
    // Utiliser computeDisplayName pour la notification — cohérent avec le GET
    const senderName = rawSender
      ? computeDisplayName(rawSender.full_name, rawSender.email, 'Quelqu\'un')
      : 'Quelqu\'un';
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

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/messages/conversation/[id]?messageId=xxx
 * Supprimer un message spécifique (l'utilisateur doit en être l'auteur).
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

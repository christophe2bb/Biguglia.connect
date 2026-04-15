/**
 * src/app/api/messages/conversation/[id]/_helpers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers internes de la route GET/PATCH/POST/DELETE conversation/[id].
 *
 * Exports :
 *  computeDisplayName        — full_name → email local → fallback
 *  zodError                  — NextResponse 400 formaté Zod
 *  parseJsonBody             — parse + try/catch du corps JSON
 *  PatchBodySchema           — schéma Zod PATCH (mark_read | update_exchange_status)
 *  PostMessageSchema         — schéma Zod POST (content)
 *  ExchangeStatusValue       — union des valeurs exchange_status valides
 *  verifyParticipant         — vérifie qu'un userId est bien participant
 *  getParticipantIds         — déduplique les IDs participants (avec fallback userId)
 *  fetchAndBuildProfiles     — charge les profils + fallback autre participant
 *  sendNewMessageNotifications — envoie les notifications post-message
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConversationParticipantApi,
  MyParticipationApi,
} from '@/app/(private)/messages/[id]/_types';

// ─── Types internes ───────────────────────────────────────────────────────────

export type RawProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

// ─── Utilitaires purs ─────────────────────────────────────────────────────────

/**
 * Calcule le display_name côté serveur.
 * Règle : full_name non vide → partie locale de l'email → fallback.
 *
 * Dupliqué intentionnellement (ne pas importer lib/utils qui peut avoir
 * des dépendances browser).
 */
export function computeDisplayName(
  full_name: string | null | undefined,
  email: string | null | undefined,
  fallback = 'Utilisateur',
): string {
  if (full_name?.trim()) return full_name.trim();
  if (email?.trim()) {
    const local = email.trim().split('@')[0];
    if (local) return local;
  }
  return fallback;
}

/** Retourne une NextResponse 400 avec le détail Zod formaté. */
export function zodError(err: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Paramètres invalides', details: err.flatten().fieldErrors },
    { status: 400 },
  );
}

/**
 * Parse le corps JSON d'une NextRequest.
 * Retourne `{ ok: true, data }` ou `{ ok: false, response }` en cas d'erreur de parsing.
 */
export async function parseJsonBody(
  req: NextRequest,
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  try {
    const data = await req.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Corps invalide' }, { status: 400 }),
    };
  }
}

// ─── Constantes de projection DB ──────────────────────────────────────────────

/** Colonnes sélectionnées pour la table conversations dans le handler GET. */
export const CONVERSATION_SELECT =
  'id, subject, related_type, related_id, exchange_status, exchange_confirmed_by, exchange_confirmed_at, owner_id, created_by, updated_at' as const;

/** Colonnes sélectionnées pour la table messages dans le handler GET. */
export const MESSAGES_SELECT =
  'id, conversation_id, sender_id, content, created_at' as const;

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const EXCHANGE_STATUS_VALUES = ['pending_confirmation', 'done'] as const;
export type ExchangeStatusValue = (typeof EXCHANGE_STATUS_VALUES)[number];

export const PatchBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('mark_read'),
    lastReadAt: z.string().datetime({ offset: true }).optional(),
  }),
  z.object({
    action: z.literal('update_exchange_status'),
    exchangeStatus: z.enum(EXCHANGE_STATUS_VALUES),
  }),
]);

export const PostMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message vide').max(10_000, 'Message trop long'),
});

// ─── Helpers DB ───────────────────────────────────────────────────────────────

/**
 * Vérifie que `userId` est bien participant de `conversationId`.
 * Retourne la ligne de participation (user_id, last_read_at, joined_at),
 * `null` si l'utilisateur n'est pas participant,
 * ou lève une `Error` en cas d'erreur DB (pour que la route renvoie 500).
 */
export async function verifyParticipant(
  admin: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<MyParticipationApi | null> {
  const { data, error } = await admin
    .from('conversation_participants')
    .select('user_id, last_read_at, joined_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as MyParticipationApi;
}

/**
 * Construit la liste dédupliquée des IDs participants à partir des lignes DB.
 * Garantit que `userId` est toujours présent même si la requête DB a échoué
 * (contournement de la récursion RLS sur conversation_participants).
 */
export function getParticipantIds(
  participantRows: Array<{ user_id: string }> | null,
  userId: string,
): string[] {
  return Array.from(
    new Set([userId, ...(participantRows ?? []).map(p => p.user_id)]),
  );
}

/**
 * Charge les profils des participants et les mappe vers ConversationParticipantApi.
 *
 * Si le profil de `otherParticipantId` est absent de la réponse principale
 * (anomalie rare), tente un fetch direct en fallback.
 */
export async function fetchAndBuildProfiles(
  admin: SupabaseClient,
  participantIds: string[],
  otherParticipantId: string | null,
): Promise<ConversationParticipantApi[]> {
  let rawProfiles: RawProfileRow[] = [];

  if (participantIds.length > 0) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', participantIds);

    if (error) {
      console.error('[api/conversation] profiles error:', error.message);
    }
    rawProfiles = (data ?? []) as RawProfileRow[];
  }

  const profiles: ConversationParticipantApi[] = rawProfiles.map(p => ({
    id: p.id,
    display_name: computeDisplayName(p.full_name, p.email),
    avatar_url: p.avatar_url,
    email: p.email,
  }));

  // Fallback : si l'autre participant n'est pas dans les profils chargés,
  // on tente un fetch direct (profil récemment créé, RLS partielle, etc.)
  if (otherParticipantId && !profiles.find(p => p.id === otherParticipantId)) {
    const { data: fallback } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', otherParticipantId)
      .maybeSingle();

    if (fallback) {
      const fb = fallback as RawProfileRow;
      profiles.push({
        id: fb.id,
        display_name: computeDisplayName(fb.full_name, fb.email),
        avatar_url: fb.avatar_url,
        email: fb.email,
      });
    }
  }

  return profiles;
}

/**
 * Envoie des notifications aux autres participants après l'envoi d'un message.
 * Silencieux en cas d'erreur (on ne bloque pas la réponse POST).
 *
 * Les messages système (démarrant par un emoji spécifique) ne génèrent pas
 * de notification.
 */
export async function sendNewMessageNotifications(
  admin: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string,
): Promise<void> {
  const isSystem =
    content.startsWith('👋') ||
    content.startsWith('✅') ||
    content.startsWith('🤝');
  if (isSystem) return;

  const [participantsRes, senderProfileRes] = await Promise.all([
    admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId),
    admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .maybeSingle(),
  ]);

  if (!participantsRes.data?.length) return;

  const rawSender = senderProfileRes.data as {
    full_name: string | null;
    email: string | null;
  } | null;
  const senderName = computeDisplayName(
    rawSender?.full_name,
    rawSender?.email,
    "Quelqu'un",
  );
  const preview = content.length > 60 ? content.slice(0, 60) + '…' : content;

  const notifications = participantsRes.data.map(
    (p: { user_id: string }) => ({
      user_id: p.user_id,
      type: 'new_message',
      title: `Message de ${senderName}`,
      message: preview,
      link: `/messages/${conversationId}`,
    }),
  );

  await admin
    .from('notifications')
    .insert(notifications)
    .then(({ error }) => {
      if (error) {
        console.warn('[conversation POST] notification insert error:', error.message);
      }
    });
}

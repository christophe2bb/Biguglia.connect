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
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';

// Augmente la limite Vercel à 30 s (défaut : 10 s Hobby / 15 s Pro)
export const maxDuration = 30;

// ── Schémas de validation Zod ─────────────────────────────────────────────────

/**
 * Regex UUID permissive : accepte les UUIDs standards (v1-v8) ainsi que les
 * UUIDs nil (000…) utilisés en tests et certains clients.
 * Zod v4 .uuid() impose version 1-8 ce qui rejette les UUIDs nil de fixtures.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH /api/messages/conversations — marquer une conversation comme lue */
const PatchSchema = z.object({
  conversationId: z
    .string()
    .regex(UUID_REGEX, 'conversationId doit être un UUID valide'),
  lastReadAt: z.string().datetime().optional(),
});

/** DELETE /api/messages/conversations?conversationId=xxx — query param */
const DeleteQuerySchema = z.object({
  conversationId: z
    .string()
    .regex(UUID_REGEX, 'conversationId doit être un UUID valide'),
});

/** Helper : retourne une 400 formatée Zod */
function zodError(err: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Paramètres invalides', details: err.flatten().fieldErrors },
    { status: 400 },
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const userId = await getUserIdBearerFirst(req);
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

  let profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null; email: string | null }> = [];
  if (allUserIds.length > 0) {
    const { data: profileData, error: profileErr } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, email')
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
export async function PATCH(req: NextRequest): Promise<Response> {
  // ── CSRF + Auth (CSRF en premier pour bloquer les requêtes cross-site cookie-only)
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ── Validation Zod du corps ────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide — JSON attendu' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) return zodError(parsed.error);

  const { conversationId, lastReadAt } = parsed.data;

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
 * Quitter une conversation (supprime la participation + messages envoyés par l'utilisateur).
 *
 * SÉCURITÉ : vérifier que l'utilisateur est bien participant avant toute suppression.
 * Sans cette vérification, un userId authentifié pourrait supprimer ses messages
 * dans n'importe quelle conversation en forgeant la requête.
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  // ── CSRF + Auth (CSRF en premier pour bloquer les requêtes cross-site cookie-only)
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // ── Validation Zod du query param ─────────────────────────────────────────
  const queryParsed = DeleteQuerySchema.safeParse({
    conversationId: searchParams.get('conversationId'),
  });
  if (!queryParsed.success) return zodError(queryParsed.error);

  const { conversationId } = queryParsed.data;

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est bien participant à cette conversation
  const { data: participation } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!participation) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Supprimer la participation et les messages de l'utilisateur
  await Promise.all([
    admin.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', userId),
    admin.from('messages').delete().eq('conversation_id', conversationId).eq('sender_id', userId),
  ]);

  return NextResponse.json({ ok: true });
}

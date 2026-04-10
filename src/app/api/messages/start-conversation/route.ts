/**
 * API Route: POST /api/messages/start-conversation
 *
 * Crée ou retrouve une conversation entre deux utilisateurs,
 * avec un message initial optionnel.
 *
 * Remplace les appels directs à conversation_participants / conversations / messages
 * qui échouent à cause de la récursion infinie dans les politiques RLS.
 *
 * Body:
 *   {
 *     ownerId:     string,       // UUID de l'autre participant
 *     subject:     string,       // Sujet de la conversation
 *     relatedType: string | null,// ex: 'listing', 'general', 'community'
 *     relatedId:   string | null,// UUID de l'objet lié (ou null)
 *     initialMsg:  string | null,// Message initial (optionnel)
 *   }
 *
 * Réponse:
 *   { conversationId: string, isNew: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

// ── Schéma de validation ────────────────────────────────────────────────────

/**
 * Valeurs autorisées pour related_type.
 * Union de ContactSourceType + InteractionSourceType + valeurs spéciales.
 * Si une nouvelle source est ajoutée côté client, l'ajouter ici aussi.
 */
const RELATED_TYPES = [
  'listing', 'equipment', 'help_request', 'association',
  'collection_item', 'outing', 'event', 'service_request',
  'lost_found', 'artisan', 'community', 'general',
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const StartConversationSchema = z.object({
  /** UUID du profil destinataire — doit exister en base */
  ownerId: z.string().regex(UUID_REGEX, 'ownerId doit être un UUID valide'),

  /** Sujet de la conversation */
  subject: z
    .string()
    .trim()
    .min(1, 'subject requis')
    .max(200, 'subject trop long (max 200)')
    .optional()
    .default('Conversation'),

  /** Type de contexte métier — whitelist stricte */
  relatedType: z
    .enum(RELATED_TYPES)
    .nullable()
    .optional()
    .default('general'),

  /** UUID de l'objet lié — null si pas de contexte */
  relatedId: z
    .string()
    .regex(UUID_REGEX, 'relatedId doit être un UUID valide')
    .nullable()
    .optional()
    .default(null),

  /** Message d'ouverture facultatif */
  initialMsg: z
    .string()
    .trim()
    .max(5_000, 'initialMsg trop long (max 5000)')
    .nullable()
    .optional()
    .default(null),
});

function zodError(err: z.ZodError) {
  return NextResponse.json(
    { error: 'Paramètres invalides', details: err.flatten().fieldErrors },
    { status: 400 }
  );
}

export async function POST(req: NextRequest) {
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

  const parsed = StartConversationSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);

  const { ownerId, subject, relatedType, relatedId, initialMsg } = parsed.data;

  // Empêcher une conversation avec soi-même
  if (ownerId === userId) {
    return NextResponse.json({ error: 'Impossible de démarrer une conversation avec soi-même' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Vérifier que le destinataire (ownerId) existe réellement dans profiles
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', ownerId)
    .maybeSingle();

  if (!ownerProfile) {
    return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 });
  }

  // relatedId est déjà validé UUID par Zod ou null
  const safeRelatedId = relatedId ?? null;

  // ── 1. Chercher une conversation existante entre les deux utilisateurs ─────
  // Trouver les conversations où les deux participent (userId ET ownerId)
  const [myConvsRes, ownerConvsRes] = await Promise.all([
    admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId),
    admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', ownerId),
  ]);

  const myConvIds = (myConvsRes.data || []).map((p: { conversation_id: string }) => p.conversation_id);
  const ownerConvIds = (ownerConvsRes.data || []).map((p: { conversation_id: string }) => p.conversation_id);
  const sharedIds = myConvIds.filter(id => ownerConvIds.includes(id));

  let existingConvId: string | null = null;

  if (sharedIds.length > 0) {
    // Chercher une conversation existante avec le même contexte
    let existingQuery = admin
      .from('conversations')
      .select('id')
      .in('id', sharedIds)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (safeRelatedId && relatedType) {
      existingQuery = existingQuery
        .eq('related_type', relatedType)
        .eq('related_id', safeRelatedId);
    } else if (relatedType && relatedType !== 'general') {
      existingQuery = existingQuery.eq('related_type', relatedType);
    } else if (subject) {
      existingQuery = existingQuery.eq('subject', subject);
    }

    const { data: existing } = await existingQuery.maybeSingle();
    existingConvId = existing?.id ?? null;

    // Fallback: any shared conversation if specific not found
    if (!existingConvId && sharedIds.length > 0 && !safeRelatedId && !relatedType) {
      const { data: anyConv } = await admin
        .from('conversations')
        .select('id')
        .in('id', sharedIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingConvId = anyConv?.id ?? null;
    }
  }

  if (existingConvId) {
    return NextResponse.json({ conversationId: existingConvId, isNew: false });
  }

  // ── 2. Créer une nouvelle conversation ────────────────────────────────────
  const convPayload: Record<string, unknown> = {
    subject,                              // défaut 'Conversation' appliqué par Zod
    related_type: relatedType ?? 'general',
    updated_at: new Date().toISOString(),
  };
  if (safeRelatedId) {
    convPayload.related_id = safeRelatedId;
  }

  const { data: newConv, error: convError } = await admin
    .from('conversations')
    .insert(convPayload)
    .select('id')
    .single();

  if (convError || !newConv?.id) {
    console.error('[start-conversation] Failed to create conversation:', convError?.message);
    return NextResponse.json({ error: convError?.message || 'Erreur création conversation' }, { status: 500 });
  }

  const convId = newConv.id;

  // ── 3. Ajouter les participants ──────────────────────────────────────────────
  // ownerId !== userId est garanti par le guard en amont
  const participantRows: { conversation_id: string; user_id: string }[] = [
    { conversation_id: convId, user_id: userId },
    { conversation_id: convId, user_id: ownerId },
  ];

  const { error: partError } = await admin
    .from('conversation_participants')
    .upsert(participantRows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });

  if (partError) {
    console.error('[start-conversation] Failed to add participants:', partError.message);
    // Ne pas bloquer — la conversation est créée, les participants sont critiques mais on continue
  }

  // ── 4. Envoyer le message initial ────────────────────────────────────────────
  // initialMsg est déjà trimmé par Zod (.trim()) et null si absent/vide
  if (initialMsg) {
    const { error: msgError } = await admin
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: userId,
        content: initialMsg,
      });

    if (msgError) {
      console.warn('[start-conversation] Failed to send initial message:', msgError.message);
    }

    // Notification pour le destinataire
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const senderName = (senderProfile as { full_name: string | null } | null)?.full_name || 'Quelqu\'un';
    const preview = initialMsg.length > 60 ? initialMsg.slice(0, 60) + '…' : initialMsg;

    // ownerId !== userId garanti en amont
    await admin.from('notifications').insert({
      user_id: ownerId,
      type: 'new_message',
      title: `Message de ${senderName}`,
      message: preview,
      link: `/messages/${convId}`,
    }).then(({ error: ne }) => {
      if (ne) console.warn('[start-conversation] notification error:', ne.message);
    });
  }

  return NextResponse.json({ conversationId: convId, isNew: true });
}

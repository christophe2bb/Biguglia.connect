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
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

function isValidUUID(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    ownerId?: string;
    subject?: string;
    relatedType?: string | null;
    relatedId?: string | null;
    initialMsg?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const { ownerId, subject, relatedType, relatedId, initialMsg } = body;

  if (!ownerId) {
    return NextResponse.json({ error: 'ownerId requis' }, { status: 400 });
  }

  const admin = createAdminClient();
  const safeRelatedId = isValidUUID(relatedId) ? relatedId : null;

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
    subject: subject || 'Conversation',
    related_type: relatedType || 'general',
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
  const participantRows: { conversation_id: string; user_id: string }[] = [
    { conversation_id: convId, user_id: userId },
  ];
  if (ownerId !== userId) {
    participantRows.push({ conversation_id: convId, user_id: ownerId });
  }

  const { error: partError } = await admin
    .from('conversation_participants')
    .upsert(participantRows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });

  if (partError) {
    console.error('[start-conversation] Failed to add participants:', partError.message);
    // Ne pas bloquer — la conversation est créée, les participants sont critiques mais on continue
  }

  // ── 4. Envoyer le message initial ────────────────────────────────────────────
  if (initialMsg?.trim()) {
    const { error: msgError } = await admin
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: userId,
        content: initialMsg.trim(),
      });

    if (msgError) {
      console.warn('[start-conversation] Failed to send initial message:', msgError.message);
    }

    // Notification pour l'autre participant
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const senderName = (senderProfile as { full_name: string | null } | null)?.full_name || 'Quelqu\'un';
    const preview = initialMsg.length > 60 ? initialMsg.slice(0, 60) + '…' : initialMsg;

    if (ownerId !== userId) {
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
  }

  return NextResponse.json({ conversationId: convId, isNew: true });
}

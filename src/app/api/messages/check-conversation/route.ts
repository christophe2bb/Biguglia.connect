/**
 * API Route: GET /api/messages/check-conversation
 *
 * Vérifie si une conversation liée à un objet (related_type + related_id)
 * existe entre l'utilisateur courant et l'auteur/propriétaire.
 *
 * Utilisé par RatingWidget (éligibilité à noter) et ExchangePrompt
 * pour contourner la récursion infinie dans les RLS de conversation_participants.
 *
 * Query params:
 *   relatedType  — ex: 'listing', 'equipment', 'help_request', etc.
 *   relatedId    — UUID de l'objet lié
 *
 * Réponse:
 *   {
 *     conversationId: string | null,
 *     exchangeStatus: string | null,   // 'done' | 'pending_confirmation' | null
 *   }
 *
 * Authentification : Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export async function GET(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get('relatedType');
  const relatedId = searchParams.get('relatedId');

  if (!relatedType || !relatedId) {
    return NextResponse.json({ error: 'relatedType et relatedId requis' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Trouver les conversations de l'utilisateur
  const { data: myParts, error: partsError } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (partsError) {
    return NextResponse.json({ error: partsError.message }, { status: 500 });
  }

  if (!myParts || myParts.length === 0) {
    return NextResponse.json({ conversationId: null, exchangeStatus: null });
  }

  const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);

  // 2. Trouver la conversation liée à cet objet parmi les conversations de l'utilisateur
  const { data: conv, error: convError } = await admin
    .from('conversations')
    .select('id, exchange_status')
    .eq('related_type', relatedType)
    .eq('related_id', relatedId)
    .in('id', myConvIds)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  return NextResponse.json({
    conversationId: conv?.id ?? null,
    exchangeStatus: conv?.exchange_status ?? null,
  });
}

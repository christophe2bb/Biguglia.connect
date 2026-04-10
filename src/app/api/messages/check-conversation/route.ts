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
 *   relatedType  — whitelist de 12 valeurs (ContactSourceType + InteractionSourceType)
 *   relatedId    — UUID de l'objet lié
 *
 * Réponse:
 *   {
 *     conversationId: string | null,
 *     exchangeStatus: 'done' | 'pending_confirmation' | null,
 *   }
 *
 * Authentification : Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

// ── Validation des query params ───────────────────────────────────────────────
const RELATED_TYPES = [
  'listing', 'equipment', 'help_request', 'association',
  'collection_item', 'outing', 'event', 'service_request',
  'lost_found', 'artisan', 'community', 'general',
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QuerySchema = z.object({
  relatedType: z.enum(RELATED_TYPES),
  relatedId:   z.string().regex(UUID_REGEX, 'relatedId doit être un UUID valide'),
});

export async function GET(req: NextRequest) {
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    relatedType: searchParams.get('relatedType'),
    relatedId:   searchParams.get('relatedId'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { relatedType, relatedId } = parsed.data;

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

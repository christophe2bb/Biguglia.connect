export const dynamic = 'force-dynamic';
export const maxDuration = 30;
/**
 * API Route — GET /api/admin/users/[id]/activity
 *
 * Retourne le contenu détaillé d'un utilisateur pour le panneau admin :
 *   • messages     : derniers messages envoyés (conversations)
 *   • listings     : annonces publiées
 *   • forum_posts  : sujets forum créés
 *   • service_requests : demandes de service
 *
 * SÉCURITÉ :
 *   • getAdminUser() → session + role admin/moderator
 *   • adminClient (service role) bypasse la RLS
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  const { id: userId } = await params;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const [
    { data: messages },
    { data: listings },
    { data: forumPosts },
    { data: requests },
  ] = await Promise.all([
    // Messages : on passe par conversations où l'utilisateur est participant
    adminClient
      .from('messages')
      .select('id, content, created_at, conversation_id')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Annonces
    adminClient
      .from('listings')
      .select('id, title, status, listing_type, price, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Forum
    adminClient
      .from('forum_posts')
      .select('id, title, content, is_closed, views, created_at, category:forum_categories(name, icon)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Demandes de service
    adminClient
      .from('service_requests')
      .select('id, title, status, urgency, created_at, category:trade_categories(name, icon)')
      .eq('resident_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    messages:      messages      ?? [],
    listings:      listings      ?? [],
    forum_posts:   forumPosts    ?? [],
    service_requests: requests   ?? [],
  });
}

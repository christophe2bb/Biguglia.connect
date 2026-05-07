export const dynamic = 'force-dynamic';
export const maxDuration = 30;
/**
 * API Route — GET /api/admin/users/[id]/activity
 *
 * Retourne l'activité COMPLÈTE d'un utilisateur pour la fiche modérateur :
 *   • messages          — derniers messages envoyés
 *   • listings          — annonces publiées
 *   • forum_posts       — sujets forum créés
 *   • service_requests  — demandes de service artisan
 *   • help_requests     — coups de main (demande/offre)
 *   • lost_found        — objets perdus / trouvés
 *   • events            — événements créés
 *   • group_outings     — sorties groupées créées
 *   • equipment_items   — matériel mis en prêt
 *   • promenades        — promenades publiées
 *   • reviews           — avis laissés sur des artisans
 *   • reports_sent      — signalements émis par l'utilisateur
 *   • job_offers        — offres d'emploi publiées
 *   • job_demands       — demandes d'emploi publiées
 *   • notifications     — 10 dernières notifications reçues
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
    { data: helpRequests },
    { data: lostFound },
    { data: events },
    { data: outings },
    { data: equipment },
    { data: promenades },
    { data: reviews },
    { data: reportsSent },
    { data: jobOffers },
    { data: jobDemands },
    { data: notifications },
  ] = await Promise.all([

    // ── Messages envoyés ──────────────────────────────────────────────────────
    adminClient
      .from('messages')
      .select('id, content, created_at, conversation_id')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    // ── Annonces ──────────────────────────────────────────────────────────────
    adminClient
      .from('listings')
      .select('id, title, status, listing_type, price, created_at, cover_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    // ── Forum — sujets créés ──────────────────────────────────────────────────
    adminClient
      .from('forum_posts')
      .select('id, title, is_closed, views, created_at, category:forum_categories(name, icon)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    // ── Demandes de service artisan ───────────────────────────────────────────
    adminClient
      .from('service_requests')
      .select('id, title, status, urgency, created_at, category:trade_categories(name, icon)')
      .eq('resident_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Coups de main ─────────────────────────────────────────────────────────
    adminClient
      .from('help_requests')
      .select('id, title, category, help_type, status, urgency, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Objets perdus / trouvés ───────────────────────────────────────────────
    adminClient
      .from('lost_found_items')
      .select('id, title, type, category, status, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Événements créés ──────────────────────────────────────────────────────
    adminClient
      .from('events')
      .select('id, title, status, start_date, location, created_at')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Sorties groupées créées ───────────────────────────────────────────────
    adminClient
      .from('group_outings')
      .select('id, title, status, outing_date, location, max_participants, created_at')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Matériel mis en prêt ──────────────────────────────────────────────────
    adminClient
      .from('equipment_items')
      .select('id, title, status, category, deposit_amount, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Promenades publiées ───────────────────────────────────────────────────
    adminClient
      .from('promenades')
      .select('id, title, type, difficulty, distance_km, status, views, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Avis laissés sur des artisans ─────────────────────────────────────────
    adminClient
      .from('reviews')
      .select('id, rating, comment, created_at, artisan:artisan_profiles(business_name)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Signalements émis ─────────────────────────────────────────────────────
    adminClient
      .from('reports')
      .select('id, target_type, target_id, reason, status, created_at')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // ── Offres d'emploi ───────────────────────────────────────────────────────
    adminClient
      .from('job_offers')
      .select('id, title, status, contract_type, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // ── Demandes d'emploi ─────────────────────────────────────────────────────
    adminClient
      .from('job_demands')
      .select('id, title, status, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // ── Notifications reçues (10 dernières) ───────────────────────────────────
    adminClient
      .from('notifications')
      .select('id, type, title, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    messages:         messages         ?? [],
    listings:         listings         ?? [],
    forum_posts:      forumPosts       ?? [],
    service_requests: requests         ?? [],
    help_requests:    helpRequests     ?? [],
    lost_found:       lostFound        ?? [],
    events:           events           ?? [],
    group_outings:    outings          ?? [],
    equipment_items:  equipment        ?? [],
    promenades:       promenades       ?? [],
    reviews:          reviews          ?? [],
    reports_sent:     reportsSent      ?? [],
    job_offers:       jobOffers        ?? [],
    job_demands:      jobDemands       ?? [],
    notifications:    notifications    ?? [],
  });
}

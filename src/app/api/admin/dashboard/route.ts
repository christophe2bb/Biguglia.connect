/**
 * API Route — GET /api/admin/dashboard
 *
 * Retourne les compteurs de synthèse pour le tableau de bord admin.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 *   • Avant ce correctif, admin/page.tsx appelait directement createClient()
 *     côté navigateur pour récupérer les compteurs via des requêtes SELECT count.
 *     Cela exposait potentiellement des données agrégées sensibles
 *     (ex: total messages, files de modération) à toute personne
 *     capable de rejouer la requête anon avec un rôle suffisant.
 *
 * Réponse : { stats: AdminDashboardStats }
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { captureApiError } from '@/lib/monitoring/sentry';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total_users: number;
  pending_artisans: number;
  verified_artisans: number;
  total_listings: number;
  total_forum_posts: number;
  pending_reports: number;
  total_equipment: number;
  total_messages: number;
  pending_moderation: number;
}

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth + rôle admin/modérateur côté serveur
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient, actor } = guard;

  try {
    // ── Requêtes COUNT parallèles (service role — bypass RLS) ───────────────
    const [
      { count: totalUsers },
      { count: pendingArtCount },
      { count: verifiedArtCount },
      { count: totalListings },
      { count: totalPosts },
      { count: pendingReports },
      { count: totalEquip },
      { count: totalMsgs },
      { count: pendingMod },
    ] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_pending'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
      adminClient.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('forum_posts').select('*', { count: 'exact', head: true }),
      adminClient.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      adminClient.from('equipment_items').select('*', { count: 'exact', head: true }).eq('is_available', true),
      adminClient.from('messages').select('*', { count: 'exact', head: true }),
      adminClient.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'en_attente_validation'),
    ]);

    const stats: AdminDashboardStats = {
      total_users:        totalUsers        ?? 0,
      pending_artisans:   pendingArtCount   ?? 0,
      verified_artisans:  verifiedArtCount  ?? 0,
      total_listings:     totalListings     ?? 0,
      total_forum_posts:  totalPosts        ?? 0,
      pending_reports:    pendingReports    ?? 0,
      total_equipment:    totalEquip        ?? 0,
      total_messages:     totalMsgs         ?? 0,
      pending_moderation: pendingMod        ?? 0,
    };

    return NextResponse.json({ stats });
  } catch (err) {
    captureApiError(err, {
      route:  '/api/admin/dashboard',
      method: 'GET',
      userId: actor.id,
      userRole: actor.role,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

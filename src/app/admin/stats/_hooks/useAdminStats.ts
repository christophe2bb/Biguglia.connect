'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { getLast30Days, countByDay, topWords, COLORS } from '../_helpers';
import type { AllStats } from '../_types';

export function useAdminStats() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();

  const [stats,       setStats]       = useState<AllStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAllStats = useCallback(async () => {
    if (!profile)   { router.push('/connexion'); return; }
    if (!isAdmin())  { router.push('/');          return; }

    setLoading(true);
    const supabase = createClient();
    const days   = getLast30Days();
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);
    const since7  = new Date(); since7.setDate(since7.getDate() - 7);

    // ── Requêtes parallèles ──────────────────────────────────────────────────
    const [
      { data: allProfiles },
      { data: allMessages },
      { data: allConversations },
      { data: allListings },
      { data: allPosts },
      { data: allComments },
      { data: allRequests },
      { data: allReviews },
      { data: allEquipment },
      { data: allBorrows },
      { data: allReports },
      { data: allNotifications },
      { data: artisanProfiles },
    ] = await Promise.all([
      supabase.from('profiles').select('id, role, created_at').order('created_at'),
      supabase.from('messages').select('id, created_at').order('created_at'),
      supabase.from('conversations').select('id, created_at'),
      supabase.from('listings').select('id, status, views_count, created_at, category:listing_categories(name)').order('created_at'),
      supabase.from('forum_posts').select('id, title, status, created_at, category:forum_categories(name)').order('created_at'),
      supabase.from('forum_comments').select('id, created_at').order('created_at'),
      supabase.from('service_requests').select('id, status, created_at').order('created_at'),
      supabase.from('reviews').select('id, rating, created_at'),
      supabase.from('equipment_items').select('id, is_available, created_at'),
      supabase.from('equipment_loans').select('id, created_at').order('created_at'),
      supabase.from('reports').select('id, status, created_at'),
      supabase.from('notifications').select('id, is_read, created_at'),
      supabase.from('artisan_profiles').select('id, artisan_type, trade_category_id, trade_category:trade_categories(name, icon)'),
    ]);

    // ── Utilisateurs ────────────────────────────────────────────────────────
    const profiles        = allProfiles || [];
    const totalUsers      = profiles.filter(p => p.role !== 'admin').length;
    const residents       = profiles.filter(p => p.role === 'resident').length;
    const artisansPending = profiles.filter(p => p.role === 'artisan_pending').length;
    const artisansVerified = profiles.filter(p => p.role === 'artisan_verified').length;
    const newUsersLast7   = profiles.filter(p => new Date(p.created_at) >= since7).length;
    const newUsersLast30  = profiles.filter(p => new Date(p.created_at) >= since30).length;
    const artisansPro     = (artisanProfiles || []).filter(a => a.artisan_type === 'professionnel').length;
    const artisansParticulier = (artisanProfiles || []).filter(a => a.artisan_type === 'particulier').length;

    // ── Messages ────────────────────────────────────────────────────────────
    const msgs             = allMessages || [];
    const totalMessages    = msgs.length;
    const totalConversations = (allConversations || []).length;

    // ── Annonces ────────────────────────────────────────────────────────────
    const listings       = allListings || [];
    const totalListings  = listings.length;
    const activeListings = listings.filter(l => l.status === 'active').length;
    const listingViews   = listings.reduce((s, l) => s + (l.views_count || 0), 0);

    const listingCatMap: Record<string, number> = {};
    listings.forEach(l => {
      const cat = (l.category as unknown as { name: string })?.name || 'Autre';
      listingCatMap[cat] = (listingCatMap[cat] || 0) + 1;
    });
    const listingCategories = Object.entries(listingCatMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // ── Forum ────────────────────────────────────────────────────────────────
    const posts        = allPosts || [];
    const totalPosts   = posts.length;
    const totalComments = (allComments || []).length;
    const closedPosts  = posts.filter(p => p.status === 'closed').length;

    const forumCatMap: Record<string, number> = {};
    posts.forEach(p => {
      const cat = (p.category as unknown as { name: string })?.name || 'Autre';
      forumCatMap[cat] = (forumCatMap[cat] || 0) + 1;
    });
    const forumCategories = Object.entries(forumCatMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    const topForumWords = topWords(posts.map(p => p.title || ''));

    // ── Demandes artisans ────────────────────────────────────────────────────
    const reqs         = allRequests || [];
    const totalRequests = reqs.length;
    const statusLabels: Record<string, string> = {
      submitted: 'Soumises', viewed: 'Vues', replied: 'Répondues',
      scheduled: 'Planifiées', completed: 'Terminées', cancelled: 'Annulées',
    };
    const reqStatusMap: Record<string, number> = {};
    reqs.forEach(r => {
      const k = statusLabels[r.status] || r.status;
      reqStatusMap[k] = (reqStatusMap[k] || 0) + 1;
    });
    const requestsByStatus = Object.entries(reqStatusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ── Avis ────────────────────────────────────────────────────────────────
    const reviews     = allReviews || [];
    const totalReviews = reviews.length;
    const avgRating   = totalReviews
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    // ── Matériel ─────────────────────────────────────────────────────────────
    const equip            = allEquipment || [];
    const totalEquipment   = equip.length;
    const availableEquipment = equip.filter(e => e.is_available).length;
    const totalBorrows     = (allBorrows || []).length;

    // ── Signalements ─────────────────────────────────────────────────────────
    const reports       = allReports || [];
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const totalReports  = reports.length;

    // ── Notifications ─────────────────────────────────────────────────────────
    const notifs             = allNotifications || [];
    const totalNotifications = notifs.length;
    const unreadNotifications = notifs.filter(n => !n.is_read).length;

    // ── Séries temporelles 30j ────────────────────────────────────────────────
    const dailyUsers    = countByDay(profiles.filter(p => new Date(p.created_at) >= since30), days);
    const dailyMessages = countByDay(msgs.filter(m => new Date(m.created_at) >= since30), days);
    const dailyPosts    = countByDay(posts.filter(p => new Date(p.created_at) >= since30), days);
    const dailyListings = countByDay(listings.filter(l => new Date(l.created_at) >= since30), days);

    // ── Répartition rôles ─────────────────────────────────────────────────────
    const roleDistribution = [
      { name: 'Habitants',           value: residents,       color: COLORS.blue  },
      { name: 'Artisans vérifiés',   value: artisansVerified, color: COLORS.green },
      { name: 'Artisans en attente', value: artisansPending,  color: COLORS.amber },
    ].filter(r => r.value > 0);

    // ── Catégories artisans ───────────────────────────────────────────────────
    const tradeCatMap: Record<string, number> = {};
    (artisanProfiles || []).forEach(a => {
      const cat = (a.trade_category as unknown as { name: string })?.name || 'Autre';
      tradeCatMap[cat] = (tradeCatMap[cat] || 0) + 1;
    });
    const tradeCategories = Object.entries(tradeCatMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ── Activité par heure (messages des 30 derniers jours) ──────────────────
    const hourMap: Record<number, { messages: number; posts: number }> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
    msgs.filter(m => new Date(m.created_at) >= since30).forEach(m => {
      hourMap[new Date(m.created_at).getHours()].messages++;
    });
    posts.filter(p => new Date(p.created_at) >= since30).forEach(p => {
      hourMap[new Date(p.created_at).getHours()].posts++;
    });
    const activityByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      messages: hourMap[h].messages,
      posts:    hourMap[h].posts,
    }));

    setStats({
      totalUsers, residents, artisansPending, artisansVerified,
      artisansPro, artisansParticulier, newUsersLast7, newUsersLast30,
      totalMessages, totalConversations,
      totalListings, activeListings, listingViews,
      totalPosts, totalComments, closedPosts,
      totalRequests, requestsByStatus,
      totalReviews, avgRating,
      totalEquipment, availableEquipment, totalBorrows,
      pendingReports, totalReports,
      totalNotifications, unreadNotifications,
      dailyUsers, dailyMessages, dailyPosts, dailyListings,
      roleDistribution, listingCategories, forumCategories, tradeCategories,
      topForumWords, activityByHour,
    });
    setLastRefresh(new Date());
    setLoading(false);
  }, [profile, isAdmin, router]);

  return { stats, loading, lastRefresh, fetchAllStats };
}

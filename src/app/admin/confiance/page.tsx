'use client';

/**
 * /admin/confiance — Tableau de bord admin du système de confiance
 *
 * Fonctions :
 *  – Modération des avis signalés
 *  – Vue des membres à risque (score bas, litiges)
 *  – Attribution manuelle de badges
 *  – Statistiques par thème
 *  – Recalcul des scores
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Star, AlertTriangle, Users, BarChart3,
  Flag, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft,
  Loader2, RefreshCw, Award, Tag, ChevronRight,
  ThumbsUp, TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatRelative } from '@/lib/utils';
import { THEME_CONFIG, BADGE_CONFIG, type BadgeCode, type InteractionSourceType } from '@/lib/trust';
import Avatar from '@/components/ui/Avatar';
import { BadgePill } from '@/components/ui/TrustScore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminReview {
  id: string;
  source_type: string;
  rating: number;
  comment?: string | null;
  would_recommend?: boolean | null;
  moderation_status: string;
  created_at: string;
  author: { id: string; full_name: string; avatar_url?: string | null } | null;
  target_user: { id: string; full_name: string; avatar_url?: string | null } | null;
  review_tags: Array<{ tag: string }>;
}

interface RiskMember {
  profile_id: string;
  trust_score: number;
  reviews_received: number;
  avg_rating: number;
  interactions_disputed: number;
  profile?: { full_name: string; avatar_url?: string | null; role: string };
}

interface ThemeStats {
  source_type: string;
  count: number;
  avg_rating: number;
  total_reviews: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminConfiancePage() {
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<'reported' | 'risk' | 'badges' | 'stats'>('reported');
  const [loading, setLoading] = useState(true);
  const [reportedReviews, setReportedReviews] = useState<AdminReview[]>([]);
  const [riskMembers, setRiskMembers] = useState<RiskMember[]>([]);
  const [themeStats, setThemeStats] = useState<ThemeStats[]>([]);
  const [moderating, setModerating] = useState<string | null>(null);

  // Badge award state
  const [badgeTarget, setBadgeTarget] = useState('');
  const [badgeCode, setBadgeCode] = useState<BadgeCode>('admin_validated');
  const [awardingBadge, setAwardingBadge] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: reviewsData },
      { data: riskData },
      { data: statsData },
    ] = await Promise.all([
      // Reported or all visible reviews
      supabase.from('reviews')
        .select(`
          id, source_type, rating, comment, would_recommend, moderation_status, created_at,
          author:profiles!reviews_author_id_fkey(id, full_name, avatar_url),
          target_user:profiles!reviews_target_user_id_fkey(id, full_name, avatar_url),
          review_tags(tag)
        `)
        .in('moderation_status', ['reported', 'visible'])
        .order('created_at', { ascending: false })
        .limit(50),

      // Risk members (low score, disputes)
      supabase.from('trust_profile_stats')
        .select('profile_id, trust_score, reviews_received, avg_rating, interactions_disputed')
        .or('trust_score.lt.20,interactions_disputed.gt.0')
        .order('trust_score', { ascending: true })
        .limit(20),

      // Theme stats
      supabase.from('reviews')
        .select('source_type, rating')
        .eq('moderation_status', 'visible'),
    ]);

    setReportedReviews((reviewsData || []) as unknown as AdminReview[]);

    // Enrich risk members with profiles
    const enrichedRisk = await Promise.all(
      (riskData || []).map(async (row: Record<string, unknown>) => {
        const { data: p } = await supabase
          .from('profiles').select('full_name, avatar_url, role').eq('id', row.profile_id as string).maybeSingle();
        return { ...row, profile: p } as RiskMember;
      })
    );
    setRiskMembers(enrichedRisk);

    // Aggregate theme stats
    const grouped: Record<string, { count: number; totalRating: number }> = {};
    (statsData || []).forEach((r: Record<string, unknown>) => {
      const t = r.source_type as string;
      if (!grouped[t]) grouped[t] = { count: 0, totalRating: 0 };
      grouped[t].count++;
      grouped[t].totalRating += r.rating as number;
    });
    setThemeStats(
      Object.entries(grouped).map(([source_type, { count, totalRating }]) => ({
        source_type,
        count,
        avg_rating: count > 0 ? totalRating / count : 0,
        total_reviews: count,
      })).sort((a, b) => b.total_reviews - a.total_reviews)
    );

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderateReview = async (reviewId: string, action: 'visible' | 'hidden' | 'deleted') => {
    setModerating(reviewId);
    const supabase = createClient();
    const { error } = await supabase.from('reviews').update({
      moderation_status: action,
      moderated_by: profile?.id,
      moderated_at: new Date().toISOString(),
    }).eq('id', reviewId);

    if (error) {
      toast.error('Erreur lors de la modération');
    } else {
      toast.success(action === 'visible' ? 'Avis restauré' : action === 'hidden' ? 'Avis masqué' : 'Avis supprimé');
      setReportedReviews(prev => prev.filter(r => r.id !== reviewId));
    }
    setModerating(null);
  };

  const awardBadge = async () => {
    if (!badgeTarget.trim()) { toast.error('ID utilisateur requis'); return; }
    setAwardingBadge(true);
    const supabase = createClient();
    const { error } = await supabase.from('profile_badges').upsert({
      profile_id: badgeTarget.trim(),
      badge_code: badgeCode,
      awarded_by: 'admin',
    }, { onConflict: 'profile_id,badge_code', ignoreDuplicates: true });

    if (error) toast.error('Erreur: ' + error.message);
    else { toast.success('Badge attribué !'); setBadgeTarget(''); }
    setAwardingBadge(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-500">Cette page est réservée aux administrateurs.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700">
            <ArrowLeft className="w-4 h-4" /> Tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const reportedOnly = reportedReviews.filter(r => r.moderation_status === 'reported');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-black text-gray-900">Confiance & Réputation</h1>
              <p className="text-xs text-gray-500">Modération des avis, membres à risque, badges</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="Actualiser">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'reported', label: `Avis signalés${reportedOnly.length ? ` (${reportedOnly.length})` : ''}`, icon: Flag, urgent: reportedOnly.length > 0 },
              { id: 'risk',     label: `Membres à risque${riskMembers.length ? ` (${riskMembers.length})` : ''}`, icon: AlertTriangle },
              { id: 'badges',   label: 'Attribuer badges', icon: Award },
              { id: 'stats',    label: 'Statistiques',     icon: BarChart3 },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                    tab === t.id
                      ? t.urgent ? 'bg-red-50 text-red-700 border-red-300' : 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            {/* ── Reported reviews ─────────────────────────────────────────── */}
            {tab === 'reported' && (
              <div className="space-y-4">
                {reportedOnly.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="font-bold text-gray-700">Aucun avis signalé</p>
                    <p className="text-sm text-gray-500 mt-1">Tous les avis ont été modérés.</p>
                  </div>
                ) : (
                  reportedOnly.map(review => {
                    const cfg = THEME_CONFIG[review.source_type as InteractionSourceType];
                    return (
                      <div key={review.id} className="bg-white border-2 border-orange-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar src={review.author?.avatar_url} name={review.author?.full_name || '?'} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-bold text-gray-900">{review.author?.full_name || 'Anonyme'}</span>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-sm font-bold text-gray-700">{review.target_user?.full_name || '?'}</span>
                              <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Flag className="w-2.5 h-2.5" /> Signalé
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">
                                {cfg?.emoji} {cfg?.label || review.source_type}
                              </span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg p-2">"{review.comment}"</p>
                            )}
                            {review.review_tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {review.review_tags.map(t => (
                                  <span key={t.tag} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Tag className="w-2.5 h-2.5" /> {t.tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Moderation actions */}
                        <div className="flex gap-2 border-t border-gray-100 pt-3">
                          <button
                            onClick={() => moderateReview(review.id, 'visible')}
                            disabled={moderating === review.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {moderating === review.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            Restaurer
                          </button>
                          <button
                            onClick={() => moderateReview(review.id, 'hidden')}
                            disabled={moderating === review.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" /> Masquer
                          </button>
                          <button
                            onClick={() => moderateReview(review.id, 'deleted')}
                            disabled={moderating === review.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Supprimer
                          </button>
                          <Link
                            href={`/profil/${review.target_user?.id}`}
                            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Voir profil <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Risk members ──────────────────────────────────────────────── */}
            {tab === 'risk' && (
              <div className="space-y-3">
                {riskMembers.length === 0 ? (
                  <div className="text-center py-16">
                    <Shield className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="font-bold text-gray-700">Aucun membre à risque détecté</p>
                    <p className="text-sm text-gray-500 mt-1">Tous les membres ont un score de confiance acceptable.</p>
                  </div>
                ) : (
                  riskMembers.map(member => (
                    <div key={member.profile_id} className="bg-white border border-orange-200 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={member.profile?.avatar_url} name={member.profile?.full_name || '?'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{member.profile?.full_name || 'Membre'}</span>
                            <span className={cn(
                              'text-[10px] font-black px-1.5 py-0.5 rounded',
                              member.trust_score < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700',
                            )}>
                              Score: {member.trust_score}/100
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" /> {member.avg_rating.toFixed(1)}/5</span>
                            <span>{member.reviews_received} avis</span>
                            {member.interactions_disputed > 0 && (
                              <span className="flex items-center gap-0.5 text-red-600 font-bold">
                                <AlertTriangle className="w-3 h-3" /> {member.interactions_disputed} litige(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/profil/${member.profile_id}`}
                          className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                        >
                          Voir <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Award badges ──────────────────────────────────────────────── */}
            {tab === 'badges' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" /> Attribuer un badge manuellement
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ID utilisateur (UUID)</label>
                      <input
                        type="text"
                        value={badgeTarget}
                        onChange={e => setBadgeTarget(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Badge</label>
                      <select
                        value={badgeCode}
                        onChange={e => setBadgeCode(e.target.value as BadgeCode)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {Object.entries(BADGE_CONFIG).map(([code, cfg]) => (
                          <option key={code} value={code}>{cfg.emoji} {cfg.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={awardBadge}
                      disabled={awardingBadge || !badgeTarget.trim()}
                      className="flex items-center gap-2 bg-brand-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {awardingBadge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      Attribuer le badge
                    </button>
                  </div>
                </div>

                {/* Badge catalog */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Catalogue des badges</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Object.entries(BADGE_CONFIG).map(([code, cfg]) => (
                      <div key={code} className={cn('flex items-start gap-2.5 p-3 rounded-xl border', cfg.bg, 'border-current/10')}>
                        <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
                        <div>
                          <p className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{cfg.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Stats by theme ────────────────────────────────────────────── */}
            {tab === 'stats' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Avis total', value: themeStats.reduce((s, t) => s + t.total_reviews, 0), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Thèmes actifs', value: themeStats.length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Membres à risque', value: riskMembers.length, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className={cn('rounded-2xl p-4 border border-current/10', s.bg)}>
                        <Icon className={cn('w-6 h-6 mb-2', s.color)} />
                        <div className={cn('text-3xl font-black', s.color)}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand-500" /> Avis par thème
                  </h3>
                  <div className="space-y-3">
                    {themeStats.map(stat => {
                      const cfg = THEME_CONFIG[stat.source_type as InteractionSourceType];
                      const maxCount = Math.max(...themeStats.map(s => s.total_reviews), 1);
                      return (
                        <div key={stat.source_type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-700">
                              {cfg?.emoji || '•'} {cfg?.label || stat.source_type}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={cn('w-3 h-3', s <= Math.round(stat.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500 font-semibold w-8 text-right">{stat.total_reviews}</span>
                            </div>
                          </div>
                          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full transition-all duration-700"
                              style={{ width: `${(stat.total_reviews / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All visible reviews (last 20) */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" /> Derniers avis publiés
                  </h3>
                  <div className="space-y-3">
                    {reportedReviews.filter(r => r.moderation_status === 'visible').slice(0, 10).map(review => {
                      const cfg = THEME_CONFIG[review.source_type as InteractionSourceType];
                      return (
                        <div key={review.id} className="border border-gray-100 rounded-xl p-3 flex items-start gap-2">
                          <Avatar src={review.author?.avatar_url} name={review.author?.full_name || '?'} size="xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-800">{review.author?.full_name}</span>
                              <span className="text-[10px] text-gray-400">→</span>
                              <span className="text-xs font-semibold text-gray-700">{review.target_user?.full_name}</span>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cfg?.emoji} {cfg?.label}</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={cn('w-3 h-3', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">"{review.comment}"</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => moderateReview(review.id, 'hidden')}
                              className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Masquer"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moderateReview(review.id, 'deleted')}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

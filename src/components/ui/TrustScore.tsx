'use client';

/**
 * TrustScore — Composants d'affichage du score de confiance unifié
 *
 * Variantes :
 *   – <TrustScoreMini>   badge compact (profil, cartes, listings)
 *   – <TrustScoreCard>   carte détaillée (page profil)
 *   – <TrustScoreFull>   vue complète avec avis (page profil publique)
 *   – <BadgePill>        badge individuel
 *   – <ReviewsList>      liste des avis reçus
 */

import { useState, useEffect } from 'react';
import {
  Star, Shield, ChevronDown, ChevronUp, ThumbsUp,
  MessageSquare, Tag,
} from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import {
  computeUnifiedTrustScore,
  fetchTrustStats,
  fetchProfileBadges,
  fetchPublicReviews,
  BADGE_CONFIG,
  type TrustProfileStats,
  type BadgeCode,
  type Review,
} from '@/lib/trust';
import Avatar from '@/components/ui/Avatar';

// ─── BadgePill ────────────────────────────────────────────────────────────────
export function BadgePill({ code, size = 'sm' }: { code: BadgeCode; size?: 'sm' | 'md' }) {
  const cfg = BADGE_CONFIG[code];
  if (!cfg) return null;
  return (
    <span
      title={cfg.description}
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        cfg.bg, cfg.color, 'border-current/20',
        size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5',
      )}
    >
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

// ─── TrustScoreMini ───────────────────────────────────────────────────────────
interface TrustProfile {
  id: string;
  created_at: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
}

interface TrustScoreMiniProps {
  profile: TrustProfile;
  stats?: TrustProfileStats | null;
  badges?: BadgeCode[];
  className?: string;
}

export function TrustScoreMini({ profile, stats, badges, className }: TrustScoreMiniProps) {
  const trust = computeUnifiedTrustScore({ ...profile, stats, badges });

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
      trust.bg, trust.color,
      className,
    )}>
      <span>{trust.emoji}</span>
      <span>{trust.label}</span>
      {stats && stats.avg_rating > 0 && (
        <>
          <span className="opacity-40">·</span>
          <Star className="w-3 h-3 fill-current" />
          <span>{stats.avg_rating.toFixed(1)}</span>
        </>
      )}
    </span>
  );
}

// ─── TrustScoreCard ───────────────────────────────────────────────────────────
interface TrustScoreCardProps {
  profile: TrustProfile;
  stats?: TrustProfileStats | null;
  badges?: BadgeCode[];
  showDetails?: boolean;
}

export function TrustScoreCard({ profile, stats, badges, showDetails = false }: TrustScoreCardProps) {
  const [open, setOpen] = useState(showDetails);
  const trust = computeUnifiedTrustScore({ ...profile, stats, badges });

  const strokeColor: Record<string, string> = {
    de_confiance: '#7c3aed',
    fiable: '#10b981',
    nouveau: '#9ca3af',
    surveille: '#f97316',
  };

  return (
    <div className={cn('rounded-2xl border p-4', trust.bg, 'border-current/10')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Circular score */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={strokeColor[trust.level] || '#9ca3af'}
                strokeWidth="3"
                strokeDasharray={`${trust.score} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn('absolute inset-0 flex items-center justify-center text-sm font-black', trust.color)}>
              {trust.score}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{trust.emoji}</span>
              <p className={cn('text-sm font-black', trust.color)}>{trust.label}</p>
            </div>
            <p className="text-xs text-gray-500">Score de confiance /100</p>
            {stats && stats.reviews_received > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-600">{stats.avg_rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({stats.reviews_received} avis)</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 transition-colors"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Badges */}
      {trust.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {trust.badges.slice(0, 4).map(b => (
            <BadgePill key={b} code={b} />
          ))}
          {trust.badges.length > 4 && (
            <span className="text-[10px] text-gray-400 px-2 py-0.5">+{trust.badges.length - 4} autres</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {open && (
        <div className="mt-4 space-y-3 border-t border-current/10 pt-4">
          {/* Score breakdown */}
          <div className="space-y-2">
            {trust.details.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0">{d.label}</span>
                <div className="flex-1 bg-black/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-current rounded-full transition-all"
                    style={{ width: `${(d.value / d.max) * 100}%`, color: strokeColor[trust.level] || '#9ca3af' }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 w-8 text-right">{d.value}/{d.max}</span>
              </div>
            ))}
          </div>

          {/* All badges */}
          {trust.badges.length > 4 && (
            <div className="flex flex-wrap gap-1.5">
              {trust.badges.map(b => <BadgePill key={b} code={b} />)}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Échanges', value: stats.interactions_done },
                { label: 'Avis reçus', value: stats.reviews_received },
                { label: 'Recommandés', value: stats.recommend_pct != null ? `${stats.recommend_pct}%` : '—' },
              ].map(s => (
                <div key={s.label} className="bg-white/60 rounded-xl p-2">
                  <p className="text-base font-black text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RatingDistribution ───────────────────────────────────────────────────────
function RatingDistribution({ stats }: { stats: TrustProfileStats }) {
  const dist = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: stats[`dist_${s}` as keyof TrustProfileStats] as number || 0,
    pct: stats.reviews_received > 0
      ? ((stats[`dist_${s}` as keyof TrustProfileStats] as number || 0) / stats.reviews_received) * 100
      : 0,
  }));

  return (
    <div className="space-y-1.5">
      {dist.map(({ star, count, pct }) => (
        <div key={star} className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 w-3">{star}</span>
          <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar
          src={(review.author as Record<string, unknown> | undefined)?.avatar_url as string | undefined}
          name={(review.author as Record<string, unknown> | undefined)?.full_name as string || 'Membre'}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">
              {(review.author as Record<string, unknown> | undefined)?.full_name as string || 'Membre anonyme'}
            </span>
            <div className="flex gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded capitalize">
              {review.source_type?.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
            {review.would_recommend === true && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <ThumbsUp className="w-2.5 h-2.5" /> Recommande
              </span>
            )}
          </div>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {review.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100">
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Comment */}
          {review.comment ? (
            <p className="text-sm text-gray-700 leading-relaxed italic">"{review.comment}"</p>
          ) : (
            <p className="text-xs text-gray-400 italic">Pas de commentaire écrit</p>
          )}

          {/* Dimensions */}
          {(review.dim_communication || review.dim_reliability || review.dim_punctuality || review.dim_quality) && (
            <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-gray-100">
              {[
                { key: 'dim_communication', label: 'Communication', emoji: '💬' },
                { key: 'dim_reliability', label: 'Fiabilité', emoji: '🤝' },
                { key: 'dim_punctuality', label: 'Ponctualité', emoji: '⏱️' },
                { key: 'dim_quality', label: 'Qualité', emoji: '⭐' },
              ].filter(d => (review as unknown as Record<string, unknown>)[d.key]).map(d => (
                <div key={d.key} className="flex items-center gap-1">
                  <span className="text-xs">{d.emoji}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn('w-2.5 h-2.5',
                        s <= ((review as unknown as Record<string, unknown>)[d.key] as number || 0)
                          ? 'fill-amber-300 text-amber-300'
                          : 'text-gray-200',
                      )} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TrustScoreFull ───────────────────────────────────────────────────────────
/**
 * Vue complète : score + badges + distribution + liste des avis.
 * Utilisée sur les pages profil publiques.
 */
interface TrustScoreFullProps {
  profile: TrustProfile;
  className?: string;
}

export function TrustScoreFull({ profile, className }: TrustScoreFullProps) {
  const [stats, setStats] = useState<TrustProfileStats | null>(null);
  const [badges, setBadges] = useState<BadgeCode[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!profile.id) return;
    setLoading(true);
    Promise.all([
      fetchTrustStats(profile.id),
      fetchProfileBadges(profile.id),
      fetchPublicReviews(profile.id, 20),
    ]).then(([s, b, r]) => {
      setStats(s);
      setBadges(b);
      setReviews(r);
      setLoading(false);
    });
  }, [profile.id]);

  const trust = computeUnifiedTrustScore({ ...profile, stats, badges });
  const displayReviews = showAll ? reviews : reviews.slice(0, 3);

  if (loading) {
    return <div className={cn('space-y-3', className)}>
      <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Score card */}
      <TrustScoreCard profile={profile} stats={stats} badges={badges} showDetails={false} />

      {/* All badges */}
      {badges.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-purple-500" /> Badges obtenus
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => <BadgePill key={b} code={b} size="md" />)}
          </div>
        </div>
      )}

      {/* Reviews summary */}
      {stats && stats.reviews_received > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-400" /> Avis reçus
            <span className="text-gray-400 text-xs font-normal">({stats.reviews_received})</span>
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Big avg */}
            <div className="text-center flex-shrink-0">
              <div className="text-5xl font-black text-amber-600">{stats.avg_rating.toFixed(1)}</div>
              <div className="text-xs text-gray-400 mt-0.5">/ 5</div>
              <div className="flex gap-0.5 justify-center mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('w-4 h-4', s <= Math.round(stats.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                ))}
              </div>
              {stats.recommend_pct != null && (
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  {stats.recommend_pct}% recommandent
                </p>
              )}
            </div>

            {/* Distribution */}
            <div className="flex-1">
              <RatingDistribution stats={stats} />
            </div>
          </div>

          {/* Dimensions moyennes */}
          {(stats.avg_communication || stats.avg_reliability || stats.avg_punctuality || stats.avg_quality) && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { key: 'avg_communication', label: 'Communication', emoji: '💬' },
                { key: 'avg_reliability',   label: 'Fiabilité',     emoji: '🤝' },
                { key: 'avg_punctuality',   label: 'Ponctualité',   emoji: '⏱️' },
                { key: 'avg_quality',       label: 'Qualité',       emoji: '⭐' },
              ].filter(d => (stats as unknown as Record<string, unknown>)[d.key] != null).map(d => {
                const val = (stats as unknown as Record<string, unknown>)[d.key] as number;
                return (
                  <div key={d.key} className="bg-gray-50 rounded-xl p-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm">{d.emoji}</span>
                      <span className="text-xs text-gray-600 font-semibold">{d.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={cn('w-3 h-3', s <= Math.round(val) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-500">{val.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            Commentaires
          </h3>
          {displayReviews.map(r => <ReviewCard key={r.id} review={r} />)}
          {reviews.length > 3 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full py-2.5 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-dashed border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
            >
              {showAll ? 'Voir moins' : `Voir les ${reviews.length - 3} autres avis →`}
            </button>
          )}
        </div>
      )}

      {reviews.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun avis pour le moment</p>
          <p className="text-xs mt-1">Les avis apparaissent après des échanges complétés.</p>
        </div>
      )}
    </div>
  );
}

// ─── Hook: useTrustData ───────────────────────────────────────────────────────
export function useTrustData(profileId: string | null) {
  const [stats, setStats] = useState<TrustProfileStats | null>(null);
  const [badges, setBadges] = useState<BadgeCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    Promise.all([fetchTrustStats(profileId), fetchProfileBadges(profileId)]).then(([s, b]) => {
      setStats(s);
      setBadges(b);
      setLoading(false);
    });
  }, [profileId]);

  return { stats, badges, loading };
}

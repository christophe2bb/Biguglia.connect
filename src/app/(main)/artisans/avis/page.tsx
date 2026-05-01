'use client';

/**
 * /artisans/avis — Page publique de tous les avis laissés sur les artisans du site.
 * Visible par tous : nom du noteur, étoiles, commentaire, artisan concerné.
 * Deux vues : liste chronologique ou groupé par artisan.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, ArrowLeft, Search, Filter, X, MessageCircle,
  LayoutList, LayoutGrid, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  artisan_id: string;
  artisan_name: string;
  artisan_avatar: string | null;
  artisan_category: string | null;
  artisan_category_icon: string | null;
}

interface ArtisanGroup {
  artisan_id: string;
  artisan_name: string;
  artisan_avatar: string | null;
  artisan_category: string | null;
  artisan_category_icon: string | null;
  avg_rating: number;
  reviews: PublicReview[];
}

type ViewMode = 'list' | 'group';

// ── Helpers visuels ────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function ReviewerAvatar({ name, src, size = 'md' }: {
  name: string | null;
  src: string | null;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? 'avatar'}
        width={size === 'sm' ? 32 : 40}
        height={size === 'sm' ? 32 : 40}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
        unoptimized
      />
    );
  }
  const initials = (name ?? '?').charAt(0).toUpperCase();
  const colors = [
    'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
    'bg-teal-100 text-teal-700', 'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700', 'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`${dim} rounded-full ${color} flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3.5 h-3.5 bg-gray-200 rounded" />)}
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded mb-1.5 w-full" />
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-100 rounded-full" />
        <div className="h-3 bg-gray-100 rounded w-40" />
      </div>
    </div>
  );
}

// ── Carte d'un avis individuel ─────────────────────────────────────────────────

function ReviewCard({ review, showArtisan = true }: { review: PublicReview; showArtisan?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-gray-200 transition-all">
      {/* En-tête : noteur + note */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ReviewerAvatar name={review.reviewer_name} src={review.reviewer_avatar} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {review.reviewer_name ?? 'Utilisateur anonyme'}
            </p>
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
        <StarDisplay rating={review.rating} />
      </div>

      {/* Commentaire */}
      {review.comment ? (
        <p className="text-sm text-gray-700 leading-relaxed mb-3 italic">
          &ldquo;{review.comment}&rdquo;
        </p>
      ) : (
        <p className="text-xs text-gray-400 mb-3 italic">Sans commentaire</p>
      )}

      {/* Artisan concerné */}
      {showArtisan && (
        <div className="pt-3 border-t border-gray-50">
          <Link
            href={`/artisans/${review.artisan_id}`}
            className="flex items-center gap-2.5 group"
            onClick={e => e.stopPropagation()}
          >
            {review.artisan_avatar ? (
              <Image
                src={review.artisan_avatar}
                alt={review.artisan_name}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-700">
                  {review.artisan_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gray-500">Avis pour</span>
              <span className="text-xs font-semibold text-brand-700 group-hover:underline truncate">
                {review.artisan_name}
              </span>
              {review.artisan_category && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  · {review.artisan_category_icon} {review.artisan_category}
                </span>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Vue groupée par artisan ────────────────────────────────────────────────────

function ArtisanGroupCard({ group }: { group: ArtisanGroup }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.reviews : group.reviews.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      {/* En-tête artisan */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/artisans/${group.artisan_id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          {group.artisan_avatar ? (
            <Image
              src={group.artisan_avatar}
              alt={group.artisan_name}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-brand-700">
                {group.artisan_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-brand-600 transition-colors">
              {group.artisan_name}
            </h3>
            {group.artisan_category && (
              <p className="text-xs text-gray-500">
                {group.artisan_category_icon} {group.artisan_category}
              </p>
            )}
          </div>
        </Link>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1.5 justify-end mb-0.5">
            <StarDisplay rating={Math.round(group.avg_rating)} />
            <span className="text-sm font-bold text-gray-900">{group.avg_rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
            <Users className="w-3 h-3" />
            <span>{group.reviews.length} avis</span>
          </div>
        </div>
      </div>

      {/* Liste des noteurs (condensée) */}
      <div className="px-5 py-3">
        {/* Ligne des avatars + noms */}
        <div className="flex flex-wrap gap-2 mb-3">
          {group.reviews.map(r => (
            <div
              key={r.id}
              title={r.reviewer_name ?? 'Utilisateur anonyme'}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1"
            >
              <ReviewerAvatar name={r.reviewer_name} src={r.reviewer_avatar} size="sm" />
              <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
                {r.reviewer_name ?? 'Anonyme'}
              </span>
              <div className="flex gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 ${
                      i <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Avis détaillés */}
        <div className="space-y-3">
          {shown.map(r => (
            <div key={r.id} className="border-l-2 border-amber-200 pl-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-gray-800">
                  {r.reviewer_name ?? 'Anonyme'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              {r.comment ? (
                <p className="text-xs text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Sans commentaire</p>
              )}
            </div>
          ))}
        </div>

        {/* Bouton voir plus */}
        {group.reviews.length > 2 && (
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Réduire
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Voir {group.reviews.length - 2} avis de plus
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AvisPublicsPage() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    const fetchReviews = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
          artisan:artisan_profiles!reviews_artisan_id_fkey(
            id, business_name, avatar_url,
            trade_category:trade_categories(name, icon)
          )
        `)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.error('[avis publics]', error.message);
        setLoading(false);
        return;
      }

      type RawReview = {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        reviewer: { full_name: string | null; avatar_url: string | null } | null;
        artisan: {
          id: string;
          business_name: string;
          avatar_url: string | null;
          trade_category: { name: string; icon: string } | null;
        } | null;
      };

      const mapped: PublicReview[] = ((data ?? []) as unknown as RawReview[]).map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_name: r.reviewer?.full_name ?? null,
        reviewer_avatar: r.reviewer?.avatar_url ?? null,
        artisan_id: r.artisan?.id ?? '',
        artisan_name: r.artisan?.business_name ?? 'Artisan',
        artisan_avatar: r.artisan?.avatar_url ?? null,
        artisan_category: r.artisan?.trade_category?.name ?? null,
        artisan_category_icon: r.artisan?.trade_category?.icon ?? null,
      }));

      setReviews(mapped);
      setLoading(false);
    };

    void fetchReviews();
  }, []);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filtered = reviews.filter(r => {
    if (filterRating !== null && r.rating !== filterRating) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.reviewer_name?.toLowerCase().includes(s) ||
      r.artisan_name?.toLowerCase().includes(s) ||
      r.comment?.toLowerCase().includes(s) ||
      r.artisan_category?.toLowerCase().includes(s)
    );
  });

  // ── Groupement par artisan ──────────────────────────────────────────────────

  const groups: ArtisanGroup[] = Object.values(
    filtered.reduce<Record<string, ArtisanGroup>>((acc, r) => {
      if (!acc[r.artisan_id]) {
        acc[r.artisan_id] = {
          artisan_id: r.artisan_id,
          artisan_name: r.artisan_name,
          artisan_avatar: r.artisan_avatar,
          artisan_category: r.artisan_category,
          artisan_category_icon: r.artisan_category_icon,
          avg_rating: 0,
          reviews: [],
        };
      }
      acc[r.artisan_id].reviews.push(r);
      return acc;
    }, {})
  ).map(g => ({
    ...g,
    avg_rating: g.reviews.reduce((s, r) => s + r.rating, 0) / g.reviews.length,
  })).sort((a, b) => b.reviews.length - a.reviews.length);

  // ── Stats globales ──────────────────────────────────────────────────────────

  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

      {/* Retour */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/artisans"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux artisans
        </Link>
      </div>

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Avis & Notes</h1>
            <p className="text-gray-500 text-sm">
              Tous les avis laissés par les habitants sur les artisans de Biguglia
            </p>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      {!loading && totalReviews > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Note moyenne */}
            <div className="text-center sm:text-left flex-shrink-0">
              <div className="text-5xl font-black text-amber-600">{avgRating.toFixed(1)}</div>
              <div className="flex justify-center sm:justify-start mt-1">
                <StarDisplay rating={Math.round(avgRating)} size="md" />
              </div>
              <div className="text-xs text-amber-700 mt-1 font-medium">
                {totalReviews} avis au total
              </div>
            </div>

            {/* Répartition étoiles */}
            <div className="flex-1 w-full space-y-1.5">
              {ratingCounts.map(({ n, count }) => {
                const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <button
                    key={n}
                    onClick={() => setFilterRating(filterRating === n ? null : n)}
                    className={`flex items-center gap-2 w-full group transition-opacity ${
                      filterRating !== null && filterRating !== n ? 'opacity-40' : ''
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-700 w-3 flex-shrink-0">{n}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-600 w-6 text-right flex-shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filterRating !== null && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-amber-700 font-medium">
                Filtre actif : {filterRating} étoile{filterRating > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setFilterRating(null)}
                className="text-xs text-amber-600 underline hover:text-amber-800"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barre de contrôle : recherche + vue */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, artisan, métier, commentaire…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle vue liste / groupé */}
        <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
          <button
            onClick={() => setViewMode('list')}
            title="Vue liste"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setViewMode('group')}
            title="Groupé par artisan"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'group'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Par artisan</span>
          </button>
        </div>
      </div>

      {/* Résumé filtre actif */}
      {!loading && (search || filterRating !== null) && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => { setSearch(''); setFilterRating(null); }}
            className="text-amber-600 font-semibold hover:underline ml-1"
          >
            Effacer les filtres
          </button>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => <ReviewSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-700 mb-1">
            {totalReviews === 0 ? 'Aucun avis pour le moment' : 'Aucun résultat'}
          </h3>
          <p className="text-sm text-gray-400">
            {totalReviews === 0
              ? 'Soyez le premier à noter un artisan !'
              : "Essayez avec d'autres critères."}
          </p>
          {totalReviews === 0 && (
            <Link
              href="/artisans"
              className="mt-4 inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Voir les artisans
            </Link>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* ── Vue liste ── */
        <div className="space-y-4">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} showArtisan />
          ))}
        </div>
      ) : (
        /* ── Vue groupée par artisan ── */
        <div className="space-y-4">
          {groups.map(group => (
            <ArtisanGroupCard key={group.artisan_id} group={group} />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-8">
          {filtered.length} avis affiché{filtered.length > 1 ? 's' : ''}
          {(search || filterRating !== null) ? ` sur ${totalReviews} au total` : ''}
          {' '}· Les avis sont vérifiés et modérés par notre équipe
        </p>
      )}
    </div>
  );
}

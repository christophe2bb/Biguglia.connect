'use client';

import Image from 'next/image';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Shield, Clock, Star, X, ChevronRight, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ArtisanProfile, TradeCategory } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import StarRating from '@/components/ui/StarRating';
import { UserRatingBadge } from '@/components/ui/RatingWidget';
import SectionTracker from '@/components/ui/SectionTracker';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types enrichis ─────────────────────────────────────────────────────────────

interface ReviewWithReviewer {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
}

type EnrichedArtisan = ArtisanProfile & {
  avg_rating?: number;
  review_count?: number;
  reviews_detail?: ReviewWithReviewer[];
};

// ── Mini-panel avis ────────────────────────────────────────────────────────────

function ReviewsPanel({
  artisan,
  onClose,
}: {
  artisan: EnrichedArtisan;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer en cliquant en dehors
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Fermer avec Échap
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const reviews = artisan.reviews_detail ?? [];
  const avgRating = artisan.avg_rating ?? 0;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Avis pour ${artisan.business_name}`}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* En-tête panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-gray-900 text-sm">
            {reviews.length} avis · {avgRating.toFixed(1)}/5
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer le panneau des avis"
          className="p-1 rounded-lg hover:bg-amber-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Liste des avis */}
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {reviews.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            Aucun avis visible pour le moment.
          </div>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-2.5">
                {/* Avatar noteur */}
                {r.reviewer_avatar ? (
                  <Image
                    src={r.reviewer_avatar}
                    alt={r.reviewer_name ?? 'avatar'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-brand-700">
                      {(r.reviewer_name ?? 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {r.reviewer_name ?? 'Utilisateur'}
                    </span>
                    {/* Étoiles de la note */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i <= r.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 italic">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(r.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lien vers la page publique des avis */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <Link
          href="/artisans/avis"
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Voir tous les avis du site
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Carte artisan ──────────────────────────────────────────────────────────────

function ArtisanCard({ artisan }: { artisan: EnrichedArtisan }) {
  const [panelOpen, setPanelOpen] = useState(false);

  const hasReviews = (artisan.review_count ?? 0) > 0;

  return (
    <div className="relative">
      <Link href={`/artisans/${artisan.id}`}>
        <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-colors duration-200 overflow-hidden group">
          {/* Photo principale (avatar_url) en priorité, sinon 1ère photo de galerie */}
          {(artisan as unknown as { avatar_url?: string }).avatar_url ||
          (artisan.gallery && artisan.gallery.length > 0) ? (
            <div className="relative h-40 bg-gray-100 overflow-hidden">
              <Image
                src={
                  (artisan as unknown as { avatar_url?: string }).avatar_url ||
                  artisan.gallery![0].url
                }
                alt={artisan.business_name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-40 gradient-hero flex items-center justify-center">
              <span className="text-4xl">{artisan.trade_category?.icon || '🔧'}</span>
            </div>
          )}

          <div className="p-5">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {artisan.is_featured && <Badge variant="warning">⭐ À la une</Badge>}
              <Badge variant="success">
                <Shield className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
              {artisan.artisan_type === 'professionnel' ? (
                <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  🏢 PRO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  👤 Particulier
                </span>
              )}
            </div>

            {/* Identité */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={artisan.profile?.avatar_url}
                name={artisan.business_name || artisan.profile?.full_name || '?'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                  {artisan.business_name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>{artisan.trade_category?.icon}</span>
                  <span>{artisan.trade_category?.name}</span>
                  {artisan.profile?.id && (
                    <UserRatingBadge userId={artisan.profile.id} className="ml-1" />
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">
              {artisan.description || 'Artisan professionnel à votre service.'}
            </p>

            {/* Infos */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {artisan.service_area}
              </div>
              {artisan.years_experience && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {artisan.years_experience} ans d&apos;exp.
                </div>
              )}
            </div>

            {/* Note — cliquable pour ouvrir le panel */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              {hasReviews ? (
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPanelOpen(prev => !prev);
                  }}
                  aria-expanded={panelOpen}
                  aria-label={`Voir les ${artisan.review_count} avis pour ${artisan.business_name}`}
                  className="flex items-center gap-2 w-full group/btn hover:bg-amber-50 rounded-xl px-2 py-1 -mx-2 transition-colors"
                >
                  <StarRating rating={artisan.avg_rating ?? 0} />
                  <span className="text-xs text-gray-500 group-hover/btn:text-amber-700 transition-colors">
                    {artisan.avg_rating?.toFixed(1)}{' '}
                    <span className="underline decoration-dotted">
                      ({artisan.review_count} avis)
                    </span>
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ml-auto text-gray-300 group-hover/btn:text-amber-500 transition-all ${
                      panelOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              ) : (
                <span className="text-xs text-gray-400">Pas encore d&apos;avis</span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Panel avis — en dehors du <Link> pour éviter la navigation */}
      {panelOpen && hasReviews && (
        <ReviewsPanel artisan={artisan} onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
}

// ── Contenu principal ──────────────────────────────────────────────────────────

function ArtisansContent() {
  const searchParams = useSearchParams();
  const [artisans, setArtisans] = useState<EnrichedArtisan[]>([]);
  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('categorie') || ''
  );

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Catégories
      const { data: cats } = await supabase
        .from('trade_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      // Artisans vérifiés avec détail des avis (noteur inclus)
      let query = supabase
        .from('artisan_profiles')
        .select(`
          id, user_id, business_name, trade_name, description,
          location, intervention_zone, is_featured, is_verified, siret, avatar_url,
          profile:profiles(id, full_name, avatar_url, role),
          trade_category:trade_categories(id, name, slug, icon),
          gallery:artisan_photos(url, display_order),
          reviews(
            id, rating, comment, created_at,
            reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
          )
        `)
        .limit(200);

      if (selectedCategory) {
        const cat = cats?.find(c => c.slug === selectedCategory);
        if (cat) query = query.eq('trade_category_id', cat.id);
      }

      const { data } = await query.order('is_featured', { ascending: false });

      // Calcul note moyenne + enrichissement avec détail des reviewers
      const enriched: EnrichedArtisan[] = (data || [])
        .filter(a => {
          const role = (a.profile as { role?: string } | null)?.role;
          return (
            (a as { is_verified?: boolean }).is_verified === true ||
            role === 'artisan_verified'
          );
        })
        .map(a => {
          const rawReviews = (a.reviews ?? []) as unknown as Array<{
            id: string;
            rating: number;
            comment: string | null;
            created_at: string;
            reviewer: { full_name: string | null; avatar_url: string | null } | null;
          }>;

          const reviews_detail: ReviewWithReviewer[] = rawReviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            reviewer_name: r.reviewer?.full_name ?? null,
            reviewer_avatar: r.reviewer?.avatar_url ?? null,
          }));

          const avg_rating = rawReviews.length
            ? rawReviews.reduce((sum, r) => sum + r.rating, 0) / rawReviews.length
            : 0;

          return {
            ...a,
            avg_rating,
            review_count: rawReviews.length,
            reviews_detail,
          } as unknown as EnrichedArtisan;
        });

      setArtisans(enriched);
      setLoading(false);
    };

    fetchData();
  }, [selectedCategory]);

  const filtered = artisans.filter(
    a =>
      !search ||
      a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.trade_category?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionTracker section="artisans" />

      {/* En-tête */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Artisans de Biguglia</h1>
          <p className="text-gray-500">
            Tous les artisans sont vérifiés et validés par notre équipe
          </p>
        </div>
        <Link
          href="/artisans/avis"
          className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition-colors"
        >
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Tous les avis du site
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Rechercher un artisan, un métier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">Tous les métiers</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun artisan trouvé"
          description={
            search || selectedCategory
              ? "Essayez avec d'autres critères de recherche."
              : "Aucun artisan n'est encore inscrit sur la plateforme. Revenez bientôt !"
          }
          action={
            selectedCategory
              ? { label: 'Voir tous les artisans', onClick: () => setSelectedCategory('') }
              : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} artisan{filtered.length > 1 ? 's' : ''} trouvé
            {filtered.length > 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(artisan => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ArtisansPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-56"
              />
            ))}
          </div>
        </div>
      }
    >
      <ArtisansContent />
    </Suspense>
  );
}

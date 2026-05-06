'use client';

import Image from 'next/image';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Clock, Star, ChevronRight, ShieldCheck, Briefcase, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ArtisanProfile, TradeCategory } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { UserRatingBadge } from '@/components/ui/RatingWidget';
import SectionTracker from '@/components/ui/SectionTracker';

type EnrichedArtisan = ArtisanProfile;

// ── Couleurs par catégorie ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  plomberie:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    accent: 'bg-blue-500' },
  electricite:   { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200',  accent: 'bg-yellow-400' },
  maconnerie:    { bg: 'bg-stone-50',   text: 'text-stone-700',   border: 'border-stone-200',   accent: 'bg-stone-500' },
  peinture:      { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    accent: 'bg-pink-400' },
  menuiserie:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   accent: 'bg-amber-500' },
  climatisation: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    accent: 'bg-cyan-500' },
  jardinage:     { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   accent: 'bg-green-500' },
  bricolage:     { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  accent: 'bg-orange-500' },
  toiture:       { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     accent: 'bg-red-500' },
  carrelage:     { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    accent: 'bg-teal-500' },
  ferronnerie:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   accent: 'bg-slate-500' },
  nettoyage:     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  accent: 'bg-violet-500' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', accent: 'bg-gray-400' };

// ── Carte artisan ──────────────────────────────────────────────────────────────
function ArtisanCard({ artisan }: { artisan: EnrichedArtisan }) {
  const slug  = artisan.trade_category?.slug ?? '';
  const color = CATEGORY_COLORS[slug] ?? DEFAULT_COLOR;
  const hasPhoto =
    (artisan as unknown as { avatar_url?: string }).avatar_url ||
    (artisan.gallery && artisan.gallery.length > 0);
  const photoSrc =
    (artisan as unknown as { avatar_url?: string }).avatar_url ||
    artisan.gallery?.[0]?.url;

  return (
    <Link href={`/artisans/${artisan.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full flex flex-col">

        {/* Bandeau couleur + icône métier */}
        <div className={`relative h-28 ${color.bg} flex items-center justify-center overflow-hidden`}>
          {/* Accent stripe gauche */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.accent}`} />

          {hasPhoto ? (
            <Image
              src={photoSrc!}
              alt={artisan.business_name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
            />
          ) : (
            <span className="text-5xl select-none">
              {artisan.trade_category?.icon ?? '🔧'}
            </span>
          )}

          {/* Badge PRO / Particulier */}
          <div className="absolute top-3 right-3">
            {artisan.artisan_type === 'professionnel' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                <Briefcase className="w-3 h-3" /> PRO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                <User className="w-3 h-3" /> Particulier
              </span>
            )}
          </div>

          {/* Badge À la une */}
          {artisan.is_featured && (
            <div className="absolute top-3 left-6">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white shadow-sm">
                ⭐ À la une
              </span>
            </div>
          )}
        </div>

        {/* Corps */}
        <div className="p-5 flex flex-col flex-1">
          {/* Identité */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <Avatar
                src={artisan.profile?.avatar_url}
                name={artisan.business_name || artisan.profile?.full_name || '?'}
                size="md"
              />
              {/* Pastille vérifié */}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <ShieldCheck className="w-2.5 h-2.5 text-white" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-tight truncate group-hover:text-brand-600 transition-colors">
                {artisan.business_name}
              </h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${color.bg} ${color.text} ${color.border} border`}>
                {artisan.trade_category?.icon}
                {artisan.trade_category?.name}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
            {artisan.description || 'Artisan professionnel à votre service.'}
          </p>

          {/* Méta-infos */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-300" />
              <span>{artisan.service_area}</span>
            </div>
            {artisan.years_experience && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-300" />
                <span>{artisan.years_experience} ans d&apos;exp.</span>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="pt-3 border-t border-gray-100">
            {artisan.profile?.id ? (
              <UserRatingBadge
                userId={artisan.profile.id}
                artisanId={artisan.id}
                showNoRating
              />
            ) : (
              <span className="text-xs text-gray-400">Pas encore d&apos;avis</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Groupe par catégorie ───────────────────────────────────────────────────────
function CategoryGroup({
  category,
  artisans,
}: {
  category: TradeCategory;
  artisans: EnrichedArtisan[];
}) {
  const color = CATEGORY_COLORS[category.slug] ?? DEFAULT_COLOR;

  return (
    <section>
      {/* En-tête de catégorie */}
      <div className={`flex items-center gap-3 mb-5 pb-3 border-b-2 ${color.border}`}>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color.bg} ${color.border} border`}>
          {category.icon}
        </span>
        <div>
          <h2 className={`text-lg font-bold ${color.text}`}>{category.name}</h2>
          <p className="text-xs text-gray-400">
            {artisans.length} artisan{artisans.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {artisans.map(a => (
          <ArtisanCard key={a.id} artisan={a} />
        ))}
      </div>
    </section>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-28 bg-gray-100" />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded mb-2" />
        <div className="h-3 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Contenu principal ──────────────────────────────────────────────────────────
function ArtisansContent() {
  const searchParams = useSearchParams();
  const [artisans,  setArtisans]  = useState<EnrichedArtisan[]>([]);
  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeSlug, setActiveSlug] = useState(searchParams.get('categorie') || '');

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      const { data: cats } = await supabase
        .from('trade_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      const { data } = await supabase
        .from('artisan_profiles')
        .select(`
          id, user_id, business_name, trade_name, description,
          location, intervention_zone, is_featured, is_verified, siret,
          avatar_url, artisan_type, service_area, years_experience,
          profile:profiles(id, full_name, avatar_url, role),
          trade_category:trade_categories(id, name, slug, icon),
          gallery:artisan_photos(url, display_order)
        `)
        .order('is_featured', { ascending: false })
        .limit(200);

      const enriched = ((data || []).filter(a => {
        const role = (a.profile as { role?: string } | null)?.role;
        return (a as { is_verified?: boolean }).is_verified === true || role === 'artisan_verified';
      })) as unknown as EnrichedArtisan[];

      setArtisans(enriched);
      setLoading(false);
    })();
  }, []);

  // Filtrage texte
  const filtered = artisans.filter(a =>
    !search ||
    a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.trade_category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Filtrage catégorie active
  const displayed = activeSlug
    ? filtered.filter(a => a.trade_category?.slug === activeSlug)
    : filtered;

  // Catégories qui ont au moins un artisan (parmi filtrés)
  const usedCategorySlugs = new Set(filtered.map(a => a.trade_category?.slug).filter(Boolean));
  const usedCategories = categories.filter(c => usedCategorySlugs.has(c.slug));

  // Grouper par catégorie (pour la vue "Tous")
  const grouped = usedCategories.map(cat => ({
    category: cat,
    items: displayed.filter(a => a.trade_category?.slug === cat.slug),
  })).filter(g => g.items.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionTracker section="artisans" />

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
              Artisans de Biguglia
            </h1>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Tous les artisans sont vérifiés et validés par notre équipe
            </p>
          </div>
          <Link
            href="/artisans/avis"
            className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Tous les avis du site
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un artisan, un métier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Chips catégories ──────────────────────────────────────────────── */}
      {!loading && usedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {/* Chip "Tous" */}
          <button
            onClick={() => setActiveSlug('')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150
              ${activeSlug === ''
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
          >
            Tous
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${activeSlug === '' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {filtered.length}
            </span>
          </button>

          {usedCategories.map(cat => {
            const color   = CATEGORY_COLORS[cat.slug] ?? DEFAULT_COLOR;
            const count   = filtered.filter(a => a.trade_category?.slug === cat.slug).length;
            const isActive = activeSlug === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveSlug(isActive ? '' : cat.slug)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150
                  ${isActive
                    ? `${color.accent} text-white border-transparent shadow-md scale-105`
                    : `bg-white ${color.text} ${color.border} hover:${color.bg}`
                  }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${isActive ? 'bg-white/20 text-white' : `${color.bg} ${color.text}`}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Résultats ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun artisan trouvé"
          description={
            search || activeSlug
              ? "Essayez avec d'autres critères de recherche."
              : "Aucun artisan n'est encore inscrit. Revenez bientôt !"
          }
          action={
            activeSlug || search
              ? { label: 'Réinitialiser', onClick: () => { setActiveSlug(''); setSearch(''); } }
              : undefined
          }
        />
      ) : activeSlug ? (
        /* Vue catégorie unique : grille simple */
        <>
          <p className="text-sm text-gray-400 mb-5">
            {displayed.length} artisan{displayed.length > 1 ? 's' : ''} en{' '}
            <span className="font-semibold text-gray-600">
              {categories.find(c => c.slug === activeSlug)?.name}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map(a => <ArtisanCard key={a.id} artisan={a} />)}
          </div>
        </>
      ) : (
        /* Vue "Tous" : groupée par catégorie */
        <div className="space-y-12">
          {grouped.map(g => (
            <CategoryGroup key={g.category.id} category={g.category} artisans={g.items} />
          ))}
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      }
    >
      <ArtisansContent />
    </Suspense>
  );
}

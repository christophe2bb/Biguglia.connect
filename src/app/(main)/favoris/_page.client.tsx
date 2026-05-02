'use client';

/**
 * FavorisClient — Page Mes Favoris
 *
 * Onglet 1 — Annonces  : IDs sauvegardés en localStorage ('annonces_favorites')
 *                         Requête Supabase pour récupérer les données des annonces
 * Onglet 2 — Artisans  : user_favorites (target_type='artisan') en base Supabase
 *
 * Comportement :
 *   - Non connecté + onglet Artisans → invite à se connecter
 *   - Bouton ❌ sur chaque carte pour retirer des favoris immédiatement
 *   - Lien direct vers la fiche complète
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Bookmark, ArrowLeft, Trash2, ExternalLink, Star, MapPin, Shield, Tag, Clock, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Listing, ArtisanProfile } from '@/types';
import { formatRelative, formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';

// ── localStorage key (shared with useFavorites hook) ─────────────────────────
const LS_KEY = 'annonces_favorites';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLocalIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeLocalIds(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

// ── Type helpers ──────────────────────────────────────────────────────────────

type ListingExt = Listing & {
  cover_url?: string | null;
  is_urgent?: boolean;
  sector_id?: string;
};

type ArtisanFavoriteRow = {
  id: string;           // user_favorites.id
  target_id: string;
  artisan: ArtisanProfile | null;
};

// ── Listing type labels ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  sale: '🏷️ Vente', wanted: '🔍 Recherche', free: '🎁 Gratuit',
  service: '🛠️ Service', exchange: '🔄 Échange', rental: '🔑 Location',
};
const TYPE_COLORS: Record<string, string> = {
  sale: 'bg-blue-100 text-blue-700', wanted: 'bg-purple-100 text-purple-700',
  free: 'bg-green-100 text-green-700', service: 'bg-amber-100 text-amber-700',
  exchange: 'bg-orange-100 text-orange-700', rental: 'bg-cyan-100 text-cyan-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Card for a saved listing */
function ListingFavCard({ listing, onRemove }: { listing: ListingExt; onRemove: (id: string) => void }) {
  const coverUrl = listing.cover_url ?? (listing.photos as Array<{ url: string }> | undefined)?.[0]?.url ?? null;
  const typeLabel = TYPE_LABELS[listing.listing_type] || listing.listing_type;
  const typeColor = TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';
  const priceLabel = listing.listing_type === 'free'
    ? '🎁 Gratuit'
    : listing.price ? formatPrice(listing.price) : 'Prix libre';

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
      {/* Remove button */}
      <button
        onClick={() => onRemove(listing.id)}
        title="Retirer des favoris"
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center shadow transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <Link href={`/annonces/${listing.id}`} className="block">
        {/* Photo */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shadow ${typeColor}`}>
              {typeLabel}
            </span>
          </div>
          {/* Urgent */}
          {listing.is_urgent && (
            <div className="absolute top-3 left-3 mt-7">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse shadow">
                ⚡ URGENT
              </span>
            </div>
          )}
          {/* Title overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{listing.title}</p>
            {listing.category?.name && (
              <p className="text-white/70 text-xs mt-0.5">{listing.category.icon} {listing.category.name}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 flex items-center justify-between">
          <span className="text-base font-bold text-blue-700">{priceLabel}</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatRelative(listing.created_at)}
          </div>
        </div>
      </Link>

      {/* Link icon */}
      <Link
        href={`/annonces/${listing.id}`}
        className="absolute bottom-3 right-3 p-1 rounded-lg text-gray-300 hover:text-blue-500 transition-colors"
        title="Voir l'annonce"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/** Card for a saved artisan */
function ArtisanFavCard({ row, onRemove }: { row: ArtisanFavoriteRow; onRemove: (favId: string, artisanId: string) => void }) {
  const artisan = row.artisan;
  if (!artisan) return null;

  const avatarUrl = (artisan as ArtisanProfile & { avatar_url?: string }).avatar_url
    ?? artisan.profile?.avatar_url
    ?? null;
  const coverUrl = avatarUrl ?? (artisan.gallery && artisan.gallery.length > 0 ? artisan.gallery[0].url : null);
  const isPro = artisan.artisan_type === 'professionnel';

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
      {/* Remove button */}
      <button
        onClick={() => onRemove(row.id, artisan.id)}
        title="Retirer des favoris"
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center shadow transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <Link href={`/artisans/${artisan.id}`} className="block">
        {/* Cover */}
        <div className="relative h-36 overflow-hidden bg-gray-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={artisan.business_name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-5xl">{artisan.trade_category?.icon || '🔧'}</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shadow ${
              isPro ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isPro ? '🏢 PRO' : '👤 Particulier'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar
              src={artisan.profile?.avatar_url}
              name={artisan.business_name || artisan.profile?.full_name || '?'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate group-hover:text-brand-600 transition-colors text-sm">
                {artisan.business_name}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {artisan.trade_category?.icon} {artisan.trade_category?.name}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            {artisan.service_area && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{artisan.service_area}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 font-medium">Vérifié</span>
            </span>
          </div>

          {artisan.description && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{artisan.description}</p>
          )}
        </div>
      </Link>

      {/* View link */}
      <div className="px-4 pb-3">
        <Link
          href={`/artisans/${artisan.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Voir la fiche
        </Link>
      </div>
    </div>
  );
}

// ── Empty state component ──────────────────────────────────────────────────────

function EmptyFav({ icon, title, desc, href, cta }: {
  icon: string; title: string; desc: string; href: string; cta: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-4xl">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{desc}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
      >
        {cta}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'annonces' | 'artisans';

export default function FavorisClient() {
  const { profile } = useAuthStore();

  const [activeTab, setActiveTab]           = useState<Tab>('annonces');
  const [listings,   setListings]           = useState<ListingExt[]>([]);
  const [artisanFavs, setArtisanFavs]       = useState<ArtisanFavoriteRow[]>([]);
  const [localIds,   setLocalIds]           = useState<string[]>([]);
  const [loadingListings,  setLoadingListings]  = useState(true);
  const [loadingArtisans,  setLoadingArtisans]  = useState(true);

  // ── Load local IDs (annonces) ─────────────────────────────────────────────
  useEffect(() => {
    const ids = readLocalIds();
    setLocalIds(ids);
  }, []);

  // ── Fetch listings from Supabase based on local IDs ───────────────────────
  useEffect(() => {
    if (localIds.length === 0) {
      setListings([]);
      setLoadingListings(false);
      return;
    }
    setLoadingListings(true);
    const supabase = createClient();
    supabase
      .from('listings')
      .select('id, title, price, location, listing_type, status, created_at, cover_url, is_urgent, sector_id, category:listing_categories(id, name, slug, icon), photos:listing_photos(url, display_order)')
      .in('id', localIds)
      .neq('status', 'archived')
      .then(({ data }) => {
        // Preserve order of localIds
        const map = new Map((data || []).map(l => [l.id, l]));
        const ordered = localIds
          .map(id => map.get(id))
          .filter(Boolean) as ListingExt[];
        setListings(ordered);
        setLoadingListings(false);
      });
  }, [localIds]);

  // ── Fetch artisan favorites from Supabase ─────────────────────────────────
  useEffect(() => {
    if (!profile?.id) {
      setLoadingArtisans(false);
      return;
    }
    setLoadingArtisans(true);
    const supabase = createClient();
    supabase
      .from('user_favorites')
      .select(`
        id,
        target_id,
        artisan:artisan_profiles!target_id(
          id, user_id, business_name, description, service_area,
          artisan_type, is_featured, is_verified, years_experience,
          trade_category:trade_categories(id, name, slug, icon),
          profile:profiles(full_name, avatar_url),
          gallery
        )
      `)
      .eq('user_id', profile.id)
      .eq('target_type', 'artisan')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Favorites artisans error:', error);
          setArtisanFavs([]);
        } else {
          setArtisanFavs((data || []) as unknown as ArtisanFavoriteRow[]);
        }
        setLoadingArtisans(false);
      });
  }, [profile?.id]);

  // ── Remove listing favorite ───────────────────────────────────────────────
  const removeListingFav = useCallback((id: string) => {
    const next = localIds.filter(x => x !== id);
    writeLocalIds(next);
    setLocalIds(next);
    setListings(prev => prev.filter(l => l.id !== id));
    toast('Annonce retirée des favoris', { icon: '💔' });
  }, [localIds]);

  // ── Remove artisan favorite ───────────────────────────────────────────────
  const removeArtisanFav = useCallback(async (favId: string, artisanId: string) => {
    if (!profile?.id) return;
    const supabase = createClient();
    await supabase
      .from('user_favorites')
      .delete()
      .eq('id', favId)
      .eq('user_id', profile.id);
    setArtisanFavs(prev => prev.filter(r => r.id !== favId));
    toast('Artisan retiré des favoris', { icon: '💔' });
    void artisanId; // used implicitly
  }, [profile?.id]);

  // ── Clear all listings favorites ──────────────────────────────────────────
  const clearAllListings = () => {
    writeLocalIds([]);
    setLocalIds([]);
    setListings([]);
    toast('Tous les favoris annonces effacés', { icon: '🗑️' });
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    {
      id: 'annonces',
      label: 'Annonces',
      icon: <Tag className="w-4 h-4" />,
      count: localIds.length,
    },
    {
      id: 'artisans',
      label: 'Artisans',
      icon: <Star className="w-4 h-4" />,
      count: artisanFavs.length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero banner ── */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Heart className="w-7 h-7 fill-white text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">❤️ Mes favoris</h1>
              <p className="text-white/80 text-sm mt-0.5">
                Annonces et artisans que vous avez sauvegardés
              </p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-2xl font-black">{localIds.length}</p>
              <p className="text-xs text-white/80 mt-0.5">Annonces</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-2xl font-black">{artisanFavs.length}</p>
              <p className="text-xs text-white/80 mt-0.5">Artisans</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-2xl font-black">{localIds.length + artisanFavs.length}</p>
              <p className="text-xs text-white/80 mt-0.5">Total</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-2xl font-black">♾️</p>
              <p className="text-xs text-white/80 mt-0.5">Illimité</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ═══════════════════════════════════════════════
            TAB : ANNONCES
        ═══════════════════════════════════════════════ */}
        {activeTab === 'annonces' && (
          <div>
            {/* Header with clear button */}
            {localIds.length > 0 && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{listings.length}</span> annonce{listings.length !== 1 ? 's' : ''} sauvegardée{listings.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={clearAllListings}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Tout effacer
                </button>
              </div>
            )}

            {/* Loading */}
            {loadingListings && localIds.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(localIds.length)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {!loadingListings && listings.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(listing => (
                  <ListingFavCard
                    key={listing.id}
                    listing={listing}
                    onRemove={removeListingFav}
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loadingListings && listings.length === 0 && (
              <EmptyFav
                icon="🏷️"
                title="Aucune annonce sauvegardée"
                desc="Cliquez sur le cœur ❤️ d'une annonce pour la retrouver ici rapidement."
                href="/annonces"
                cta="Parcourir les annonces"
              />
            )}

            {/* Info: localStorage notice */}
            {listings.length > 0 && (
              <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Bookmark className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <strong>Stockage local</strong> — vos annonces favorites sont enregistrées dans ce navigateur uniquement.
                  Connectez-vous pour les synchroniser entre vos appareils (fonctionnalité à venir).
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB : ARTISANS
        ═══════════════════════════════════════════════ */}
        {activeTab === 'artisans' && (
          <div>
            {/* Not logged in */}
            {!profile && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-4xl">
                  🔒
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">
                  Connectez-vous pour retrouver les artisans que vous avez mis en favoris.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/connexion"
                    className="px-5 py-2.5 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/artisans"
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Voir les artisans
                  </Link>
                </div>
              </div>
            )}

            {/* Loading */}
            {profile && loadingArtisans && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="h-36 bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {profile && !loadingArtisans && artisanFavs.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{artisanFavs.length}</span> artisan{artisanFavs.length !== 1 ? 's' : ''} sauvegardé{artisanFavs.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {artisanFavs.map(row => (
                    <ArtisanFavCard
                      key={row.id}
                      row={row}
                      onRemove={removeArtisanFav}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty */}
            {profile && !loadingArtisans && artisanFavs.length === 0 && (
              <EmptyFav
                icon="🔧"
                title="Aucun artisan sauvegardé"
                desc="Cliquez sur le cœur ❤️ d'une fiche artisan pour le retrouver ici rapidement."
                href="/artisans"
                cta="Parcourir les artisans"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

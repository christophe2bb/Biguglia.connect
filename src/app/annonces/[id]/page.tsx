'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, MapPin, Calendar, Tag, Pencil, Trash2, Share2,
  Heart, MessageCircle, Copy, Clock, CheckCircle2, Archive,
  AlertTriangle, Eye, Zap, ArrowLeftRight, Phone, PackageCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Listing } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, STATUS_LABELS, formatDate, formatRelative } from '@/lib/utils';
import StatusManager from '@/components/ui/StatusManager';
import toast from 'react-hot-toast';
import { TrustScoreFull } from '@/components/ui/TrustScore';
import ContactButton from '@/components/ui/ContactButton';
import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';
import { SectorBadge } from '@/components/ui/SectorFilter';

// Extended type labels & colors (CDC)
const ALL_TYPE_LABELS: Record<string, string> = {
  ...LISTING_TYPE_LABELS,
  exchange: 'Échange',
  rental: 'Location',
};
const ALL_TYPE_COLORS: Record<string, string> = {
  ...LISTING_TYPE_COLORS,
  exchange: 'bg-amber-100 text-amber-700',
  rental: 'bg-cyan-100 text-cyan-700',
};
const ALL_TYPE_EMOJIS: Record<string, string> = {
  sale: '🏷️', wanted: '🔍', free: '🎁', service: '🛠️',
  exchange: '🔄', rental: '🔑',
};

const CONDITION_LABELS: Record<string, string> = {
  neuf: '✨ Neuf',
  tres_bon: '👍 Très bon état',
  bon: '👌 Bon état',
  usage: '🔧 Usagé',
  a_reparer: '🔨 À réparer',
  lot: '📦 Lot',
  excellent: '⭐ Excellent',
  passable: '⚠️ Passable',
};

// Status timeline steps for listings
const STATUS_TIMELINE = [
  { status: 'draft', label: 'Brouillon', icon: '📝' },
  { status: 'active', label: 'Publiée', icon: '✅' },
  { status: 'reserved', label: 'Réservée', icon: '🔒' },
  { status: 'sold', label: 'Vendue', icon: '🎉' },
];

type ExtListing = Listing & {
  user_id?: string;
  sector_id?: string;
  is_urgent?: boolean;
  is_negotiable?: boolean;
  pickup_notes?: string;
  availability_window?: string;
  exchange_preferences?: string;
  condition_state?: string;
  views_count?: number;
  expires_at?: string;
};

export default function AnnonceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [listing, setListing] = useState<ExtListing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('active');
  const [isSaved, setIsSaved] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // Load saved state
  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem('annonces_favorites');
      const saved: string[] = stored ? JSON.parse(stored) : [];
      setIsSaved(saved.includes(id as string));
    } catch { /* ignore */ }
  }, [id]);

  const toggleSave = useCallback(() => {
    if (!id) return;
    setIsSaved(prev => {
      const next = !prev;
      try {
        const stored = localStorage.getItem('annonces_favorites');
        const saved: string[] = stored ? JSON.parse(stored) : [];
        const updated = next ? [...saved, id as string] : saved.filter(s => s !== id);
        localStorage.setItem('annonces_favorites', JSON.stringify(updated));
      } catch { /* ignore */ }
      toast(next ? 'Annonce sauvegardée en favoris !' : 'Retirée des favoris', { icon: next ? '❤️' : '💔' });
      return next;
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('listings')
        .select('*, category:listing_categories(*), photos:listing_photos(id, url, display_order)')
        .eq('id', id as string)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch author profile
      let userData = null;
      if (data.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, created_at, role')
          .eq('id', data.user_id)
          .single();
        userData = userProfile;
      }

      // Sort photos
      if (data.photos) {
        data.photos.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
      }

      const enriched = { ...data, user: userData } as unknown as ExtListing;
      setListing(enriched);
      setCurrentStatus((enriched.status as string) || 'active');
      setLoading(false);

      // Fetch similar listings (same category, active, different id)
      if (data.category_id) {
        const { data: simData } = await supabase
          .from('listings')
          .select('*, category:listing_categories(*), photos:listing_photos(url)')
          .eq('category_id', data.category_id)
          .eq('status', 'active')
          .neq('id', id as string)
          .limit(3)
          .order('created_at', { ascending: false });
        setSimilar((simData as Listing[]) || []);
      }

      // Increment view counter (best-effort, ignore errors)
      if (data.views_count !== undefined) {
        supabase
          .from('listings')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', id as string)
          .then(() => { /* fire-and-forget */ });
      }
    };
    fetchListing();
  }, [id]);

  const handleDelete = async () => {
    if (!listing || !profile) return;
    if (!window.confirm('Supprimer définitivement cette annonce ? Cette action est irréversible.')) return;

    setDeleting(true);
    const supabase = createClient();

    const photos = listing.photos as Array<{ id: string; url: string }> | undefined;
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const urlParts = photo.url.split('/storage/v1/object/public/photos/');
        if (urlParts[1]) await supabase.storage.from('photos').remove([urlParts[1]]);
      }
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);
    }

    const { error } = await supabase.from('listings').delete().eq('id', listing.id);
    if (error) { toast.error('Erreur lors de la suppression'); setDeleting(false); return; }

    toast.success('Annonce supprimée');
    router.push('/annonces');
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async (method: 'copy' | 'native' | 'sms' | 'email') => {
    if (method === 'native' && navigator.share) {
      await navigator.share({ title: listing?.title, url: shareUrl });
      return;
    }
    if (method === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(`${listing?.title} — ${shareUrl}`)}`);
      return;
    }
    if (method === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(listing?.title || 'Annonce')}&body=${encodeURIComponent(`Bonjour,\n\nJe t'envoie cette annonce sur Biguglia Connect :\n${listing?.title}\n${shareUrl}`)}`);
      return;
    }
    // copy
    navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
    setShowSharePanel(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce introuvable</h1>
        <p className="text-gray-500 mb-6">Cette annonce n&apos;existe pas ou a été supprimée.</p>
        <Link href="/annonces" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour aux annonces
        </Link>
      </div>
    );
  }

  const rawPhotos = listing.photos as Array<{ id: string; url: string; display_order: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const isOwner = profile?.id === listing.user_id;
  const typeLabel = ALL_TYPE_LABELS[listing.listing_type] || listing.listing_type;
  const typeColor = ALL_TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';
  const typeEmoji = ALL_TYPE_EMOJIS[listing.listing_type] || '📦';

  // Build timeline steps for this listing
  const timelineSteps = (() => {
    const statusOrder = ['draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'archived'];
    const currentIdx = statusOrder.indexOf(currentStatus);
    return STATUS_TIMELINE.map((step, i) => ({
      ...step,
      done: currentIdx >= statusOrder.indexOf(step.status),
      current: currentStatus === step.status,
    }));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/annonces" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            Annonces
          </Link>
          <div className="flex items-center gap-2">
            {/* View count */}
            {listing.views_count !== undefined && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3.5 h-3.5" />
                {listing.views_count} vue{listing.views_count !== 1 ? 's' : ''}
              </span>
            )}
            {/* Favorite */}
            <button
              onClick={toggleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                isSaved ? 'bg-pink-100 text-pink-600 border border-pink-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{isSaved ? 'Sauvegardé' : 'Sauvegarder'}</span>
            </button>
            {/* Share */}
            <div className="relative">
              <button
                onClick={() => setShowSharePanel(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Partager</span>
              </button>
              {showSharePanel && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-52 z-30">
                  <p className="text-xs font-semibold text-gray-500 mb-2 px-2">Partager via</p>
                  <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <Copy className="w-4 h-4 text-gray-400" /> Copier le lien
                  </button>
                  <button onClick={() => handleShare('sms')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <MessageCircle className="w-4 h-4 text-green-500" /> SMS
                  </button>
                  <button onClick={() => handleShare('email')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <MessageCircle className="w-4 h-4 text-blue-500" /> Email
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button onClick={() => handleShare('native')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      <Share2 className="w-4 h-4 text-indigo-500" /> Autres…
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Owner edit */}
            {isOwner && (
              <Link href={`/annonces/${listing.id}/modifier`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Modifier</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Urgent banner */}
        {listing.is_urgent && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
            <Zap className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-700">Annonce urgente</p>
              <p className="text-xs text-red-600">Le vendeur souhaite conclure rapidement.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {photos.length > 0 ? (
              <PhotoGallery photos={photos} title={listing.title} mainHeight="h-80" />
            ) : (
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <span className="text-5xl opacity-30">{listing.category?.icon || '📦'}</span>
              </div>
            )}

            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full ${typeColor}`}>
                  {typeEmoji} {typeLabel}
                </span>
                <StatusBadge status={listing.status} contentType="listing" size="md" showIcon showDot={listing.status === 'active'} />
                {listing.category && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {listing.category.icon} {listing.category.name}
                  </span>
                )}
                {listing.is_negotiable && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                    💬 Prix négociable
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>

              {listing.price !== undefined && listing.price !== null && (
                <div className="text-3xl font-black text-blue-600 mb-3">
                  {listing.price === 0 ? '🎁 Gratuit' : `${listing.price.toLocaleString('fr-FR')} €`}
                  {listing.is_negotiable && <span className="text-sm font-normal text-gray-400 ml-2">à discuter</span>}
                </div>
              )}
              {listing.listing_type === 'free' && !listing.price && (
                <div className="text-3xl font-black text-green-600 mb-3">🎁 Gratuit</div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {listing.location}
                </div>
                {listing.sector_id && <SectorBadge sectorId={listing.sector_id} size="sm" />}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(listing.created_at)}
                </div>
                {listing.condition && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    {CONDITION_LABELS[listing.condition] || listing.condition}
                  </div>
                )}
                {listing.views_count !== undefined && (
                  <div className="flex items-center gap-1 sm:hidden">
                    <Eye className="w-4 h-4" />
                    {listing.views_count} vue{listing.views_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Extra details (CDC fields) */}
            {(listing.pickup_notes || listing.availability_window || listing.exchange_preferences) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                <h2 className="font-bold text-gray-900 mb-1">Informations pratiques</h2>
                {listing.availability_window && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">Disponibilité : </span>
                      {listing.availability_window}
                    </div>
                  </div>
                )}
                {listing.pickup_notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <PackageCheck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">Remise / retrait : </span>
                      {listing.pickup_notes}
                    </div>
                  </div>
                )}
                {listing.exchange_preferences && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowLeftRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">Échange souhaité contre : </span>
                      {listing.exchange_preferences}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Progression de l&apos;annonce</h2>
              <div className="flex items-center gap-0">
                {timelineSteps.map((step, i) => (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border-2 transition-all ${
                        step.current
                          ? 'bg-blue-600 border-blue-600 text-white scale-110'
                          : step.done
                          ? 'bg-green-50 border-green-400 text-green-600'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}>
                        {step.done && !step.current ? <CheckCircle2 className="w-4 h-4" /> : <span>{step.icon}</span>}
                      </div>
                      <p className={`text-[10px] mt-1 font-semibold text-center leading-tight ${
                        step.current ? 'text-blue-600' : step.done ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Similar listings */}
            {similar.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">
                  📌 Annonces similaires ({listing.category?.name})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {similar.map(sim => {
                    const simPhotos = sim.photos as Array<{ url: string }> | undefined;
                    return (
                      <Link key={sim.id} href={`/annonces/${sim.id}`} className="group block">
                        <div className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm hover:border-gray-200 transition-all">
                          <div className="relative h-28 overflow-hidden bg-gray-100">
                            {simPhotos && simPhotos.length > 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={simPhotos[0].url} alt={sim.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-3xl opacity-20">{sim.category?.icon || '📦'}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{sim.title}</p>
                            <p className="text-xs text-blue-600 font-bold mt-1">
                              {sim.listing_type === 'free' ? '🎁 Gratuit' : sim.price ? `${sim.price} €` : '—'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Seller card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Publié par</h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={(listing.user as { avatar_url?: string })?.avatar_url}
                  name={(listing.user as { full_name?: string })?.full_name || '?'}
                  size="md"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {(listing.user as { full_name?: string })?.full_name || 'Anonyme'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Publié {formatRelative(listing.created_at)}
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="mb-3 text-xs text-center text-gray-400 italic py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  ✉️ Les autres membres vous contacteront via ce bouton
                </div>
              ) : listing.status === 'active' ? (
                <ContactButton
                  sourceType="listing"
                  sourceId={listing.id}
                  sourceTitle={listing.title}
                  ownerId={listing.user_id || ''}
                  userId={profile?.id}
                  ctaLabel={listing.listing_type === 'wanted' ? '✉️ Proposer un article' : '💬 Discuter en privé'}
                  prefillMsg={`Bonjour, je suis intéressé(e) par votre annonce "${listing.title}"${listing.price ? ` à ${listing.price} €` : ''} — est-elle toujours disponible ?`}
                  className="mb-3 w-full"
                />
              ) : (
                <div className="mb-3 p-3 bg-gray-50 rounded-xl text-xs text-center text-gray-500 font-medium border border-dashed border-gray-200">
                  {currentStatus === 'sold' || currentStatus === 'given' || currentStatus === 'exchanged'
                    ? '🎉 Cette annonce est clôturée'
                    : currentStatus === 'reserved'
                    ? '🔒 Déjà réservé'
                    : '⏸️ Annonce inactive'}
                </div>
              )}

              {isOwner && (
                <div className="space-y-2">
                  <div className="text-xs text-center text-blue-600 font-medium py-1.5 bg-blue-50 rounded-xl">
                    ✅ C&apos;est votre annonce
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <StatusManager
                      contentType="listing"
                      currentStatus={currentStatus}
                      onStatusChange={async (newStatus) => {
                        const supabase = createClient();
                        const { error } = await supabase
                          .from('listings')
                          .update({ status: newStatus, updated_at: new Date().toISOString() })
                          .eq('id', listing.id);
                        if (error) throw error;
                        setCurrentStatus(newStatus);
                        setListing(prev => prev ? { ...prev, status: newStatus as ExtListing['status'] } : prev);
                      }}
                      onDelete={handleDelete}
                    />
                  </div>
                  <Link
                    href={`/annonces/${listing.id}/modifier`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier l&apos;annonce
                  </Link>
                  <button
                    onClick={() => {
                      if (navigator.share) navigator.share({ title: listing.title, url: shareUrl });
                      else { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié !'); }
                    }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Partager
                  </button>
                  {deleting && (
                    <button onClick={handleDelete} disabled={deleting} className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Seller reputation */}
            {listing.user && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    ⭐ Réputation du vendeur
                  </h3>
                </div>
                <div className="p-4">
                  <TrustScoreFull
                    profile={{
                      id: listing.user_id || '',
                      created_at: (listing.user as { created_at?: string }).created_at ?? new Date().toISOString(),
                      role: (listing.user as { role?: string }).role ?? 'resident',
                      avatar_url: listing.user.avatar_url ?? null,
                      phone: null,
                      full_name: (listing.user as { full_name?: string }).full_name ?? null,
                    }}
                  />
                  <Link
                    href={`/profil/${listing.user_id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    Voir le profil complet →
                  </Link>
                </div>
              </div>
            )}

            {/* Expiry info */}
            {listing.expires_at && (
              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
                new Date(listing.expires_at) < new Date() ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'
              }`}>
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    {new Date(listing.expires_at) < new Date() ? '⏱ Annonce expirée' : '⏱ Expire le'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{formatDate(listing.expires_at)}</p>
                </div>
              </div>
            )}

            {/* Safety tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-blue-800 mb-2">🔒 Conseils de sécurité</h4>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li>• Rencontrez-vous dans un lieu public</li>
                <li>• Vérifiez le produit avant de payer</li>
                <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
                <li>• Utilisez la messagerie de la plateforme</li>
                <li>• Méfiez-vous des offres trop alléchantes</li>
              </ul>
            </div>

            {/* Report */}
            {!isOwner && profile && (
              <button
                onClick={async () => {
                  const reason = prompt('Motif du signalement :');
                  if (!reason) return;
                  const supabase = createClient();
                  await supabase.from('reports').insert({
                    reporter_id: profile.id,
                    target_type: 'listing',
                    target_id: id as string,
                    reason,
                    status: 'pending',
                  });
                  toast.success("Signalement envoyé à l'équipe de modération");
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Signaler cette annonce
              </button>
            )}
          </div>
        </div>

        {/* Sticky mobile action bar */}
        {!isOwner && listing.status === 'active' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg">
            <button
              onClick={toggleSave}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                isSaved ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? 'Favori' : 'Sauvegarder'}
            </button>
            {profile ? (
              <ContactButton
                sourceType="listing"
                sourceId={listing.id}
                sourceTitle={listing.title}
                ownerId={listing.user_id || ''}
                userId={profile?.id}
                ctaLabel={listing.listing_type === 'wanted' ? '✉️ Proposer un article' : '💬 Contacter'}
                prefillMsg={`Bonjour, je suis intéressé(e) par votre annonce "${listing.title}".`}
                className="flex-1"
              />
            ) : (
              <Link href="/connexion" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                <Phone className="w-4 h-4" /> Contacter
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

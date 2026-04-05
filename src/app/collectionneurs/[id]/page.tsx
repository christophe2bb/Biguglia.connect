'use client';

/**
 * Collectionneurs — Fiche détail objet v2.0 Premium
 * Galerie immersive, confiance vendeur, offres, favoris
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative, cn } from '@/lib/utils';
import {
  ChevronLeft, Heart, Share2, Flag, MapPin, Truck, Package,
  MessageSquare, ArrowLeftRight, Gift, Search, Star, Shield,
  BadgeCheck, Phone, Clock, Eye, CheckCircle2, AlertTriangle,
  Pencil, Trash2, Loader2, ChevronLeft as Left, ChevronRight as Right,
  Gem, Tag, Calendar, Ruler, Palette, Layers, Info,
  ThumbsUp, ArrowRight, Zap,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import ContactButton from '@/components/ui/ContactButton';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import toast from 'react-hot-toast';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionItem, type CollectionMode, type CollectionStatus,
  type ConditionLevel, type RarityLevel,
} from '@/lib/collectionneurs-config';

// ─── Transitions statut autorisées par mode ────────────────────────────────────
const TRANSITIONS: Record<CollectionMode, Partial<Record<CollectionStatus, CollectionStatus[]>>> = {
  vente: {
    actif:   ['reserve', 'vendu', 'retire'],
    reserve: ['actif', 'vendu', 'retire'],
    vendu:   ['archive'],
    retire:  ['archive'],
  },
  echange: {
    actif:   ['reserve', 'echange', 'retire'],
    reserve: ['actif', 'echange', 'retire'],
    echange: ['archive'],
    retire:  ['archive'],
  },
  don: {
    actif:   ['reserve', 'donne', 'retire'],
    reserve: ['actif', 'donne', 'retire'],
    donne:   ['archive'],
    retire:  ['archive'],
  },
  recherche: {
    actif:   ['trouve', 'retire'],
    trouve:  ['archive'],
    retire:  ['archive'],
  },
};

function getAllowedTransitions(mode: CollectionMode, status: CollectionStatus): CollectionStatus[] {
  return TRANSITIONS[mode]?.[status] || [];
}

const TRANSITION_LABELS: Partial<Record<CollectionStatus, string>> = {
  actif:   '✅ Remettre en vente',
  reserve: '⏳ Marquer Réservé',
  vendu:   '💰 Marquer Vendu',
  echange: '🔄 Marquer Échangé',
  donne:   '❤️ Marquer Donné',
  trouve:  '🔍 Objet Trouvé',
  retire:  '❌ Retirer l\'annonce',
  archive: '📦 Archiver',
};

// ─── Galerie immersive ────────────────────────────────────────────────────────

function ImmersiveGallery({ photos, title }: { photos: { url: string; is_cover?: boolean }[]; title: string }) {
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoItems = toPhotoItems(photos.map((p, i) => ({ url: p.url, display_order: i })));

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune photo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Image principale */}
      <div className="relative aspect-[4/3] bg-gray-50 rounded-3xl overflow-hidden cursor-zoom-in group"
           onClick={() => setLightboxOpen(true)}>
        <img
          src={photos[activeIdx]?.url}
          alt={`${title} - photo ${activeIdx + 1}`}
          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
        />
        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setActiveIdx(i => (i - 1 + photos.length) % photos.length); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            >
              <Left className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setActiveIdx(i => (i + 1) % photos.length); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            >
              <Right className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
        {/* Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">
            {activeIdx + 1} / {photos.length}
          </div>
        )}
        {/* Zoom hint */}
        <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          🔍 Cliquer pour agrandir
        </div>
      </div>

      {/* Miniatures */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                i === activeIdx ? 'border-orange-400 shadow-md' : 'border-transparent hover:border-gray-300'
              )}
            >
              <img src={photo.url} alt={`miniature ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer photos={photoItems} initialIndex={activeIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

// ─── Bloc confiance vendeur ────────────────────────────────────────────────────

function SellerTrustBlock({ author, showContact }: {
  author: NonNullable<CollectionItem['author']>;
  showContact?: boolean;
}) {
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_user_id', author.id)
        .eq('moderation_status', 'visible');
      if (data && data.length > 0) {
        const avg = data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
        setStats({ avg: Math.round(avg * 10) / 10, count: data.length });
      }
    };
    fetch();
  }, [author.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberSince = author.created_at
    ? new Date(author.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" /> Vendeur / Membre
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <Link href={`/profil/${author.id}`}>
          <Avatar src={author.avatar_url} name={author.full_name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profil/${author.id}`}
                className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
            {author.full_name}
          </Link>
          {memberSince && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Membre depuis {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* Stats confiance */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats && stats.count > 0 ? (
          <div className="text-center p-2 bg-amber-50 rounded-xl">
            <div className="text-lg font-black text-amber-700">{stats.avg}⭐</div>
            <div className="text-xs text-gray-500">{stats.count} avis</div>
          </div>
        ) : (
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-400">Nouveau</div>
            <div className="text-xs text-gray-400">membre</div>
          </div>
        )}
        <div className="text-center p-2 bg-blue-50 rounded-xl">
          <div className="text-sm font-bold text-blue-700">Actif</div>
          <div className="text-xs text-gray-500">sur Biguglia</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
          <BadgeCheck className="w-3 h-3" /> E-mail vérifié
        </span>
        {stats && stats.count >= 5 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3" /> Vendeur actif
          </span>
        )}
      </div>

      {showContact && (
        <Link href={`/profil/${author.id}`}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
          Voir le profil public →
        </Link>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CollectionItemDetailPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { profile } = useAuthStore();
  const supabase  = createClient();

  const [item,      setItem]      = useState<CollectionItem | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [isFav,     setIsFav]     = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [similar,   setSimilar]   = useState<CollectionItem[]>([]);

  const isOwner  = profile?.id === item?.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const isClosed = item ? STATUS_CONFIG[item.status]?.closed : false;

  // ── Fetch item ─────────────────────────────────────────────────────────────
  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          id, title, description, category_id, mode, item_type, status, price,
          exchange_expected, condition, rarity_level, year_period, brand, series_name,
          authenticity_declared, provenance, defects_noted, dimensions, material,
          shipping_available, local_meetup_available, city, postal_code,
          tags, author_id, views_count, favorites_count, messages_count, is_featured,
          published_at, created_at, updated_at,
          author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url, created_at),
          category:collection_categories(id, name, slug, icon, color),
          photos:collection_item_photos(url, is_cover, sort_order)
        `)
        .eq('id', id as string)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Normalise mode
      const mapped = {
        ...(data as unknown as CollectionItem),
        mode: ((data as Record<string, unknown>).mode || ((data as Record<string, unknown>).item_type === 'troc' ? 'echange' : (data as Record<string, unknown>).item_type)) as CollectionMode || 'vente',
        photos: ((data as Record<string, unknown>).photos as CollectionItem['photos'] || [])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      };
      setItem(mapped);

      // Enregistrer la vue
      if (profile?.id && profile.id !== (data as Record<string, unknown>).author_id) {
        supabase.from('collection_views').insert({ item_id: id, viewer_id: profile.id }).then(() => {});
      }

      // Vérifier si favori
      if (profile?.id) {
        const { data: fav } = await supabase
          .from('collection_favorites').select('id').eq('user_id', profile.id).eq('item_id', id).maybeSingle();
        setIsFav(!!fav);
      }

      // Annonces similaires
      const { data: sim } = await supabase
        .from('collection_items')
        .select(`id, title, price, mode, item_type, status, condition, author_id, created_at, photos:collection_item_photos(url, is_cover)`)
        .eq('status', 'actif')
        .eq('category_id', (data as Record<string, unknown>).category_id as string)
        .neq('id', id as string)
        .limit(4);
      setSimilar((sim || []).map((s: Record<string, unknown>) => ({
        ...(s as unknown as CollectionItem),
        mode: ((s.mode || (s.item_type === 'troc' ? 'echange' : s.item_type)) as CollectionMode) || 'vente',
        status: s.status as CollectionStatus || 'actif',
        condition: s.condition as ConditionLevel || 'bon',
      })));

    } finally { setLoading(false); }
  }, [id, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // ── Favori ─────────────────────────────────────────────────────────────────
  const handleFav = async () => {
    if (!profile?.id) { router.push(`/connexion?redirect=/collectionneurs/${id}`); return; }
    setFavLoading(true);
    try {
      if (isFav) {
        await supabase.from('collection_favorites').delete().eq('user_id', profile.id).eq('item_id', id as string);
        setIsFav(false); toast.success('Retiré des favoris');
      } else {
        await supabase.from('collection_favorites').insert({ user_id: profile.id, item_id: id });
        setIsFav(true); toast.success('Ajouté aux favoris ❤️');
      }
    } catch { toast.error('Erreur'); }
    finally { setFavLoading(false); }
  };

  // ── Changement de statut ────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: CollectionStatus) => {
    if (!item) return;
    setChangingStatus(true);
    try {
      const { error } = await supabase
        .from('collection_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      setItem(prev => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label}`);
    } catch { toast.error('Erreur lors du changement de statut'); }
    finally { setChangingStatus(false); }
  };

  // ── Suppression ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!item || !confirm('Supprimer définitivement cette annonce ?')) return;
    const { error } = await supabase.from('collection_items').delete().eq('id', item.id);
    if (error) { toast.error('Erreur lors de la suppression'); return; }
    toast.success('Annonce supprimée');
    router.push('/collectionneurs');
  };

  // ── Partage ─────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Annonce introuvable</h2>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline text-sm">← Retour aux annonces</Link>
        </div>
      </div>
    );
  }

  const modeCfg   = MODE_CONFIG[item.mode];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;
  const rarityCfg = item.rarity_level ? RARITY_CONFIG[item.rarity_level] : null;
  const condCfg   = CONDITION_CONFIG[item.condition];
  const ModeIcon  = modeCfg.icon;
  const allowedTransitions = isOwner ? getAllowedTransitions(item.mode, item.status) : [];

  const sortedPhotos = (item.photos || [])
    .map(p => ({ ...p, url: p.url || p.image_url || p.preview || '' }))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/collectionneurs" className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Collectionneurs
          </Link>
          {item.category && (
            <>
              <span>/</span>
              <span className="text-gray-700">{item.category.icon} {item.category.name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : galerie ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <ImmersiveGallery photos={sortedPhotos} title={item.title} />

            {/* Infos principales */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
                  <ModeIcon className="w-4 h-4" /> {modeCfg.label}
                </span>
                <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', statusCfg.bg, statusCfg.color)}>
                  {statusCfg.label}
                </span>
                {item.is_featured && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white">
                    ✨ À la une
                  </span>
                )}
                {rarityCfg && item.rarity_level !== 'commun' && (
                  <span className={cn('text-sm font-semibold flex items-center gap-1', rarityCfg.color)}>
                    <Gem className="w-3.5 h-3.5" /> {rarityCfg.icon} {rarityCfg.label}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-3 leading-snug">{item.title}</h1>

              {/* Prix / mode */}
              <div className="mb-4">
                {item.mode === 'vente' && item.price != null ? (
                  <div className="text-3xl font-black text-gray-900">
                    {item.price === 0
                      ? <span className="text-emerald-600">Gratuit</span>
                      : `${item.price.toLocaleString('fr-FR')} €`
                    }
                  </div>
                ) : item.mode === 'don' ? (
                  <div className="text-2xl font-black text-emerald-600">Don gratuit ❤️</div>
                ) : item.mode === 'echange' ? (
                  <div>
                    <div className="text-xl font-black text-amber-700 flex items-center gap-2">
                      <ArrowLeftRight className="w-5 h-5" /> Échange
                    </div>
                    {item.exchange_expected && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        Recherche en échange : <strong>{item.exchange_expected}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xl font-black text-purple-700 flex items-center gap-2">
                    <Search className="w-5 h-5" /> Objet recherché
                  </div>
                )}
              </div>

              {/* Localisation & livraison */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-5">
                {item.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {item.city}{item.postal_code ? ` (${item.postal_code})` : ''}
                  </div>
                )}
                {item.shipping_available && (
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Truck className="w-4 h-4" /> Expédition possible
                  </div>
                )}
                {item.local_meetup_available && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Remise en main propre
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-5">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-2">Description</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats vues */}
              <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 border-t border-gray-50">
                {(item.views_count || 0) > 0 && <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.views_count} vues</span>}
                {(item.favorites_count || 0) > 0 && <span className="flex items-center gap-1">❤️ {item.favorites_count} favoris</span>}
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatRelative(item.published_at || item.created_at)}</span>
              </div>
            </div>

            {/* Détails objet */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" /> Détails de l&apos;objet
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: CheckCircle2, label: 'État', value: condCfg.label, color: condCfg.color },
                  rarityCfg ? { icon: Gem, label: 'Rareté', value: `${rarityCfg.icon} ${rarityCfg.label}`, color: rarityCfg.color } : null,
                  item.year_period ? { icon: Calendar, label: 'Période / année', value: item.year_period, color: '' } : null,
                  item.brand ? { icon: Tag, label: 'Marque / éditeur', value: item.brand, color: '' } : null,
                  item.series_name ? { icon: Layers, label: 'Série / collection', value: item.series_name, color: '' } : null,
                  item.dimensions ? { icon: Ruler, label: 'Dimensions', value: item.dimensions, color: '' } : null,
                  item.material ? { icon: Palette, label: 'Matière', value: item.material, color: '' } : null,
                  item.authenticity_declared ? { icon: Shield, label: 'Authenticité', value: '✅ Déclarée authentique', color: 'text-emerald-600' } : null,
                ].filter(Boolean).map((detail, i) => {
                  const IconComp = detail!.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <IconComp className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{detail!.label}</p>
                        <p className={cn('text-sm font-semibold text-gray-800', detail!.color)}>{detail!.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Défauts honnêtes */}
              {item.defects_noted && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 mb-1">Défauts signalés par le vendeur</p>
                      <p className="text-sm text-amber-800">{item.defects_noted}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Provenance */}
              {item.provenance && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs font-bold text-blue-700 mb-1">Provenance / historique</p>
                  <p className="text-sm text-blue-800">{item.provenance}</p>
                </div>
              )}
            </div>

            {/* Avis sur cet objet */}
            <div>
              <RatingWidget
                targetType="collection_item"
                targetId={item.id}
                authorId={item.author_id}
                userId={profile?.id}
                compact={false}
                showPoll
              />
            </div>

            {/* Annonces similaires */}
            {similar.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">Objets similaires</h2>
                  <Link href="/collectionneurs" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                    Voir tout <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {similar.map(sim => {
                    const simMode = MODE_CONFIG[sim.mode] || MODE_CONFIG.vente;
                    const SimIcon = simMode.icon;
                    const simPhoto = sim.photos?.find(p => p.is_cover) || sim.photos?.[0];
                    return (
                      <Link key={sim.id} href={`/collectionneurs/${sim.id}`}
                            className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-sm transition-all">
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          {simPhoto ? (
                            <img src={simPhoto.url} alt={sim.title}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">📦</div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{sim.title}</p>
                          <span className={cn('inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full', simMode.bg, simMode.color)}>
                            <SimIcon className="w-2.5 h-2.5" />
                            {sim.mode === 'vente' && sim.price != null
                              ? (sim.price === 0 ? 'Gratuit' : `${sim.price} €`)
                              : simMode.label
                            }
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar droite ─────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* CTA principal */}
            {!isClosed && !isOwner && (
              <div className={cn('rounded-2xl border p-5', modeCfg.bg, modeCfg.border)}>
                <h3 className={cn('font-black mb-3 text-base', modeCfg.color)}>
                  {modeCfg.cta}
                </h3>
                <ContactButton
                  sourceType="collection_item"
                  sourceId={item.id}
                  sourceTitle={item.title}
                  ownerId={item.author_id}
                  userId={profile?.id}
                  className="w-full mb-2"
                />
                <p className="text-xs text-gray-500 text-center mt-2">
                  💬 La messagerie privée est sécurisée
                </p>
              </div>
            )}

            {/* Réservé message */}
            {item.status === 'reserve' && !isOwner && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-sm font-bold text-amber-800">Cet objet est réservé</p>
                <p className="text-xs text-amber-700 mt-1">Il peut se libérer — contactez le vendeur</p>
              </div>
            )}

            {/* Objet clôturé */}
            {isClosed && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm font-bold text-gray-700">{statusCfg.label}</p>
                <p className="text-xs text-gray-500 mt-1">Cette annonce est clôturée</p>
              </div>
            )}

            {/* Actions propriétaire */}
            {isOwner && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-black text-gray-700 mb-3">Gérer mon annonce</h3>

                <div className="text-xs text-center font-semibold py-2 px-3 bg-blue-50 text-blue-700 rounded-xl mb-3">
                  ✏️ C&apos;est votre annonce
                </div>

                {/* Changement de statut */}
                {allowedTransitions.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Changer le statut :</p>
                    {allowedTransitions.map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        disabled={changingStatus}
                        className={cn(
                          'w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all border text-left',
                          STATUS_CONFIG[st]?.bg, STATUS_CONFIG[st]?.color,
                          'hover:opacity-80 border-current/20'
                        )}
                      >
                        {changingStatus ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                        {TRANSITION_LABELS[st] || st}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2 mt-3">
                  <Link href={`/collectionneurs/${item.id}/modifier`}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">
                    <Pencil className="w-4 h-4" /> Modifier l&apos;annonce
                  </Link>
                  <Link href="/dashboard/collectionneurs"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                    📊 Mes statistiques
                  </Link>
                  <button onClick={handleDelete}
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-red-400 hover:text-red-600 text-sm transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* Favoris & partage */}
            <div className="flex gap-2">
              <button
                onClick={handleFav}
                disabled={favLoading}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  isFav ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {favLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  <Heart className={cn('w-4 h-4', isFav && 'fill-current')} />}
                {isFav ? 'Favori ❤️' : 'Favoris'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Share2 className="w-4 h-4" /> Partager
              </button>
            </div>

            {/* Confiance vendeur */}
            {item.author && (
              <SellerTrustBlock author={item.author} showContact />
            )}

            {/* Signalement */}
            {!isOwner && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <ReportButton
                  targetType="collection_item"
                  targetId={item.id}
                  targetTitle={item.title}
                  variant="mini"
                />
              </div>
            )}

            {/* Conseils sécurité */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Conseils de sécurité
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Rencontrez-vous dans un lieu public</li>
                <li>• Vérifiez l&apos;objet avant de conclure</li>
                <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
                <li>• Utilisez la messagerie de la plateforme</li>
                <li>• Méfiez-vous des offres trop alléchantes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

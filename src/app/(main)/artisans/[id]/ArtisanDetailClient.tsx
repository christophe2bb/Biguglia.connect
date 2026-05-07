'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Clock, Shield, Star, Phone, Calendar, ChevronLeft, ChevronRight, Heart, HardHat, Users, CheckCircle, FileCheck, X, ZoomIn, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ArtisanProfile, Review } from '@/types';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';
import ContactButton from '@/components/ui/ContactButton';
import ReviewForm from '@/components/ui/ReviewForm';

// Nombre de documents fournis (sans exposer leur contenu)
function DocBadge({ artisan }: { artisan: ArtisanProfile }) {
  const docCount = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;
  if (docCount === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
      <FileCheck className="w-3.5 h-3.5" />
      {docCount} document{docCount > 1 ? 's' : ''} vérifié{docCount > 1 ? 's' : ''}
    </div>
  );
}

// Badge type artisan
function ArtisanTypeBadge({ artisan }: { artisan: ArtisanProfile }) {
  const isPro = artisan.artisan_type === 'professionnel';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      isPro
        ? 'bg-blue-100 text-blue-800 border border-blue-200'
        : 'bg-green-100 text-green-800 border border-green-200'
    }`}>
      {isPro
        ? <><HardHat className="w-3.5 h-3.5" /> Professionnel</>
        : <><Users className="w-3.5 h-3.5" /> Particulier / Bénévole</>
      }
    </span>
  );
}

export default function ArtisanDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Avis
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewInteractionId, setReviewInteractionId] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Swipe tactile
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback((total: number) => {
    setActivePhoto(p => (p + 1) % total);
  }, []);

  const goPrev = useCallback((total: number) => {
    setActivePhoto(p => (p - 1 + total) % total);
  }, []);

  // Clavier (flèches + Échap) quand la lightbox est ouverte
  useEffect(() => {
    if (!lightboxOpen || !artisan?.gallery) return;
    const total = artisan.gallery.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext(total);
      if (e.key === 'ArrowLeft') goPrev(total);
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, artisan?.gallery, goNext, goPrev]);

  useEffect(() => {
    const fetchArtisan = async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from('artisan_profiles')
        .select(`
          *,
          profile:profiles!artisan_profiles_user_id_fkey(id, full_name, avatar_url, phone),
          trade_category:trade_categories(*),
          gallery:artisan_photos(*)
        `)
        .eq('id', id as string)
        .single();

      if (!data) {
        router.push('/artisans');
        return;
      }
      setArtisan(data as ArtisanProfile);

      // Incrémenter le compteur de vues (ne bloque pas le chargement)
      void supabase.rpc('increment_artisan_view', { artisan_id: id as string });

      // Reviews
      const { data: rev } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('artisan_id', id as string)
        .order('created_at', { ascending: false });
      setReviews(rev as Review[] || []);

      // Favori — user_favorites est la table réelle (favorite_artisans n'existe pas)
      if (profile) {
        try {
          const { data: fav } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', profile.id)
            .eq('target_id', id as string)
            .eq('target_type', 'artisan')
            .maybeSingle();
          setIsFavorite(!!fav);
        } catch { setIsFavorite(false); }
      }

      setLoading(false);
    };

    if (id) fetchArtisan();
  }, [id, profile, router]);

  const toggleFavorite = async () => {
    if (!profile) { router.push('/connexion'); return; }
    const supabase = createClient();
    if (isFavorite) {
      await supabase.from('user_favorites').delete()
        .eq('user_id', profile.id).eq('target_id', id as string).eq('target_type', 'artisan');
      setIsFavorite(false);
      toast.success('Retiré des favoris');
    } else {
      await supabase.from('user_favorites').insert({ user_id: profile.id, target_id: id, target_type: 'artisan' });
      setIsFavorite(true);
      toast.success('Ajouté aux favoris');
    }
  };

  // ── Ouvrir le formulaire d'avis : crée automatiquement la trust_interaction ──
  const openReviewForm = async () => {
    if (!profile) { router.push('/connexion'); return; }
    if (!artisan) return;
    setReviewLoading(true);
    const supabase = createClient();

    // Vérifier si l'utilisateur a déjà laissé un avis sur cet artisan
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('target_user_id', artisan.user_id)
      .eq('author_id', profile.id)
      .maybeSingle();

    if (existingReview) {
      toast('Vous avez déjà laissé un avis sur cet artisan.', { icon: 'ℹ️' });
      setAlreadyReviewed(true);
      setReviewLoading(false);
      return;
    }

    // Chercher une trust_interaction existante pour cet artisan
    const { data: existing } = await supabase
      .from('trust_interactions')
      .select('id')
      .eq('source_type', 'service_request')
      .eq('requester_id', profile.id)
      .eq('receiver_id', artisan.user_id)
      .maybeSingle();

    let interactionId = existing?.id ?? null;

    if (!interactionId) {
      // Créer une nouvelle interaction directe (visite de profil)
      const { data: created } = await supabase
        .from('trust_interactions')
        .insert({
          source_type:      'service_request',
          source_id:        artisan.id,  // id du profil artisan
          requester_id:     profile.id,
          receiver_id:      artisan.user_id,
          interaction_type: 'service_request',
          status:           'done',
          review_unlocked:  true,
          review_requester_done: false,
          review_receiver_done:  false,
          completed_at:     new Date().toISOString(),
        })
        .select('id')
        .single();
      interactionId = created?.id ?? null;
    } else {
      // Débloquer l'avis si pas encore fait
      await supabase.from('trust_interactions').update({
        status: 'done',
        review_unlocked: true,
        completed_at: new Date().toISOString(),
      }).eq('id', interactionId);
    }

    setReviewLoading(false);
    if (!interactionId) { toast.error('Impossible d\'ouvrir le formulaire'); return; }
    setReviewInteractionId(interactionId);
    setReviewOpen(true);
  };

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-80 bg-gray-100 rounded-2xl mb-6" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-100 rounded mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  if (!artisan) return null;

  // ── Fusionner avatar_url + galerie en une seule liste d'URLs ──────────────
  // avatar_url en premier (si présent et pas déjà dans la galerie),
  // puis toutes les photos de chantier triées par display_order.
  const allPhotos: string[] = (() => {
    const galleryUrls = (artisan.gallery ?? [])
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(p => p.url);
    const avatar = artisan.avatar_url ?? artisan.profile?.avatar_url ?? null;
    if (avatar && !galleryUrls.includes(avatar)) {
      return [avatar, ...galleryUrls];
    }
    return galleryUrls;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Retour */}
      <Link href="/artisans" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour aux artisans
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galerie — carousel */}
          {allPhotos.length > 0 ? (() => {
            const total = allPhotos.length;
            return (
              <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
                {/* Image principale */}
                <button
                  type="button"
                  aria-label="Ouvrir la galerie en plein écran"
                  className="relative h-72 sm:h-80 cursor-zoom-in select-none w-full block"
                  onClick={() => setLightboxOpen(true)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true); }}
                  onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={e => {
                    if (touchStartX.current === null) return;
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    if (dx < -40) goNext(total);
                    else if (dx > 40) goPrev(total);
                    touchStartX.current = null;
                  }}
                >
                  <Image
                    src={allPhotos[activePhoto]}
                    alt={`Réalisation ${activePhoto + 1} sur ${total}`}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-opacity duration-300"
                  />

                  {/* Bouton zoom */}
                  <div className="absolute top-3 right-3 bg-black/40 rounded-xl p-1.5 text-white pointer-events-none">
                    <ZoomIn className="w-4 h-4" />
                  </div>

                  {/* Flèches navigation */}
                  {total > 1 && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); goPrev(total); }}
                        aria-label="Photo précédente"
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); goNext(total); }}
                        aria-label="Photo suivante"
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Compteur + indicateurs */}
                  {total > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none">
                      <div className="flex gap-1.5">
                        {allPhotos.map((_, i) => (
                          <span
                            key={i}
                            className={`block rounded-full transition-all duration-300 ${
                              i === activePhoto
                                ? 'w-5 h-2 bg-white'
                                : 'w-2 h-2 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                        {activePhoto + 1} / {total}
                      </span>
                    </div>
                  )}
                </button>

                {/* Miniatures défilantes */}
                {total > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-gray-800/60">
                    {allPhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        aria-label={`Voir la réalisation ${i + 1}`}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                          i === activePhoto
                            ? 'border-brand-400 scale-105 shadow-lg'
                            : 'border-transparent opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="relative w-full h-full">
                          <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="h-64 gradient-hero rounded-2xl flex items-center justify-center">
              <span className="text-6xl">{artisan.trade_category?.icon || '🔧'}</span>
            </div>
          )}

          {/* Lightbox plein écran */}
          {lightboxOpen && allPhotos.length > 0 && (() => {
            const total = allPhotos.length;
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Galerie plein écran"
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              >
                {/* Fond cliquable pour fermer */}
                <button
                  type="button"
                  aria-label="Fermer la galerie"
                  className="absolute inset-0 w-full h-full cursor-default"
                  onClick={() => setLightboxOpen(false)}
                />
                {/* Fermer */}
                <button
                  className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Fermer"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Flèches lightbox */}
                {total > 1 && (
                  <>
                    <button
                      className="absolute left-4 text-white bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                      onClick={e => { e.stopPropagation(); goPrev(total); }}
                      aria-label="Photo précédente"
                    >
                      <ChevronLeft className="w-7 h-7" />
                    </button>
                    <button
                      className="absolute right-4 text-white bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                      onClick={e => { e.stopPropagation(); goNext(total); }}
                      aria-label="Photo suivante"
                    >
                      <ChevronRight className="w-7 h-7" />
                    </button>
                  </>
                )}

                {/* Image plein écran */}
                <div className="relative w-full max-w-4xl mx-8 aspect-video z-10">
                  <Image
                    src={allPhotos[activePhoto]}
                    alt={`Réalisation ${activePhoto + 1} sur ${total}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>

                {/* Compteur lightbox */}
                {total > 1 && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <span className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                      {activePhoto + 1} / {total}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Infos principales */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={artisan.profile?.avatar_url}
                  name={artisan.business_name || '?'}
                  size="lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{artisan.business_name}</h1>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <span className="text-gray-500 text-sm">{artisan.trade_category?.icon} {artisan.trade_category?.name}</span>
                    {/* Badge type artisan */}
                    <ArtisanTypeBadge artisan={artisan} />
                    {/* Badge vérifié admin */}
                    <Badge variant="success">
                      <Shield className="w-3 h-3 mr-1" />
                      Vérifié
                    </Badge>
                    {/* Badge documents fournis */}
                    <DocBadge artisan={artisan} />
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFavorite}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-pressed={isFavorite}
                className="p-2 rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} aria-hidden="true" />
              </button>
            </div>

            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={avgRating} size="md" />
                <span className="font-semibold text-gray-800">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({reviews.length} avis)</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {artisan.service_area}
              </div>
              {artisan.years_experience && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {artisan.years_experience} ans d&apos;expérience
                </div>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{artisan.description}</p>
          </div>

          {/* Avis */}
          <div id="avis" className="bg-white rounded-2xl border border-gray-100 p-6">
            {/* En-tête avis */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Avis clients {reviews.length > 0 && <span className="text-gray-400 font-normal text-base">({reviews.length})</span>}
              </h2>

              {/* Bouton Laisser un avis — visible pour tout utilisateur connecté sauf l'artisan */}
              {profile && profile.id !== artisan.user_id && !alreadyReviewed && !reviewOpen && (
                <button
                  type="button"
                  onClick={openReviewForm}
                  disabled={reviewLoading}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {reviewLoading
                    ? <span className="text-xs">Chargement…</span>
                    : <><Pencil className="w-3.5 h-3.5" /> Laisser un avis</>
                  }
                </button>
              )}

              {/* Avis déjà laissé */}
              {(alreadyReviewed) && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> Avis déjà soumis
                </span>
              )}

              {/* Pas connecté : invitation à se connecter */}
              {!profile && (
                <Link
                  href={`/connexion?redirect=/artisans/${artisan.id}#avis`}
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-semibold"
                >
                  <Star className="w-3.5 h-3.5" /> Se connecter pour noter
                </Link>
              )}
            </div>

            {/* Formulaire d'avis inline */}
            {reviewOpen && reviewInteractionId && (
              <div className="mb-6">
                <ReviewForm
                  interactionId={reviewInteractionId}
                  sourceType="service_request"
                  sourceId={artisan.id}
                  sourceTitle={artisan.business_name}
                  targetUserId={artisan.user_id}
                  targetUserName={artisan.business_name}
                  targetUserAvatar={artisan.profile?.avatar_url}
                  variant="inline"
                  onSuccess={() => {
                    setReviewOpen(false);
                    setAlreadyReviewed(true);
                    toast.success('Merci pour votre avis !');
                    // Rafraîchir les avis
                    const supabase = createClient();
                    supabase
                      .from('reviews')
                      .select('id, rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url)')
                      .eq('target_user_id', artisan.user_id)
                      .eq('moderation_status', 'visible')
                      .order('created_at', { ascending: false })
                      .limit(10)
                      .then(({ data }: { data: Record<string, unknown>[] | null }) => {
                        if (data) {
                          setReviews(data.map((r: Record<string, unknown>) => ({
                            ...r,
                            reviewer: (r as unknown as { author: { full_name: string; avatar_url?: string } }).author,
                          })) as unknown as Review[]);
                        }
                      });
                  }}
                  onCancel={() => setReviewOpen(false)}
                />
              </div>
            )}

            {/* Liste des avis */}
            {reviews.length === 0 && !reviewOpen ? (
              <EmptyState
                icon="💬"
                title="Pas encore d'avis"
                description={profile && profile.id !== artisan.user_id
                  ? 'Vous avez travaillé avec cet artisan ? Soyez le premier à partager votre expérience !'
                  : 'Les avis de vos clients apparaîtront ici.'}
              />
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        src={review.reviewer?.avatar_url}
                        name={review.reviewer?.full_name || 'Anonyme'}
                        size="sm"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{review.reviewer?.full_name || 'Anonyme'}</div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contacter */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Contacter {artisan.business_name}</h3>
            <ContactButton
              sourceType="artisan"
              sourceId={artisan.id}
              sourceTitle={artisan.business_name}
              ownerId={artisan.user_id}
              userId={profile?.id}
              ctaLabel="Envoyer un message"
              className="w-full justify-center"
              variant="primary"
            />
            <Link href={`/artisans/demande?artisan=${artisan.id}`}>
              <Button variant="outline" className="w-full mt-2">
                <Calendar className="w-4 h-4" />
                Demander un devis
              </Button>
            </Link>
            {artisan.profile?.phone && (
              <a href={`tel:${artisan.profile.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4 text-gray-400" />
                {artisan.profile.phone}
              </a>
            )}
          </div>

          {/* Disponibilité */}
          <div className="bg-brand-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-brand-800">Artisan disponible</span>
            </div>
            <p className="text-xs text-brand-600">
              Envoyer votre demande et attendez sa réponse directement dans vos messages.
            </p>
          </div>

          {/* Trust adapté au type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            {artisan.artisan_type === 'professionnel' ? (
              <>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-blue-600" /> Professionnel vérifié
                </h4>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    Profil validé par l&apos;administrateur
                  </li>
                  {artisan.siret && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      SIRET déclaré : {artisan.siret}
                    </li>
                  )}
                  {[artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length > 0 && (
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      Documents vérifiés par l&apos;admin
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    Avis laissés par de vrais clients
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" /> Particulier / Bénévole
                </h4>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    Profil validé par l&apos;administrateur
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    Aide de voisinage ou savoir-faire partagé
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    Avis laissés par de vrais clients
                  </li>
                </ul>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <p className="text-xs text-amber-700">
                    ⚠️ Cet intervenant n&apos;est pas un professionnel déclaré. Renseignez-vous sur les conditions d&apos;intervention.
                  </p>
                </div>
              </>
            )}
            <Link href="/confiance" className="text-xs text-brand-600 hover:underline mt-3 block">
              En savoir plus sur la confiance →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

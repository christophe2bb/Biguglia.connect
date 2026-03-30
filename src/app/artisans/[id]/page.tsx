'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Clock, Shield, Star, Phone, MessageSquare, Calendar, ChevronLeft, Heart, HardHat, Users, CheckCircle, FileCheck } from 'lucide-react';
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

export default function ArtisanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

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

      // Reviews
      const { data: rev } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('artisan_id', id as string)
        .order('created_at', { ascending: false });
      setReviews(rev as Review[] || []);

      // Favori
      if (profile) {
        const { data: fav } = await supabase
          .from('favorite_artisans')
          .select('id')
          .eq('user_id', profile.id)
          .eq('artisan_id', id as string)
          .single();
        setIsFavorite(!!fav);
      }

      setLoading(false);
    };

    if (id) fetchArtisan();
  }, [id, profile, router]);

  const toggleFavorite = async () => {
    if (!profile) { router.push('/connexion'); return; }
    const supabase = createClient();
    if (isFavorite) {
      await supabase.from('favorite_artisans').delete()
        .eq('user_id', profile.id).eq('artisan_id', id as string);
      setIsFavorite(false);
      toast.success('Retiré des favoris');
    } else {
      await supabase.from('favorite_artisans').insert({ user_id: profile.id, artisan_id: id });
      setIsFavorite(true);
      toast.success('Ajouté aux favoris');
    }
  };

  const startConversation = async () => {
    if (!profile) { router.push('/connexion'); return; }
    const supabase = createClient();

    // Créer conversation
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ subject: `Contact avec ${artisan?.business_name}`, related_type: 'general' })
      .select()
      .single();

    if (conv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: profile.id },
        { conversation_id: conv.id, user_id: artisan!.user_id },
      ]);
      router.push(`/messages/${conv.id}`);
    }
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Retour */}
      <Link href="/artisans" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour aux artisans
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galerie */}
          {artisan.gallery && artisan.gallery.length > 0 ? (
            <div className="bg-gray-100 rounded-2xl overflow-hidden">
              <div className="h-72">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artisan.gallery[activePhoto]?.url}
                  alt="Réalisation"
                  className="w-full h-full object-cover"
                />
              </div>
              {artisan.gallery.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {artisan.gallery.map((photo, i) => (
                    <button key={photo.id} onClick={() => setActivePhoto(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activePhoto ? 'border-brand-500' : 'border-transparent'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 gradient-hero rounded-2xl flex items-center justify-center">
              <span className="text-6xl">{artisan.trade_category?.icon || '🔧'}</span>
            </div>
          )}

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
              <button onClick={toggleFavorite} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Avis clients ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <EmptyState
                icon="💬"
                title="Pas encore d'avis"
                description="Soyez le premier à laisser un avis après votre intervention."
              />
            ) : (
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
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contacter */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Contacter {artisan.business_name}</h3>
            <Button className="w-full" onClick={startConversation}>
              <MessageSquare className="w-4 h-4" />
              Envoyer un message
            </Button>
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

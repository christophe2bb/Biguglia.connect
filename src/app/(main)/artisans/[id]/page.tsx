/**
 * artisans/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetch serveur : artisan + profil + galerie + avis + catégorie
 * Rendu HTML complet côté serveur (zéro skeleton côté client)
 * ArtisanActions (client) : favoris uniquement
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft, MapPin, Clock, Shield, Star, Phone,
  Calendar, HardHat, Users, CheckCircle, FileCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import EmptyState from '@/components/ui/EmptyState';
import ContactButton from '@/components/ui/ContactButton';
import ArtisanActions from './_components/ArtisanActions';
import { formatRelative } from '@/lib/utils';
import type { ArtisanProfile, Review } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: { id: string } };

// ─── Fetch data ───────────────────────────────────────────────────────────────
async function fetchArtisan(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('artisan_profiles')
    .select(`
      *,
      profile:profiles!artisan_profiles_user_id_fkey(id, full_name, avatar_url, phone),
      trade_category:trade_categories(*),
      gallery:artisan_photos(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
    .eq('artisan_id', id)
    .order('created_at', { ascending: false });

  return { artisan: data as ArtisanProfile, reviews: (reviews as Review[]) || [] };
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await fetchArtisan(params.id);
  if (!result) return { title: 'Artisan introuvable — Biguglia Connect' };

  const { artisan } = result;
  const categoryName = (artisan.trade_category as { name?: string } | null)?.name ?? '';
  const title = `${artisan.business_name}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
  const description = artisan.description
    ? artisan.description.slice(0, 155)
    : `Découvrez ${artisan.business_name}, artisan à ${artisan.service_area ?? 'Biguglia'}.`;

  const gallery = artisan.gallery as Array<{ url: string }> | undefined;
  const ogImage = gallery?.[0]?.url ?? `${SITE_URL}/images/biguglia-hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/artisans/${params.id}` },
    openGraph: {
      title, description,
      url: `${SITE_URL}/artisans/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: artisan.business_name }],
      type: 'profile',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function ArtisanDetailPage({ params }: Props) {
  const result = await fetchArtisan(params.id);
  if (!result) notFound();

  const { artisan, reviews } = result;
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const gallery = artisan.gallery as Array<{ id: string; url: string }> | undefined;
  const profileData = artisan.profile as { id?: string; full_name?: string; avatar_url?: string; phone?: string } | undefined;
  const docCount = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;
  const isPro = artisan.artisan_type === 'professionnel';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Back link */}
      <Link href="/artisans" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour aux artisans
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Main column ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Gallery (server-rendered first image, client handles thumbnails) */}
          {gallery && gallery.length > 0 ? (
            <ArtisanActions artisan={artisan} variant="gallery" />
          ) : (
            <div className="h-64 gradient-hero rounded-2xl flex items-center justify-center">
              <span className="text-6xl">
                {(artisan.trade_category as { icon?: string } | null)?.icon || '🔧'}
              </span>
            </div>
          )}

          {/* Info card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={profileData?.avatar_url}
                  name={artisan.business_name || '?'}
                  size="lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{artisan.business_name}</h1>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <span className="text-gray-500 text-sm">
                      {(artisan.trade_category as { icon?: string; name?: string } | null)?.icon}{' '}
                      {(artisan.trade_category as { name?: string } | null)?.name}
                    </span>
                    {/* Type badge */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isPro
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {isPro
                        ? <><HardHat className="w-3.5 h-3.5" /> Professionnel</>
                        : <><Users className="w-3.5 h-3.5" /> Particulier / Bénévole</>}
                    </span>
                    <Badge variant="success">
                      <Shield className="w-3 h-3 mr-1" /> Vérifié
                    </Badge>
                    {docCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <FileCheck className="w-3.5 h-3.5" />
                        {docCount} document{docCount > 1 ? 's' : ''} vérifié{docCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Favourite button (client) */}
              <ArtisanActions artisan={artisan} variant="favorite" />
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

          {/* Reviews */}
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
                {reviews.map(review => {
                  const reviewer = review.reviewer as { full_name?: string; avatar_url?: string } | undefined;
                  return (
                    <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar
                          src={reviewer?.avatar_url}
                          name={reviewer?.full_name || 'Anonyme'}
                          size="sm"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {reviewer?.full_name || 'Anonyme'}
                          </div>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Contact card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Contacter {artisan.business_name}</h3>
            <ContactButton
              sourceType="artisan"
              sourceId={artisan.id}
              sourceTitle={artisan.business_name}
              ownerId={artisan.user_id}
              userId={undefined}
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
            {profileData?.phone && (
              <a
                href={`tel:${profileData.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4 text-gray-400" />
                {profileData.phone}
              </a>
            )}
          </div>

          {/* Availability badge */}
          <div className="bg-brand-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-brand-800">Artisan disponible</span>
            </div>
            <p className="text-xs text-brand-600">
              Envoyez votre demande et attendez sa réponse directement dans vos messages.
            </p>
          </div>

          {/* Trust card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            {isPro ? (
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
                  {docCount > 0 && (
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

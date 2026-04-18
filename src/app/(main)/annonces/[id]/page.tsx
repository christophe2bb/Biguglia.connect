/**
 * annonces/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Ce fichier fait TOUT le fetch côté serveur (listing + author + similar)
 *   • Le rendu HTML principal est produit ici (LCP côté serveur)
 *   • AnnonceActions (client) gère uniquement : favoris, partage, delete, status
 *
 * Bénéfices :
 *   • HTML complet livré au 1er octet → SEO parfait, LCP rapide
 *   • Zéro loading spinner pour l'utilisateur (plus de skeleton côté client)
 *   • JS client réduit au strict minimum (actions interactives)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Zap, Clock, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buildTimeline } from './_config';
import { ListingGallery }   from './_components/ListingGallery';
import { ListingMeta }      from './_components/ListingMeta';
import { PracticalInfo }    from './_components/PracticalInfo';
import { StatusTimeline }   from './_components/StatusTimeline';
import { SimilarListings }  from './_components/SimilarListings';
import { SellerReputation } from './_components/SellerReputation';
import AnnonceActions       from './_components/AnnonceActions';
import { toPhotoItems }     from '@/components/ui/PhotoViewer';
import { formatDate }       from '@/lib/utils';
import Avatar               from '@/components/ui/Avatar';
import ContactButton        from '@/components/ui/ContactButton';
import type { ExtListing, AuthorProfile } from './_types';
import type { Listing } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: { id: string } };

// ─── Fetch data (réutilisé par generateMetadata + page) ──────────────────────
async function fetchListing(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, category:listing_categories(*), photos:listing_photos(id, url, display_order)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Sort photos
  if (data.photos) {
    data.photos.sort(
      (a: { display_order: number }, b: { display_order: number }) =>
        a.display_order - b.display_order,
    );
  }

  // Fetch author
  let userData: AuthorProfile | null = null;
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, role')
      .eq('id', data.user_id)
      .single();
    userData = profile;
  }

  // Fetch similar (same category, active, different id)
  let similar: Listing[] = [];
  if (data.category_id) {
    const { data: simData } = await supabase
      .from('listings')
      .select('*, category:listing_categories(*), photos:listing_photos(url)')
      .eq('category_id', data.category_id)
      .eq('status', 'active')
      .neq('id', id)
      .limit(3)
      .order('created_at', { ascending: false });
    similar = (simData as Listing[]) || [];
  }

  // Increment view counter (fire-and-forget, no await)
  if (data.views_count !== undefined) {
    supabase
      .from('listings')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', id)
      .then(() => { /* ignore */ });
  }

  return { listing: { ...data, user: userData } as unknown as ExtListing, similar };
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await fetchListing(params.id);
  if (!result) return { title: 'Annonce introuvable — Biguglia Connect' };

  const { listing } = result;
  const categoryName = listing.category?.name ?? '';
  const title = `${listing.title}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
  const description = listing.description
    ? listing.description.slice(0, 155)
    : `Annonce : ${listing.title} sur Biguglia Connect.`;

  // First photo for OG
  const photos = listing.photos as Array<{ url: string }> | undefined;
  const ogImage = photos?.[0]?.url ?? `${SITE_URL}/images/biguglia-village.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/annonces/${params.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/annonces/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: listing.title }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function AnnonceDetailPage({ params }: Props) {
  const result = await fetchListing(params.id);
  if (!result) notFound();

  const { listing, similar } = result;
  const currentStatus = (listing.status as string) || 'active';
  const timelineSteps = buildTimeline(currentStatus);
  const rawPhotos = listing.photos as Array<{ id: string; url: string; display_order: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const author = listing.user as { full_name?: string; avatar_url?: string | null; created_at?: string } | undefined;
  const isExpired = listing.expires_at ? new Date(listing.expires_at) < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky top bar (back + view count + actions client) ─────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/annonces"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Annonces
          </Link>

          <div className="flex items-center gap-2">
            {listing.views_count !== undefined && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3.5 h-3.5" />
                {listing.views_count} vue{listing.views_count !== 1 ? 's' : ''}
              </span>
            )}
            {/* Client: favoris + partage + edit link for owner */}
            <AnnonceActions listing={listing} />
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

          {/* ── Main column ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <ListingGallery
              photos={photos}
              categoryIcon={listing.category?.icon}
              title={listing.title}
            />
            <ListingMeta listing={listing} />

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>

            <PracticalInfo listing={listing} />
            <StatusTimeline steps={timelineSteps} />
            <SimilarListings similar={similar} categoryName={listing.category?.name} />
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Seller card (server-rendered) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Publié par</h3>

              {/* Author row */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={author?.avatar_url}
                  name={author?.full_name || '?'}
                  size="md"
                />
                <div>
                  <div className="font-medium text-gray-900">{author?.full_name || 'Anonyme'}</div>
                  <div className="text-xs text-gray-400">
                    {author?.created_at ? `Membre depuis ${formatDate(author.created_at)}` : ''}
                  </div>
                </div>
              </div>

              {/* Contact CTA (client: needs userId) or static CTA */}
              {listing.status === 'active' ? (
                <ContactButton
                  sourceType="listing"
                  sourceId={listing.id}
                  sourceTitle={listing.title}
                  ownerId={listing.user_id || ''}
                  userId={undefined}
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

              {/* Owner panel (client: needs auth state) */}
              <AnnonceActions listing={listing} variant="owner-panel" />
            </div>

            {/* Seller reputation */}
            <SellerReputation listing={listing} />

            {/* Expiry notice */}
            {listing.expires_at && (
              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
                isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'
              }`}>
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    {isExpired ? '⏱ Annonce expirée' : '⏱ Expire le'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{formatDate(listing.expires_at)}</p>
                </div>
              </div>
            )}

            {/* Safety tips (static, server-rendered) */}
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

            {/* Report button (client: needs auth) */}
            <AnnonceActions listing={listing} variant="report" />
          </div>
        </div>

        {/* Mobile sticky action bar (client: needs auth + save state) */}
        <AnnonceActions listing={listing} variant="mobile-bar" />
      </div>
    </div>
  );
}

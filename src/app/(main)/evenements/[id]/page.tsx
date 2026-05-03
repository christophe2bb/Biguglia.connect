/**
 * evenements/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Ce fichier fait TOUT le fetch côté serveur (event + photos + participants count)
 *   • Le rendu HTML principal est produit ici (LCP côté serveur)
 *   • EvenementDetailClient (client) gère : inscription, onglets, modaux, partage
 *
 * Bénéfices :
 *   • HTML complet livré au 1er octet → SEO parfait, LCP rapide
 *   • Zéro loading spinner pour le contenu principal
 *   • JS client réduit aux interactions
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Euro,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  EVENT_CATEGORY_CONFIG,
  formatEventDate,
  formatEventTime,
  daysUntilLabel,
} from '@/lib/events';
import StatusBadge from '@/components/ui/StatusBadge';
import Avatar from '@/components/ui/Avatar';
import EvenementInteractiveClient from './EvenementDetailClient';
import BackButton from './_components/BackButton';
import type { EventDetail } from './_types';
import { JsonLd, breadcrumbSchema, eventSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: Promise<{ id: string }> };

// ─── Fetch data ───────────────────────────────────────────────────────────────
async function fetchEvent(id: string): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*, author:profiles(full_name, avatar_url), photos:event_photos(id, url, display_order, is_cover)')
    .eq('id', id)
    .single();

  if (error || !data) {
    // Fallback without photos
    const { data: d2, error: e2 } = await supabase
      .from('events')
      .select('*, author:profiles(full_name, avatar_url)')
      .eq('id', id)
      .single();
    if (e2 || !d2) return null;
    const { count } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .neq('status', 'annule');
    return { ...d2, participants_count: count ?? 0 } as EventDetail;
  }

  const { count } = await supabase
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)
    .neq('status', 'annule');

  return { ...data, participants_count: count ?? 0 } as EventDetail;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) return { title: 'Événement introuvable — Biguglia Connect' };

  const title = `${event.title} | Biguglia Connect`;
  const description = event.description
    ? event.description.slice(0, 155)
    : `Événement à ${event.location ?? 'Biguglia'} — rejoignez la communauté Biguglia Connect.`;

  const allPhotos = event.photos ?? [];
  const coverPhoto = allPhotos.find(p => p.is_cover)?.url ?? event.cover_photo_url ?? allPhotos[0]?.url;
  const ogImage = coverPhoto ?? `${SITE_URL}/images/biguglia-hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/evenements/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/evenements/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: event.title }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) notFound();

  const cat = EVENT_CATEGORY_CONFIG[event.category as keyof typeof EVENT_CATEGORY_CONFIG]
    ?? EVENT_CATEGORY_CONFIG.autres;

  const allPhotos = event.photos ?? [];
  const coverPhoto = allPhotos.find(p => p.is_cover)?.url ?? event.cover_photo_url ?? allPhotos[0]?.url;

  const isFull =
    !event.is_unlimited &&
    !!event.capacity &&
    (event.participants_count ?? 0) >= event.capacity;

  const priceLabel =
    event.price_type === 'gratuit' ? 'Gratuit' :
    event.price_type === 'libre'   ? 'Prix libre' :
    event.price_amount             ? `${event.price_amount} €` : 'Payant';

  const daysLabel = daysUntilLabel(event.event_date);
  const author = event.author as { full_name?: string; avatar_url?: string | null } | undefined;

  // ── Structured data ────────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',               url: '/' },
    { name: 'Événements Biguglia',   url: '/evenements' },
    { name: event.title,             url: `/evenements/${id}` },
  ]);

  const eventJsonLd = eventSchema({
    name:        event.title,
    description: event.description?.slice(0, 300) ?? `Événement à ${event.location ?? 'Biguglia'}`,
    url:         `/evenements/${id}`,
    startDate:   event.event_date + (event.start_time ? `T${event.start_time}` : 'T00:00:00'),
    ...(event.end_time && { endDate: event.event_date + `T${event.end_time}` }),
    location:    event.location ?? 'Biguglia',
  });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={eventJsonLd} />
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero (server-rendered) ────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-purple-600 to-violet-700 overflow-hidden">
        {/* Photo de couverture — hauteur fixe, ne déborde pas */}
        {coverPhoto && (
          <Image
            src={coverPhoto}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            style={{ opacity: 0.55 }}
          />
        )}
        {!coverPhoto && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl opacity-20">{cat.icon}</span>
          </div>
        )}
        {/* Dégradé assombri pour lisibilité des textes et boutons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

        {/* Boutons haut — z-10 pour passer au-dessus de l'image */}
        <div className="absolute top-4 left-4 z-10">
          <BackButton />
        </div>
        <div className="absolute top-4 right-4 z-10">
          <StatusBadge
            status={event.status}
            contentType="event"
            extra={{ eventDate: event.event_date, isFull }}
          />
        </div>

        {/* Titre bas — z-10 */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${cat.bg} ${cat.color} border ${cat.border}`}>
            <span>{cat.icon}</span> {cat.label}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow">{event.title}</h1>
          {event.subtitle && (
            <p className="text-white/80 text-sm mt-1 drop-shadow">{event.subtitle}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-20">

        {/* ── Meta strip (server-rendered) ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Date */}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Date</p>
              <p className="text-sm font-bold text-gray-900">
                {formatEventDate(event.event_date, false)}
              </p>
              {daysLabel && (
                <p className="text-xs text-purple-600 font-semibold">{daysLabel}</p>
              )}
            </div>
          </div>

          {/* Horaire */}
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Horaire</p>
              <p className="text-sm font-bold text-gray-900">
                {formatEventTime(event.start_time)}
                {event.end_time ? ` → ${formatEventTime(event.end_time)}` : ''}
              </p>
            </div>
          </div>

          {/* Lieu */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Lieu</p>
              <p className="text-sm font-bold text-gray-900 line-clamp-1">{event.location}</p>
              {event.location_detail && (
                <p className="text-xs text-gray-500">{event.location_detail}</p>
              )}
            </div>
          </div>

          {/* Tarif */}
          <div className="flex items-start gap-2">
            <Euro className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Tarif</p>
              <p className="text-sm font-bold text-gray-900">{priceLabel}</p>
            </div>
          </div>
        </div>

        {/* ── Description (server-rendered) ────────────────────────────────── */}
        {event.description && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <h2 className="font-bold text-gray-900 mb-3">À propos de cet événement</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* ── Organisateur (server-rendered) ───────────────────────────────── */}
        {author?.full_name && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 flex items-center gap-3">
            <Avatar src={author.avatar_url} name={author.full_name} size="md" />
            <div>
              <p className="text-xs text-gray-400">Organisé par</p>
              <p className="text-sm font-semibold text-gray-800">
                {event.organizer_name || author.full_name}
              </p>
            </div>
          </div>
        )}

        {/* ── Client part: inscription, onglets, modaux, partage ───────────── */}
        <EvenementInteractiveClient initialEvent={event} />
      </div>
    </div>
    </>
  );
}

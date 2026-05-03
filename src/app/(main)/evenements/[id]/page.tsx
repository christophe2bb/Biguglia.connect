/**
 * evenements/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Fetch complet côté serveur (event + photos + participants count)
 *   • Hero, barre de nav, meta-strip → rendus HTML ici (LCP optimal, SEO)
 *   • EvenementInteractiveClient → inscription, onglets, modaux (client)
 *
 * Layout desktop :
 *   ┌─────────────────────────────┬─────────────────┐
 *   │  Onglets (info/participants) │  CTA inscription │
 *   │  discussion / historique     │  Actions orga    │
 *   └─────────────────────────────┴─────────────────┘
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, MapPin, Euro, Users, ChevronRight, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  EVENT_CATEGORY_CONFIG,
  formatEventDate,
  formatEventTime,
  daysUntilLabel,
} from '@/lib/events';
import StatusBadge from '@/components/ui/StatusBadge';
import EvenementInteractiveClient from './EvenementDetailClient';
import BackButton from './_components/BackButton';
import type { EventDetail } from './_types';
import { JsonLd, breadcrumbSchema, eventSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: Promise<{ id: string }> };

// ─── Fetch ───────────────────────────────────────────────────────────────────
async function fetchEvent(id: string): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*, author:profiles(full_name, avatar_url), photos:event_photos(id, url, display_order, is_cover)')
    .eq('id', id)
    .single();

  if (error || !data) {
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
      title, description,
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
  const coverPhoto = allPhotos.find(p => p.is_cover)?.url
    ?? event.cover_photo_url
    ?? allPhotos[0]?.url;

  const isFull =
    !event.is_unlimited &&
    !!event.capacity &&
    (event.participants_count ?? 0) >= event.capacity;

  const priceLabel =
    event.price_type === 'gratuit' ? 'Gratuit' :
    event.price_type === 'libre'   ? 'Prix libre' :
    event.price_amount             ? `${event.price_amount} €` : 'Payant';

  const priceColor = event.price_type === 'gratuit'
    ? 'text-emerald-700 font-bold'
    : 'text-gray-900 font-bold';

  const daysLabel = daysUntilLabel(event.event_date);

  // ── SEO structured data ────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',             url: '/' },
    { name: 'Événements Biguglia', url: '/evenements' },
    { name: event.title,           url: `/evenements/${id}` },
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

        {/* ── Barre de navigation sticky ───────────────────────────────── */}
        <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-2">

            {/* Bouton retour */}
            <BackButton />

            {/* Fil d'Ariane — visible seulement sur sm+ */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1 text-xs text-gray-400 min-w-0 flex-1">
              <Link href="/" className="hover:text-purple-600 transition-colors flex-shrink-0">
                <Home className="w-3.5 h-3.5" />
              </Link>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <Link
                href="/evenements"
                className="hover:text-purple-600 transition-colors font-medium text-gray-500 flex-shrink-0"
              >
                Événements
              </Link>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="text-gray-700 font-semibold truncate">{event.title}</span>
            </div>

            {/* Badge catégorie (à droite) */}
            <div className="ml-auto flex-shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cat.bg} ${cat.color} border ${cat.border}`}>
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </span>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-purple-600 to-violet-700 overflow-hidden">
          {coverPhoto ? (
            <Image
              src={coverPhoto}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              style={{ opacity: 0.6 }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-9xl opacity-10">{cat.icon}</span>
            </div>
          )}
          {/* Dégradé sombre pour lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Statut — coin supérieur droit */}
          <div className="absolute top-3 right-4 z-10">
            <StatusBadge
              status={event.status}
              contentType="event"
              extra={{ eventDate: event.event_date, isFull }}
            />
          </div>

          {/* Titre, sous-titre, compteur participants */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:px-8 sm:pb-6 z-10">
            <h1 className="text-xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-white/80 text-sm mt-1 drop-shadow">{event.subtitle}</p>
            )}
            {/* Compteur participants dans le hero */}
            {!event.is_unlimited && event.capacity && (
              <div className="flex items-center gap-1.5 mt-2">
                <Users className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/90 text-xs font-semibold">
                  {event.participants_count ?? 0} / {event.capacity} participant{(event.capacity > 1) ? 's' : ''}
                </span>
                {isFull && (
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    COMPLET
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Corps ────────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-20">

          {/* Meta strip : date / heure / lieu / tarif — server-rendered */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Date</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {formatEventDate(event.event_date, false)}
                </p>
                {daysLabel && (
                  <p className="text-xs text-purple-600 font-semibold mt-0.5">{daysLabel}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Horaire</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {formatEventTime(event.start_time)}
                  {event.end_time ? ` → ${formatEventTime(event.end_time)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Lieu</p>
                <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                  {event.location}
                </p>
                {event.location_detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{event.location_detail}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Euro className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Tarif</p>
                <p className={`text-sm leading-tight ${priceColor}`}>{priceLabel}</p>
              </div>
            </div>

          </div>

          {/* Layout deux colonnes — géré par le client (qui connaît l'état auth) */}
          <EvenementInteractiveClient initialEvent={event} />

        </div>
      </div>
    </>
  );
}

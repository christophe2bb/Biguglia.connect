/**
 * Route /evenements-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour les recherches "événements Biguglia", "agenda Biguglia",
 * "sorties Biguglia", "activités Haute-Corse".
 *
 * Architecture SSR + JSON-LD Event.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, ArrowRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, eventSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Événements à Biguglia — Agenda Complet des Activités Locales (Haute-Corse)',
  description:
    'Agenda des événements à Biguglia : fêtes du village, marchés, concerts, sports, sorties nature, ateliers. Restez informé de toute la vie locale de Biguglia, Haute-Corse.',
  keywords: [
    'événements Biguglia', 'agenda Biguglia', 'activités Biguglia',
    'sorties Biguglia', 'fêtes Biguglia', 'concerts Biguglia',
    'agenda Haute-Corse', 'manifestations Biguglia', 'vie locale Corse',
  ],
  alternates: { canonical: `${SITE_URL}/evenements-biguglia` },
  openGraph: {
    title:       'Événements à Biguglia — Agenda Local Haute-Corse',
    description: 'Fêtes, marchés, sports, sorties nature, ateliers… L\'agenda complet de Biguglia.',
    url:         `${SITE_URL}/evenements-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630 }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface EventRow {
  id:          string;
  title:       string;
  start_date:  string | null;
  location:    string | null;
  category:    string | null;
  description: string | null;
}

async function fetchUpcomingEvents(): Promise<{ events: EventRow[]; total: number }> {
  try {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data, count } = await supabase
      .from('events')
      .select('id, title, start_date, location, category, description', { count: 'exact' })
      .neq('status', 'annule')
      .neq('status', 'draft')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(6);
    return { events: (data ?? []) as EventRow[], total: count ?? 0 };
  } catch {
    return { events: [], total: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

const EVENT_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  sport:       { label: 'Sport',          emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:     { label: 'Culture',        emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  fete:        { label: 'Fête',           emoji: '🎉', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  nature:      { label: 'Nature',         emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  marche:      { label: 'Marché',         emoji: '🛒', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  atelier:     { label: 'Atelier',        emoji: '🎨', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  association: { label: 'Association',    emoji: '🏛️', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const FAQ = [
  { q: 'Où trouver les événements à Biguglia ?', a: 'L\'agenda complet des événements de Biguglia est disponible sur Biguglia Connect. Vous y trouverez les fêtes du village, matchs sportifs, marchés, concerts, sorties nature et ateliers.' },
  { q: 'Comment publier un événement à Biguglia ?', a: 'Tout habitant ou association peut publier un événement gratuitement sur Biguglia Connect. Il sera visible par tous les membres de la communauté et indexé sur Google.' },
  { q: 'Quels types d\'événements ont lieu à Biguglia ?', a: 'Matchs du SC Biguglia (football), fêtes du village, marchés de producteurs, sorties aux flamants roses de l\'étang, randonnées, ateliers culturels et concerts.' },
  { q: 'Le SC Biguglia organise-t-il des événements ?', a: 'Oui, le SC Biguglia est très actif dans la commune. Les matchs et événements du club sont régulièrement publiés sur Biguglia Connect.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvenementsBigugliaPage() {
  const { events, total } = await fetchUpcomingEvents();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Événements à ${GEO.city}`, url: '/evenements-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  // JSON-LD Event list
  const eventListSchema = events.length > 0 ? {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name:       `Événements à ${GEO.city}`,
    url:        `${SITE_URL}/evenements-biguglia`,
    numberOfItems: total,
    itemListElement: events.map((e, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      url:        `${SITE_URL}/evenements/${e.id}`,
      name:       e.title,
      item: {
        '@type':      'Event',
        name:         e.title,
        startDate:    e.start_date,
        location: {
          '@type':           'Place',
          name:              e.location ?? GEO.city,
          address: {
            '@type':           'PostalAddress',
            addressLocality:   GEO.city,
            addressRegion:     GEO.department,
            addressCountry:    GEO.countryCode,
          },
        },
        organizer: { '@type': 'Organization', name: 'Biguglia Connect', url: SITE_URL },
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {eventListSchema && <JsonLd data={eventListSchema} />}

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Événements à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <span className="w-2 h-2 bg-violet-300 rounded-full animate-pulse" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} événements à venir` : 'Agenda local'} · {GEO.city}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Événements à Biguglia<br />
            <span className="text-violet-300">L'agenda local</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Fêtes du village, matchs sportifs, marchés, concerts, sorties nature…
            Tout l'agenda de Biguglia et de la plaine orientale de Haute-Corse.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/evenements"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-md">
              🎉 Voir tous les événements <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/evenements/nouveau"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              + Publier un événement
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* ── PROCHAINS ÉVÉNEMENTS ── */}
        {events.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-600" /> Prochains événements à {GEO.city}
              </h2>
              <Link href="/evenements"
                className="flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => {
                const cat = ev.category ? EVENT_CATEGORIES[ev.category] : null;
                return (
                  <Link key={ev.id} href={`/evenements/${ev.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm line-clamp-2 flex-1">{ev.title}</p>
                        {cat && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cat.color}`}>
                            {cat.emoji} {cat.label}
                          </span>
                        )}
                      </div>
                      {ev.start_date && (
                        <p className="text-xs text-violet-600 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatEventDate(ev.start_date)}
                        </p>
                      )}
                      {ev.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{ev.location}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <span className="text-4xl mb-3 block">📅</span>
            <h2 className="font-black text-gray-900 mb-2">Aucun événement programmé</h2>
            <p className="text-gray-500 text-sm mb-4">Vous organisez quelque chose à Biguglia ? Publiez-le gratuitement.</p>
            <Link href="/evenements/nouveau"
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all">
              Publier un événement
            </Link>
          </section>
        )}

        {/* ── TYPES D'ÉVÉNEMENTS ── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Types d'événements à {GEO.city}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
              <Link key={key} href={`/evenements?categorie=${key}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center hover:shadow-md hover:border-gray-200 transition-all">
                  <p className="text-2xl mb-1">{cat.emoji}</p>
                  <p className="text-xs font-bold text-gray-700">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-5">
            Questions fréquentes — Événements à {GEO.city}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group" open={i === 0}>
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                  <h3 className="font-bold text-gray-900 text-sm pr-4">{item.q}</h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── MAILLAGE ── */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">Explorer Biguglia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations',       desc: 'Clubs et bénévolat' },
              { href: '/artisans-biguglia',     emoji: '🔧', title: 'Artisans vérifiés',  desc: 'Plombiers, électriciens…' },
              { href: '/emploi-biguglia',       emoji: '💼', title: 'Emploi local',       desc: 'Offres & candidatures' },
              { href: '/forum-biguglia',        emoji: '💬', title: 'Forum des habitants', desc: 'Questions & entraide' },
              { href: '/annonces-biguglia',     emoji: '📦', title: 'Petites annonces',   desc: 'Achat, vente, dons locaux' },
              { href: '/communaute',            emoji: '🏘️', title: 'Communauté',         desc: 'Membres actifs et badges' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all flex items-center gap-3">
                  <span className="text-xl">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{l.title}</p>
                    <p className="text-xs text-gray-500">{l.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

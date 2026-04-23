/**
 * Route /evenements-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour "événements Biguglia", "agenda Biguglia",
 * "sorties Biguglia", "activités Haute-Corse".
 *
 * Architecture SSR + JSON-LD complet
 * (BreadcrumbList + FAQPage + Event individuels + ItemList + CollectionPage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, ArrowRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, collectionPageSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Événements à Biguglia — Agenda Complet des Activités Locales (Haute-Corse)',
  description:
    'Agenda des événements à Biguglia : fêtes du village, matchs SC Biguglia, marchés de producteurs, sorties nature à l\'étang, concerts, ateliers culturels. Restez informé de toute la vie locale de Biguglia, Haute-Corse (20620).',
  keywords: [
    'événements Biguglia', 'agenda Biguglia', 'activités Biguglia',
    'sorties Biguglia', 'fêtes Biguglia', 'SC Biguglia matchs',
    'agenda Haute-Corse', 'manifestations Biguglia', 'vie locale Corse',
    'marché producteurs Biguglia', 'sorties nature étang Biguglia',
    'concerts Biguglia', 'ateliers Biguglia', 'fête village Corse',
  ],
  alternates: { canonical: `${SITE_URL}/evenements-biguglia` },
  openGraph: {
    title:       'Événements à Biguglia — Agenda Local Haute-Corse',
    description: 'SC Biguglia, fêtes patronales, marchés de producteurs, sorties étang, ateliers… L\'agenda complet de Biguglia.',
    url:         `${SITE_URL}/evenements-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Événements et agenda à Biguglia, Haute-Corse' }],
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
    const supabase = await createClient();
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
  sport:       { label: 'Sport',       emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:     { label: 'Culture',     emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  fete:        { label: 'Fête',        emoji: '🎉', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  nature:      { label: 'Nature',      emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  marche:      { label: 'Marché',      emoji: '🛒', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  atelier:     { label: 'Atelier',     emoji: '🎨', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  association: { label: 'Association', emoji: '🏛️', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// ─── Événements phares / récurrents de Biguglia ────────────────────────────────

const RECURRING_EVENTS = [
  {
    emoji: '⚽',
    title: 'Matchs du SC Biguglia',
    desc: 'Les matchs à domicile du Sporting Club Biguglia (football) sont des moments forts de la vie communale. Toutes les catégories jouent au stade local, de l\'U6 aux seniors. Consultez le calendrier sur Biguglia Connect.',
    href: '/evenements?categorie=sport',
  },
  {
    emoji: '🌿',
    title: 'Sorties nature à l\'étang de Biguglia',
    desc: 'L\'étang de Biguglia, réserve naturelle régionale, accueille régulièrement des sorties guidées pour observer les flamants roses, hérons et autres oiseaux nicheurs. Des naturalistes locaux organisent ces balades gratuites ou à petit prix.',
    href: '/evenements?categorie=nature',
  },
  {
    emoji: '🛒',
    title: 'Marchés de producteurs locaux',
    desc: 'Charcuterie corse, fromages, miel du maquis, vins locaux, poteries artisanales — les marchés de producteurs de Biguglia permettent d\'acheter directement aux agriculteurs et artisans de Haute-Corse.',
    href: '/evenements?categorie=marche',
  },
  {
    emoji: '🎉',
    title: 'Fêtes patronales et festivités corses',
    desc: 'Biguglia célèbre ses fêtes traditionnelles, avec processions, concerts de polyphonie corse, animations et gastronomie locale. Ces événements rassemblent habitants et visiteurs dans une ambiance conviviale typiquement insulaire.',
    href: '/evenements?categorie=fete',
  },
  {
    emoji: '🎨',
    title: 'Ateliers culturels et artistiques',
    desc: 'Cours de langue corse, ateliers poterie, stages musicaux, sorties cinéma — des associations et particuliers proposent des activités créatives pour petits et grands tout au long de l\'année à Biguglia.',
    href: '/evenements?categorie=atelier',
  },
  {
    emoji: '🏘️',
    title: 'Réunions de quartier et voisinage',
    desc: 'Des réunions de concertation entre habitants, des actions de nettoyage collectif et des apéros de voisinage sont régulièrement organisés à Biguglia — une façon simple de s\'impliquer dans la vie du village.',
    href: '/evenements?categorie=association',
  },
];

// ─── FAQ enrichie (7 questions) ───────────────────────────────────────────────

const FAQ = [
  {
    q: 'Où trouver les événements à Biguglia ?',
    a: 'L\'agenda complet des événements de Biguglia est disponible en temps réel sur Biguglia Connect. Vous y trouverez les matchs du SC Biguglia, fêtes du village, marchés de producteurs, sorties nature à l\'étang, concerts, ateliers et réunions de quartier.',
  },
  {
    q: 'Comment publier un événement à Biguglia ?',
    a: 'Tout habitant, association ou commerce peut publier un événement gratuitement sur Biguglia Connect. Créez un compte, renseignez les détails (date, lieu, description) et votre événement sera visible par tous les membres et indexé sur Google.',
  },
  {
    q: 'Quels types d\'événements ont lieu régulièrement à Biguglia ?',
    a: 'Les événements récurrents incluent les matchs du SC Biguglia (football toutes catégories), les sorties aux flamants roses de l\'étang (réserve naturelle), les marchés de producteurs corses, les fêtes patronales, les ateliers culturels et les réunions de voisinage.',
  },
  {
    q: 'Le SC Biguglia publie-t-il ses événements en ligne ?',
    a: 'Oui, le SC Biguglia et les autres associations de la commune peuvent publier leurs matchs, tournois et événements directement sur Biguglia Connect. Consultez la catégorie "Sport" de l\'agenda pour suivre l\'actualité sportive de Biguglia.',
  },
  {
    q: 'Y a-t-il des sorties nature à l\'étang de Biguglia ?',
    a: 'Oui, l\'étang de Biguglia (réserve naturelle régionale, plus grand étang naturel de Corse) attire naturalistes et randonneurs. Des associations locales organisent régulièrement des sorties guidées pour observer les flamants roses, aigrettes, hérons et autres espèces protégées. Ces sorties sont publiées dans la catégorie "Nature" de Biguglia Connect.',
  },
  {
    q: 'Comment trouver un marché de producteurs à Biguglia ?',
    a: 'Les marchés de producteurs et artisans locaux (charcuterie, fromages, miel, vins corses, poteries) sont annoncés dans la catégorie "Marché" de l\'agenda de Biguglia Connect. Certains marchés sont saisonniers (été) et d\'autres ont lieu toute l\'année.',
  },
  {
    q: 'Peut-on assister aux événements de Biguglia sans compte ?',
    a: 'Vous pouvez consulter l\'agenda et les détails des événements publics sans créer de compte. Pour publier un événement, recevoir des rappels et interagir avec les organisateurs, un compte gratuit Biguglia Connect est nécessaire.',
  },
  {
    q: 'Où trouver l\'agenda officiel de la commune de Biguglia ?',
    a: 'L\'agenda officiel est disponible sur le site de la mairie de Biguglia. Biguglia Connect complète cet agenda avec les événements publiés par les associations, les habitants et les commerces locaux — pour une vue complète de la vie de Biguglia.',
  },
  {
    q: 'Quels événements ont lieu l\'été à Biguglia ?',
    a: 'L\'été est la saison la plus animée à Biguglia : concerts en plein air, fêtes de village, tournois sportifs (SC Biguglia), marchés nocturnes de producteurs, sorties kayak sur l\'étang et journées nature dans la réserve. De nombreux événements sont gratuits et ouverts à tous.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvenementsBigugliaPage() {
  const { events, total } = await fetchUpcomingEvents();

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Événements à ${GEO.city}`, url: '/evenements-biguglia' },
  ]);
  const faq        = faqSchema(FAQ);
  const collection = collectionPageSchema({
    name:        `Agenda des événements à ${GEO.city}`,
    description: `Tous les événements, activités et manifestations à ${GEO.city}, ${GEO.department}. Agenda local complet.`,
    url:         '/evenements-biguglia',
  });

  // ItemList des événements à venir
  const eventListSchema = events.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Événements à ${GEO.city}`,
    url:             `${SITE_URL}/evenements-biguglia`,
    numberOfItems:   total,
    itemListElement: events.map((e, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      url:       `${SITE_URL}/evenements/${e.id}`,
      name:      e.title,
      item: {
        '@type':     'Event',
        name:        e.title,
        startDate:   e.start_date,
        description: e.description ?? `Événement à ${GEO.city} — ${e.title}`,
        location: {
          '@type': 'Place',
          name:    e.location ?? GEO.city,
          address: {
            '@type':           'PostalAddress',
            addressLocality:   GEO.city,
            addressRegion:     GEO.department,
            postalCode:        GEO.postalCode,
            addressCountry:    GEO.countryCode,
          },
        },
        organizer: { '@type': 'Organization', name: 'Biguglia Connect', url: SITE_URL },
      },
    })),
  } : null;

  // JSON-LD Event individuels (max 3 pour les rich snippets)
  const individualEventSchemas = events.slice(0, 3).map(ev => ({
    '@context':  'https://schema.org',
    '@type':     'Event',
    name:        ev.title,
    description: ev.description ?? `Événement à ${GEO.city} — ${ev.title}`,
    url:         `${SITE_URL}/evenements/${ev.id}`,
    startDate:   ev.start_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name:    ev.location ?? GEO.city,
      address: {
        '@type':           'PostalAddress',
        addressLocality:   GEO.city,
        addressRegion:     GEO.department,
        postalCode:        GEO.postalCode,
        addressCountry:    GEO.countryCode,
      },
    },
    organizer: { '@type': 'Organization', name: 'Biguglia Connect', url: SITE_URL },
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      {eventListSchema && <JsonLd data={eventListSchema} />}
      {individualEventSchemas.map((schema, i) => <JsonLd key={i} data={schema} />)}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] bg-dot-grid-md" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Événements à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <MapPin className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} événements à venir` : 'Agenda local'} · {GEO.city} · {GEO.postalCode}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Événements à Biguglia<br />
            <span className="text-violet-300">L&apos;agenda local</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            SC Biguglia, fêtes patronales, marchés de producteurs corses, sorties nature à l&apos;étang,
            concerts, ateliers… Tout l&apos;agenda de Biguglia et de la plaine orientale de Haute-Corse.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: total > 0 ? `${total}` : '—', label: 'Événements à venir' },
              { value: Object.keys(EVENT_CATEGORIES).length.toString(), label: 'Catégories' },
              { value: '0 €', label: 'Publication gratuite' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/evenements"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-colors shadow-md">
              🎉 Voir tous les événements <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/evenements/nouveau"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
              + Publier un événement
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — vie événementielle de Biguglia
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            La vie événementielle de {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Biguglia est une commune vivante dont l&apos;agenda reflète la richesse humaine et naturelle
                de la Corse. Le <strong>SC Biguglia</strong>, club de football historique, fédère toute
                la commune autour de ses matchs et tournois. L&apos;équipe seniors comme les jeunes catégories
                représentent Biguglia dans les championnats régionaux de Haute-Corse.
              </p>
              <p>
                L&apos;<strong>étang de Biguglia</strong> — plus grand étang naturel de Corse et réserve
                naturelle régionale classée — génère une effervescence autour de la nature. Des associations
                locales organisent régulièrement des sorties pour observer les <strong>flamants roses</strong>,
                hérons cendrés, martins-pêcheurs et autres espèces protégées de cette zone humide unique.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Traditions et fêtes corses :</strong> Biguglia célèbre ses fêtes patronales avec
                processions religieuses, concerts de polyphonie corse (A Filetta, Canta u Populu), marchés
                de producteurs locaux (miel du maquis, charcuterie, fromages corses, vins de l&apos;île) et
                animations pour enfants. L&apos;été, les soirées festives rassemblent habitants et vacanciers.
              </p>
              <p>
                <strong>Publiez votre événement gratuitement</strong> sur Biguglia Connect pour le faire
                connaître à toute la communauté locale. Les événements publiés sont indexés par Google et
                visibles dans l&apos;agenda de Biguglia — une visibilité maximale pour votre initiative.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/evenements/nouveau',      label: '+ Publier un événement' },
              { href: '/associations-biguglia',   label: '🏛️ SC Biguglia & associations' },
              { href: '/forum-biguglia',          label: '💬 Forum des habitants' },
              { href: '/annonces-biguglia',       label: '📦 Petites annonces locales' },
              { href: '/promenades',              label: '🥾 Balades & randonnées' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ÉVÉNEMENTS RÉCURRENTS PHARES
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Événements récurrents à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Ces événements ont lieu régulièrement à Biguglia tout au long de l&apos;année.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RECURRING_EVENTS.map(ev => (
              <Link key={ev.title} href={ev.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-[color,border-color,box-shadow,transform] h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ev.emoji}</span>
                    <h3 className="font-black text-gray-900 text-sm">{ev.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{ev.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-violet-600 mt-auto">
                    Voir les événements <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PROCHAINS ÉVÉNEMENTS (live)
        ══════════════════════════════════════════ */}
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
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-[color,border-color,box-shadow,transform] h-full flex flex-col gap-3">
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
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Publier un événement
            </Link>
          </section>
        )}

        {/* ══════════════════════════════════════════
            CALENDRIER SÉASONNIER
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            La vie événementielle de Biguglia au fil des saisons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                saison: 'Printemps (mars–mai)',
                emoji: '🌻',
                events: [
                  'Sorties naturalistes à l\'étang (flamants roses en migration)',
                  'Début du championnat de football SC Biguglia',
                  'Marchés de producteurs saisonniers',
                  'Activités jeunesse et scolaires',
                ],
              },
              {
                saison: 'Été (juin–août)',
                emoji: '☀️',
                events: [
                  'Fêtes patronales et concerts de polyphonie corse',
                  'Tournois sportifs (SC Biguglia, pétanque)',
                  'Marchés nocturnes de producteurs locaux',
                  'Sorties kayak et nature réserve de l\'étang',
                ],
              },
              {
                saison: 'Automne (sept–nov)',
                emoji: '🍂',
                events: [
                  'Brocantes et vide-greniers locaux',
                  'Ateliers culturels (langue corse, artisanat)',
                  'Repérage des espèces d\'oiseaux migrateurs',
                  'Reprise des activités associatives',
                ],
              },
              {
                saison: 'Hiver (déc–fév)',
                emoji: '❄️',
                events: [
                  'Fêtes de fin d\'année et marché de Noël local',
                  'Tournois de football en salle',
                  'Ateliers cuisine corses et gastronomie',
                  'Réunions et AG des associations de Biguglia',
                ],
              },
            ].map(s => (
              <div key={s.saison} className="bg-gray-50 rounded-2xl p-4">
                <p className="font-black text-gray-900 text-sm mb-2">{s.emoji} {s.saison}</p>
                <ul className="space-y-1">
                  {s.events.map(ev => (
                    <li key={ev} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-violet-400 mt-0.5 flex-shrink-0">›</span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500 italic">
            Les dates exactes sont publiées sur Biguglia Connect au fil de l\&apos;année par les organisateurs.
            Consultez aussi le site officiel de la{' '}
            <a href="https://www.biguglia.fr" target="_blank" rel="noopener noreferrer"
              className="text-violet-600 font-semibold hover:underline">mairie de Biguglia</a>.
          </p>
        </section>

        {/* ══════════════════════════════════════════
            CATÉGORIES
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Types d&apos;événements à {GEO.city}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
              <Link key={key} href={`/evenements?categorie=${key}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center hover:shadow-md hover:border-gray-200 transition-colors">
                  <p className="text-2xl mb-1">{cat.emoji}</p>
                  <p className="text-xs font-bold text-gray-700">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LIENS CONTEXTUELS — catégories & fiches liées
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Filtres & ressources associées — Accès direct
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Accédez directement aux sous-catégories d&apos;événements et aux pages locales liées.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Par catégorie d&apos;événement</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/evenements?categorie=sport',       label: '⚽ Sport — SC Biguglia' },
                  { href: '/evenements?categorie=culture',     label: '🎭 Culture & polyphonie' },
                  { href: '/evenements?categorie=fete',        label: '🎉 Fêtes patronales' },
                  { href: '/evenements?categorie=nature',      label: '🌿 Sorties étang & nature' },
                  { href: '/evenements?categorie=marche',      label: '🛒 Marchés de producteurs' },
                  { href: '/evenements?categorie=atelier',     label: '🎨 Ateliers & cours' },
                  { href: '/evenements?categorie=association', label: '🏛️ Événements associatifs' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Pages & contenus liés</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/associations-biguglia',            label: '🏛️ SC Biguglia & clubs' },
                  { href: '/promenades',                       label: '🥾 Randonnées & étang' },
                  { href: '/annonces?type=don',                label: '🎁 Vide-greniers locaux' },
                  { href: '/forum?categorie=vie_locale',       label: '🏘️ Forum Vie locale' },
                  { href: '/forum?categorie=nature',           label: '🌿 Forum Étang & nature' },
                  { href: '/communaute',                       label: '👥 Communauté Biguglia' },
                  { href: '/evenements/nouveau',               label: '+ Publier un événement' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ enrichie (7 questions)
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
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

        {/* ══════════════════════════════════════════
            MAILLAGE INTERNE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Explorer Biguglia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations',          desc: 'SC Biguglia & tous les clubs locaux' },
              { href: '/artisans-biguglia',     emoji: '🔧', title: 'Artisans vérifiés',    desc: 'Plombiers, électriciens…' },
              { href: '/emploi-biguglia',       emoji: '💼', title: 'Emploi local',          desc: 'Offres & candidatures' },
              { href: '/forum-biguglia',        emoji: '💬', title: 'Forum des habitants',  desc: 'Questions & entraide' },
              { href: '/annonces-biguglia',     emoji: '📦', title: 'Petites annonces',     desc: 'Achat, vente, dons locaux' },
              { href: '/promenades',            emoji: '🥾', title: 'Promenades & sorties', desc: 'Balades autour de l\'étang' },
              { href: '/services-biguglia',     emoji: '🛠️', title: 'Services locaux',      desc: 'Tous les services de Biguglia' },
              { href: '/perdu-trouve',          emoji: '🔍', title: 'Objets perdus',         desc: 'Retrouvez vos affaires' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-colors flex items-center gap-3">
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

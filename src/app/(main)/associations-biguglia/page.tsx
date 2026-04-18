/**
 * Route /associations-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour "associations Biguglia", "clubs Biguglia",
 * "bénévolat Biguglia", "vie associative Haute-Corse".
 *
 * Architecture SSR + JSON-LD complet
 * (BreadcrumbList + FAQPage + Organization/SportsClub + ItemList + CollectionPage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, ChevronRight, MapPin, ArrowRight, Heart, Trophy, Music, Leaf } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, collectionPageSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Associations à Biguglia — Clubs, Bénévolat & Vie Associative (Haute-Corse)',
  description:
    'Toutes les associations de Biguglia : SC Biguglia (football), clubs sportifs, associations culturelles corses, groupes environnementaux (étang), seniors et bénévolat. Rejoignez la vie associative de Biguglia, Haute-Corse (20620).',
  keywords: [
    'associations Biguglia', 'clubs Biguglia', 'vie associative Biguglia',
    'bénévolat Biguglia', 'SC Biguglia', 'association Haute-Corse',
    'clubs sportifs Biguglia', 'association culturelle Corse',
    'football Biguglia', 'bénévole Biguglia', 'club nature Biguglia',
    'association seniors Biguglia', 'rejoindre association Corse',
  ],
  alternates: { canonical: `${SITE_URL}/associations-biguglia` },
  openGraph: {
    title:       'Associations à Biguglia — Clubs & Vie Associative (Haute-Corse)',
    description: 'SC Biguglia, clubs sportifs, associations culturelles, bénévolat et seniors. Toute la vie associative de Biguglia.',
    url:         `${SITE_URL}/associations-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Associations et clubs à Biguglia, Haute-Corse' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface AssociationRow {
  id:          string;
  name:        string;
  category:    string | null;
  description: string | null;
  city:        string | null;
}

async function fetchAssociations(): Promise<{ assocs: AssociationRow[]; total: number }> {
  try {
    const supabase = createClient();
    const { data, count } = await supabase
      .from('associations')
      .select('id, name, category, description, city', { count: 'exact' })
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(9);
    return { assocs: (data ?? []) as AssociationRow[], total: count ?? 0 };
  } catch {
    return { assocs: [], total: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ASSOC_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  sport:    { label: 'Sport',         emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:  { label: 'Culture',       emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  nature:   { label: 'Environnement', emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  social:   { label: 'Social',        emoji: '🤝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  seniors:  { label: 'Seniors',       emoji: '👴', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  jeunesse: { label: 'Jeunesse',      emoji: '🎓', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// ─── Grandes associations phares de Biguglia ──────────────────────────────────

const FEATURED_ASSOCS = [
  {
    emoji: '⚽',
    name:  'SC Biguglia — Football',
    desc:  'Le Sporting Club Biguglia est l\'association emblématique de la commune. Club de football toutes catégories (U6 à seniors), il fédère joueurs, bénévoles et supporters depuis des décennies. Ses matchs sont des événements communautaires incontournables.',
    href:  '/associations?categorie=sport',
  },
  {
    emoji: '🌿',
    name:  'Protection de l\'Étang de Biguglia',
    desc:  'L\'étang de Biguglia, plus grand étang naturel de Corse et réserve naturelle régionale, est au cœur de nombreuses initiatives associatives. Des groupes organisent des sorties naturalistes, des actions de nettoyage et de sensibilisation à la biodiversité locale.',
    href:  '/associations?categorie=nature',
  },
  {
    emoji: '🎭',
    name:  'Associations culturelles corses',
    desc:  'Biguglia abrite plusieurs associations qui préservent et transmettent les traditions corses : musique polyphonique, artisanat local, langue corse et gastronomie. Ces associations animent le village lors des fêtes patronales et des événements culturels.',
    href:  '/associations?categorie=culture',
  },
  {
    emoji: '👴',
    name:  'Clubs seniors & retraités',
    desc:  'Les associations de seniors organisent activités sportives douces, sorties, ateliers et rencontres conviviales. Un lien social essentiel pour les habitants les plus âgés de Biguglia, qui peuvent ainsi rester actifs et intégrés dans la communauté.',
    href:  '/associations?categorie=seniors',
  },
];

// ─── FAQ enrichie (6 questions) ───────────────────────────────────────────────

const FAQ = [
  {
    q: 'Combien y a-t-il d\'associations à Biguglia ?',
    a: 'Biguglia compte de nombreuses associations actives couvrant le sport (dont le SC Biguglia, football), la culture corse, la protection de l\'étang de Biguglia (réserve naturelle), le bénévolat social, les seniors et la jeunesse. Retrouvez-les toutes sur Biguglia Connect.',
  },
  {
    q: 'Comment rejoindre une association à Biguglia ?',
    a: 'Consultez le profil de l\'association sur Biguglia Connect pour trouver les coordonnées, les créneaux d\'activité et les modalités d\'adhésion. Vous pouvez contacter directement les responsables via la plateforme, sans avoir à vous déplacer.',
  },
  {
    q: 'Comment créer ou référencer une association à Biguglia ?',
    a: 'Créez un compte sur Biguglia Connect et publiez le profil de votre association gratuitement. Vous pourrez partager vos actualités, vos besoins en bénévoles, vos prochains événements et être trouvé par tous les habitants de Biguglia et des communes voisines.',
  },
  {
    q: 'Quels sports sont pratiqués dans les clubs de Biguglia ?',
    a: 'Football (SC Biguglia, toutes catégories d\'âge), sports nautiques sur l\'étang de Biguglia, pétanque, tennis, randonnée sur les sentiers de la plaine orientale, activités aquatiques et sports pour seniors. Consultez l\'annuaire complet pour la liste de toutes les disciplines.',
  },
  {
    q: 'Comment participer à la protection de l\'étang de Biguglia ?',
    a: 'L\'étang de Biguglia est une réserve naturelle régionale d\'importance nationale. Plusieurs associations locales organisent des actions de préservation, des sorties naturalistes et des ateliers de sensibilisation. Rejoignez-les via Biguglia Connect ou participez aux événements nature publiés sur la plateforme.',
  },
  {
    q: 'Y a-t-il des associations de bénévolat à Biguglia ?',
    a: 'Oui, plusieurs associations proposent des missions de bénévolat à Biguglia : aide alimentaire, accompagnement de seniors, soutien scolaire, environnement. Consultez la catégorie "Social" de l\'annuaire pour trouver une mission qui correspond à vos disponibilités et compétences.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssociationsBigugliaPage() {
  const { assocs, total } = await fetchAssociations();

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Associations à ${GEO.city}`, url: '/associations-biguglia' },
  ]);
  const faq        = faqSchema(FAQ);
  const collection = collectionPageSchema({
    name:        `Associations & clubs à ${GEO.city}`,
    description: `Annuaire des associations sportives, culturelles, environnementales et sociales de ${GEO.city}, ${GEO.department}.`,
    url:         '/associations-biguglia',
  });

  // SportsClub schema pour SC Biguglia
  const scBigugliaSchema = {
    '@context': 'https://schema.org',
    '@type':    'SportsClub',
    name:       'SC Biguglia',
    description:'Club de football de Biguglia — Sporting Club Biguglia, toutes catégories d\'âge.',
    url:        `${SITE_URL}/associations?nom=sc-biguglia`,
    sport:      'Football',
    address: {
      '@type':           'PostalAddress',
      addressLocality:   GEO.city,
      addressRegion:     GEO.department,
      postalCode:        GEO.postalCode,
      addressCountry:    GEO.countryCode,
    },
    areaServed: { '@type': 'City', name: GEO.city },
    memberOf: {
      '@type': 'Organization',
      name:    'Ligue Corse de Football',
    },
  };

  // Organisation schema générique pour les associations
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:       `Associations de ${GEO.city}`,
    description:`Fédération des associations et clubs locaux de ${GEO.city}, ${GEO.department}. Sport, culture, nature, bénévolat, seniors.`,
    url:        `${SITE_URL}/associations-biguglia`,
    address: {
      '@type':           'PostalAddress',
      addressLocality:   GEO.city,
      addressRegion:     GEO.department,
      postalCode:        GEO.postalCode,
      addressCountry:    GEO.countryCode,
    },
    areaServed: { '@type': 'City', name: GEO.city },
  };

  // ItemList des associations réelles depuis Supabase
  const orgListSchema = assocs.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Associations à ${GEO.city}`,
    url:             `${SITE_URL}/associations-biguglia`,
    numberOfItems:   total,
    itemListElement: assocs.map((a, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      url:       `${SITE_URL}/associations/${a.id}`,
      name:      a.name,
      item: {
        '@type':     a.category === 'sport' ? 'SportsOrganization' : 'Organization',
        name:        a.name,
        description: a.description ?? undefined,
        url:         `${SITE_URL}/associations/${a.id}`,
        address: {
          '@type':           'PostalAddress',
          addressLocality:   a.city ?? GEO.city,
          addressRegion:     GEO.department,
          addressCountry:    GEO.countryCode,
        },
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      <JsonLd data={scBigugliaSchema} />
      <JsonLd data={orgSchema} />
      {orgListSchema && <JsonLd data={orgListSchema} />}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-violet-700 via-indigo-700 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Associations à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <MapPin className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} associations actives` : 'Vie associative'} · {GEO.city} · {GEO.postalCode}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Associations à Biguglia<br />
            <span className="text-violet-300">Vie associative locale</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            SC Biguglia, clubs sportifs, associations culturelles corses, groupes environnementaux
            de l'étang, seniors et bénévolat — toute la vie associative de Biguglia réunie sur une
            seule plateforme.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: total > 0 ? `${total}` : '—', label: 'Associations actives' },
              { value: '6',                           label: 'Catégories' },
              { value: '0 €',                         label: 'Inscription gratuite' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/associations"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-md">
              🏛️ Voir toutes les associations <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/associations/nouvelle"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              + Référencer mon association
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — vie associative Biguglia
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            La vie associative à {GEO.city} : un pilier de la communauté
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Le <strong>SC Biguglia (Sporting Club Biguglia)</strong> est l'association la plus emblématique
                de la commune. Ce club de football rassemble des joueurs de tous âges — de l'U6 aux seniors —
                bénévoles et supporters depuis des décennies. Ses matchs à domicile sont de véritables
                événements fédérateurs pour toute la communauté.
              </p>
              <p>
                Au-delà du football, Biguglia compte des <strong>associations culturelles</strong> actives :
                transmission de la polyphonie corse, préservation de l'artisanat traditionnel, pratique
                de la langue corse et promotion de la gastronomie locale. Ces groupes animent les fêtes
                patronales et participent aux événements culturels de Haute-Corse.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                L'<strong>étang de Biguglia</strong> — plus grand étang naturel de Corse et réserve
                naturelle régionale — est au cœur d'un réseau d'associations environnementales.
                Ornithologues, naturalistes et citoyens engagés organisent des sorties aux flamants roses,
                des ateliers de sensibilisation et des actions de préservation de cette zone humide classée.
              </p>
              <p>
                <strong>Vous gérez une association ?</strong> Référencez-la gratuitement sur Biguglia Connect.
                Partagez vos actualités, vos besoins en bénévoles et vos prochains événements pour toucher
                tous les habitants de Biguglia (20620) et des communes voisines : Borgo, Furiani, Lucciana.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/associations/nouvelle',  label: '+ Référencer mon association' },
              { href: '/evenements-biguglia',    label: '🎉 Événements locaux' },
              { href: '/emploi-biguglia',        label: '💼 Bénévolat & missions' },
              { href: '/forum-biguglia',         label: '💬 Forum des habitants' },
              { href: '/communaute',             label: '🏘️ Communauté Biguglia' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ASSOCIATIONS PHARES DE BIGUGLIA
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Associations phares de {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Découvrez les associations les plus actives de la commune et rejoignez celle qui vous correspond.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_ASSOCS.map(assoc => (
              <Link key={assoc.name} href={assoc.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{assoc.emoji}</span>
                    <h3 className="font-black text-gray-900 text-sm">{assoc.name}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{assoc.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-violet-600 mt-auto">
                    Voir les associations <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LISTE ASSOCIATIONS DEPUIS SUPABASE
        ══════════════════════════════════════════ */}
        {assocs.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600" />
                {total} associations à {GEO.city}
              </h2>
              <Link href="/associations"
                className="flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assocs.map(a => {
                const cat = a.category ? ASSOC_CATEGORIES[a.category] : null;
                return (
                  <Link key={a.id} href={`/associations/${a.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm line-clamp-2 flex-1">{a.name}</p>
                        {cat && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cat.color}`}>
                            {cat.emoji} {cat.label}
                          </span>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{a.description}</p>
                      )}
                      <div className="mt-auto flex items-center gap-1 text-xs font-bold text-violet-600">
                        En savoir plus <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <span className="text-4xl mb-3 block">🏛️</span>
            <h2 className="font-black text-gray-900 mb-2">Aucune association référencée</h2>
            <p className="text-gray-500 text-sm mb-4">Vous gérez une association à Biguglia ? Référencez-la gratuitement.</p>
            <Link href="/associations/nouvelle"
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all">
              Publier mon association
            </Link>
          </section>
        )}

        {/* ══════════════════════════════════════════
            CATÉGORIES
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Catégories d'associations à {GEO.city}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(ASSOC_CATEGORIES).map(([key, cat]) => (
              <Link key={key} href={`/associations?categorie=${key}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{cat.label}</p>
                    <p className="text-xs text-gray-500">à {GEO.city}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA BÉNÉVOLAT
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <p className="text-3xl mb-3">🤝</p>
            <h2 className="text-xl font-black mb-2">Vous cherchez à vous engager à {GEO.city} ?</h2>
            <p className="text-white/75 text-sm max-w-md mx-auto mb-5 leading-relaxed">
              Des associations locales cherchent des bénévoles toute l'année. Rejoignez un club sportif,
              une association culturelle ou un groupe de protection de l'étang de Biguglia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/associations"
                className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-lg">
                <Heart className="w-4 h-4" /> Trouver une association
              </Link>
              <Link href="/evenements-biguglia"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
                🎉 Événements associatifs
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ enrichie (6 questions)
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Questions fréquentes — Associations à {GEO.city}
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
          <h2 className="text-xl font-black text-gray-900 mb-4">Autres pages à {GEO.city}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/evenements-biguglia',  emoji: '🎉', title: 'Événements',            desc: 'SC Biguglia & agenda local complet' },
              { href: '/artisans-biguglia',    emoji: '🔧', title: 'Artisans vérifiés',     desc: 'Tous les métiers locaux' },
              { href: '/emploi-biguglia',      emoji: '💼', title: 'Emploi & bénévolat',    desc: 'Offres & missions volontaires' },
              { href: '/forum-biguglia',       emoji: '💬', title: 'Forum des habitants',   desc: 'Échanges & entraide locale' },
              { href: '/annonces-biguglia',    emoji: '📦', title: 'Petites annonces',      desc: 'Vente & dons entre voisins' },
              { href: '/communaute',           emoji: '🏘️', title: 'Communauté',            desc: 'Membres actifs et badges' },
              { href: '/services-biguglia',    emoji: '🛠️', title: 'Services locaux',       desc: 'Artisans & prestataires vérifiés' },
              { href: '/coups-de-main',        emoji: '🤝', title: 'Coups de main',         desc: 'Entraide de voisinage' },
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

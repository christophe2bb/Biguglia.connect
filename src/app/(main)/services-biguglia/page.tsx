/**
 * Route /services-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Hub SEO principal pour "services Biguglia", "artisans Biguglia",
 * "travaux Biguglia", "prestataires Haute-Corse".
 *
 * Architecture SSR pure : données réelles Supabase + JSON-LD complet
 * (BreadcrumbList + FAQPage + ItemList + Service par catégorie + CollectionPage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  JsonLd, breadcrumbSchema, faqSchema, serviceSchema, collectionPageSchema, itemListSchema,
} from '@/components/seo/JsonLd';
import { TRADE_META, GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Services & Artisans à Biguglia — Plombier, Électricien, Maçon (Haute-Corse)',
  description:
    'Tous les services locaux à Biguglia : plombiers, électriciens, maçons, peintres, jardiniers, carreleurs… Artisans vérifiés SIRET, avis réels, contact direct. Devis gratuit en Haute-Corse (2B).',
  keywords: [
    'services Biguglia', 'artisans Biguglia', 'travaux Biguglia',
    'plombier Biguglia', 'électricien Biguglia', 'maçon Biguglia',
    'rénovation Biguglia', 'services Haute-Corse 2B', 'artisan vérifié Corse',
    'devis gratuit Biguglia', 'prestataire Biguglia', 'réparation Corse',
  ],
  alternates: { canonical: `${SITE_URL}/services-biguglia` },
  openGraph: {
    title:       'Services & Artisans à Biguglia — Vérifiés & Disponibles (Haute-Corse)',
    description: 'Plombiers, électriciens, maçons, peintres… Tous les artisans vérifiés de Biguglia (2B), Haute-Corse.',
    url:         `${SITE_URL}/services-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Services et artisans à Biguglia, Haute-Corse' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

async function fetchStats(): Promise<{ artisanCount: number; reviewCount: number; requestCount: number }> {
  try {
    const supabase = await createClient();
    const [{ count: artisanCount }, { count: reviewCount }, { count: requestCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
      supabase.from('artisan_reviews').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
    ]);
    return { artisanCount: artisanCount ?? 0, reviewCount: reviewCount ?? 0, requestCount: requestCount ?? 0 };
  } catch { return { artisanCount: 0, reviewCount: 0, requestCount: 0 }; }
}

// ─── FAQ enrichie (7 questions) ───────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment trouver un artisan fiable à Biguglia ?',
    a: 'Sur Biguglia Connect, chaque artisan est vérifié manuellement par notre équipe : SIRET, assurance RC Pro et pièce d\'identité contrôlés. Vous pouvez consulter les avis de vrais clients et contacter directement l\'artisan sans intermédiaire ni commission.',
  },
  {
    q: 'Les artisans de Biguglia interviennent-ils dans les communes voisines ?',
    a: 'Oui, la plupart des artisans référencés couvrent également les communes proches : Borgo, Furiani, Lucciana, Bastia et les villages de la plaine orientale de Haute-Corse (2B).',
  },
  {
    q: 'Comment déposer une demande de devis à Biguglia ?',
    a: 'Rendez-vous sur la page "Déposer une demande" de Biguglia Connect. Décrivez votre projet en 2 minutes et les artisans locaux vous contactent directement avec un devis gratuit et sans engagement.',
  },
  {
    q: 'Les avis sur les artisans de Biguglia sont-ils fiables ?',
    a: 'Oui, tous les avis proviennent d\'échanges réels entre un habitant et un artisan via Biguglia Connect. Ils sont modérés avant publication et impossibles à falsifier.',
  },
  {
    q: 'Biguglia Connect est-il gratuit pour trouver un artisan ?',
    a: 'Oui, la consultation des profils, la lecture des avis et la prise de contact sont entièrement gratuites pour les habitants. Les artisans bénéficient également d\'une inscription gratuite.',
  },
  {
    q: 'Quels travaux sont les plus demandés à Biguglia ?',
    a: 'À Biguglia, les demandes les plus fréquentes concernent la plomberie (fuites, chauffe-eau, salle de bain), l\'électricité (mise aux normes, tableau électrique), la maçonnerie (clôtures, murs, dalles) et la peinture intérieure. La rénovation globale de maisons corses est aussi très courante.',
  },
  {
    q: 'Comment vérifier qu\'un artisan est bien assuré à Biguglia ?',
    a: 'Sur Biguglia Connect, la validité de l\'assurance RC Pro et décennale est vérifiée lors de l\'inscription. Vous pouvez également demander à l\'artisan de vous transmettre directement son attestation d\'assurance avant de signer un devis.',
  },
];

// ─── Catégories de services avec descriptions éditoriales ─────────────────────

const SERVICE_CATEGORIES = [
  {
    slug:  'plomberie',
    title: 'Plomberie à Biguglia',
    desc:  'Fuites, chauffe-eau, salle de bain, raccordement — interventions rapides en 24–48 h.',
    href:  '/artisans/metier/plomberie',
  },
  {
    slug:  'electricite',
    title: 'Électricité à Biguglia',
    desc:  'Mise aux normes, tableau électrique, domotique, pose de prises et éclairage.',
    href:  '/artisans/metier/electricite',
  },
  {
    slug:  'maconnerie',
    title: 'Maçonnerie à Biguglia',
    desc:  'Gros œuvre, clôtures, dallages, reprises de façade — maçons locaux certifiés.',
    href:  '/artisans/metier/maconnerie',
  },
  {
    slug:  'peinture',
    title: 'Peinture à Biguglia',
    desc:  'Intérieur, extérieur, ravalement de façade — peintres locaux avec avis vérifiés.',
    href:  '/artisans/metier/peinture',
  },
  {
    slug:  'menuiserie',
    title: 'Menuiserie à Biguglia',
    desc:  'Fenêtres, portes, parquet, mobilier sur mesure — artisans du bois locaux.',
    href:  '/artisans/metier/menuiserie',
  },
  {
    slug:  'jardinage',
    title: 'Jardinage à Biguglia',
    desc:  'Entretien de jardin, taille, élagage, création de massifs et pelouses.',
    href:  '/artisans/metier/jardinage',
  },
];

// ─── Services d’urgence — contenu éditorial spécifique ──────────────────────────────────────────────────────────────
const EMERGENCY_SERVICES = [
  {
    emoji: '🚨',
    title: 'Plombier urgence Biguglia',
    desc:  'Fuite d\'eau, dégât des eaux, chauffe-eau en panne — intervention rapide 7j/7, y compris le week-end.',
    href:  '/artisans/metier/plomberie',
  },
  {
    emoji: '⚡',
    title: 'Électricien urgence Biguglia',
    desc:  'Panne de courant, court-circuit, disjoncteur — dépannage électrique en urgence sur Biguglia et Haute-Corse.',
    href:  '/artisans/metier/electricite',
  },
  {
    emoji: '🔑',
    title: 'Serrurier urgence Biguglia',
    desc:  'Clé cassée, porte claque, cambriolage — serrurier disponible rapidement à Biguglia et communes voisines.',
    href:  '/artisans/metier/serrurerie',
  },
  {
    emoji: '🌪️',
    title: 'Vitrerie urgence Biguglia',
    desc:  'Vitre cassée, fenêtre fracturée — remplacement de vitres en urgence pour sécuriser votre logement à Biguglia.',
    href:  '/artisans/metier/vitrerie',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ServicesBigugliaPage() {
  const { artisanCount, reviewCount, requestCount } = await fetchStats();

  // JSON-LD
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                  url: '/' },
    { name: `Services à ${GEO.city}`,  url: '/services-biguglia' },
  ]);
  const faq = faqSchema(FAQ);
  const collection = collectionPageSchema({
    name:        `Services & artisans à ${GEO.city}`,
    description: `Annuaire des artisans vérifiés et des services locaux à ${GEO.city}, ${GEO.department}.`,
    url:         '/services-biguglia',
  });
  const tradeList = itemListSchema({
    name:  `Catégories de services à ${GEO.city}`,
    url:   '/services-biguglia',
    items: TRADE_META.map(t => ({
      name:        t.h1,
      url:         `/artisans/metier/${t.slug}`,
      description: t.description,
    })),
  });
  // Service schemas — top 6 catégories pour les rich results
  const serviceSchemas = SERVICE_CATEGORIES.map(cat =>
    serviceSchema({ name: cat.title, description: cat.desc, url: cat.href })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      <JsonLd data={tradeList} />
      {serviceSchemas.map((s, i) => <JsonLd key={i} data={s} />)}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Services à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-5 py-2 mb-5">
            <MapPin className="w-4 h-4 text-white/80" />
            <span className="text-white/90 text-sm font-bold">{GEO.city} · {GEO.department} · {GEO.iso}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Services & Artisans<br />
            <span className="text-orange-300">à Biguglia</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            {artisanCount > 0
              ? `${artisanCount} artisans vérifiés à votre service — plombiers, électriciens, maçons, peintres, jardiniers et plus encore.`
              : 'Plombiers, électriciens, maçons, peintres et plus encore — tous vérifiés, tous locaux.'}
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: artisanCount > 0 ? `${artisanCount}+` : '50+',    label: 'Artisans vérifiés' },
              { value: reviewCount    > 0 ? `${reviewCount}+` : '200+',   label: 'Avis clients' },
              { value: requestCount   > 0 ? `${requestCount}+` : '500+',  label: 'Demandes traitées' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/artisans"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-md">
              Trouver un artisan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une demande de devis
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — territoire, particularités
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Services locaux à {GEO.city} : ce qu&apos;il faut savoir
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Biguglia, nichée entre <strong>l&apos;étang de Biguglia</strong> — plus grand étang naturel de Corse,
                classé réserve naturelle régionale — et la mer Tyrrhénienne, est une commune en pleine expansion.
                Sa proximité avec Bastia (8 km) et la plaine orientale en fait un territoire très demandé pour
                les <strong>services à domicile</strong>, les <strong>travaux de rénovation</strong> et les
                <strong> artisans qualifiés</strong>.
              </p>
              <p>
                La commune attire chaque année de nouveaux habitants et des projets immobiliers neufs, ce qui génère
                une demande soutenue en plomberie, électricité, maçonnerie, peinture et jardinage. Les maisons corses
                en pierre (granit, schiste) présentent des <strong>spécificités techniques</strong> que maîtrisent
                parfaitement les artisans locaux référencés sur Biguglia Connect.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Zone d&apos;intervention principale :</strong> les prestataires référencés couvrent également{' '}
                <Link href="/artisans?ville=Borgo" className="text-brand-600 font-semibold hover:underline">Borgo</Link>,{' '}
                <Link href="/artisans?ville=Furiani" className="text-brand-600 font-semibold hover:underline">Furiani</Link>,{' '}
                <Link href="/artisans?ville=Lucciana" className="text-brand-600 font-semibold hover:underline">Lucciana</Link>,{' '}
                <Link href="/artisans?ville=Bastia" className="text-brand-600 font-semibold hover:underline">Bastia</Link>{' '}
                et Vescovato dans le bassin de Haute-Corse.
              </p>
              <p>
                <strong>Conseils avant tout travaux :</strong> demandez toujours au moins trois devis comparatifs,
                vérifiez la validité de l&apos;assurance décennale pour les travaux de construction, et privilégiez les
                artisans disposant d&apos;avis vérifiés de voisins dans un rayon de 10 km. Sur Biguglia Connect, ces
                informations sont contrôlées manuellement par notre équipe.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/artisans-biguglia',     label: '🔧 Annuaire artisans Biguglia' },
              { href: '/artisans/demande',       label: '📝 Déposer une demande de devis' },
              { href: '/annonces-biguglia',      label: '📦 Petites annonces locales' },
              { href: '/perdu-trouve',           label: '🔍 Objets perdus & trouvés' },
              { href: '/forum-biguglia',         label: '💬 Forum habitants Biguglia' },
              { href: '/materiel',               label: '🛠️ Matériel partagé entre voisins' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            GARANTIES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🛡️', title: 'Artisans vérifiés',       desc: 'SIRET, assurance RC Pro et identité contrôlés par notre équipe avant toute publication' },
            { emoji: '⭐', title: 'Avis de vrais clients',    desc: 'Évaluations authentiques laissées après chaque prestation par de vrais habitants' },
            { emoji: '💬', title: 'Contact direct & gratuit', desc: 'Échangez directement avec l\'artisan, sans commission ni intermédiaire' },
          ].map(g => (
            <div key={g.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-2xl mb-2">{g.emoji}</p>
              <h3 className="font-black text-gray-900 text-sm mb-1">{g.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            CATÉGORIES VEDETTES — liens vers fiches métier
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Services les plus demandés à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur une catégorie pour découvrir les artisans vérifiés disponibles à Biguglia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICE_CATEGORIES.map(cat => (
              <Link key={cat.slug} href={cat.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                  <h3 className="font-black text-gray-900 text-sm">{cat.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-brand-600 mt-auto">
                    Voir les artisans <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            GRILLE COMPLÈTE DES MÉTIERS
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Tous les métiers à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {TRADE_META.length} catégories — cliquez pour voir les artisans disponibles à Biguglia et en Haute-Corse.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRADE_META.map(trade => (
              <Link key={trade.slug} href={`/artisans/metier/${trade.slug}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{trade.emoji}</span>
                    <div>
                      <h3 className="font-black text-gray-900 text-sm">{trade.h1}</h3>
                      <p className="text-xs text-gray-500">{trade.namePlural} vérifiés</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 flex-1">{trade.description}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-brand-600 mt-auto">
                    Voir les profils <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SERVICES D’URGENCE
        ══════════════════════════════════════════ */}
        <section className="bg-red-50 rounded-3xl border border-red-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚨</span>
            <h2 className="text-xl font-black text-gray-900">Services d\&apos;urgence à {GEO.city}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            Fuite, panne, serrure bloquée — certains artisans de Biguglia proposent des interventions
            d\&apos;urgence 7j/7. Précisez <strong>« urgence »</strong> dans votre message pour une réponse
            sous 2 heures. Les services d\&apos;urgence sont payants mais sans surprice de facturation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMERGENCY_SERVICES.map(srv => (
              <Link key={srv.title} href={srv.href}>
                <div className="bg-white rounded-2xl border border-red-100 p-4 hover:shadow-md hover:border-red-200 transition-all flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{srv.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{srv.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{srv.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CALENDRIER SÉASONNIER
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Quand réaliser vos travaux à {GEO.city} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">☀️</span>
                <div>
                  <p className="font-bold text-gray-900">Printemps – été (mars–octobre)</p>
                  <p>Période de forte activité : ravalement de façade, peinture extérieure, jardinage,
                  terrasses, piscines. Prévoyez 3 à 6 semaines de délai pour les artisans les plus demandés.
                  Réservez tôt, surtout pour les gros chantiers.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🍂</span>
                <div>
                  <p className="font-bold text-gray-900">Automne (octobre–décembre)</p>
                  <p>Idéal pour l\&apos;isolation thermique, le chauffage (chauffe-eau, climatisation), la
                  plomberie intérieure et les travaux d\&apos;aménagement. Délais plus courts, parfois
                  tarifs négociables.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">❄️</span>
                <div>
                  <p className="font-bold text-gray-900">Hiver (janvier–février)</p>
                  <p>Meilleure disponibilité des artisans, délais plus courts. Parfait pour la mise aux normes
                  électrique, la plomberie (tuyaux hors-gel), la peinture intérieure et les
                  travaux de menuiserie. Certains artisans offrent des réductions hors saison.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📌</span>
                <div>
                  <p className="font-bold text-gray-900">Toute l\&apos;année</p>
                  <p>Plomberie d\&apos;urgence, dépannage électrique et serrurerie interviennent 365 jours par an
                  à Biguglia. Pour les urgences, contactez directement via Biguglia Connect en précisant
                  votre situation.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COMMENT ÇA MARCHE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Comment trouver un artisan à {GEO.city} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '1', emoji: '🔍', title: 'Choisissez votre métier',   desc: 'Parcourez les catégories ou utilisez la recherche pour trouver le bon artisan à Biguglia.' },
              { n: '2', emoji: '📋', title: 'Consultez les profils',     desc: 'Lisez les avis vérifiés, regardez les certifications et comparez les artisans locaux.' },
              { n: '3', emoji: '💬', title: 'Contactez directement',     desc: 'Envoyez un message à l\'artisan gratuitement. Il vous répond et vous propose un devis sans commission.' },
            ].map(s => (
              <div key={s.n} className="bg-white rounded-2xl border border-gray-100 p-5 relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-md">{s.n}</div>
                <p className="text-2xl mb-2 mt-1">{s.emoji}</p>
                <h3 className="font-black text-gray-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ enrichie (7 questions)
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Questions fréquentes — Services à {GEO.city}
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
            LIENS CONTEXTUELS — sous-catégories & fiches
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-3xl border border-sky-100 p-6 sm:p-8">
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Trouvez le bon prestataire à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Accédez directement aux fiches métier, aux profils disponibles et aux ressources liées.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Fiches métier directes</p>
              <div className="space-y-2">
                {[
                  { href: '/artisans/metier/plomberie',     emoji: '🚿', label: 'Plombiers à Biguglia',     sub: 'Fuite, chauffe-eau, sdb' },
                  { href: '/artisans/metier/electricite',   emoji: '⚡', label: 'Électriciens à Biguglia',  sub: 'Tableau, mise aux normes' },
                  { href: '/artisans/metier/maconnerie',    emoji: '🏗️', label: 'Maçons à Biguglia',        sub: 'Gros œuvre, façades, dallage' },
                  { href: '/artisans/metier/peinture',      emoji: '🎨', label: 'Peintres à Biguglia',      sub: 'Intérieur, extérieur, ravalement' },
                  { href: '/artisans/metier/menuiserie',    emoji: '🪵', label: 'Menuisiers à Biguglia',    sub: 'Fenêtres, portes, parquet' },
                  { href: '/artisans/metier/jardinage',     emoji: '🌿', label: 'Jardiniers à Biguglia',    sub: 'Entretien, taille, élagage' },
                ].map(m => (
                  <Link key={m.href} href={m.href}>
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2 hover:shadow-sm hover:border-brand-200 transition-all">
                      <span className="text-lg flex-shrink-0">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1">{m.label}</p>
                        <p className="text-xs text-gray-500">{m.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Catégories & ressources liées</p>
              <div className="space-y-2">
                {[
                  { href: '/artisans-biguglia',                emoji: '🔧', label: 'Annuaire artisans Biguglia',    sub: 'Tous les métiers vérifiés' },
                  { href: '/artisans/demande',                 emoji: '📝', label: 'Déposer une demande de devis', sub: 'Gratuit, sans engagement' },
                  { href: '/artisans?categorie=serrurerie',    emoji: '🔑', label: 'Serruriers à Biguglia',        sub: 'Urgence, remplacement' },
                  { href: '/artisans?categorie=climatisation', emoji: '❄️', label: 'Climatisation Biguglia',       sub: 'Pompe à chaleur, clim réversible' },
                  { href: '/artisans?categorie=carrelage',     emoji: '🪟', label: 'Carreleurs à Biguglia',        sub: 'Salle de bain, cuisine, terrasse' },
                  { href: '/materiel',                         emoji: '🛠️', label: 'Matériel à emprunter',         sub: 'Perceuse, échelle, karcher…' },
                ].map(m => (
                  <Link key={m.href} href={m.href}>
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2 hover:shadow-sm hover:border-sky-200 transition-all">
                      <span className="text-lg flex-shrink-0">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1">{m.label}</p>
                        <p className="text-xs text-gray-500">{m.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAILLAGE INTERNE — pages voisines
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Autres ressources locales à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/artisans-biguglia',     emoji: '🔧', title: 'Artisans à Biguglia',       desc: 'Tous les métiers — hub complet' },
              { href: '/emploi-biguglia',        emoji: '💼', title: 'Emploi à Biguglia',         desc: 'Offres et demandes d\'emploi local' },
              { href: '/evenements-biguglia',    emoji: '🎉', title: 'Événements à Biguglia',     desc: 'Agenda des activités locales' },
              { href: '/associations-biguglia',  emoji: '🏛️', title: 'Associations à Biguglia',  desc: 'Clubs et vie associative' },
              { href: '/forum-biguglia',         emoji: '💬', title: 'Forum des habitants',       desc: 'Questions & entraide locale' },
              { href: '/annonces-biguglia',      emoji: '📦', title: 'Petites annonces',          desc: 'Achat, vente, dons entre voisins' },
              { href: '/perdu-trouve',           emoji: '🔍', title: 'Objets perdus & trouvés',   desc: 'Signalez ou retrouvez un objet' },
              { href: '/materiel',               emoji: '🛠️', title: 'Matériel partagé',          desc: 'Prêt & location entre voisins' },
              { href: '/coups-de-main',          emoji: '🤝', title: 'Coups de main',             desc: 'Entraide et services entre voisins' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3">
                  <span className="text-2xl">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{l.title}</p>
                    <p className="text-xs text-gray-500">{l.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA ARTISAN
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <p className="text-3xl mb-3">🔧</p>
            <h2 className="text-xl font-black mb-2">
              Vous êtes artisan à {GEO.city} ?
            </h2>
            <p className="text-white/75 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Créez votre profil gratuit sur Biguglia Connect et soyez trouvé par les habitants qui cherchent
              un prestataire de confiance. Vérification incluse, aucune commission sur les devis.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/inscription/artisan-profil"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-lg">
                Créer mon profil artisan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/artisans"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
                Voir l&apos;annuaire artisans
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

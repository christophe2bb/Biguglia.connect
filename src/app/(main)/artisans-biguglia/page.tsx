/**
 * Route /artisans-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Hub SEO principal pour les artisans de Biguglia.
 * Cible : "artisans Biguglia", "artisans Haute-Corse", "trouver artisan Corse".
 *
 * Architecture : SSR + JSON-LD LocalBusiness + BreadcrumbList + FAQPage.
 * Maillage interne vers toutes les pages /artisans/metier/[slug].
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield, Star, CheckCircle, ArrowRight, MapPin, ChevronRight,
  Users, Wrench, Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { TRADE_META, GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Artisans à Biguglia — Tous les Métiers Vérifiés (Haute-Corse)',
  description: 'Trouvez le meilleur artisan à Biguglia : plombier, électricien, maçon, peintre, menuisier… Artisans vérifiés SIRET, avis réels. Contact direct, devis gratuit.',
  keywords: [
    'artisans Biguglia', 'artisan Haute-Corse', 'artisan vérifié Corse',
    'travaux Biguglia', 'trouver artisan Biguglia', 'devis artisan Corse',
    'plombier Biguglia', 'électricien Biguglia', 'maçon Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/artisans-biguglia` },
  openGraph: {
    title:       'Artisans à Biguglia — Vérifiés & Recommandés (Haute-Corse)',
    description: 'Tous les artisans de Biguglia : plombiers, électriciens, maçons, peintres… Vérifiés, avis réels, contact direct.',
    url:         `${SITE_URL}/artisans-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Artisans à Biguglia' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

async function fetchStats(): Promise<{ totalArtisans: number; totalReviews: number }> {
  try {
    const supabase = createClient();
    const [{ count: totalArtisans }, { count: totalReviews }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
      supabase.from('artisan_reviews').select('*', { count: 'exact', head: true }),
    ]);
    return { totalArtisans: totalArtisans ?? 0, totalReviews: totalReviews ?? 0 };
  } catch {
    return { totalArtisans: 0, totalReviews: 0 };
  }
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment trouver un artisan fiable à Biguglia ?',
    a: 'Sur Biguglia Connect, chaque artisan est vérifié manuellement par notre équipe avant publication : SIRET, assurance RC Pro et pièce d\'identité. Consultez les avis de vrais clients et contactez directement l\'artisan sans intermédiaire ni commission.',
  },
  {
    q: 'Les artisans de Biguglia interviennent-ils dans les communes voisines ?',
    a: 'Oui, la plupart des artisans référencés couvrent également les communes proches : Borgo, Furiani, Lucciana, Bastia et l\'ensemble de la plaine orientale de Haute-Corse.',
  },
  {
    q: 'Comment déposer une demande de devis à Biguglia ?',
    a: 'Rendez-vous sur la page "Déposer une demande" de Biguglia Connect. Décrivez votre projet en 2 minutes et les artisans locaux vous contactent directement avec un devis gratuit et sans engagement.',
  },
  {
    q: 'Les avis sur les artisans de Biguglia sont-ils vérifiés ?',
    a: 'Oui, tous les avis proviennent d\'échanges réels entre un habitant et un artisan via Biguglia Connect. Ils sont modérés avant publication et ne peuvent pas être falsifiés.',
  },
  {
    q: 'Y a-t-il des artisans disponibles rapidement à Biguglia ?',
    a: 'Plusieurs artisans proposent des interventions sous 24 à 48 h. En cas d\'urgence (fuite, panne électrique), précisez-le dans votre message pour obtenir une réponse prioritaire.',
  },
  {
    q: 'Faut-il un devis écrit avant de faire des travaux à Biguglia ?',
    a: 'Oui, un devis écrit est obligatoire pour tout travail dont le montant dépasse 150 €. Il doit préciser la nature des travaux, les matériaux utilisés, la main-d\'œuvre et le délai d\'exécution. Sur Biguglia Connect, vous pouvez demander plusieurs devis comparatifs directement depuis la plateforme.',
  },
  {
    q: 'L\'assurance décennale est-elle obligatoire pour les artisans à Biguglia ?',
    a: 'Oui, l\'assurance décennale est obligatoire pour tous les travaux de construction, rénovation et gros œuvre. Elle couvre les dommages pendant 10 ans après la réception des travaux. Sur Biguglia Connect, nous vérifions la validité de cette assurance avant tout référencement.',
  },
];

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(totalArtisans: number) {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                    url: '/' },
    { name: `Artisans à ${GEO.city}`,     url: '/artisans-biguglia' },
  ]);

  const faq = faqSchema(FAQ);

  const localBusiness = {
    '@context':  'https://schema.org',
    '@type':     'LocalBusiness',
    name:        'Biguglia Connect — Artisans',
    url:         `${SITE_URL}/artisans-biguglia`,
    description: `Annuaire des artisans vérifiés à ${GEO.city}, ${GEO.department}. ${totalArtisans} artisans référencés.`,
    areaServed: {
      '@type':        'City',
      name:           GEO.city,
      addressCountry: GEO.countryCode,
      addressRegion:  GEO.department,
    },
    address: {
      '@type':           'PostalAddress',
      addressLocality:   GEO.city,
      addressRegion:     GEO.department,
      postalCode:        GEO.postalCode,
      addressCountry:    GEO.countryCode,
    },
    geo: { '@type': 'GeoCoordinates', latitude: GEO.lat, longitude: GEO.lng },
  };

  const itemList = {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Métiers artisans à ${GEO.city}`,
    url:             `${SITE_URL}/artisans-biguglia`,
    numberOfItems:   TRADE_META.length,
    itemListElement: TRADE_META.map((t, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      t.h1,
      url:       `${SITE_URL}/artisans/metier/${t.slug}`,
    })),
  };

  return { breadcrumb, faq, localBusiness, itemList };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ArtisansBigugliaPage() {
  const { totalArtisans, totalReviews } = await fetchStats();
  const { breadcrumb, faq, localBusiness, itemList } = buildJsonLd(totalArtisans);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={localBusiness} />
      <JsonLd data={itemList} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Artisans à {GEO.city}</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">🔧</span>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/90 text-xs font-bold">{GEO.city} · {GEO.department} · {GEO.iso}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Artisans à {GEO.city}
              </h1>
            </div>
          </div>

          <p className="text-white/75 text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
            Trouvez le bon artisan à {GEO.city} et en {GEO.department} — plombiers, électriciens, maçons, peintres,
            menuisiers et bien d'autres. Tous vérifiés manuellement, tous recommandés par vos voisins.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm">
            {[
              { value: totalArtisans > 0 ? `${totalArtisans}+` : '50+', label: 'Artisans vérifiés' },
              { value: totalReviews > 0 ? `${totalReviews}+` : '200+', label: 'Avis clients' },
              { value: TRADE_META.length.toString(), label: 'Métiers' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-white/60 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/artisans"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-md">
              Voir tous les artisans <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une demande
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — contexte unique Biguglia
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Pourquoi choisir un artisan local à {GEO.city} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Biguglia est une commune dynamique de la plaine orientale de Haute-Corse, à quelques kilomètres
                de Bastia. Son développement résidentiel soutenu génère une demande constante en travaux :
                rénovation de maisons corses, construction neuve, remise aux normes électriques et plomberie.
              </p>
              <p>
                Un artisan local connaît les <strong>particularités du bâti corse</strong> — pierres de granit,
                enduits chaux, toits en lauze — et maîtrise les démarches administratives propres à la commune
                (permis de construire, déclaration préalable de travaux auprès de la mairie de Biguglia).
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Zone d'intervention :</strong> tous les artisans référencés sur Biguglia Connect couvrent
                Biguglia et ses communes voisines — <Link href="/artisans?ville=Borgo" className="text-brand-600 font-semibold hover:underline">Borgo</Link>,{' '}
                <Link href="/artisans?ville=Furiani" className="text-brand-600 font-semibold hover:underline">Furiani</Link>,{' '}
                <Link href="/artisans?ville=Lucciana" className="text-brand-600 font-semibold hover:underline">Lucciana</Link>,{' '}
                <Link href="/artisans?ville=Bastia" className="text-brand-600 font-semibold hover:underline">Bastia</Link>{' '}
                et l'ensemble du bassin de Haute-Corse (2B).
              </p>
              <p>
                <strong>Comment bien choisir ?</strong> Vérifiez toujours le SIRET, l'assurance RC Pro et la
                décennale avant de signer un devis. Sur Biguglia Connect, ces informations sont contrôlées
                manuellement par notre équipe. Consultez plusieurs devis et lisez les avis de vos voisins.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/artisans/demande', label: '📝 Déposer une demande de devis' },
              { href: '/forum-biguglia',   label: '💬 Forum : recommandations d\'artisans' },
              { href: '/annonces-biguglia', label: '📦 Petites annonces locales' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TRUST BADGES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🛡️', title: 'Vérifiés manuellement',  desc: 'SIRET, assurance RC Pro et identité contrôlés avant tout référencement.' },
            { emoji: '⭐', title: 'Avis authentiques',       desc: 'Évaluations laissées par de vrais habitants du village, modérées et non manipulables.' },
            { emoji: '📞', title: 'Contact direct',          desc: 'Échangez directement avec l\'artisan sans intermédiaire ni commission.' },
          ].map(b => (
            <div key={b.title} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
              <span className="text-2xl flex-shrink-0">{b.emoji}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            GRILLE MÉTIERS — maillage interne complet
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Tous les métiers artisans à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur un métier pour découvrir les artisans vérifiés disponibles à {GEO.city} et en {GEO.department}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRADE_META.map(trade => (
              <Link key={trade.slug} href={`/artisans/metier/${trade.slug}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{trade.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm">{trade.h1}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{trade.description}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600">
                      Voir les artisans <ChevronRight className="w-3 h-3" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COMMENT ÇA MARCHE
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-8">
          <h2 className="text-xl font-black text-gray-900 mb-6 text-center">
            Comment trouver un artisan à {GEO.city} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', icon: Wrench,       title: 'Choisissez votre métier',   desc: 'Plombier, électricien, maçon… Sélectionnez la catégorie qui correspond à votre besoin.' },
              { step: '2', icon: Users,        title: 'Consultez les profils',     desc: 'Lisez les avis de vrais voisins, vérifiez les qualifications et comparez les artisans.' },
              { step: '3', icon: Phone,        title: 'Contactez directement',     desc: 'Envoyez un message à l\'artisan directement, sans intermédiaire et sans commission.' },
            ].map(s => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 bg-brand-600 text-white rounded-xl font-black flex items-center justify-center text-sm">
                  {s.step}
                </div>
                <s.icon className="w-6 h-6 text-brand-500" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ACCÈS RAPIDE — Top métiers & fiches liées
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Accès rapide — Métiers les plus demandés à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Cliquez sur un métier pour accéder directement aux artisans vérifiés et disponibles à Biguglia.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { slug: 'plomberie',    emoji: '🚿', label: 'Plombiers Biguglia',     color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' },
              { slug: 'electricite', emoji: '⚡', label: 'Électriciens Biguglia',   color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' },
              { slug: 'maconnerie',  emoji: '🏗️', label: 'Maçons Biguglia',         color: 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100' },
              { slug: 'peinture',    emoji: '🎨', label: 'Peintres Biguglia',       color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
              { slug: 'menuiserie',  emoji: '🪵', label: 'Menuisiers Biguglia',     color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
              { slug: 'jardinage',   emoji: '🌿', label: 'Jardiniers Biguglia',     color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
              { slug: 'serrurerie',  emoji: '🔑', label: 'Serruriers Biguglia',     color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' },
              { slug: 'carrelage',   emoji: '🪟', label: 'Carreleurs Biguglia',     color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' },
            ].map(m => (
              <Link key={m.slug} href={`/artisans/metier/${m.slug}`}>
                <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${m.color}`}>
                  <span>{m.emoji}</span>
                  <span className="line-clamp-1">{m.label}</span>
                </div>
              </Link>
            ))}
          </div>
          {/* Liens contextuels croisés */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Pages liées</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { href: '/services-biguglia',              label: '⚙️ Services à Biguglia' },
                { href: '/artisans/demande',               label: '📝 Déposer une demande de devis' },
                { href: '/artisans?categorie=plomberie',   label: '🚿 Plombiers disponibles' },
                { href: '/artisans?categorie=electricite', label: '⚡ Électriciens disponibles' },
                { href: '/artisans?categorie=maconnerie',  label: '🏗️ Maçons disponibles' },
                { href: '/forum?categorie=travaux',        label: '💬 Forum Travaux' },
                { href: '/emploi-biguglia',                label: '💼 Emploi BTP Biguglia' },
                { href: '/annonces-biguglia',              label: '📦 Matériaux & annonces' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Questions fréquentes — Artisans à {GEO.city}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden group"
                open={i === 0}
              >
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
            GUIDE TRAVAUX BIGUGLIA — conseil éditorial
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 p-6 sm:p-8">
          <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span> Guide pratique : faire appel à un artisan à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                <strong>Réglementation locale :</strong> à Biguglia, tout projet de construction ou de
                modification de façade nécessite une <strong>déclaration préalable de travaux</strong> ou
                un <strong>permis de construire</strong> auprès de la mairie (04 95 30 22 00).
                Les artisans référencés sur Biguglia Connect connaissent ces démarches et peuvent vous
                accompagner dans vos demandes administratives.
              </p>
              <p>
                <strong>Travaux d\'urgence :</strong> fuite d\'eau, panne électrique, serrurerie —
                plusieurs artisans de Biguglia proposent des interventions d\'urgence 7j/7.
                Précisez «&nbsp;urgent&nbsp;» dans votre message pour une réponse prioritaire sous 2 heures.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Saisons et délais :</strong> la demande en artisans est maximale de mars à octobre
                à Biguglia (rénovations, extérieurs). Planifiez vos travaux en hiver pour obtenir des
                délais plus courts et des tarifs parfois négociables. Les travaux d\'isolation et de
                chauffage sont idéalement réalisés en automne.
              </p>
              <p>
                <strong>Budget :</strong> demandez toujours au moins <strong>3 devis comparatifs</strong>.
                Un devis écrit est obligatoire au-delà de 150 €. Vérifiez que le devis inclut
                la fourniture des matériaux, la main-d\'œuvre et les délais d\'exécution.
                Les garanties légales (biennale, décennale) doivent être mentionnées.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-1.5 bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-all">
              📝 Demander 3 devis en 2 min
            </Link>
            <Link href="/forum-biguglia"
              className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all">
              💬 Conseils travaux sur le forum
            </Link>
            <Link href="/services-biguglia"
              className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all">
              🔧 Services d\'urgence Biguglia
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAILLAGE INTERNE — pages associées
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">
            Explorez d'autres services à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/services-biguglia',      emoji: '🔧', title: 'Services à Biguglia',         desc: 'Vue d\'ensemble de tous les services locaux' },
              { href: '/emploi-biguglia',         emoji: '💼', title: 'Emploi à Biguglia',           desc: 'Offres d\'emploi et recrutement local' },
              { href: '/evenements-biguglia',     emoji: '🎉', title: 'Événements à Biguglia',       desc: 'Agenda et activités du village' },
              { href: '/associations-biguglia',   emoji: '🏛️', title: 'Associations à Biguglia',    desc: 'Clubs sportifs, culturels et bénévolat' },
              { href: '/annonces-biguglia',       emoji: '📦', title: 'Petites annonces',            desc: 'Achat, vente, dons entre voisins' },
              { href: '/forum-biguglia',          emoji: '💬', title: 'Forum des habitants',         desc: 'Questions, conseils & entraide locale' },
            ].map(link => (
              <Link key={link.href} href={link.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4">
                  <span className="text-2xl">{link.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{link.title}</p>
                    <p className="text-xs text-gray-500">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA ARTISAN — rejoindre la plateforme
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
              un artisan de confiance. Vérification incluse, aucune commission.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/inscription/artisan-profil"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-lg">
                Créer mon profil artisan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/artisans"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
                Voir l'annuaire artisans
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/**
 * Route /services-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO d'entrée pour les recherches "services Biguglia",
 * "artisans Biguglia", "travaux Biguglia".
 *
 * Architecture SSR pure : données réelles depuis Supabase + JSON-LD complet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Star, ChevronRight, MapPin, ArrowRight, CheckCircle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { TRADE_META, GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Services & Artisans à Biguglia — Plombier, Électricien, Maçon (Haute-Corse)',
  description:
    'Tous les services locaux à Biguglia : plombiers, électriciens, maçons, peintres, jardiniers… Artisans vérifiés, avis réels, contact direct. Devis gratuit en Haute-Corse.',
  keywords: [
    'services Biguglia', 'artisans Biguglia', 'travaux Biguglia',
    'plombier Biguglia', 'électricien Biguglia', 'maçon Biguglia',
    'rénovation Biguglia', 'services Haute-Corse', 'artisan vérifié Corse',
  ],
  alternates: { canonical: `${SITE_URL}/services-biguglia` },
  openGraph: {
    title:       'Services & Artisans à Biguglia — Vérifiés & Disponibles',
    description: 'Plombiers, électriciens, maçons, peintres… Tous les artisans vérifiés de Biguglia, Haute-Corse.',
    url:         `${SITE_URL}/services-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Services et artisans à Biguglia' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

async function fetchArtisanCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'artisan_verified');
    return count ?? 0;
  } catch { return 0; }
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  { q: 'Comment trouver un artisan fiable à Biguglia ?', a: 'Sur Biguglia Connect, chaque artisan est vérifié manuellement par notre équipe : SIRET, assurance RC Pro et pièce d\'identité contrôlés. Vous pouvez consulter les avis de vrais clients et contacter directement l\'artisan sans intermédiaire.' },
  { q: 'Les artisans de Biguglia interviennent-ils dans les communes voisines ?', a: 'Oui, la plupart des artisans référencés couvrent également les communes proches : Borgo, Furiani, Lucciana, Bastia et les villages de la plaine orientale de Haute-Corse.' },
  { q: 'Comment déposer une demande de devis à Biguglia ?', a: 'Rendez-vous sur la page "Déposer une demande" de Biguglia Connect. Décrivez votre projet en 2 minutes et les artisans locaux vous contactent directement avec un devis.' },
  { q: 'Les avis sur les artisans de Biguglia sont-ils fiables ?', a: 'Oui, tous les avis proviennent d\'échanges réels entre un habitant et un artisan via Biguglia Connect. Ils sont modérés avant publication et impossibles à falsifier.' },
  { q: 'Biguglia Connect est-il gratuit pour trouver un artisan ?', a: 'Oui, la consultation des profils, la lecture des avis et la prise de contact sont entièrement gratuites pour les habitants.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ServicesBigugliaPage() {
  const artisanCount = await fetchArtisanCount();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Services à ${GEO.city}`, url: '/services-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  const serviceListSchema = {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name:       `Services et artisans à ${GEO.city}`,
    url:        `${SITE_URL}/services-biguglia`,
    itemListElement: TRADE_META.map((t, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       t.h1,
      url:        `${SITE_URL}/artisans/metier/${t.slug}`,
      description: t.description,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={serviceListSchema} />

      {/* ── HERO ── */}
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
              ? `${artisanCount} artisans vérifiés à votre service — plombiers, électriciens, maçons, peintres et plus encore.`
              : 'Plombiers, électriciens, maçons, peintres et plus encore — tous vérifiés, tous locaux.'}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/artisans"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-md">
              Trouver un artisan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une demande
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ── GARANTIES ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🛡️', title: 'Artisans vérifiés',       desc: 'SIRET, assurance RC Pro et identité contrôlés par notre équipe avant publication' },
            { emoji: '⭐', title: 'Avis de vrais clients',    desc: 'Évaluations authentiques laissées après chaque prestation, impossibles à falsifier' },
            { emoji: '💬', title: 'Contact direct & gratuit', desc: 'Échangez directement avec l\'artisan, sans commission ni intermédiaire' },
          ].map(g => (
            <div key={g.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-2xl mb-2">{g.emoji}</p>
              <h3 className="font-black text-gray-900 text-sm mb-1">{g.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* ── GRILLE DES MÉTIERS ── */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Tous les métiers à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur un métier pour voir les artisans disponibles à Biguglia et en Haute-Corse.
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

        {/* ── COMMENT ÇA MARCHE ── */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Comment trouver un artisan à {GEO.city} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '1', emoji: '🔍', title: 'Cherchez votre métier',    desc: 'Parcourez les catégories ou utilisez la barre de recherche pour trouver le bon artisan.' },
              { n: '2', emoji: '📋', title: 'Consultez les profils',    desc: 'Lisez les avis, vérifiez les certifications et regardez les photos de réalisations.' },
              { n: '3', emoji: '💬', title: 'Contactez directement',    desc: 'Envoyez un message à l\'artisan gratuitement. Il vous répond et vous propose un devis.' },
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

        {/* ── FAQ ── */}
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

        {/* ── MAILLAGE VERS AUTRES SECTIONS ── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Autres ressources locales à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/artisans-biguglia',    emoji: '🔧', title: 'Artisans à Biguglia',       desc: 'Tous les métiers — hub complet' },
              { href: '/emploi-biguglia',      emoji: '💼', title: 'Emploi à Biguglia',         desc: 'Offres et demandes d\'emploi local' },
              { href: '/evenements-biguglia',  emoji: '🎉', title: 'Événements à Biguglia',     desc: 'Agenda des activités locales' },
              { href: '/associations-biguglia',emoji: '🏛️', title: 'Associations à Biguglia',  desc: 'Clubs et vie associative' },
              { href: '/forum-biguglia',       emoji: '💬', title: 'Forum des habitants',       desc: 'Questions & entraide locale' },
              { href: '/annonces-biguglia',    emoji: '📦', title: 'Petites annonces',          desc: 'Achat, vente, dons entre voisins' },
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

      </div>
    </div>
  );
}

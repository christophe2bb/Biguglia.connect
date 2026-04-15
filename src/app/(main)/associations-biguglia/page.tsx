/**
 * Route /associations-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour les recherches "associations Biguglia", "clubs Biguglia",
 * "bénévolat Biguglia", "vie associative Haute-Corse".
 *
 * Architecture SSR + JSON-LD Organization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, ChevronRight, MapPin, ArrowRight, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Associations à Biguglia — Clubs, Bénévolat & Vie Associative (Haute-Corse)',
  description:
    'Toutes les associations et clubs de Biguglia : sportifs, culturels, environnementaux, seniors, bénévolat. Rejoignez la vie associative de Biguglia, Haute-Corse.',
  keywords: [
    'associations Biguglia', 'clubs Biguglia', 'vie associative Biguglia',
    'bénévolat Biguglia', 'association Haute-Corse', 'SC Biguglia',
    'clubs sportifs Biguglia', 'association culturelle Corse',
  ],
  alternates: { canonical: `${SITE_URL}/associations-biguglia` },
  openGraph: {
    title:       'Associations à Biguglia — Clubs & Vie Associative',
    description: 'Clubs sportifs, associations culturelles, bénévolat et seniors à Biguglia, Haute-Corse.',
    url:         `${SITE_URL}/associations-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630 }],
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
  sport:       { label: 'Sport',          emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:     { label: 'Culture',        emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  nature:      { label: 'Environnement',  emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  social:      { label: 'Social',         emoji: '🤝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  seniors:     { label: 'Seniors',        emoji: '👴', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  jeunesse:    { label: 'Jeunesse',       emoji: '🎓', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const FAQ = [
  { q: 'Combien y a-t-il d\'associations à Biguglia ?', a: 'Biguglia compte de nombreuses associations actives : clubs sportifs (dont le SC Biguglia), associations culturelles, groupes de bénévolat, associations de seniors et clubs nature. Retrouvez-les toutes sur Biguglia Connect.' },
  { q: 'Comment rejoindre une association à Biguglia ?', a: 'Consultez le profil de l\'association sur Biguglia Connect pour trouver les coordonnées, les prochaines réunions et les modalités d\'adhésion. Vous pouvez aussi contacter directement les responsables via la plateforme.' },
  { q: 'Comment créer ou référencer une association à Biguglia ?', a: 'Créez un compte sur Biguglia Connect et publiez le profil de votre association gratuitement. Vous pourrez partager vos actualités, vos besoins en bénévoles et vos événements.' },
  { q: 'Quels sports sont pratiqués dans les clubs de Biguglia ?', a: 'Football (SC Biguglia), sports nautiques sur l\'étang, pétanque, tennis, randonnée et activités sportives pour seniors. Consultez l\'annuaire des associations pour la liste complète.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssociationsBigugliaPage() {
  const { assocs, total } = await fetchAssociations();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Associations à ${GEO.city}`, url: '/associations-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  const orgListSchema = assocs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name:       `Associations à ${GEO.city}`,
    url:        `${SITE_URL}/associations-biguglia`,
    numberOfItems: total,
    itemListElement: assocs.map((a, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      url:        `${SITE_URL}/associations/${a.id}`,
      name:       a.name,
      item: {
        '@type':       'Organization',
        name:          a.name,
        description:   a.description ?? undefined,
        url:           `${SITE_URL}/associations/${a.id}`,
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
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {orgListSchema && <JsonLd data={orgListSchema} />}

      {/* ── HERO ── */}
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
            <span className="w-2 h-2 bg-violet-300 rounded-full animate-pulse" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} associations actives` : 'Vie associative'} · {GEO.city}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Associations à Biguglia<br />
            <span className="text-violet-300">Vie associative locale</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Clubs sportifs, associations culturelles, groupes de bénévolat, seniors…
            Toute la vie associative de Biguglia réunie sur une seule plateforme.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/associations"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-md">
              🏛️ Voir toutes les associations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* ── ÉDITO LOCAL — vie associative Biguglia ── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            La vie associative à {GEO.city} : un pilier de la communauté
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Le <strong>SC Biguglia</strong> (Sporting Club Biguglia) est l'une des associations les plus
                emblématiques de la commune. Ce club de football rassemble joueurs de tous âges, bénévoles et
                supporters. Ses matchs sont des moments de cohésion sociale importants pour Biguglia.
              </p>
              <p>
                Au-delà du sport, Biguglia compte des <strong>associations culturelles</strong> qui préservent
                les traditions corses, des <strong>groupes environnementaux</strong> actifs autour de l'étang
                de Biguglia (réserve naturelle), et des <strong>clubs seniors</strong> qui animent la vie
                du village tout au long de l'année.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Rejoindre une association à Biguglia</strong> est simple : consultez le profil de
                l'association sur Biguglia Connect, trouvez les coordonnées et les modalités d'adhésion,
                puis contactez les responsables directement via la plateforme.
              </p>
              <p>
                <strong>Vous gérez une association ?</strong> Référencez-la gratuitement sur Biguglia Connect.
                Partagez vos actualités, vos besoins en bénévoles et vos prochains événements pour toucher
                tous les habitants de la commune et des environs.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/associations/nouvelle',  label: '+ Référencer mon association' },
              { href: '/evenements-biguglia',    label: '🎉 Événements locaux' },
              { href: '/emploi-biguglia',        label: '💼 Emploi & bénévolat' },
              { href: '/forum-biguglia',         label: '💬 Forum des habitants' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── LISTE ASSOCIATIONS ── */}
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

        {/* ── CATÉGORIES ── */}
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

        {/* ── BÉNÉVOLAT CTA ── */}
        <section className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <p className="text-3xl mb-3">🤝</p>
            <h2 className="text-xl font-black mb-2">Vous cherchez à vous engager ?</h2>
            <p className="text-white/75 text-sm max-w-md mx-auto mb-5 leading-relaxed">
              Des associations locales cherchent des bénévoles. Rejoignez un club ou un groupe à Biguglia.
            </p>
            <Link href="/associations"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-lg">
              <Heart className="w-4 h-4" /> Trouver une association
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-5">
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

        {/* ── MAILLAGE ── */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">Autres pages à {GEO.city}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/evenements-biguglia',  emoji: '🎉', title: 'Événements',           desc: 'Agenda local — SC Biguglia & plus' },
              { href: '/artisans-biguglia',    emoji: '🔧', title: 'Artisans vérifiés',   desc: 'Tous les métiers locaux' },
              { href: '/emploi-biguglia',      emoji: '💼', title: 'Emploi local',         desc: 'Offres & bénévolat rémunéré' },
              { href: '/forum-biguglia',       emoji: '💬', title: 'Forum des habitants',  desc: 'Échanges & entraide' },
              { href: '/annonces-biguglia',    emoji: '📦', title: 'Petites annonces',     desc: 'Vente & dons entre voisins' },
              { href: '/communaute',           emoji: '🏘️', title: 'Communauté',           desc: 'Membres actifs et badges' },
              { href: '/services-biguglia',    emoji: '🔧', title: 'Services locaux',       desc: 'Artisans & prestataires vérifiés' },
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

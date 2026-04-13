/**
 * Route /annonces-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour les recherches "petites annonces Biguglia", "vente Biguglia",
 * "annonces particulier Corse", "dons Biguglia".
 *
 * Architecture : SSR + JSON-LD BreadcrumbList + FAQPage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, ChevronRight, MapPin, ArrowRight, Tag, Gift, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Petites Annonces à Biguglia — Vente, Don, Échange entre Habitants',
  description: 'Annonces de particuliers à Biguglia : vente d\'objets, dons, locations, échanges. Déposez votre annonce gratuitement et achetez local en Haute-Corse.',
  keywords: [
    'petites annonces Biguglia', 'vente Biguglia', 'annonces Corse',
    'don objet Biguglia', 'achat vente Biguglia', 'annonces particulier Haute-Corse',
    'marché occasion Biguglia', 'troquer Biguglia', 'annonces gratuites Corse',
  ],
  alternates: { canonical: `${SITE_URL}/annonces-biguglia` },
  openGraph: {
    title:       'Petites Annonces à Biguglia — Vente, Don & Échange Local',
    description: 'Achetez, vendez, donnez ou échangez avec vos voisins de Biguglia. Annonces gratuites en Haute-Corse.',
    url:         `${SITE_URL}/annonces-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Annonces à Biguglia' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface AnnonceRow {
  id:           string;
  title:        string;
  price:        number | null;
  category:     string | null;
  published_at: string | null;
  listing_type: string | null;
}

async function fetchRecentAnnonces(): Promise<{ annonces: AnnonceRow[]; total: number }> {
  try {
    const supabase = createClient();
    const { data, count } = await supabase
      .from('listings')
      .select('id, title, price, category, published_at, listing_type', { count: 'exact' })
      .eq('status', 'active')
      .order('published_at', { ascending: false })
      .limit(6);
    return { annonces: (data ?? []) as AnnonceRow[], total: count ?? 0 };
  } catch {
    return { annonces: [], total: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatPrice(price: number | null, type: string | null): string {
  if (type === 'don' || price === 0) return 'Don gratuit';
  if (!price) return 'Prix à convenir';
  return `${price.toLocaleString('fr-FR')} €`;
}

const LISTING_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vehicule:     { label: 'Véhicule',        emoji: '🚗', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  electromenager: { label: 'Électroménager', emoji: '🧺', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  mobilier:     { label: 'Mobilier',        emoji: '🪑', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  electronique: { label: 'Électronique',    emoji: '📱', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  vetement:     { label: 'Vêtements',       emoji: '👕', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  sport:        { label: 'Sport',           emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  maison:       { label: 'Maison & Jardin', emoji: '🏡', color: 'bg-green-50 text-green-700 border-green-200' },
  autre:        { label: 'Autre',           emoji: '📦', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment déposer une annonce gratuite à Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect, cliquez sur "Nouvelle annonce", renseignez les informations et publiez. Votre annonce est visible par tous les habitants de Biguglia et des communes voisines.',
  },
  {
    q: 'Quels types d\'objets peut-on vendre ou donner à Biguglia ?',
    a: 'Tout type de bien d\'occasion : meubles, électroménager, vêtements, livres, jouets, vélos, matériel de bricolage, jardinage, électronique… Les seules restrictions concernent les objets illégaux ou dangereux.',
  },
  {
    q: 'Comment sécuriser une transaction entre particuliers à Biguglia ?',
    a: 'Préférez les échanges en personne dans un lieu public du village. Vérifiez l\'objet avant le paiement. Sur Biguglia Connect, chaque vendeur a un profil avec historique et note de confiance.',
  },
  {
    q: 'Y a-t-il un marché aux puces ou brocante à Biguglia ?',
    a: 'Des événements locaux sont régulièrement organisés. Consultez la section Événements de Biguglia Connect pour l\'agenda des vides-greniers et marchés de l\'occasion.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnnoncesBigugliaPage() {
  const { annonces, total } = await fetchRecentAnnonces();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                         url: '/' },
    { name: `Annonces à ${GEO.city}`,          url: '/annonces-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  const itemListSchema = annonces.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Petites annonces à ${GEO.city}`,
    url:             `${SITE_URL}/annonces-biguglia`,
    numberOfItems:   total,
    itemListElement: annonces.map((a, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      a.title,
      url:       `${SITE_URL}/annonces/${a.id}`,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {itemListSchema && <JsonLd data={itemListSchema} />}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Annonces à {GEO.city}</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">📦</span>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/90 text-xs font-bold">{GEO.city} · {GEO.department} · {GEO.iso}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Petites Annonces à {GEO.city}
              </h1>
            </div>
          </div>

          <p className="text-white/75 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
            Vendez, achetez, donnez ou échangez avec vos voisins de {GEO.city}.
            {total > 0 ? ` ${total} annonces actives` : ' Des annonces'} publiées par les habitants
            — mobilier, électronique, vêtements, véhicules et bien plus.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/annonces"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-all shadow-md">
              Voir toutes les annonces <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/annonces/nouvelle"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une annonce gratuite
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ══════════════════════════════════════════
            CATÉGORIES D'ANNONCES
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Catégories d'annonces à {GEO.city}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/annonces?categorie=vehicule',      emoji: '🚗', label: 'Véhicules' },
              { href: '/annonces?categorie=mobilier',      emoji: '🪑', label: 'Mobilier' },
              { href: '/annonces?categorie=electromenager',emoji: '🧺', label: 'Électroménager' },
              { href: '/annonces?categorie=electronique',  emoji: '📱', label: 'Électronique' },
              { href: '/annonces?categorie=vetement',      emoji: '👕', label: 'Vêtements' },
              { href: '/annonces?categorie=sport',         emoji: '⚽', label: 'Sport & Loisirs' },
              { href: '/annonces?categorie=maison',        emoji: '🏡', label: 'Maison & Jardin' },
              { href: '/annonces?type=don',                emoji: '🎁', label: 'Dons gratuits' },
            ].map(cat => (
              <Link key={cat.href} href={cat.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl">{cat.emoji}</span>
                  <p className="font-bold text-gray-900 text-xs">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ANNONCES RÉCENTES
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">
              Annonces récentes à {GEO.city}
            </h2>
            <Link href="/annonces"
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {annonces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {annonces.map(a => {
                const cat = LISTING_CATEGORIES[a.category ?? 'autre'] ?? LISTING_CATEGORIES.autre;
                return (
                  <Link key={a.id} href={`/annonces/${a.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-2 flex-1">{a.title}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-emerald-600">
                          {formatPrice(a.price, a.listing_type)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(a.published_at)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <span className="text-4xl mb-4 block">📦</span>
              <h3 className="font-black text-gray-900 mb-2">Soyez le premier à publier</h3>
              <p className="text-gray-500 text-sm mb-4">
                Déposez votre première annonce gratuitement et touchez tous les habitants de {GEO.city}.
              </p>
              <Link href="/annonces/nouvelle"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-all">
                Déposer une annonce <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            AVANTAGES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🎁', title: '100 % gratuit',       desc: 'Déposer et consulter des annonces est entièrement gratuit pour tous les habitants.' },
            { emoji: '🔒', title: 'Voisins vérifiés',    desc: 'Chaque profil vendeur a un score de confiance basé sur son historique sur la plateforme.' },
            { emoji: '📍', title: 'Échange local',        desc: 'Récupérez l\'objet directement à Biguglia, sans frais de port ni délais d\'attente.' },
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
            PAGES ASSOCIÉES — maillage interne
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">
            Autres sections utiles à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/materiel',             emoji: '🛠️', title: 'Matériel partagé',          desc: 'Prêt et location de matériel entre voisins' },
              { href: '/collectionneurs',      emoji: '🏆', title: 'Collectionneurs',            desc: 'Échanges entre passionnés de collection' },
              { href: '/perdu-trouve',         emoji: '🔍', title: 'Objets perdus & trouvés',   desc: 'Signalez ou retrouvez un objet perdu à Biguglia' },
              { href: '/artisans-biguglia',    emoji: '🔧', title: 'Artisans à Biguglia',       desc: 'Trouvez un artisan vérifié pour vos travaux' },
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
            FAQ
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Questions fréquentes — Annonces à {GEO.city}
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

      </div>
    </div>
  );
}

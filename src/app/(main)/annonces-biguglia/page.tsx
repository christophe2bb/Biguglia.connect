/**
 * Route /annonces-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour "petites annonces Biguglia", "vente Biguglia",
 * "annonces particulier Corse", "dons Biguglia".
 *
 * Architecture SSR + JSON-LD complet
 * (BreadcrumbList + FAQPage + ItemList + Product/Offer par catégorie + CollectionPage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, ChevronRight, MapPin, ArrowRight, Tag, Gift, Shield, Clock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, collectionPageSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Petites Annonces à Biguglia — Vente, Don & Échange entre Habitants (Haute-Corse)',
  description: 'Annonces gratuites entre particuliers à Biguglia : vente de meubles, électroménager, vêtements, véhicules, dons et échanges. Achetez et vendez local en Haute-Corse (20620) sans frais ni intermédiaire.',
  keywords: [
    'petites annonces Biguglia', 'vente Biguglia', 'annonces Corse',
    'don objet Biguglia', 'achat vente Biguglia', 'annonces particulier Haute-Corse',
    'marché occasion Biguglia', 'troquer Biguglia', 'annonces gratuites Corse',
    'occasion Biguglia', 'vide grenier Biguglia', 'annonces 20620',
    'vente entre voisins Biguglia', 'dons gratuits Corse',
  ],
  alternates: { canonical: `${SITE_URL}/annonces-biguglia` },
  openGraph: {
    title:       'Petites Annonces à Biguglia — Vente, Don & Échange Local',
    description: 'Achetez, vendez, donnez ou échangez avec vos voisins de Biguglia. Annonces 100 % gratuites en Haute-Corse.',
    url:         `${SITE_URL}/annonces-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Petites annonces à Biguglia, Haute-Corse' }],
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

async function fetchRecentAnnonces(): Promise<{ annonces: AnnonceRow[]; total: number; donCount: number }> {
  try {
    const supabase = createClient();
    const [{ data, count }, { count: donCount }] = await Promise.all([
      supabase
        .from('listings')
        .select('id, title, price, category, published_at, listing_type', { count: 'exact' })
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(6),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('listing_type', 'don'),
    ]);
    return {
      annonces: (data ?? []) as AnnonceRow[],
      total:    count    ?? 0,
      donCount: donCount ?? 0,
    };
  } catch {
    return { annonces: [], total: 0, donCount: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d    = new Date(iso);
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
  vehicule:       { label: 'Véhicule',        emoji: '🚗', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  electromenager: { label: 'Électroménager',  emoji: '🧺', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  mobilier:       { label: 'Mobilier',        emoji: '🪑', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  electronique:   { label: 'Électronique',    emoji: '📱', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  vetement:       { label: 'Vêtements',       emoji: '👕', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  sport:          { label: 'Sport & Loisirs', emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  maison:         { label: 'Maison & Jardin', emoji: '🏡', color: 'bg-green-50 text-green-700 border-green-200' },
  autre:          { label: 'Autre',           emoji: '📦', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── Sections éditoriales par catégorie ───────────────────────────────────────

const CATEGORY_EDITORIAL = [
  {
    emoji: '🚗',
    title: 'Véhicules à Biguglia',
    desc: 'Voitures, motos, scooters, vélos d\'occasion. Les échanges de véhicules entre particuliers à Biguglia évitent les frais de concessionnaire et permettent des transactions directes et sécurisées.',
    href: '/annonces?categorie=vehicule',
  },
  {
    emoji: '🪑',
    title: 'Mobilier & Déco à Biguglia',
    desc: 'Meubles de salon, chambres, cuisine, jardin. Avant l\'été, les habitants de Biguglia vendent souvent parasols, tables de jardin et mobilier extérieur — idéal pour les nouveaux arrivants.',
    href: '/annonces?categorie=mobilier',
  },
  {
    emoji: '📱',
    title: 'Électronique & High-Tech à Biguglia',
    desc: 'Smartphones, ordinateurs, tablettes, consoles. Achetez de l\'électronique d\'occasion à prix réduit auprès de vos voisins de Biguglia, sans frais de livraison.',
    href: '/annonces?categorie=electronique',
  },
  {
    emoji: '🏡',
    title: 'Maison & Jardin à Biguglia',
    desc: 'Outillage de bricolage, jardinage, matériaux de construction. Les habitants de Biguglia échangent régulièrement du matériel de jardinage et de bricolage — consultez aussi la section Matériel partagé.',
    href: '/annonces?categorie=maison',
  },
  {
    emoji: '👕',
    title: 'Vêtements & Mode à Biguglia',
    desc: 'Vêtements enfants et adultes, chaussures, accessoires. Les achats d\'occasion locaux sont écologiques et économiques — idéal pour les familles de Biguglia.',
    href: '/annonces?categorie=vetement',
  },
  {
    emoji: '🎁',
    title: 'Dons gratuits à Biguglia',
    desc: 'Objets donnés gratuitement par des habitants de Biguglia, Borgo, Furiani et Lucciana. Favorisez l\'économie circulaire et récupérez des objets utiles sans dépenser.',
    href: '/annonces?type=don',
  },
];

// ─── FAQ enrichie (6 questions) ───────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment déposer une annonce gratuite à Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect, cliquez sur "Nouvelle annonce", renseignez le titre, la description, le prix et ajoutez des photos. Votre annonce est immédiatement visible par tous les habitants de Biguglia et des communes voisines (Borgo, Furiani, Lucciana, Bastia).',
  },
  {
    q: 'Quels types d\'objets peut-on vendre ou donner à Biguglia ?',
    a: 'Tout type de bien d\'occasion : meubles, électroménager, vêtements, livres, jouets, vélos, matériel de bricolage, jardinage, électronique, véhicules, produits artisanaux corses (miel, confiture, poterie)… Les seules restrictions concernent les objets illégaux ou dangereux.',
  },
  {
    q: 'Comment sécuriser une transaction entre particuliers à Biguglia ?',
    a: 'Préférez les rencontres dans un lieu public du village (mairie de Biguglia, place principale, parking de la médiathèque). Vérifiez l\'objet avant de payer. Sur Biguglia Connect, chaque profil vendeur dispose d\'un score de confiance basé sur son historique de transactions et ses avis reçus.',
  },
  {
    q: 'Y a-t-il des dons gratuits d\'objets à Biguglia ?',
    a: 'Oui, la catégorie "Dons gratuits" est très active sur Biguglia Connect. De nombreux habitants préfèrent donner plutôt que jeter — meubles, électroménager, vêtements, jouets. Ces objets sont disponibles gratuitement pour les habitants de Biguglia et des communes voisines.',
  },
  {
    q: 'Y a-t-il un marché aux puces ou vide-grenier à Biguglia ?',
    a: 'Des vide-greniers et marchés de l\'occasion sont régulièrement organisés à Biguglia et dans les communes proches. Consultez la section Événements de Biguglia Connect pour l\'agenda des brocantes et marchés locaux. Vous pouvez aussi y publier votre propre vide-grenier.',
  },
  {
    q: 'Biguglia Connect prend-il une commission sur les ventes ?',
    a: 'Non, Biguglia Connect est entièrement gratuit pour les particuliers. Déposer une annonce, contacter un vendeur et consulter les offres est 100 % gratuit. L\'objectif est de faciliter les échanges de proximité entre habitants de Biguglia et du bassin de Haute-Corse.',
  },
  {
    q: 'Comment éviter les arnaques dans les petites annonces à Biguglia ?',
    a: 'Privilégiez toujours les rencontres en personne dans un lieu public (mairie de Biguglia, parking de la médiathèque, place principale). N\'envoyez jamais d\'argent à l\'avance sans avoir vu l\'objet. Méfiez-vous des prix anormalement bas. Sur Biguglia Connect, consultez l\'historique et les évaluations du vendeur avant tout achat.',
  },
  {
    q: 'Peut-on vendre des produits artisanaux corses sur Biguglia Connect ?',
    a: 'Oui, les habitants et artisans de Biguglia peuvent publier des annonces pour vendre leurs productions locales : miel du maquis, confitures, charcuterie, poteries, produits du terroir corse. Ces annonces sont particulièrement appréciées par les résidents et les visiteurs de Haute-Corse.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnnoncesBigugliaPage() {
  const { annonces, total, donCount } = await fetchRecentAnnonces();

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                url: '/' },
    { name: `Annonces à ${GEO.city}`, url: '/annonces-biguglia' },
  ]);
  const faq        = faqSchema(FAQ);
  const collection = collectionPageSchema({
    name:        `Petites annonces à ${GEO.city}`,
    description: `Vente, don et échange d'objets entre particuliers à ${GEO.city}, ${GEO.department}.`,
    url:         '/annonces-biguglia',
  });

  // ItemList annonces récentes
  const listingItemList = annonces.length > 0 ? {
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
      item: {
        '@type':      'Product',
        name:         a.title,
        url:          `${SITE_URL}/annonces/${a.id}`,
        offers: {
          '@type':          'Offer',
          price:            a.listing_type === 'don' ? '0' : (a.price?.toString() ?? '0'),
          priceCurrency:    'EUR',
          availability:     'https://schema.org/InStock',
          seller: {
            '@type': 'Person',
            address: {
              '@type':           'PostalAddress',
              addressLocality:   GEO.city,
              addressRegion:     GEO.department,
              postalCode:        GEO.postalCode,
              addressCountry:    GEO.countryCode,
            },
          },
        },
      },
    })),
  } : null;

  // ItemList catégories
  const categoryItemList = {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Catégories d'annonces à ${GEO.city}`,
    url:             `${SITE_URL}/annonces-biguglia`,
    numberOfItems:   CATEGORY_EDITORIAL.length,
    itemListElement: CATEGORY_EDITORIAL.map((cat, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      cat.title,
      url:       `${SITE_URL}${cat.href}`,
      description: cat.desc,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      <JsonLd data={categoryItemList} />
      {listingItemList && <JsonLd data={listingItemList} />}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Annonces à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <MapPin className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} annonces actives` : 'Annonces gratuites'} · {GEO.city} · {GEO.postalCode}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Petites Annonces<br />
            <span className="text-emerald-300">à Biguglia</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Vendez, achetez, donnez ou échangez avec vos voisins de {GEO.city} et de Haute-Corse.
            {total > 0 ? ` ${total} annonces actives` : ' Des annonces'} — mobilier, électronique,
            vêtements, véhicules et bien plus. 100 % gratuit.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: total    > 0 ? `${total}`    : '—', label: 'Annonces actives' },
              { value: donCount > 0 ? `${donCount}` : '—', label: 'Dons gratuits' },
              { value: '0 €',                               label: 'Frais pour tous' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/annonces"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-emerald-50 transition-all shadow-md">
              Voir toutes les annonces <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/annonces/nouvelle"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une annonce gratuite
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — marché de l'occasion à Biguglia
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Les petites annonces à {GEO.city} : achetez et vendez local
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Biguglia et sa plaine orientale constituent un bassin de vie dense avec une forte demande
                pour les échanges de proximité. Acheter et vendre localement permet de{' '}
                <strong>récupérer immédiatement</strong> l'objet, d'éviter les frais de port et de{' '}
                <strong>contribuer à l'économie circulaire</strong> du village.
              </p>
              <p>
                Les objets les plus échangés entre habitants de Biguglia : mobilier de jardin et parasols
                (avant/après l'été), matériel de bricolage, vélos et trottinettes, vêtements enfants,
                électroménager de cuisine et produits artisanaux corses (miel, confiture, poterie).
              </p>
              <p>
                <strong>Zone couverte :</strong> les annonces de Biguglia Connect sont visibles par tous
                les habitants de la commune et des environs — Borgo, Furiani, Lucciana, Bastia et la
                plaine de Haute-Corse. Idéal pour toucher un maximum d'acheteurs potentiels à proximité.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Conseils pour sécuriser votre transaction :</strong> préférez les rencontres dans
                un lieu public (mairie de Biguglia, parking de la médiathèque, place du village). Vérifiez
                l'objet avant de payer. Consultez le profil du vendeur et ses évaluations sur Biguglia Connect.
              </p>
              <p>
                <strong>Dons gratuits :</strong> de nombreux habitants préfèrent donner plutôt que jeter.
                Consultez la catégorie "Dons gratuits" pour récupérer des objets utiles à Biguglia et
                dans les communes voisines. Cette pratique réduit les déchets et renforce les liens de voisinage.
              </p>
              <p>
                <strong>Matériel partagé :</strong> pour du matériel dont vous n'avez besoin qu'une fois
                (perceuse, échelle, tondeuse…), consultez aussi la section{' '}
                <Link href="/materiel" className="text-emerald-600 font-semibold hover:underline">
                  Matériel partagé
                </Link>{' '}
                — prêt gratuit entre voisins de Biguglia.
              </p>
            </div>
          </div>

          {/* Garanties */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { emoji: '🎁', title: '100 % gratuit',     desc: 'Déposer et consulter des annonces est entièrement gratuit.' },
              { emoji: '🔒', title: 'Voisins vérifiés',  desc: 'Chaque profil a un score de confiance basé sur l\'historique.' },
              { emoji: '📍', title: 'Échange local',      desc: 'Récupérez l\'objet directement à Biguglia, sans frais de port.' },
            ].map(g => (
              <div key={g.title} className="flex items-start gap-3 bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                <span className="text-xl flex-shrink-0">{g.emoji}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{g.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/annonces/nouvelle',  label: '+ Publier une annonce' },
              { href: '/annonces?type=don',  label: '🎁 Dons gratuits' },
              { href: '/materiel',           label: '🛠️ Matériel partagé' },
              { href: '/perdu-trouve',       label: '🔍 Objets perdus & trouvés' },
              { href: '/collectionneurs',    label: '🏆 Collectionneurs' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CATÉGORIES ÉDITORIALES
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Catégories d'annonces à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur une catégorie pour voir toutes les annonces disponibles à Biguglia et alentours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_EDITORIAL.map(cat => (
              <Link key={cat.href} href={cat.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cat.emoji}</span>
                    <h3 className="font-black text-gray-900 text-sm">{cat.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-auto">
                    Voir les annonces <ChevronRight className="w-3 h-3" />
                  </div>
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
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(a.published_at)}
                        </p>
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
            GUIDE ACHETEUR / VENDEUR
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" /> Conseils pour acheter et vendre en sécurité à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">🛍️ Pour les acheteurs</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Rencontrez le vendeur dans un <strong>lieu public</strong> (mairie, parking médiathèque)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Vérifiez le <strong>score de confiance</strong> du vendeur sur son profil</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Testez l\'objet avant de payer, n\'envoyez jamais d\'argent à l\'avance</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Méfiez-vous des prix anormalement bas ou des urgences invoquées</span></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">📸 Pour les vendeurs</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Ajoutez <strong>des photos</strong> claires sous bonne lumière (+3× plus de contacts)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Décrivez l\'état réel de l\'objet et mentionnez les défauts éventuels</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Fixez un <strong>prix réaliste</strong> (consultez les annonces similaires)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Indiquez votre zone (Biguglia, Borgo…) pour attirer les acheteurs locaux</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION DONS GRATUITS
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-amber-50 to-emerald-50 rounded-3xl border border-amber-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎁</span>
            <h2 className="text-xl font-black text-gray-900">
              Dons gratuits à {GEO.city}
            </h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-5 max-w-2xl">
            L'économie circulaire est très active à Biguglia. Plutôt que de jeter, de nombreux habitants donnent
            gratuitement leurs objets dont ils n'ont plus besoin. Meubles, électroménager, vêtements, livres,
            jouets — tout est possible. C'est bon pour l'environnement et ça renforce les liens de voisinage.
            {donCount > 0 ? ` ${donCount} dons gratuits disponibles en ce moment.` : ''}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/annonces?type=don"
              className="inline-flex items-center gap-2 bg-amber-500 text-white font-black px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all shadow-sm">
              🎁 Voir les dons gratuits <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/materiel"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white transition-all">
              🛠️ Matériel partagé entre voisins
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ enrichie (6 questions)
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Questions fréquentes — Annonces à {GEO.city}
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
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Autres ressources locales à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/materiel',             emoji: '🛠️', title: 'Matériel partagé',          desc: 'Prêt & location de matériel entre voisins' },
              { href: '/collectionneurs',      emoji: '🏆', title: 'Collectionneurs',            desc: 'Échanges entre passionnés de collection' },
              { href: '/perdu-trouve',         emoji: '🔍', title: 'Objets perdus & trouvés',   desc: 'Signalez ou retrouvez un objet' },
              { href: '/artisans-biguglia',    emoji: '🔧', title: 'Artisans à Biguglia',       desc: 'Travaux, réparations — artisans vérifiés' },
              { href: '/evenements-biguglia',  emoji: '🎉', title: 'Événements à Biguglia',     desc: 'Vide-greniers & marchés locaux' },
              { href: '/forum-biguglia',       emoji: '💬', title: 'Forum des habitants',       desc: 'Recommandations & bons plans locaux' },
              { href: '/services-biguglia',    emoji: '🛠️', title: 'Services locaux',            desc: 'Artisans & prestataires vérifiés' },
              { href: '/coups-de-main',        emoji: '🤝', title: 'Coups de main',             desc: 'Entraide et services de voisinage' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3">
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

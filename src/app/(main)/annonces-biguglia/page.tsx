/**
 * Route /annonces-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour "petites annonces Biguglia", "vente Biguglia",
 * "annonces particulier Corse", "dons Biguglia".
 *
 * Architecture SSR + JSON-LD complet
 * (BreadcrumbList + FAQPage + ItemList + Product/Offer par catégorie + CollectionPage).
 *
 * Sections extraites dans ./_sections/ pour la lisibilité :
 *   AnnoncesHero       — bandeau hero + stats
 *   AnnoncesEdito      — texte éditorial + garanties
 *   AnnoncesCategories — grille catégories éditoriales
 *   AnnoncesRecentes   — annonces live (Supabase)
 *   AnnoncesDons       — section dons gratuits
 *   AnnoncesFaq        — accordéon FAQ (8 questions)
 *   AnnoncesLiens      — liens par catégorie + maillage interne
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, collectionPageSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

// ── Section sub-components ────────────────────────────────────────────────────
import AnnoncesHero       from './_sections/AnnoncesHero';
import AnnoncesEdito      from './_sections/AnnoncesEdito';
import AnnoncesCategories, { CATEGORY_EDITORIAL } from './_sections/AnnoncesCategories';
import AnnoncesRecentes                           from './_sections/AnnoncesRecentes';
import AnnoncesDons                               from './_sections/AnnoncesDons';
import AnnoncesFaq, { FAQ }                       from './_sections/AnnoncesFaq';
import AnnoncesLiens                              from './_sections/AnnoncesLiens';

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
    const supabase = await createClient();
    // 'category' et 'published_at' n'existent pas sur listings
    // → on utilise category_id (join) et created_at ; on remonte category_id comme category
    const [{ data, count }, { count: donCount }] = await Promise.all([
      supabase
        .from('listings')
        .select('id, title, price, listing_type, created_at, category:listing_categories(name)', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('listing_type', 'don'),
    ]);
    const annonces: AnnonceRow[] = (data ?? []).map(r => {
      const row = r as Record<string, unknown>;
      const catObj = row.category as { name?: string } | null;
      return {
        id:           row.id as string,
        title:        row.title as string,
        price:        (row.price as number | null) ?? null,
        category:     catObj?.name ?? null,
        published_at: (row.created_at as string | null) ?? null,
        listing_type: (row.listing_type as string | null) ?? null,
      };
    });
    return {
      annonces,
      total:    count    ?? 0,
      donCount: donCount ?? 0,
    };
  } catch {
    return { annonces: [], total: 0, donCount: 0 };
  }
}

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
        '@type': 'Product',
        name:    a.title,
        url:     `${SITE_URL}/annonces/${a.id}`,
        offers: {
          '@type':       'Offer',
          price:         a.listing_type === 'don' ? '0' : (a.price?.toString() ?? '0'),
          priceCurrency: 'EUR',
          availability:  'https://schema.org/InStock',
          seller: {
            '@type':  'Person',
            address: {
              '@type':          'PostalAddress',
              addressLocality:  GEO.city,
              addressRegion:    GEO.department,
              postalCode:       GEO.postalCode,
              addressCountry:   GEO.countryCode,
            },
          },
        },
      },
    })),
  } : null;
  const categoryItemList = {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Catégories d'annonces à ${GEO.city}`,
    url:             `${SITE_URL}/annonces-biguglia`,
    numberOfItems:   CATEGORY_EDITORIAL.length,
    itemListElement: CATEGORY_EDITORIAL.map((cat, i) => ({
      '@type':      'ListItem',
      position:     i + 1,
      name:         cat.title,
      url:          `${SITE_URL}${cat.href}`,
      description:  cat.desc,
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

      {/* ── Breadcrumb ── */}
      <AnnoncesHero total={total} donCount={donCount}>
        <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/90">Annonces à {GEO.city}</span>
        </nav>
      </AnnoncesHero>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        <AnnoncesEdito />
        <AnnoncesCategories />
        <AnnoncesRecentes annonces={annonces} />
        <AnnoncesDons donCount={donCount} />
        <AnnoncesLiens />
        <AnnoncesFaq />
      </div>

    </div>
  );
}

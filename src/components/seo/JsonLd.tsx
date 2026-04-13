/**
 * src/components/seo/JsonLd.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Composant serveur pour injecter du JSON-LD (données structurées Schema.org).
 * Améliore les Rich Results dans Google (étoiles, FAQ, breadcrumbs, etc.)
 *
 * Usage :
 *   <JsonLd data={localBusinessSchema} />
 *   <JsonLd data={faqSchema} />
 *
 * Ne rien importer de client ici (pas de 'use client').
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Injecte un bloc <script type="application/ld+json"> dans le <head>.
 * Next.js App Router l'élève automatiquement dans le <head>.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint — innerHTML nécessaire pour JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}

// ─── Schémas réutilisables ────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

/**
 * LocalBusiness / WebSite — schéma principal du site
 * Affiché sur la page d'accueil
 */
export const websiteSchema = {
  '@context':   'https://schema.org',
  '@type':      'WebSite',
  name:         'Biguglia Connect',
  url:          SITE_URL,
  description:  'Plateforme locale de Biguglia : artisans vérifiés, petites annonces, forum, matériel et communauté.',
  inLanguage:   'fr',
  potentialAction: {
    '@type':       'SearchAction',
    target:        { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/recherche?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

/**
 * LocalBusiness — pour le village de Biguglia
 * Aide Google à afficher Biguglia Connect dans les résultats locaux
 */
export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type':    'LocalBusiness',
  name:       'Biguglia Connect',
  url:        SITE_URL,
  description:
    'La plateforme locale de Biguglia (Haute-Corse) pour trouver des artisans vérifiés, déposer des annonces et rejoindre la communauté du village.',
  areaServed: {
    '@type':        'City',
    name:           'Biguglia',
    addressCountry: 'FR',
    addressRegion:  'Haute-Corse',
  },
  address: {
    '@type':           'PostalAddress',
    addressLocality:   'Biguglia',
    addressRegion:     'Haute-Corse',
    postalCode:        '20620',
    addressCountry:    'FR',
  },
  geo: {
    '@type':    'GeoCoordinates',
    latitude:   42.5747,
    longitude:   9.4436,
  },
  image:     `${SITE_URL}/images/biguglia-hero.jpg`,
  sameAs:    [SITE_URL],
};

/**
 * BreadcrumbList — génère un schéma de fil d'Ariane
 *
 * Usage : breadcrumbSchema([
 *   { name: 'Accueil', url: '/' },
 *   { name: 'Artisans', url: '/artisans' },
 * ])
 */
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context':        'https://schema.org',
    '@type':           'BreadcrumbList',
    itemListElement:   items.map((item, index) => ({
      '@type':   'ListItem',
      position:  index + 1,
      name:      item.name,
      item:      item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * FAQPage — génère un schéma FAQ pour les rich snippets Google
 *
 * Usage : faqSchema([
 *   { q: 'Comment trouver un artisan ?', a: 'Rendez-vous sur…' },
 * ])
 */
export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    '@context':  'https://schema.org',
    '@type':     'FAQPage',
    mainEntity:  items.map(item => ({
      '@type':          'Question',
      name:             item.q,
      acceptedAnswer:   { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * Person — schéma pour un profil artisan
 */
export function artisanPersonSchema(artisan: {
  name:       string;
  jobTitle:   string;
  url:        string;
  image?:     string;
  telephone?: string;
  city?:      string;
}) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Person',
    name:        artisan.name,
    jobTitle:    artisan.jobTitle,
    url:         artisan.url.startsWith('http') ? artisan.url : `${SITE_URL}${artisan.url}`,
    ...(artisan.image     && { image:     artisan.image }),
    ...(artisan.telephone && { telephone: artisan.telephone }),
    ...(artisan.city      && {
      address: {
        '@type':         'PostalAddress',
        addressLocality: artisan.city,
        addressCountry:  'FR',
      },
    }),
    worksFor: { '@type': 'Organization', name: 'Biguglia Connect' },
  };
}

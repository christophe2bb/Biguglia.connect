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
 * Organization — schéma d'organisation pour Biguglia Connect
 * Améliore la présence dans le Knowledge Graph Google
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'Biguglia Connect',
  url:        SITE_URL,
  logo:       `${SITE_URL}/images/biguglia-hero.jpg`,
  description:
    'Plateforme communautaire locale de Biguglia (Haute-Corse) : artisans vérifiés, petites annonces, emploi local, événements, forum et entraide entre habitants.',
  foundingLocation: {
    '@type':        'Place',
    name:           'Biguglia',
    addressCountry: 'FR',
    addressRegion:  'Haute-Corse',
  },
  areaServed: [
    { '@type': 'City',   name: 'Biguglia' },
    { '@type': 'State',  name: 'Haute-Corse' },
    { '@type': 'Country', name: 'France' },
  ],
  sameAs: [SITE_URL],
  contactPoint: {
    '@type':       'ContactPoint',
    contactType:   'customer service',
    availableLanguage: { '@type': 'Language', name: 'French' },
  },
};

/**
 * JobPosting — génère un schéma d'offre d'emploi
 */
export function jobPostingSchema(job: {
  title:       string;
  description: string;
  url:         string;
  datePosted:  string;
  contractType?: string;
  city?:       string;
}) {
  return {
    '@context':        'https://schema.org',
    '@type':           'JobPosting',
    title:             job.title,
    description:       job.description,
    url:               job.url.startsWith('http') ? job.url : `${SITE_URL}${job.url}`,
    datePosted:        job.datePosted,
    employmentType:    job.contractType ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      sameAs:  SITE_URL,
    },
    jobLocation: {
      '@type':  'Place',
      address: {
        '@type':           'PostalAddress',
        addressLocality:   job.city ?? 'Biguglia',
        addressRegion:     'Haute-Corse',
        postalCode:        '20620',
        addressCountry:    'FR',
      },
    },
  };
}

/**
 * Event — génère un schéma pour un événement local
 */
export function eventSchema(event: {
  name:        string;
  description: string;
  url:         string;
  startDate:   string;
  endDate?:    string;
  location?:   string;
}) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Event',
    name:        event.name,
    description: event.description,
    url:         event.url.startsWith('http') ? event.url : `${SITE_URL}${event.url}`,
    startDate:   event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    eventStatus:     'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type':  'Place',
      name:     event.location ?? 'Biguglia',
      address: {
        '@type':           'PostalAddress',
        addressLocality:   'Biguglia',
        addressRegion:     'Haute-Corse',
        postalCode:        '20620',
        addressCountry:    'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
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

/**
 * Service — schéma pour un service / catégorie de métier
 * Utilisé sur /services-biguglia et /artisans/metier/[slug]
 */
export function serviceSchema(svc: {
  name:        string;
  description: string;
  url:         string;
  provider?:   string;
  city?:       string;
}) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Service',
    name:        svc.name,
    description: svc.description,
    url:         svc.url.startsWith('http') ? svc.url : `${SITE_URL}${svc.url}`,
    serviceType: svc.name,
    provider: {
      '@type': 'Organization',
      name:    svc.provider ?? 'Biguglia Connect',
      url:     SITE_URL,
    },
    areaServed: {
      '@type':        'City',
      name:           svc.city ?? 'Biguglia',
      addressCountry: 'FR',
      addressRegion:  'Haute-Corse',
    },
  };
}

/**
 * Occupation — schéma pour un métier / secteur d'emploi
 * Utilisé sur /emploi-biguglia
 */
export function occupationSchema(occ: {
  name:        string;
  description: string;
  url:         string;
}) {
  return {
    '@context':           'https://schema.org',
    '@type':              'Occupation',
    name:                 occ.name,
    description:          occ.description,
    url:                  occ.url.startsWith('http') ? occ.url : `${SITE_URL}${occ.url}`,
    occupationLocation:  { '@type': 'City', name: 'Biguglia', addressRegion: 'Haute-Corse' },
    estimatedSalary:     { '@type': 'MonetaryAmountDistribution', name: 'Salaire estimé', currency: 'EUR', duration: 'P1M' },
  };
}

/**
 * DiscussionForumPosting — schéma pour un sujet de forum
 * Utilisé sur /forum-biguglia
 */
export function forumPostingSchema(post: {
  name:        string;
  url:         string;
  dateCreated: string;
  author?:     string;
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'DiscussionForumPosting',
    name:         post.name,
    url:          post.url.startsWith('http') ? post.url : `${SITE_URL}${post.url}`,
    dateCreated:  post.dateCreated,
    ...(post.author && {
      author: { '@type': 'Person', name: post.author },
    }),
    sharedContent: {
      '@type': 'WebPage',
      url:     post.url.startsWith('http') ? post.url : `${SITE_URL}${post.url}`,
    },
  };
}

/**
 * CollectionPage — schéma pour une page de liste / hub
 * Utilisé sur les pages -biguglia
 */
export function collectionPageSchema(page: {
  name:        string;
  description: string;
  url:         string;
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'CollectionPage',
    name:         page.name,
    description:  page.description,
    url:          page.url.startsWith('http') ? page.url : `${SITE_URL}${page.url}`,
    inLanguage:   'fr',
    publisher: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
  };
}

/**
 * SiteNavigationElement — booste la compréhension de la structure du site
 */
export function siteNavigationSchema(_links: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type':    'SiteLinksSearchBox',
    url:        SITE_URL,
    potentialAction: {
      '@type':       'SearchAction',
      target:        { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/recherche?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * ItemListSchema — helper générique pour une liste d'items
 */
export function itemListSchema(opts: {
  name:  string;
  url:   string;
  items: Array<{ name: string; url: string; description?: string }>;
}) {
  return {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            opts.name,
    url:             opts.url.startsWith('http') ? opts.url : `${SITE_URL}${opts.url}`,
    numberOfItems:   opts.items.length,
    itemListElement: opts.items.map((item, i) => ({
      '@type':      'ListItem',
      position:     i + 1,
      name:         item.name,
      url:          item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
      ...(item.description && { description: item.description }),
    })),
  };
}

// ─── Helpers supplémentaires ──────────────────────────────────────────────────

/**
 * Product + Offer — schéma pour une petite annonce / listing
 * Génère des rich results "Product" dans Google (prix, disponibilité)
 */
export function productOfferSchema(listing: {
  name:        string;
  description: string;
  url:         string;
  price?:      number | null;
  currency?:   string;
  condition?:  'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  image?:      string;
  seller?:     string;
  availability?: 'InStock' | 'OutOfStock' | 'Discontinued';
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'Product',
    name:         listing.name,
    description:  listing.description,
    url:          listing.url.startsWith('http') ? listing.url : `${SITE_URL}${listing.url}`,
    ...(listing.image && { image: listing.image }),
    offers: {
      '@type':          'Offer',
      price:            listing.price ?? 0,
      priceCurrency:    listing.currency ?? 'EUR',
      availability:     `https://schema.org/${listing.availability ?? 'InStock'}`,
      itemCondition:    `https://schema.org/${listing.condition ?? 'UsedCondition'}`,
      url:              listing.url.startsWith('http') ? listing.url : `${SITE_URL}${listing.url}`,
      seller: {
        '@type': 'Person',
        name:    listing.seller ?? 'Habitant de Biguglia',
      },
      areaServed: {
        '@type':        'City',
        name:           'Biguglia',
        addressRegion:  'Haute-Corse',
        addressCountry: 'FR',
      },
    },
  };
}

/**
 * SportsOrganization — club sportif (SC Biguglia, etc.)
 */
export function sportsOrganizationSchema(org: {
  name:       string;
  url:        string;
  sport?:     string;
  city?:      string;
  image?:     string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type':    'SportsOrganization',
    name:       org.name,
    url:        org.url.startsWith('http') ? org.url : `${SITE_URL}${org.url}`,
    sport:      org.sport ?? 'Football',
    ...(org.image && { image: org.image }),
    location: {
      '@type':  'Place',
      name:     org.city ?? 'Biguglia',
      address: {
        '@type':           'PostalAddress',
        addressLocality:   org.city ?? 'Biguglia',
        addressRegion:     'Haute-Corse',
        postalCode:        '20620',
        addressCountry:    'FR',
      },
    },
    memberOf: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
  };
}

/**
 * HowTo — guide étape par étape
 * Génère des rich results "How-to" dans Google
 */
export function howToSchema(guide: {
  name:        string;
  description: string;
  url:         string;
  steps:       Array<{ name: string; text: string }>;
  totalTime?:  string;   // ISO 8601 duration, ex: "PT10M"
  image?:      string;
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'HowTo',
    name:         guide.name,
    description:  guide.description,
    url:          guide.url.startsWith('http') ? guide.url : `${SITE_URL}${guide.url}`,
    ...(guide.image     && { image: guide.image }),
    ...(guide.totalTime && { totalTime: guide.totalTime }),
    step: guide.steps.map((s, i) => ({
      '@type':  'HowToStep',
      position: i + 1,
      name:     s.name,
      text:     s.text,
    })),
    tool: { '@type': 'HowToTool', name: 'Biguglia Connect' },
  };
}

/**
 * Article — schéma pour une discussion de forum ou contenu éditorial
 */
export function articleSchema(article: {
  headline:     string;
  description:  string;
  url:          string;
  datePublished: string;
  dateModified?: string;
  author?:      string;
  image?:       string;
  articleBody?: string;
}) {
  return {
    '@context':     'https://schema.org',
    '@type':        'Article',
    headline:       article.headline,
    description:    article.description,
    url:            article.url.startsWith('http') ? article.url : `${SITE_URL}${article.url}`,
    datePublished:  article.datePublished,
    dateModified:   article.dateModified ?? article.datePublished,
    ...(article.image       && { image: article.image }),
    ...(article.articleBody && { articleBody: article.articleBody.slice(0, 500) }),
    author: {
      '@type': 'Person',
      name:    article.author ?? 'Habitant de Biguglia',
    },
    publisher: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
      logo:    { '@type': 'ImageObject', url: `${SITE_URL}/images/biguglia-hero.jpg` },
    },
    inLanguage:  'fr',
    isPartOf: {
      '@type': 'WebSite',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
  };
}

/**
 * LocalBusiness spécifique — pour une page de service/artisan
 * Avec plus de détails que le schema global (aggregateRating, priceRange)
 */
export function localServiceSchema(svc: {
  name:          string;
  description:   string;
  url:           string;
  serviceType:   string;
  telephone?:    string;
  priceRange?:   string;
  reviewCount?:  number;
  ratingValue?:  number;
  image?:        string;
}) {
  return {
    '@context':  'https://schema.org',
    '@type':     'LocalBusiness',
    name:        svc.name,
    description: svc.description,
    url:         svc.url.startsWith('http') ? svc.url : `${SITE_URL}${svc.url}`,
    serviceType: svc.serviceType,
    ...(svc.telephone  && { telephone:  svc.telephone }),
    ...(svc.priceRange && { priceRange: svc.priceRange }),
    ...(svc.image      && { image:      svc.image }),
    ...(svc.reviewCount && svc.ratingValue && {
      aggregateRating: {
        '@type':       'AggregateRating',
        ratingValue:   svc.ratingValue,
        reviewCount:   svc.reviewCount,
        bestRating:    5,
        worstRating:   1,
      },
    }),
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
    areaServed: {
      '@type':        'City',
      name:           'Biguglia',
      addressCountry: 'FR',
      addressRegion:  'Haute-Corse',
    },
  };
}

/**
 * WebPage — schéma générique pour une page de contenu (CGU, aide, mentions…)
 */
export function webPageSchema(page: {
  name:        string;
  description: string;
  url:         string;
  type?:       'WebPage' | 'AboutPage' | 'ContactPage' | 'FAQPage';
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      page.type ?? 'WebPage',
    name:         page.name,
    description:  page.description,
    url:          page.url.startsWith('http') ? page.url : `${SITE_URL}${page.url}`,
    inLanguage:   'fr',
    isPartOf:     { '@type': 'WebSite', name: 'Biguglia Connect', url: SITE_URL },
    publisher:    { '@type': 'Organization', name: 'Biguglia Connect', url: SITE_URL },
    breadcrumb:   { '@type': 'BreadcrumbList', itemListElement: [] },
  };
}

/**
 * Place + TouristAttraction — pour une sortie / promenade nature
 */
export function placeSchema(place: {
  name:        string;
  description: string;
  url:         string;
  latitude?:   number;
  longitude?:  number;
  type?:       'TouristAttraction' | 'LandmarksOrHistoricalBuildings' | 'Park';
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      place.type ?? 'TouristAttraction',
    name:         place.name,
    description:  place.description,
    url:          place.url.startsWith('http') ? place.url : `${SITE_URL}${place.url}`,
    ...(place.latitude && place.longitude && {
      geo: {
        '@type':    'GeoCoordinates',
        latitude:   place.latitude,
        longitude:  place.longitude,
      },
    }),
    address: {
      '@type':           'PostalAddress',
      addressLocality:   'Biguglia',
      addressRegion:     'Haute-Corse',
      postalCode:        '20620',
      addressCountry:    'FR',
    },
    touristType: ['Nature', 'Outdoor activities', 'Local community'],
  };
}

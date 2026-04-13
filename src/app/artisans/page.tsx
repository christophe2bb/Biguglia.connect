/**
 * Route /artisans — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import ArtisansPageClient from './_page.client';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { TRADE_META } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-hero.jpg`;

export const metadata: Metadata = {
  title: 'Artisans Vérifiés à Biguglia — Plombiers, Électriciens, Maçons',
  description:
    'Trouvez un artisan de confiance à Biguglia : plombiers, électriciens, maçons, peintres, menuisiers… Tous les artisans sont vérifiés et validés. Contactez-les directement.',
  keywords: [
    'artisan Biguglia', 'plombier Biguglia', 'électricien Biguglia',
    'maçon Biguglia', 'peintre Biguglia', 'menuisier Biguglia',
    'artisan vérifié Corse', 'artisan Haute-Corse 2B',
  ],
  alternates: { canonical: `${SITE_URL}/artisans` },
  openGraph: {
    title:       'Artisans Vérifiés à Biguglia — Plombiers, Électriciens, Maçons',
    description: 'Trouvez un artisan de confiance à Biguglia. Tous les profils sont vérifiés et validés.',
    url:         `${SITE_URL}/artisans`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Artisans vérifiés Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Artisans Vérifiés à Biguglia',
    description: 'Plombiers, électriciens, maçons — artisans validés à Biguglia, Corse.',
    images:      [OG_IMAGE],
  },
};

export default function ArtisansPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Artisans à Biguglia', url: '/artisans' },
  ]);

  const faq = faqSchema([
    { q: 'Comment sont vérifiés les artisans de Biguglia ?', a: 'Chaque artisan soumet son SIRET, son assurance RC Pro et une pièce d\'identité. Notre équipe vérifie manuellement chaque dossier avant validation.' },
    { q: 'Peut-on contacter un artisan gratuitement sur Biguglia Connect ?', a: 'Oui, la prise de contact, la lecture des profils et les avis sont entièrement gratuits pour les habitants.' },
    { q: 'Quels artisans trouve-t-on à Biguglia ?', a: 'Plombiers, électriciens, maçons, peintres, menuisiers, installateurs de climatisation, jardiniers et bricoleurs disponibles à Biguglia et en Haute-Corse.' },
  ]);

  // Sitelinks searchbox hint for Google
  const siteLinksSchema = {
    '@context':     'https://schema.org',
    '@type':        'WebPage',
    '@id':          `${SITE_URL}/artisans`,
    name:           'Artisans Vérifiés à Biguglia',
    url:            `${SITE_URL}/artisans`,
    description:    'Annuaire des artisans vérifiés de Biguglia, Haute-Corse.',
    breadcrumb:     breadcrumb,
    mainEntity: {
      '@type':     'ItemList',
      name:        'Métiers artisans à Biguglia',
      itemListElement: TRADE_META.map((t, i) => ({
        '@type':    'ListItem',
        position:   i + 1,
        name:       t.h1,
        url:        `${SITE_URL}/artisans/metier/${t.slug}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={siteLinksSchema} />
      <ArtisansPageClient />
    </>
  );
}

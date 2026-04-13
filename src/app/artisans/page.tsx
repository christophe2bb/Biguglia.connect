/**
 * Route /artisans — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import ArtisansPageClient from './_page.client';

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
  return <ArtisansPageClient />;
}

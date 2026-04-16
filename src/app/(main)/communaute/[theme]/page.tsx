/**
 * Page: Communauté — thème
 * Route: /communaute/[theme]
 *
 * Server Component — generates SEO metadata from static theme config,
 * delegates all interactive rendering to CommunauteThemeClient.
 */

import type { Metadata } from 'next';
import { getThemeConfig } from './_config';
import CommunauteThemeClient from './CommunauteThemeClient';

interface PageProps {
  params: Promise<{ theme: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { theme } = await params;
  const config = getThemeConfig(theme);

  const title = `Communauté ${config.label} à Biguglia | Biguglia Connect`;
  const description = config.description
    ?? `Rejoignez la communauté ${config.label} de Biguglia — échangez, participez, rencontrez vos voisins.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://biguglia-connect.vercel.app/communaute/${theme}`,
    },
    alternates: {
      canonical: `https://biguglia-connect.vercel.app/communaute/${theme}`,
    },
  };
}

export default async function CommunauteThemePage() {
  return <CommunauteThemeClient />;
}

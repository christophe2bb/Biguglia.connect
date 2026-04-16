/**
 * Page: Détail d'une sortie / promenade
 * Route: /promenades/sorties/[id]
 *
 * Server Component — fetches minimal SEO data server-side,
 * delegates all interactive rendering to OutingDetailClient.
 */

import type { Metadata } from 'next';
import { fetchOutingSEO } from './queries';
import OutingDetailClient from './OutingDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const outing = await fetchOutingSEO(id);
  if (!outing) {
    return { title: 'Sortie introuvable — Biguglia Connect' };
  }

  const location = [outing.location_area, outing.location_city].filter(Boolean).join(', ');
  const dateStr = outing.outing_date
    ? new Date(outing.outing_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const title = `${outing.title}${dateStr ? ` — ${dateStr}` : ''}${location ? ` à ${location}` : ''} | Biguglia Connect`;
  const description = outing.description
    ? outing.description.slice(0, 155)
    : `Sortie organisée à Biguglia — ${outing.title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://biguglia-connect.vercel.app/promenades/sorties/${id}`,
    },
    alternates: {
      canonical: `https://biguglia-connect.vercel.app/promenades/sorties/${id}`,
    },
  };
}

export default async function OutingDetailPage({ params }: PageProps) {
  await params;
  return <OutingDetailClient />;
}

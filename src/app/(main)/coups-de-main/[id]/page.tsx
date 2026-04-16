/**
 * Page: Détail d'un coup de main
 * Route: /coups-de-main/[id]
 *
 * Server Component — fetches minimal SEO data server-side,
 * delegates all interactive rendering to HelpRequestDetailClient.
 */

import type { Metadata } from 'next';
import { fetchHelpRequestSEO } from './queries';
import HelpRequestDetailClient from './HelpRequestDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchHelpRequestSEO(id);
  if (!item) {
    return { title: 'Coup de main introuvable — Biguglia Connect' };
  }

  const helpTypeLabel = item.help_type === 'offre' ? 'Offre d\'aide' : 'Demande d\'aide';
  const location = [item.location_area, item.location_city].filter(Boolean).join(', ');
  const title = `${item.title} — ${helpTypeLabel} à ${location} | Biguglia Connect`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `${helpTypeLabel} : ${item.title} — Biguglia Connect`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://biguglia-connect.vercel.app/coups-de-main/${id}`,
    },
    alternates: {
      canonical: `https://biguglia-connect.vercel.app/coups-de-main/${id}`,
    },
  };
}

export default async function HelpRequestDetailPage({ params }: PageProps) {
  // params are awaited here so the shell is rendered server-side;
  // all data fetching for the interactive parts happens client-side
  // via useHelpRequestDetail (keeps realtime updates working).
  await params; // ensure params resolves (needed for Next.js 15 async params)
  return <HelpRequestDetailClient />;
}

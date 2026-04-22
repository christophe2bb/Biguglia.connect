/**
 * Page: Détail d'une demande de service
 * Route: /demandes/[id]
 *
 * Server Component — fetches minimal SEO data server-side,
 * delegates all interactive rendering to DemandeDetailClient.
 */

import type { Metadata } from 'next';
import { fetchDemandeSEO } from './queries';
import DemandeDetailClient from './DemandeDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchDemandeSEO(id);
  if (!item) {
    return { title: 'Demande introuvable — Biguglia Connect' };
  }

  const urgencyLabel =
    item.urgency === 'tres_urgent' ? 'Très urgent' :
    item.urgency === 'urgent'      ? 'Urgent'      :
    'Demande de service';

  const title = `${item.title} — ${urgencyLabel} à Biguglia | Biguglia Connect`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `${urgencyLabel} : ${item.title} — Biguglia Connect`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/demandes/${id}`,
    },
    alternates: {
      canonical: `${SITE_URL}/demandes/${id}`,
    },
  };
}

export default async function DemandeDetailPage({ params }: PageProps) {
  await params;
  return <DemandeDetailClient />;
}

/**
 * Page: Modifier une demande de service
 * Route: /demandes/[id]/modifier
 *
 * Accessible uniquement au propriétaire (resident_id === auth.uid()).
 * Pré-charge les données existantes et soumet un UPDATE Supabase.
 */

import type { Metadata } from 'next';
import ModifierDemandeClient from './ModifierDemandeClient';

export const metadata: Metadata = {
  title: 'Modifier ma demande — Biguglia Connect',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModifierDemandePage({ params }: PageProps) {
  const { id } = await params;
  return <ModifierDemandeClient id={id} />;
}

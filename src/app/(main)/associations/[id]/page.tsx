/**
 * associations/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à AssociationDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AssociationDetailClient from './AssociationDetailClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('associations')
      .select('name, description_short')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Association introuvable — Biguglia Connect' };

    const title = `${data.name} — Association | Biguglia Connect`;
    const description = data.description_short
      ? data.description_short.slice(0, 155)
      : `Découvrez l'association ${data.name} sur Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Association — Biguglia Connect' };
  }
}

export default function AssociationDetailPage() {
  return <AssociationDetailClient />;
}

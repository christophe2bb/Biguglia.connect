/**
 * annonces/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à AnnonceDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AnnonceDetailClient from './AnnonceDetailClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('listings')
      .select('title, description, category:listing_categories(name)')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Annonce introuvable — Biguglia Connect' };

    const categoryName =
      data.category && !Array.isArray(data.category)
        ? (data.category as { name: string }).name
        : '';
    const title = `${data.title}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Annonce : ${data.title} sur Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Annonce — Biguglia Connect' };
  }
}

export default function AnnonceDetailPage() {
  return <AnnonceDetailClient />;
}

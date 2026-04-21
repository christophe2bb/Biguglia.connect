/**
 * collectionneurs/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à CollectionItemDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import CollectionItemDetailClient from './CollectionItemDetailClient';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('collection_items')
      .select('title, description, category:collection_categories(name)')
      .eq('id', id)
      .single();

    if (!data) return { title: 'Objet introuvable — Biguglia Connect' };

    const categoryName =
      data.category && !Array.isArray(data.category)
        ? (data.category as { name: string }).name
        : '';
    const title = `${data.title}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Objet de collection : ${data.title} sur Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Collectionneurs — Biguglia Connect' };
  }
}

export default function CollectionItemDetailPage() {
  return <CollectionItemDetailClient />;
}

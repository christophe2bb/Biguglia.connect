/**
 * materiel/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à MaterielDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import MaterielDetailClient from './MaterielDetailClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('equipment_items')
      .select('name, description, category:equipment_categories(name)')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Matériel introuvable — Biguglia Connect' };

    const categoryName =
      data.category && !Array.isArray(data.category)
        ? (data.category as { name: string }).name
        : '';
    const title = `${data.name}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Matériel partagé : ${data.name} sur Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Matériel partagé — Biguglia Connect' };
  }
}

export default function MaterielDetailPage() {
  return <MaterielDetailClient />;
}

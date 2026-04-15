/**
 * evenements/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à EvenementDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import EvenementDetailClient from './EvenementDetailClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select('title, description, location')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Événement introuvable — Biguglia Connect' };

    const title = `${data.title} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Événement à ${data.location ?? 'Biguglia'} — rejoignez la communauté.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Événement — Biguglia Connect' };
  }
}

export default function EventDetailPage() {
  return <EvenementDetailClient />;
}

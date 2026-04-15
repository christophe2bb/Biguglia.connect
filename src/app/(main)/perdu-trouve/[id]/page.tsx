/**
 * perdu-trouve/[id] — Server Component
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Délègue tout le rendu interactif à PerduTrouveDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PerduTrouveDetailClient from './PerduTrouveDetailClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('lost_found_items')
      .select('title, description, item_type, location')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Annonce introuvable — Biguglia Connect' };

    const typeLabel = data.item_type === 'perdu' ? 'Perdu' : 'Trouvé';
    const title = `${typeLabel} : ${data.title} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Objet ${typeLabel.toLowerCase()} à ${data.location ?? 'Biguglia'} — Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Perdu / Trouvé — Biguglia Connect' };
  }
}

export default function PerduTrouveDetailPage() {
  return <PerduTrouveDetailClient />;
}

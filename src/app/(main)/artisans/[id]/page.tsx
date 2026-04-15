/**
 * artisans/[id] — Server Component
 * • generateMetadata : titre + description SEO à partir des données Supabase
 * • Rendu immédiat du shell (pas de blanc côté client)
 * • Toute l'interactivité reste dans ArtisanDetailClient (hooks, favoris, etc.)
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ArtisanDetailClient from './ArtisanDetailClient';

type Props = { params: { id: string } };

// ── Metadata dynamique ───────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('artisan_profiles')
      .select('business_name, description, service_area, trade_category:trade_categories(name)')
      .eq('id', params.id)
      .single();

    if (!data) {
      return { title: 'Artisan introuvable — Biguglia Connect' };
    }

    const categoryName =
      data.trade_category && !Array.isArray(data.trade_category)
        ? (data.trade_category as { name: string }).name
        : '';
    const title = `${data.business_name}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
    const description = data.description
      ? data.description.slice(0, 155)
      : `Découvrez ${data.business_name}, artisan à ${data.service_area ?? 'Biguglia'}.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Artisan — Biguglia Connect' };
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanDetailPage() {
  return <ArtisanDetailClient />;
}

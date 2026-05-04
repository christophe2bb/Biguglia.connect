import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PromenadeDetailClient from './PromenadeDetailClient';

// Forcer le rendu dynamique — pas de cache Next.js sur cette page
// (nécessaire pour afficher les nouvelles photos après modification)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PromenadeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: promenade } = await supabase
    .from('promenades')
    .select('*, author:profiles(full_name, avatar_url), photos:promenade_photos(url, display_order)')
    .eq('id', id)
    .single();

  if (!promenade) notFound();

  // Trier les photos par display_order côté serveur
  if (promenade.photos && Array.isArray(promenade.photos)) {
    promenade.photos.sort((a: { display_order?: number }, b: { display_order?: number }) =>
      (a.display_order ?? 0) - (b.display_order ?? 0)
    );
  }

  return <PromenadeDetailClient promenade={promenade} />;
}

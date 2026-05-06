import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PromenadeDetailClient from './PromenadeDetailClient';

// Forcer le rendu dynamique — pas de cache Next.js sur cette page
// (nécessaire pour afficher les nouvelles photos après modification)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('promenades')
    .select('title, description')
    .eq('id', id)
    .single();
  if (!data) return { title: 'Promenade introuvable — Biguglia Connect' };
  const title = `${data.title} — Promenades à Biguglia`;
  const description = data.description?.slice(0, 155) || 'Découvrez cette promenade à Biguglia sur Biguglia Connect.';
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

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

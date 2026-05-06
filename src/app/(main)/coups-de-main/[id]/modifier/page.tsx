/**
 * coups-de-main/[id]/modifier — Server Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Vérifie côté serveur que l'annonce existe, puis passe la main au client.
 * La vérification d'autorisation (auteur) est faite côté client via useAuthStore.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HelpEditClient from './HelpEditClient';
import type { HelpRequest } from '../../_types';

type Props = { params: Promise<{ id: string }> };

async function fetchHelpRequest(id: string): Promise<HelpRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('help_requests')
    .select('*, author:profiles(full_name, avatar_url, created_at), photos:help_photos(url, display_order)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as HelpRequest;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchHelpRequest(id);
  if (!item) return { title: 'Annonce introuvable — Biguglia Connect' };
  return {
    title: `Modifier "${item.title}" — Biguglia Connect`,
    robots: { index: false, follow: false },
  };
}

export default async function HelpEditPage({ params }: Props) {
  const { id } = await params;
  const item = await fetchHelpRequest(id);
  if (!item) notFound();

  return <HelpEditClient item={item} />;
}

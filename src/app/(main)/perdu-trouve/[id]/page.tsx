/**
 * perdu-trouve/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Fetch serveur : item + auteur + photos
 *   • Rendu HTML principal côté serveur (info panel, auteur, conseils sécurité)
 *   • PerduTrouveDetailClient (client) gère : galerie, actions, discussion,
 *     historique statut, lightbox, partage, impression
 *
 * Bénéfices :
 *   • HTML complet livré au 1er octet → SEO parfait, LCP rapide
 *   • Zéro loading spinner pour le contenu principal
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PerduTrouveDetailClient from './PerduTrouveDetailClient';
import { PrintHeader } from './_components/PrintHeader';
import { ItemInfoPanel } from './_components/ItemInfoPanel';
import { SecurityTips } from './_components/SecurityTips';
import { AuthorPanel } from './_components/AuthorPanel';
import type { LFItem } from './_types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: { id: string } };

// ─── Fetch data ───────────────────────────────────────────────────────────────
async function fetchLFItem(id: string): Promise<LFItem | null> {
  const supabase = createClient();

  // Attempt 1 – with explicit FK
  let { data, error } = await supabase
    .from('lost_found_items')
    .select('*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
    .eq('id', id)
    .single();

  // Attempt 2 – without explicit FK
  if ((error || !data) && error?.message?.includes('fkey')) {
    ({ data, error } = await supabase
      .from('lost_found_items')
      .select('*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
      .eq('id', id)
      .single());
  }

  // Attempt 3 – base table only
  if (error || !data) {
    ({ data, error } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('id', id)
      .single());
  }

  if (error || !data) return null;
  return data as LFItem;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await fetchLFItem(params.id);
  if (!item) return { title: 'Annonce introuvable — Biguglia Connect' };

  const typeLabel = item.type === 'perdu' ? 'Perdu' : 'Trouvé';
  const title = `${typeLabel} : ${item.title} | Biguglia Connect`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `Objet ${typeLabel.toLowerCase()} à ${item.location_area ?? 'Biguglia'} — Biguglia Connect.`;

  const photos = item.photos ?? [];
  const ogImage = photos[0]?.url ?? `${SITE_URL}/images/biguglia-hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/perdu-trouve/${params.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/perdu-trouve/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: item.title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function PerduTrouveDetailPage({ params }: Props) {
  const item = await fetchLFItem(params.id);
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* Navigation + galerie + actions (client) */}
      <PerduTrouveDetailClient initialItem={item} />

      {/* Rendu statique (server) — visible via SSR, hydraté sans flash */}
      {/* Note : ce contenu est inclus aussi dans PerduTrouveDetailClient
          après hydration. On utilise un div masqué avec data-ssr pour SSR only. */}
      <noscript>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <PrintHeader item={item} />
          <ItemInfoPanel item={item} />
          <AuthorPanel item={item} />
          <SecurityTips proofRequired={item.proof_required} />
        </div>
      </noscript>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

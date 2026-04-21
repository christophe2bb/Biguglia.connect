/**
 * associations/[id] — Server Component (server-first)
 * • generateMetadata : titre + description SEO depuis Supabase
 * • Fetch serveur : association complète avec auteur et photos
 * • Délègue les interactions à AssociationDetailClient
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AssociationDetailClient from './AssociationDetailClient';
import type { Association } from './_types';

type Props = { params: { id: string } };

// ─── Server fetch helper ────────────────────────────────────────────────────
async function fetchAssociation(id: string): Promise<Association | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('associations')
      .select('*, author:profiles(full_name, avatar_url), photos:asso_photos(url, display_order)')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      public_target: Array.isArray(data.public_target) ? data.public_target : [],
      activities:    Array.isArray(data.activities)    ? data.activities    : [],
      tags:          Array.isArray(data.tags)          ? data.tags          : [],
      needs:         Array.isArray(data.needs)         ? data.needs         : [],
      photos: (data.photos ?? []).sort(
        (a: { display_order: number }, b: { display_order: number }) =>
          a.display_order - b.display_order,
      ),
    } as Association;
  } catch {
    return null;
  }
}

// ─── generateMetadata ───────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('associations')
      .select('name, description_short')
      .eq('id', params.id)
      .single();

    if (!data) return { title: 'Association introuvable — Biguglia Connect' };

    const title = `${data.name} — Association | Biguglia Connect`;
    const description = data.description_short
      ? data.description_short.slice(0, 155)
      : `Découvrez l'association ${data.name} sur Biguglia Connect.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return { title: 'Association — Biguglia Connect' };
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default async function AssociationDetailPage({ params }: Props) {
  const initialItem = await fetchAssociation(params.id);

  if (!initialItem) notFound();

  return <AssociationDetailClient initialItem={initialItem} />;
}

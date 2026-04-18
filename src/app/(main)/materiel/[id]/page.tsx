/**
 * materiel/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Fetch serveur : item + owner + photos + catégorie
 *   • Rendu HTML principal côté serveur (galerie statique, description, titre)
 *   • MaterielDetailClient (client) gère : demande emprunt, prêt actif,
 *     actions propriétaire, historique statut, lightbox
 *
 * Bénéfices :
 *   • HTML complet livré au 1er octet → SEO parfait, LCP rapide
 *   • Zéro loading spinner pour le contenu principal
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Avatar from '@/components/ui/Avatar';
import { EQUIPMENT_STATUS_CONFIG, type EquipmentStatus, type EquipmentItemFull } from '@/lib/equipment';
import { CONDITION_LABELS, formatDate } from '@/lib/utils';
import MaterielDetailClient from './MaterielDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: { id: string } };

// ─── Fetch data ───────────────────────────────────────────────────────────────
async function fetchMateriel(id: string): Promise<EquipmentItemFull | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('equipment_items')
    .select('*, category:equipment_categories(*), photos:equipment_photos(id, url, display_order, is_cover)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  let ownerData = null;
  if (data.owner_id) {
    const { data: op } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at')
      .eq('id', data.owner_id)
      .single();
    ownerData = op;
  }

  const photos = ((data.photos || []) as Array<{ id: string; url: string; display_order: number; is_cover?: boolean }>)
    .sort((a, b) => a.display_order - b.display_order);

  return { ...data, owner: ownerData, photos } as unknown as EquipmentItemFull;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await fetchMateriel(params.id);
  if (!item) return { title: 'Matériel introuvable — Biguglia Connect' };

  const categoryName = (item.category as { name?: string } | null)?.name ?? '';
  const title = `${item.title}${categoryName ? ` — ${categoryName}` : ''} | Biguglia Connect`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `Matériel partagé : ${item.title} sur Biguglia Connect.`;

  const rawPhotos = item.photos as Array<{ url: string }> | undefined;
  const ogImage = rawPhotos?.[0]?.url ?? `${SITE_URL}/images/biguglia-hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/materiel/${params.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/materiel/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: item.title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function MaterielDetailPage({ params }: Props) {
  const item = await fetchMateriel(params.id);
  if (!item) notFound();

  const rawPhotos = item.photos as Array<{ id: string; url: string; display_order?: number; is_cover?: boolean }> | undefined;
  const firstPhoto = rawPhotos?.find(p => p.is_cover)?.url ?? rawPhotos?.[0]?.url;
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];
  const categoryName = (item.category as { name?: string; icon?: string } | null);
  const conditionLabel = item.condition
    ? (CONDITION_LABELS[item.condition as keyof typeof CONDITION_LABELS] ?? item.condition)
    : null;
  const ownerData = item.owner as { full_name?: string; avatar_url?: string | null; created_at?: string } | undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href="/materiel"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Retour au matériel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Galerie + titre + badges (server-rendered) */}
          <div className="space-y-4">
            {/* Photos */}
            {firstPhoto ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100">
                <Image
                  src={firstPhoto}
                  alt={item.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
                <span className="text-6xl">{categoryName?.icon ?? '📦'}</span>
              </div>
            )}

            {/* Title + badges */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                >
                  {cfg.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {categoryName?.name && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {categoryName.icon} {categoryName.name}
                  </span>
                )}
                {conditionLabel && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{conditionLabel}</span>
                )}
                {item.is_available && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">✅ Disponible</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                {item.location_area && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {item.location_area}
                  </div>
                )}
                {item.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Publié le {formatDate(item.created_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description (server-rendered) */}
          {item.description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* Avertissement si non disponible */}
          {!item.is_available && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Actuellement indisponible</p>
                <p className="text-xs text-amber-700 mt-0.5">Ce matériel n&apos;est pas disponible à l&apos;emprunt pour l&apos;instant.</p>
              </div>
            </div>
          )}

          {/* Client: galerie complète, conditions, prêt actif, demandes en attente, historique */}
          <MaterielDetailClient initialItem={item} variant="main-content" />
        </div>

        {/* ── Sidebar droite ── */}
        <div className="space-y-4">

          {/* Propriétaire (server-rendered) */}
          {ownerData?.full_name && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Proposé par</h3>
              <div className="flex items-center gap-3">
                <Avatar src={ownerData.avatar_url} name={ownerData.full_name} size="md" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{ownerData.full_name}</p>
                  {ownerData.created_at && (
                    <p className="text-xs text-gray-400">Membre depuis {formatDate(ownerData.created_at)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Client: sidebar actions (owner panel ou borrower actions) */}
          <MaterielDetailClient initialItem={item} variant="sidebar" />
        </div>
      </div>
    </div>
  );
}

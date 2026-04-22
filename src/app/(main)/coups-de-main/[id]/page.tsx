/**
 * coups-de-main/[id] — Server Component (server-first)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture :
 *   • Fetch serveur : item + auteur + photos
 *   • Rendu HTML principal côté serveur (hero, infos pratiques, statut)
 *   • HelpRequestDetailClient (client) gère : favoris, partage, discussion,
 *     participants, proposer aide, changement statut, lightbox
 *
 * Bénéfices :
 *   • HTML complet livré au 1er octet → SEO parfait, LCP rapide
 *   • Zéro loading spinner pour le contenu principal
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Heart, Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import HelpRequestDetailClient from './HelpRequestDetailClient';
import {
  TYPE_CONFIG, URGENCY_CONFIG, CATEGORIES, DURATION_OPTIONS, COMPENSATION_CONFIG,
} from '../_constants';
import type { HelpRequest } from './_types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

type Props = { params: Promise<{ id: string }> };

// ─── Fetch data ───────────────────────────────────────────────────────────────
async function fetchHelpRequest(id: string): Promise<HelpRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('help_requests')
    .select('*, author:profiles(full_name, avatar_url, created_at), photos:help_photos(url, display_order, caption)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as HelpRequest;
}

function getDisplayName(author: { full_name: string } | null | undefined, mode: string): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchHelpRequest(id);
  if (!item) return { title: 'Coup de main introuvable — Biguglia Connect' };

  const helpTypeLabel = item.help_type === 'offre' ? "Offre d'aide" : "Demande d'aide";
  const location = [item.location_area, item.location_city].filter(Boolean).join(', ');
  const title = `${item.title} — ${helpTypeLabel} à ${location} | Biguglia Connect`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `${helpTypeLabel} : ${item.title} — Biguglia Connect`;

  const photos = item.photos ?? [];
  const ogImage = photos[0]?.url ?? `${SITE_URL}/images/biguglia-hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/coups-de-main/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/coups-de-main/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: item.title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function HelpRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await fetchHelpRequest(id);
  if (!item) notFound();

  const typeConf = TYPE_CONFIG[item.help_type] ?? TYPE_CONFIG.demande;
  const urgConf  = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.flexible;
  const catConf  = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const durationLabel = DURATION_OPTIONS.find(o => o.value === item.duration)?.label ?? item.duration;
  const compConf = COMPENSATION_CONFIG[item.compensation];
  const author = item.author as { full_name?: string; avatar_url?: string; created_at?: string } | undefined;
  const displayName = getDisplayName(item.author, item.display_name);
  const photos = (item.photos ?? []).sort((a, b) => a.display_order - b.display_order);
  const firstPhoto = photos[0]?.url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* ── Navigation sticky (partie statique) ─────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link
            href="/coups-de-main"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour aux annonces</span>
            <span className="sm:hidden">Retour</span>
          </Link>

          {/* Client: favoris + partage + signaler + éditer */}
          <HelpRequestDetailClient item={item} variant="topbar" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">

          {/* ── COLONNE PRINCIPALE (server-rendered) ─────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Hero card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {item.urgency === 'urgent' && item.status === 'active' && (
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-black px-5 py-2.5 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> URGENT — Aide recherchée aujourd&apos;hui
                </div>
              )}

              {firstPhoto ? (
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={firstPhoto}
                    alt={item.title}
                    fill
                    priority
                    className="object-cover"
                  />
                  {photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      +{photos.length - 1} photo{photos.length > 2 ? 's' : ''}
                    </div>
                  )}
                  {/* Client: lightbox au clic */}
                  <HelpRequestDetailClient item={item} variant="photo-overlay" />
                </div>
              ) : null}

              <div className="p-6">
                {/* Type + urgence + statut */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl border ${typeConf.bg} ${typeConf.color} border-current/20`}>
                    {typeConf.emoji} {typeConf.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${urgConf.bg} ${urgConf.color}`}>
                    <span className={`w-2 h-2 rounded-full ${urgConf.dotColor}`} /> {urgConf.label}
                  </span>
                  <StatusBadge status={item.status} contentType="help_request" />
                </div>

                {/* Catégorie + titre */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{catConf.emoji}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{catConf.label}</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-4">{item.title}</h1>

                {/* Description */}
                {item.description && (
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap mb-4">{item.description}</p>
                )}

                {/* Auteur */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <Avatar src={author?.avatar_url} name={displayName} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                    {author?.created_at && (
                      <p className="text-xs text-gray-400">Membre de la communauté</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Informations pratiques */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-800 mb-4">Informations pratiques</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Lieu</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" /> {item.location_area}
                  </p>
                  {item.location_detail && <p className="text-xs text-gray-500">{item.location_detail}</p>}
                </div>

                {item.help_date && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Date souhaitée</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long',
                      })}
                    </p>
                    {item.help_time && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.help_time.substring(0, 5)}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Durée</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" /> {durationLabel}
                  </p>
                </div>

                {item.persons_needed > 1 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Personnes</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-orange-400 flex-shrink-0" /> {item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {compConf && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Contrepartie</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-pink-400 flex-shrink-0" /> {compConf.label}
                    </p>
                    {item.compensation_detail && (
                      <p className="text-xs text-gray-500">{item.compensation_detail}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Client: participants, discussion, statut, notation */}
            <HelpRequestDetailClient item={item} variant="main-content" />

            {/* CTA catégorie similaire */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-3">
                Voir d&apos;autres annonces dans la même catégorie
              </p>
              <Link
                href={`/coups-de-main?cat=${item.category}`}
                className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors"
              >
                {catConf.emoji} Toutes les annonces &quot;{catConf.label}&quot;
              </Link>
            </div>
          </div>

          {/* ── SIDEBAR (client: actions d'aide, statut, contact) ─────────── */}
          <HelpRequestDetailClient item={item} variant="sidebar" />
        </div>
      </div>

      {/* ── Barre mobile (client) ──────────────────────────────────────── */}
      <HelpRequestDetailClient item={item} variant="mobile-bar" />

      {/* Lightbox (client, lazy) */}
      <HelpRequestDetailClient item={item} variant="lightbox" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeSection — Bloc de section de la Maison vivante
// Bandeau coloré accrocheur + grille de cartes enrichies
// 'use client' requis : les cartes enfants (FreshnessIndicator, EventCard)
// utilisent Date.now() — doit rester côté client pour éviter hydration mismatch
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomeSection as HomeSectionType } from '@/services/home/types';
import FeedCard from './FeedCard';
import NeedCard from './NeedCard';
import EventCard from './EventCard';
import DiscussionCard from './DiscussionCard';
import HomeEmptyState from './HomeEmptyState';
import { cn } from '@/lib/utils';

interface HomeSectionProps {
  section: HomeSectionType;
}

// ─── Config visuelle par section ─────────────────────────────────────────────

const SECTION_CONFIG: Record<string, {
  gradient: string;      // dégradé du bandeau
  accentColor: string;   // couleur du CTA + accents
  accentBg: string;      // fond du CTA
  accentBorder: string;  // bordure section
  iconBg: string;        // fond de l'icône
  tagline: string;       // phrase d'accroche sous le titre
}> = {
  now: {
    gradient:     'from-amber-500 via-orange-500 to-red-500',
    accentColor:  'text-orange-700',
    accentBg:     'bg-orange-50 hover:bg-orange-100',
    accentBorder: 'border-l-4 border-orange-400',
    iconBg:       'bg-white/25',
    tagline:      'Nouveautés, demandes actives, annonces récentes',
  },
  needs: {
    gradient:     'from-teal-500 via-emerald-500 to-green-600',
    accentColor:  'text-emerald-700',
    accentBg:     'bg-emerald-50 hover:bg-emerald-100',
    accentBorder: 'border-l-4 border-emerald-400',
    iconBg:       'bg-white/25',
    tagline:      'Voisins qui ont besoin d\'un coup de main',
  },
  upcoming: {
    gradient:     'from-violet-600 via-purple-600 to-indigo-600',
    accentColor:  'text-violet-700',
    accentBg:     'bg-violet-50 hover:bg-violet-100',
    accentBorder: 'border-l-4 border-violet-400',
    iconBg:       'bg-white/25',
    tagline:      'Événements, promenades et sorties à ne pas rater',
  },
  discussions: {
    gradient:     'from-sky-500 via-blue-500 to-cyan-600',
    accentColor:  'text-sky-700',
    accentBg:     'bg-sky-50 hover:bg-sky-100',
    accentBorder: 'border-l-4 border-sky-400',
    iconBg:       'bg-white/25',
    tagline:      'Les discussions les plus actives du forum local',
  },
  foryou: {
    gradient:     'from-rose-500 via-pink-500 to-fuchsia-600',
    accentColor:  'text-rose-700',
    accentBg:     'bg-rose-50 hover:bg-rose-100',
    accentBorder: 'border-l-4 border-rose-400',
    iconBg:       'bg-white/25',
    tagline:      'Sélection de l\'activité locale pour vous',
  },
  emploi: {
    gradient:     'from-cyan-500 via-teal-500 to-emerald-600',
    accentColor:  'text-cyan-700',
    accentBg:     'bg-cyan-50 hover:bg-cyan-100',
    accentBorder: 'border-l-4 border-cyan-400',
    iconBg:       'bg-white/25',
    tagline:      'Offres et candidatures d\'emploi à Biguglia',
  },
};

const FALLBACK_CONFIG = SECTION_CONFIG.now;

// ─── Sélection du composant de carte ─────────────────────────────────────────

function renderCard(section: HomeSectionType, index: number) {
  const item = section.items[index];
  if (!item) return null;

  if (section.id === 'needs') return <NeedCard key={item.id} item={item} />;
  if (section.id === 'upcoming') return <EventCard key={item.id} item={item} />;
  if (section.id === 'discussions') return <DiscussionCard key={item.id} item={item} />;

  if (item.type === 'help_request') return <NeedCard key={item.id} item={item} />;
  if (item.type === 'event' || item.type === 'outing') return <EventCard key={item.id} item={item} />;
  if (item.type === 'forum_topic') return <DiscussionCard key={item.id} item={item} />;
  if (item.type === 'job_offer' || item.type === 'job_demand') return <FeedCard key={item.id} item={item} />;

  return <FeedCard key={item.id} item={item} />;
}

// ─── Grille selon la section ──────────────────────────────────────────────────

const GRID_CLASS: Record<string, string> = {
  now:         'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  needs:       'grid grid-cols-1 sm:grid-cols-2 gap-3',
  upcoming:    'grid grid-cols-1 sm:grid-cols-2 gap-3',
  discussions: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  emploi:      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  foryou:      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function HomeSection({ section }: HomeSectionProps) {
  const cfg = SECTION_CONFIG[section.id] ?? FALLBACK_CONFIG;

  return (
    <section className="mb-10">

      {/* ── Bandeau accrocheur ─────────────────────────────────────────────── */}
      <div className={cn(
        'relative rounded-2xl overflow-hidden mb-4 bg-gradient-to-r shadow-md',
        cfg.gradient
      )}>
        {/* Motif décoratif en arrière-plan */}
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden">
          <span className="absolute -right-4 -top-4 text-[120px] leading-none">{section.icon}</span>
        </div>

        <div className="relative px-5 py-4 flex items-center justify-between gap-3">
          {/* Icône + texte */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
              cfg.iconBg
            )}>
              <span className="text-2xl leading-none" aria-hidden="true">{section.icon}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white leading-tight tracking-tight">
                {section.title}
              </h2>
              <p className="text-xs text-white/75 mt-0.5 leading-relaxed line-clamp-1">
                {cfg.tagline}
              </p>
            </div>
          </div>

          {/* CTA bandeau */}
          {section.ctaUrl && section.ctaLabel && !section.isEmpty && (
            <Link
              href={section.ctaUrl}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-black text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3.5 py-2 rounded-xl transition-all border border-white/20 hover:border-white/40 shadow-sm"
            >
              {section.ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Ligne de compteur */}
        {!section.isEmpty && (
          <div className="px-5 pb-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90 bg-black/15 rounded-full px-2.5 py-0.5">
              {section.items.length} {section.items.length > 1 ? 'contenus' : 'contenu'}
            </span>
            <span className="text-xs text-white/60">· mis à jour en temps réel</span>
          </div>
        )}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      {section.isEmpty ? (
        <div className={cn('bg-gray-50 rounded-2xl border', cfg.accentBorder.replace('border-l-4', 'border'))}>
          <HomeEmptyState
            sectionId={section.id}
            variant={section.items.length === 0 ? 'empty' : 'low'}
          />
        </div>
      ) : (
        <div className={GRID_CLASS[section.id] ?? 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
          {section.items.map((_, i) => renderCard(section, i))}
        </div>
      )}
    </section>
  );
}

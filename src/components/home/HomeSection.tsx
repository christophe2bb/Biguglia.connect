// ─────────────────────────────────────────────────────────────────────────────
// HomeSection — Bloc de section de la Maison vivante
// Affiche : titre, sous-titre, grille de cartes, CTA, état vide
// Sélectionne automatiquement le bon composant de carte selon le type
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomeSection as HomeSectionType } from '@/services/home/types';
import FeedCard from './FeedCard';
import NeedCard from './NeedCard';
import EventCard from './EventCard';
import DiscussionCard from './DiscussionCard';
import HomeEmptyState from './HomeEmptyState';

interface HomeSectionProps {
  section: HomeSectionType;
}

// Sélection du composant de carte selon la section + le type d'item
function renderCard(section: HomeSectionType, index: number) {
  const item = section.items[index];
  if (!item) return null;

  // Section dédiée → carte spécialisée
  if (section.id === 'needs') {
    return <NeedCard key={item.id} item={item} />;
  }
  if (section.id === 'upcoming') {
    return <EventCard key={item.id} item={item} />;
  }
  if (section.id === 'discussions') {
    return <DiscussionCard key={item.id} item={item} />;
  }

  // Section générique → carte spécialisée par type
  if (item.type === 'help_request') return <NeedCard key={item.id} item={item} />;
  if (item.type === 'event' || item.type === 'outing') return <EventCard key={item.id} item={item} />;
  if (item.type === 'forum_topic') return <DiscussionCard key={item.id} item={item} />;

  // Fallback
  return <FeedCard key={item.id} item={item} />;
}

// Configuration de grille selon la section
const GRID_CLASS: Record<string, string> = {
  now: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  needs: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  upcoming: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  discussions: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  foryou: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
};

export default function HomeSection({ section }: HomeSectionProps) {
  return (
    <section className="mb-8">
      {/* En-tête de section */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none" aria-hidden="true">{section.icon}</span>
          <div>
            <h2 className="text-base font-black text-gray-900 leading-tight">
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {section.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* CTA global */}
        {section.ctaUrl && section.ctaLabel && !section.isEmpty && (
          <Link
            href={section.ctaUrl}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
          >
            {section.ctaLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Contenu */}
      {section.isEmpty ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-100">
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

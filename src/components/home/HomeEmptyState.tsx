// ─────────────────────────────────────────────────────────────────────────────
// HomeEmptyState — États vides pour les sections de la Maison vivante
// Gère : low-activity, empty, error avec call-to-action contextuel
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { PenLine, RefreshCw, MapPin } from 'lucide-react';
import type { HomeSectionId } from '@/services/home/types';

interface HomeEmptyStateProps {
  sectionId: HomeSectionId;
  variant?: 'empty' | 'low' | 'error';
}

const SECTION_CONFIG: Record<HomeSectionId, {
  emoji: string;
  emptyTitle: string;
  emptyDesc: string;
  lowTitle: string;
  lowDesc: string;
  ctaLabel: string;
  ctaUrl: string;
}> = {
  now: {
    emoji: '🌅',
    emptyTitle: 'Tout est calme pour l\'instant',
    emptyDesc: 'Soyez le premier à partager quelque chose avec vos voisins.',
    lowTitle: 'Peu d\'activité récente',
    lowDesc: 'Voici ce qui s\'est passé récemment à Biguglia.',
    ctaLabel: 'Publier une annonce',
    ctaUrl: '/annonces/nouvelle',
  },
  needs: {
    emoji: '🤝',
    emptyTitle: 'Pas de demande en cours',
    emptyDesc: 'Besoin d\'un coup de main ? Vos voisins sont là.',
    lowTitle: 'Quelques besoins locaux',
    lowDesc: 'Des voisins attendent votre aide.',
    ctaLabel: 'Proposer de l\'aide',
    ctaUrl: '/coups-de-main/nouveau',
  },
  upcoming: {
    emoji: '📅',
    emptyTitle: 'Rien de prévu cette semaine',
    emptyDesc: 'Organisez un événement ou une sortie pour animer le village.',
    lowTitle: 'Quelques événements à venir',
    lowDesc: 'Voici ce qui est prévu.',
    ctaLabel: 'Créer un événement',
    ctaUrl: '/evenements/nouveau',
  },
  discussions: {
    emoji: '💬',
    emptyTitle: 'Le forum est calme',
    emptyDesc: 'Lancez une discussion, posez une question, partagez un bon plan.',
    lowTitle: 'Quelques discussions actives',
    lowDesc: 'Rejoignez la conversation.',
    ctaLabel: 'Démarrer une discussion',
    ctaUrl: '/forum/nouveau',
  },
  foryou: {
    emoji: '✨',
    emptyTitle: 'Votre fil est vide',
    emptyDesc: 'Explorez les différentes rubriques pour trouver ce qui vous intéresse.',
    lowTitle: 'Votre sélection locale',
    lowDesc: 'Les contenus les plus pertinents pour vous.',
    ctaLabel: 'Explorer',
    ctaUrl: '/recherche',
  },
  emploi: {
    emoji: '💼',
    emptyTitle: 'Aucune offre pour l\'instant',
    emptyDesc: 'Soyez le premier à publier une offre ou déposer votre candidature.',
    lowTitle: 'Quelques offres d\'emploi',
    lowDesc: 'Découvrez les opportunités locales.',
    ctaLabel: 'Voir toutes les offres',
    ctaUrl: '/emploi/offres',
  },
};

export default function HomeEmptyState({ sectionId, variant = 'empty' }: HomeEmptyStateProps) {
  const config = SECTION_CONFIG[sectionId];

  if (variant === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm text-gray-500">Impossible de charger ce contenu</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const title = variant === 'low' ? config.lowTitle : config.emptyTitle;
  const desc = variant === 'low' ? config.lowDesc : config.emptyDesc;

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
      <span className="text-4xl">{config.emoji}</span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-xs text-gray-400 max-w-xs">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <MapPin className="w-3 h-3" />
        <span>Biguglia</span>
      </div>
      {variant === 'empty' && (
        <Link
          href={config.ctaUrl}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors"
        >
          <PenLine className="w-3 h-3" />
          {config.ctaLabel}
        </Link>
      )}
    </div>
  );
}

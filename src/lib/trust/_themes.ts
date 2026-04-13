/**
 * trust/_themes.ts — Configuration des thèmes par type de source
 *
 * Détermine le libellé, les dimensions d'évaluation, la fenêtre de review
 * et les tags suggérés pour chaque InteractionSourceType.
 */

import type { InteractionSourceType, InteractionType } from './_types';

export type ThemeConfig = {
  label: string;
  emoji: string;
  interactionType: InteractionType;
  reviewTrigger: string;    // Moment où l'avis est débloqué
  reviewWindow: number;     // Jours après completion
  dimensions: {
    key: 'dim_communication' | 'dim_reliability' | 'dim_punctuality' | 'dim_quality';
    label: string;
    emoji: string;
  }[];
  tags: string[];           // Tags suggérés
  revieweeLabel: string;    // "vendeur", "organisateur", etc.
  reviewerLabel: string;    // "acheteur", "participant", etc.
};

export const THEME_CONFIG: Record<InteractionSourceType, ThemeConfig> = {
  listing: {
    label: 'Annonce',
    emoji: '📦',
    interactionType: 'transaction',
    reviewTrigger: 'Transaction confirmée par les deux parties',
    reviewWindow: 30,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Fiabilité',     emoji: '🤝' },
      { key: 'dim_quality',       label: 'Conformité',    emoji: '✅' },
    ],
    tags: ['Ponctuel', 'Objet conforme', 'Communication facile', 'Prix honnête', 'Recommandé'],
    revieweeLabel: 'vendeur',
    reviewerLabel: 'acheteur',
  },
  equipment: {
    label: 'Matériel',
    emoji: '🔧',
    interactionType: 'material_request',
    reviewTrigger: 'Matériel retourné et état validé',
    reviewWindow: 14,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Fiabilité',     emoji: '🤝' },
      { key: 'dim_punctuality',   label: 'Ponctualité',   emoji: '⏱️' },
      { key: 'dim_quality',       label: 'État matériel', emoji: '⭐' },
    ],
    tags: ['Matériel propre', 'Rendu à temps', 'Prêteur sympa', 'Emprunteur soigneux'],
    revieweeLabel: 'prêteur / emprunteur',
    reviewerLabel: 'participant',
  },
  help_request: {
    label: 'Coup de main',
    emoji: '🤝',
    interactionType: 'help_match',
    reviewTrigger: 'Aide accomplie et clôture confirmée',
    reviewWindow: 14,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Fiabilité',     emoji: '🤝' },
      { key: 'dim_punctuality',   label: 'Réactivité',    emoji: '⚡' },
      { key: 'dim_quality',       label: 'Qualité aide',  emoji: '💪' },
    ],
    tags: ['Super aidant', 'Très réactif', 'Agréable', 'Compétent', 'Reconnaissant'],
    revieweeLabel: 'helper',
    reviewerLabel: 'bénéficiaire',
  },
  lost_found: {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    interactionType: 'contact',
    reviewTrigger: 'Objet rendu / contact établi',
    reviewWindow: 7,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Honnêteté',     emoji: '🤝' },
    ],
    tags: ['Honnête', 'Réactif', 'Serviable'],
    revieweeLabel: 'membre',
    reviewerLabel: 'membre',
  },
  association: {
    label: 'Association',
    emoji: '🏛️',
    interactionType: 'contact',
    reviewTrigger: 'Contact / participation confirmé',
    reviewWindow: 30,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_quality',       label: 'Accueil',       emoji: '🤗' },
      { key: 'dim_reliability',   label: 'Organisation',  emoji: '📋' },
    ],
    tags: ['Très active', 'Bonne ambiance', 'Projets intéressants', 'Bien organisée'],
    revieweeLabel: 'association',
    reviewerLabel: 'membre',
  },
  outing: {
    label: 'Promenade / Sortie',
    emoji: '🚶',
    interactionType: 'participation',
    reviewTrigger: 'Sortie terminée',
    reviewWindow: 14,
    dimensions: [
      { key: 'dim_communication', label: 'Communication',  emoji: '💬' },
      { key: 'dim_reliability',   label: 'Organisation',   emoji: '📋' },
      { key: 'dim_punctuality',   label: 'Ponctualité',    emoji: '⏱️' },
      { key: 'dim_quality',       label: 'Qualité sortie', emoji: '🌄' },
    ],
    tags: ['Magnifique sortie', 'Bien organisée', 'Conviviale', 'Guide expert'],
    revieweeLabel: 'organisateur',
    reviewerLabel: 'participant',
  },
  collection_item: {
    label: 'Collection',
    emoji: '💎',
    interactionType: 'contact',
    reviewTrigger: 'Échange confirmé',
    reviewWindow: 30,
    dimensions: [
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Fiabilité',     emoji: '🤝' },
      { key: 'dim_quality',       label: 'Conformité',    emoji: '✅' },
    ],
    tags: ['Article conforme', 'Vendeur sérieux', 'Prix correct', 'Beau objet'],
    revieweeLabel: 'collectionneur',
    reviewerLabel: 'acheteur',
  },
  event: {
    label: 'Événement',
    emoji: '📅',
    interactionType: 'participation',
    reviewTrigger: 'Événement terminé (présence confirmée)',
    reviewWindow: 14,
    dimensions: [
      { key: 'dim_communication', label: 'Info & communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Organisation',         emoji: '📋' },
      { key: 'dim_punctuality',   label: 'Respect horaires',     emoji: '⏱️' },
      { key: 'dim_quality',       label: 'Qualité événement',    emoji: '🎉' },
    ],
    tags: ['Super événement', 'Bien organisé', 'Ambiance top', 'Horaires respectés', 'À refaire'],
    revieweeLabel: 'organisateur',
    reviewerLabel: 'participant',
  },
  promenade: {
    label: 'Promenade',
    emoji: '🌿',
    interactionType: 'participation',
    reviewTrigger: 'Promenade terminée',
    reviewWindow: 14,
    dimensions: [
      { key: 'dim_communication', label: 'Description', emoji: '📝' },
      { key: 'dim_quality',       label: 'Intérêt',     emoji: '🌟' },
    ],
    tags: ['Superbe vue', 'Bien balisée', 'Accessible', 'Recommend'],
    revieweeLabel: 'créateur',
    reviewerLabel: 'randonneur',
  },
  service_request: {
    label: 'Artisan / Service',
    emoji: '🛠️',
    interactionType: 'service_request',
    reviewTrigger: 'Prestation terminée',
    reviewWindow: 30,
    dimensions: [
      { key: 'dim_communication', label: 'Communication',   emoji: '💬' },
      { key: 'dim_reliability',   label: 'Fiabilité',       emoji: '🤝' },
      { key: 'dim_punctuality',   label: 'Respect délais',  emoji: '⏱️' },
      { key: 'dim_quality',       label: 'Qualité travail', emoji: '⭐' },
    ],
    tags: ['Excellent travail', 'Dans les délais', 'Prix honnête', 'Je recommande', 'Propre et soigné'],
    revieweeLabel: 'artisan',
    reviewerLabel: 'client',
  },
};

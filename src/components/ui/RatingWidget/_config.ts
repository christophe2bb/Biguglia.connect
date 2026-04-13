// ─── Configuration sondages par rubrique ─────────────────────────────────────

import type { PollOption, RatingTargetType } from './_types';

export const POLL_CONFIG: Record<RatingTargetType, { question: string; options: PollOption[] }> = {
  listing:         { question: 'Annonce conforme ?',              options: [{ label: 'Conforme',           emoji: '✅' }, { label: 'Prix ok',              emoji: '💰' }, { label: 'Bon état',          emoji: '👍' }, { label: 'À améliorer',      emoji: '⚠️' }] },
  equipment:       { question: 'Matériel en bon état ?',          options: [{ label: 'Parfait état',       emoji: '⭐' }, { label: 'Bon état',            emoji: '👍' }, { label: 'Fonctionnel',       emoji: '🔧' }, { label: 'Usure visible',    emoji: '⚠️' }] },
  help_request:    { question: "Comment s'est passée l'aide ?",   options: [{ label: 'Super aide',         emoji: '🤝' }, { label: 'Très réactif',        emoji: '⚡' }, { label: 'Agréable',          emoji: '😊' }, { label: 'À améliorer',      emoji: '📝' }] },
  lost_found:      { question: 'Annonce utile ?',                 options: [{ label: 'Très utile',         emoji: '🔍' }, { label: 'Bien décrit',         emoji: '📝' }, { label: 'Photo claire',      emoji: '📷' }, { label: 'Résolu !',         emoji: '✅' }] },
  association:     { question: "Votre avis sur l'association ?",  options: [{ label: 'Très active',        emoji: '🏃' }, { label: 'Accueil top',         emoji: '🤗' }, { label: 'Projets intéressants', emoji: '💡' }, { label: 'Bien organisée', emoji: '📋' }] },
  outing:          { question: 'La sortie était comment ?',       options: [{ label: 'Magnifique',         emoji: '🌄' }, { label: 'Bien organisée',      emoji: '📋' }, { label: 'Conviviale',        emoji: '👥' }, { label: 'Trop difficile',   emoji: '😅' }] },
  collection_item: { question: 'Article bien décrit ?',           options: [{ label: 'Rare & beau',        emoji: '💎' }, { label: 'Bien documenté',      emoji: '📖' }, { label: 'Prix correct',      emoji: '💰' }, { label: 'Photos nettes',    emoji: '📷' }] },
  event:           { question: "L'événement était ?",             options: [{ label: 'Excellent !',        emoji: '🎉' }, { label: 'Bien organisé',       emoji: '📋' }, { label: 'Ambiance top',      emoji: '🎶' }, { label: 'À améliorer',      emoji: '📝' }] },
  promenade:       { question: 'La promenade était ?',            options: [{ label: 'Superbe vue',        emoji: '🌟' }, { label: 'Bien balisée',        emoji: '🗺️' }, { label: 'Accessible',        emoji: '👣' }, { label: 'Difficile',        emoji: '⛰️' }] },
  service_request: { question: 'Prestation réalisée ?',           options: [{ label: 'Excellent travail',  emoji: '⭐' }, { label: 'Dans les délais',     emoji: '⏱️' }, { label: 'Prix honnête',      emoji: '💰' }, { label: 'Je recommande',    emoji: '👍' }] },
};

// ─── Couleur selon la moyenne ─────────────────────────────────────────────────

export function ratingColor(avg: number): string {
  if (avg >= 4.5) return 'text-emerald-600';
  if (avg >= 3.5) return 'text-amber-500';
  if (avg >= 2.5) return 'text-orange-500';
  return 'text-red-500';
}

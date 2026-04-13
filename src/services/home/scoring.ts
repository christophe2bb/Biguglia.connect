// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Système de scoring
// Règles simples, lisibles, modifiables sans toucher à l'UI.
// Principe : récent + non résolu + diversifié entre sources.
//
// v2 — Personnalisation : accepte des poids utilisateur optionnels
// qui modulent le TYPE_WEIGHT de base.
// ─────────────────────────────────────────────────────────────────────────────

import type { HomeFeedItem, HomeFeedItemType } from './types';

/** Poids de personnalisation passés depuis le profil d'intérêt utilisateur */
export type UserFeedWeights = Partial<Record<HomeFeedItemType, number>>;

// ─── Constantes ───────────────────────────────────────────────────────────────

// Durée de "fraîcheur maximale" en heures
const FRESHNESS_MAX_HOURS = 72;

// Poids par type (diversité et utilité perçue)
const TYPE_WEIGHT: Record<HomeFeedItemType, number> = {
  help_request: 1.3,   // Priorité : crée l'engagement, besoin concret
  event:        1.2,   // Priorité : temporel, donne une raison de revenir
  lost_found:   1.2,   // Priorité : urgent par nature
  forum_topic:  1.0,   // Standard : conversation vivante
  listing:      0.9,   // Légèrement en retrait : moins "temps réel"
  outing:       1.1,   // Bon : crée de la vie
  equipment:    0.8,   // En retrait : usage plus ponctuel
  association:  0.8,   // En retrait : moins temps réel
  job_offer:    1.15,  // Emploi : très pertinent pour les habitants
  job_demand:   1.05,  // Candidature : bon signal d'activité
};

// Poids par urgence
const URGENCY_WEIGHT: Record<HomeFeedItem['urgency'], number> = {
  high:   1.4,
  medium: 1.1,
  low:    1.0,
};

// ─── Score de fraîcheur ───────────────────────────────────────────────────────
// Décroît linéairement de 100 à 0 sur FRESHNESS_MAX_HOURS heures.
// Un item vieux de 72h+ a un score de fraîcheur de 0.

export function computeFreshnessScore(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const ageHours = (now - created) / (1000 * 60 * 60);
  const raw = Math.max(0, 1 - ageHours / FRESHNESS_MAX_HOURS);
  return Math.round(raw * 100);
}

// ─── Score de pertinence ──────────────────────────────────────────────────────
// Combine : type + urgence + statut non résolu + activité récente
// + poids personnalisés optionnels de l'utilisateur

export function computeRelevanceScore(item: HomeFeedItem, userWeights: UserFeedWeights = {}): number {
  let score = 50; // Base

  // Bonus type (standard × personnalisation utilisateur)
  const baseTypeWeight = TYPE_WEIGHT[item.type] ?? 1.0;
  const userTypeWeight = userWeights[item.type] ?? 1.0;
  score *= baseTypeWeight * userTypeWeight;

  // Bonus urgence
  score *= URGENCY_WEIGHT[item.urgency] ?? 1.0;

  // Bonus non résolu (+20)
  if (!item.isResolved) score += 20;

  // Bonus événement à venir dans 48h (+15)
  if (item.eventDate) {
    const hoursUntil = (new Date(item.eventDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil <= 48) score += 15;
  }

  // Malus résolu (−30)
  if (item.isResolved) score -= 30;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Score final ──────────────────────────────────────────────────────────────
// Combinaison pondérée fraîcheur (40%) + pertinence (60%)

export function computeFinalScore(item: HomeFeedItem): number {
  return Math.round(item.freshnessScore * 0.4 + item.relevanceScore * 0.6);
}

// ─── Scoring en lot ───────────────────────────────────────────────────────────

export function scoreItems(items: HomeFeedItem[], userWeights: UserFeedWeights = {}): HomeFeedItem[] {
  return items.map(item => {
    const freshnessScore = computeFreshnessScore(item.createdAt);
    const withFreshness = { ...item, freshnessScore };
    const relevanceScore = computeRelevanceScore(withFreshness, userWeights);
    const withRelevance = { ...withFreshness, relevanceScore };
    const finalScore = computeFinalScore(withRelevance);
    return { ...withRelevance, finalScore };
  });
}

// ─── Tri et déduplication ─────────────────────────────────────────────────────

export function sortByScore(items: HomeFeedItem[]): HomeFeedItem[] {
  return [...items].sort((a, b) => b.finalScore - a.finalScore);
}

// Garantit la diversité : max N items par type dans un même lot
export function diversifyItems(items: HomeFeedItem[], maxPerType = 2): HomeFeedItem[] {
  const countByType: Partial<Record<HomeFeedItemType, number>> = {};
  const result: HomeFeedItem[] = [];

  for (const item of items) {
    const count = countByType[item.type] ?? 0;
    if (count < maxPerType) {
      result.push(item);
      countByType[item.type] = count + 1;
    }
  }
  return result;
}

// ─── Pipeline complet ─────────────────────────────────────────────────────────

export function rankAndFilter(
  items: HomeFeedItem[],
  options: {
    limit?: number;
    maxPerType?: number;
    excludeResolved?: boolean;
    userWeights?: UserFeedWeights;
  } = {}
): HomeFeedItem[] {
  const { limit = 6, maxPerType = 3, excludeResolved = false, userWeights = {} } = options;

  let result = scoreItems(items, userWeights);

  if (excludeResolved) {
    result = result.filter(i => !i.isResolved);
  }

  result = sortByScore(result);
  result = diversifyItems(result, maxPerType);
  return result.slice(0, limit);
}

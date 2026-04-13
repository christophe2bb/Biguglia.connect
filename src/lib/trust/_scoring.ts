/**
 * trust/_scoring.ts — Calcul client-side du score de confiance unifié
 *
 * Découpe en sous-scores :
 *   - Ancienneté  (30 pts max)
 *   - Profil      (15 pts max)
 *   - Rôle/statut (25 pts max)
 *   - Avis reçus  (30 pts max)
 *
 * Total : 0–100. Niveaux : nouveau / fiable / de_confiance.
 */

import type { BadgeCode, TrustProfileStats } from './_types';

// ─── Résultat ─────────────────────────────────────────────────────────────────

export interface TrustScoreResult {
  score: number;
  level: 'nouveau' | 'surveille' | 'fiable' | 'de_confiance';
  label: string;
  emoji: string;
  color: string;
  bg: string;
  badges: BadgeCode[];
  details: Array<{ label: string; value: number; max: number }>;
}

// ─── Niveaux ─────────────────────────────────────────────────────────────────

const LEVELS: {
  minScore: number;
  level: TrustScoreResult['level'];
  label: string;
  emoji: string;
  color: string;
  bg: string;
}[] = [
  { minScore: 75, level: 'de_confiance', label: 'De confiance', emoji: '🛡️', color: 'text-purple-700',  bg: 'bg-purple-50'  },
  { minScore: 45, level: 'fiable',       label: 'Fiable',       emoji: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { minScore: 0,  level: 'nouveau',      label: 'Nouveau',      emoji: '🌱', color: 'text-gray-600',    bg: 'bg-gray-100'   },
];

function resolveLevel(score: number) {
  return LEVELS.find(l => score >= l.minScore) ?? LEVELS[LEVELS.length - 1];
}

// ─── Sous-scores ──────────────────────────────────────────────────────────────

function scoreAge(
  createdAt: string,
  badges: BadgeCode[],
): { value: number } {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (ageDays > 365) { badges.push('veteran'); return { value: 30 }; }
  if (ageDays > 90)  return { value: 20 };
  if (ageDays > 30)  return { value: 10 };
  badges.push('new_member');
  return { value: 0 };
}

function scoreProfile(
  avatarUrl: string | null | undefined,
  phone: string | null | undefined,
  badges: BadgeCode[],
): { value: number } {
  let v = 0;
  if (avatarUrl) v += 8;
  if (phone) { v += 7; badges.push('phone_verified'); }
  if (v >= 15) badges.push('profile_complete');
  return { value: v };
}

function scoreRole(
  role: string,
  badges: BadgeCode[],
): { value: number } {
  if (['admin', 'moderator'].includes(role)) return { value: 25 };
  if (role === 'artisan_verified') { badges.push('admin_validated'); return { value: 20 }; }
  if (role === 'artisan_pending')  return { value: 5 };
  return { value: 0 };
}

function scoreReviews(
  stats: TrustProfileStats | null | undefined,
  badges: BadgeCode[],
): { value: number } {
  if (!stats) return { value: 0 };
  const { reviews_received, avg_rating, recommend_pct, interactions_total, interactions_done } = stats;
  let v = Math.min(15, reviews_received * 2);
  if (avg_rating >= 4.5)      { v += 15; badges.push('top_rated'); }
  else if (avg_rating >= 4.0) { v += 10; }
  else if (avg_rating >= 3.0) { v += 5; }
  if (recommend_pct && recommend_pct >= 80) badges.push('trusted_member');
  const doneRatio = interactions_total > 0 ? interactions_done / interactions_total : 0;
  if (doneRatio >= 0.8 && interactions_done >= 3) badges.push('active_member');
  return { value: v };
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function computeUnifiedTrustScore(params: {
  created_at: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
  stats?: TrustProfileStats | null;
  badges?: BadgeCode[];
}): TrustScoreResult {
  const earnedBadges: BadgeCode[] = [];

  const age     = scoreAge(params.created_at, earnedBadges);
  const profile = scoreProfile(params.avatar_url, params.phone, earnedBadges);
  const role    = scoreRole(params.role, earnedBadges);
  const reviews = scoreReviews(params.stats, earnedBadges);

  const details: TrustScoreResult['details'] = [
    { label: 'Ancienneté',         value: age.value,     max: 30 },
    { label: 'Profil',             value: profile.value, max: 15 },
    ...(role.value > 0 ? [{ label: 'Statut vérifié', value: role.value, max: 25 }] : []),
    { label: 'Avis & interactions', value: reviews.value, max: 30 },
  ];

  // Merge badges fournis de l'extérieur (DB)
  if (params.badges) {
    params.badges.forEach(b => { if (!earnedBadges.includes(b)) earnedBadges.push(b); });
  }

  const rawScore = age.value + profile.value + role.value + reviews.value;
  const score = Math.max(0, Math.min(100, rawScore));
  const { level, label, emoji, color, bg } = resolveLevel(score);

  return { score, level, label, emoji, color, bg, badges: earnedBadges, details };
}

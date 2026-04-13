/**
 * trust/_queries.ts — Requêtes Supabase en lecture + attribution automatique des badges
 *
 * Expose :
 *   fetchTrustStats        – stats agrégées d'un profil (trust_profile_stats)
 *   fetchProfileBadges     – liste des BadgeCode d'un profil (profile_badges)
 *   awardAutomaticBadges   – calcule et insère les nouveaux badges système
 */

import { createClient } from '@/lib/supabase/client';
import type { TrustProfileStats, BadgeCode } from './_types';

// ─── fetchTrustStats ──────────────────────────────────────────────────────────

export async function fetchTrustStats(profileId: string): Promise<TrustProfileStats | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('trust_profile_stats')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return data as TrustProfileStats | null;
}

// ─── fetchProfileBadges ───────────────────────────────────────────────────────

export async function fetchProfileBadges(profileId: string): Promise<BadgeCode[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profile_badges')
    .select('badge_code')
    .eq('profile_id', profileId);
  return (data || []).map((r: { badge_code: string }) => r.badge_code as BadgeCode);
}

// ─── awardAutomaticBadges ─────────────────────────────────────────────────────

/**
 * Calcule les badges manquants et les insère via upsert (ignoreDuplicates).
 * Doit être appelé côté serveur ou après une action utilisateur significative.
 */
export async function awardAutomaticBadges(profileId: string): Promise<void> {
  const supabase = createClient();

  const [{ data: profile }, { data: stats }, { data: existingBadges }] = await Promise.all([
    supabase.from('profiles').select('created_at, role, avatar_url, phone').eq('id', profileId).single(),
    supabase.from('trust_profile_stats').select('*').eq('profile_id', profileId).maybeSingle(),
    supabase.from('profile_badges').select('badge_code').eq('profile_id', profileId),
  ]);

  if (!profile) return;

  const existing = new Set((existingBadges || []).map((b: { badge_code: string }) => b.badge_code));
  const toAward: BadgeCode[] = [];

  // Ancienneté
  const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000;
  if (ageDays > 365 && !existing.has('veteran'))    toAward.push('veteran');
  if (ageDays <= 7  && !existing.has('new_member')) toAward.push('new_member');

  // Profil complet
  if (profile.avatar_url && profile.phone && !existing.has('profile_complete')) toAward.push('profile_complete');
  if (profile.phone && !existing.has('phone_verified')) toAward.push('phone_verified');

  // Stats
  if (stats) {
    if (stats.reviews_received >= 5 && stats.avg_rating >= 4.5 && !existing.has('top_rated'))    toAward.push('top_rated');
    if (stats.trust_score >= 70                                  && !existing.has('trusted_member')) toAward.push('trusted_member');
    if (stats.interactions_done >= 10                            && !existing.has('active_member'))  toAward.push('active_member');
  }

  if (toAward.length === 0) return;

  await supabase.from('profile_badges').upsert(
    toAward.map(badge_code => ({ profile_id: profileId, badge_code, awarded_by: 'system' })),
    { onConflict: 'profile_id,badge_code', ignoreDuplicates: true },
  );
}

/**
 * moderation/scoring.ts
 * Logique métier : validation complète, scoring confiance, statut modération,
 * vérification limite de publications.
 */
import {
  TRUST_LEVEL_CONFIG,
  type ContentType,
  type TrustLevel,
  type ModerationStatus,
  type ValidationResult,
  type TrustScore,
  type PublicationLimitResult,
} from './types';
import { VALIDATION_RULES } from './rules';
import { checkSpam } from './spam';

// ─── Validation complète pré-publication ─────────────────────────────────────
export function validateContent(
  contentType: ContentType,
  data: Record<string, unknown>,
): ValidationResult {
  const rules = VALIDATION_RULES[contentType] ?? [];
  const errors: ValidationResult['errors'] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let riskScore = 0;

  // Champs obligatoires
  for (const rule of rules) {
    const value = data[rule.field];
    if (!rule.check(value, data)) {
      errors.push({ field: rule.field, label: rule.label, message: rule.message, weight: rule.weight });
      if (rule.weight >= 2) riskScore += rule.weight * 10;
    }
  }

  // Anti-spam sur les champs texte
  const TEXT_FIELDS = ['title', 'description', 'content', 'name'];
  for (const field of TEXT_FIELDS) {
    const val = data[field];
    if (typeof val === 'string' && val.length > 5) {
      const spamResult = checkSpam(val);
      if (spamResult.level === 'blocked') {
        riskScore += 40;
        warnings.push(`Contenu suspect dans "${field}" : ${spamResult.reasons.join(', ')}`);
      } else if (spamResult.level === 'warning') {
        riskScore += 15;
        suggestions.push(`Vérifier "${field}" : ${spamResult.reasons.join(', ')}`);
      }
    }
  }

  // Taux de complétude
  const totalWeight = rules.reduce((s, r) => s + r.weight, 0);
  const errorWeight = errors.reduce((s, e) => s + e.weight, 0);
  const completeness = totalWeight > 0
    ? Math.round(((totalWeight - errorWeight) / totalWeight) * 100)
    : 100;

  const riskLevel: ValidationResult['riskLevel'] =
    riskScore >= 60 ? 'critical' :
    riskScore >= 40 ? 'high' :
    riskScore >= 20 ? 'medium' : 'low';

  return {
    valid: errors.length === 0 && riskScore < 60,
    errors,
    warnings,
    completeness,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    shouldBlock: riskScore >= 60 || errors.some(e => e.weight === 3),
    suggestions,
  };
}

// ─── Statut selon le niveau de confiance ─────────────────────────────────────
export function getModerationStatus(
  trustLevel: TrustLevel,
  role: string,
): ModerationStatus {
  if (['admin', 'moderator'].includes(role)) return 'publie';
  return TRUST_LEVEL_CONFIG[trustLevel].autoPublish
    ? 'publie'
    : 'en_attente_validation';
}

// ─── Calcul du niveau de confiance ───────────────────────────────────────────
export function computeTrustLevel(profile: {
  created_at: string;
  role: string;
  trust_level?: string;
  publication_count?: number;
  reports_received?: number;
}): TrustLevel {
  // Respecter le niveau fixé manuellement par un admin
  if (profile.trust_level &&
    ['nouveau', 'surveille', 'fiable', 'de_confiance'].includes(profile.trust_level)) {
    return profile.trust_level as TrustLevel;
  }

  const ageDays   = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
  const pubCount  = profile.publication_count ?? 0;
  const reports   = profile.reports_received ?? 0;

  if (reports > 3) return 'surveille';
  if (ageDays >= 180 && pubCount >= 10 && reports === 0) return 'de_confiance';
  if (ageDays >= 30 && pubCount >= 3 && reports <= 1) return 'fiable';
  return 'nouveau';
}

// ─── Score de confiance (pour affichage) ─────────────────────────────────────
export function computeTrustScore(profile: {
  created_at: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
  publication_count?: number;
  reports_received?: number;
  trust_level?: string;
}): TrustScore {
  let score = 0;
  const badges: string[] = [];

  const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
  if (ageDays > 365)     { score += 30; badges.push('👴 Membre depuis 1 an'); }
  else if (ageDays > 90) { score += 20; badges.push('📅 Membre depuis 3 mois'); }
  else if (ageDays > 30) { score += 10; badges.push('📅 Membre depuis 1 mois'); }
  else                   { badges.push('🌱 Nouveau membre'); }

  if (profile.avatar_url) { score += 10; badges.push('📷 Photo de profil'); }
  if (profile.phone)      { score += 15; badges.push('📞 Téléphone renseigné'); }

  if (['admin', 'moderator'].includes(profile.role)) {
    score += 40; badges.push('🛡️ Équipe Biguglia');
  } else if (profile.role === 'artisan_verified') {
    score += 30; badges.push('✅ Artisan vérifié');
  } else if (profile.role === 'artisan_pending') {
    score += 10;
  }

  const pubCount = profile.publication_count ?? 0;
  if (pubCount >= 20)    { score += 20; badges.push('⭐ Membre actif'); }
  else if (pubCount >= 5){ score += 10; badges.push('📝 Contributeur'); }

  const reports = profile.reports_received ?? 0;
  if (reports > 5)       score -= 30;
  else if (reports > 2)  score -= 15;
  else if (reports > 0)  score -= 5;

  score = Math.max(0, Math.min(100, score));
  const level = computeTrustLevel(profile);
  const cfg   = TRUST_LEVEL_CONFIG[level];

  return { score, level, badges, label: cfg.label, color: cfg.color, bg: cfg.bg, emoji: cfg.emoji };
}

// ─── Limite quotidienne de publications ──────────────────────────────────────
const DAILY_LIMITS: Record<string, number> = {
  resident:         5,
  artisan_pending:  3,
  artisan_verified: 10,
  moderator:        50,
  admin:            999,
};

export async function checkPublicationLimit(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  userId: string,
  role: string,
  tableName: string,
  authorColumn = 'author_id',
): Promise<PublicationLimitResult> {
  const limit = DAILY_LIMITS[role] ?? 5;
  const today = new Date().toISOString().split('T')[0];

  try {
    const { count } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq(authorColumn, userId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const todayCount = count ?? 0;
    if (todayCount >= limit) {
      return {
        allowed: false,
        reason: `Limite de ${limit} publications/jour atteinte. Réessayez demain.`,
        count: todayCount,
        limit,
      };
    }
    return { allowed: true, count: todayCount, limit };
  } catch {
    return { allowed: true, count: 0, limit };
  }
}

// ─── Helpers rapides ──────────────────────────────────────────────────────────
export function isNewMember(createdAt: string): boolean {
  return (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 3600 * 1000;
}

export function needsModeration(profile: {
  created_at: string;
  role: string;
  publication_count?: number;
  trust_level?: string;
}): boolean {
  if (['admin', 'moderator'].includes(profile.role)) return false;
  return !TRUST_LEVEL_CONFIG[computeTrustLevel(profile)].autoPublish;
}

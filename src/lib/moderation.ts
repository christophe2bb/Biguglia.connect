/**
 * Bibliothèque anti-spam et modération de contenu
 * Utilisée sur toutes les pages du site avant publication
 */

// ─── Mots/expressions suspects ────────────────────────────────────────────────
const SPAM_WORDS = [
  // Arnaques financières
  'bitcoin', 'crypto', 'ethereum', 'nft', 'investissement garanti',
  'gagner de l\'argent', 'revenus passifs', 'millionnaire',
  // Spam publicitaire
  'cliquez ici', 'offre limitée', 'gratuit immédiatement',
  'sans engagement', 'meilleur prix garanti',
  // Contenu sensible
  'travail dissimulé', 'sans déclaration', 'au noir',
  'faux papiers', 'document officiel',
];

// ─── Patterns regex ───────────────────────────────────────────────────────────
// Numéros de téléphone FR (06, 07, 04, 05, etc.)
const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;

// URLs et liens
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

// Emails
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Répétition excessive (3+ fois le même caractère)
const REPEAT_REGEX = /(.)\1{4,}/g;

// Tout en majuscules (5+ mots)
const ALL_CAPS_REGEX = /\b[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]{4,}\b/g;

// ─── Types ────────────────────────────────────────────────────────────────────
export type SpamCheckResult = {
  isSpam: boolean;
  score: number;       // 0-100, >50 = bloqué, >30 = avertissement
  reasons: string[];
  level: 'ok' | 'warning' | 'blocked';
};

// ─── Fonction principale ──────────────────────────────────────────────────────
export function checkSpam(text: string, options?: {
  allowPhone?: boolean;
  allowUrl?: boolean;
  allowEmail?: boolean;
}): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;
  const lower = text.toLowerCase();

  // 1. Mots suspects
  const foundWords = SPAM_WORDS.filter(w => lower.includes(w));
  if (foundWords.length > 0) {
    score += foundWords.length * 20;
    reasons.push(`Mots suspects détectés : ${foundWords.slice(0, 3).join(', ')}`);
  }

  // 2. Numéros de téléphone
  if (!options?.allowPhone) {
    const phones = text.match(PHONE_REGEX);
    if (phones && phones.length > 0) {
      score += 25;
      reasons.push('Numéro de téléphone dans le texte (utilisez la messagerie interne)');
    }
  }

  // 3. URLs
  if (!options?.allowUrl) {
    const urls = text.match(URL_REGEX);
    if (urls && urls.length > 0) {
      score += 30;
      reasons.push('Lien externe détecté');
    }
  }

  // 4. Emails
  if (!options?.allowEmail) {
    const emails = text.match(EMAIL_REGEX);
    if (emails && emails.length > 0) {
      score += 20;
      reasons.push('Adresse email dans le texte (utilisez la messagerie interne)');
    }
  }

  // 5. Répétitions excessives
  const repeats = text.match(REPEAT_REGEX);
  if (repeats && repeats.length > 2) {
    score += 15;
    reasons.push('Caractères répétés excessivement');
  }

  // 6. Trop de majuscules
  const capsWords = text.match(ALL_CAPS_REGEX);
  if (capsWords && capsWords.length > 5) {
    score += 10;
    reasons.push('Trop de majuscules');
  }

  // 7. Texte trop court (< 10 chars) si c'est une description
  if (text.trim().length < 10) {
    score += 10;
    reasons.push('Texte trop court');
  }

  // Calcul du niveau
  const level: SpamCheckResult['level'] =
    score >= 50 ? 'blocked' :
    score >= 25 ? 'warning' : 'ok';

  return { isSpam: score >= 50, score: Math.min(score, 100), reasons, level };
}

// ─── Check limite de publications ─────────────────────────────────────────────
export type PublicationLimitResult = {
  allowed: boolean;
  reason?: string;
  count: number;
  limit: number;
};

/**
 * Tables et limites par jour selon le rôle
 */
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
    // En cas d'erreur on laisse passer
    return { allowed: true, count: 0, limit };
  }
}

// ─── Vérifier si nouveau membre (< 7 jours) ──────────────────────────────────
export function isNewMember(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age < 7 * 24 * 3600 * 1000; // 7 jours
}

// ─── Calcul score de confiance ────────────────────────────────────────────────
export type TrustScore = {
  score: number;        // 0-100
  level: 'new' | 'member' | 'trusted' | 'verified';
  label: string;
  color: string;
  bg: string;
  emoji: string;
  badges: string[];
};

export function computeTrustScore(profile: {
  created_at: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
  publication_count?: number;
  reports_received?: number;
}): TrustScore {
  let score = 0;
  const badges: string[] = [];

  // Ancienneté
  const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
  if (ageDays > 365) { score += 30; badges.push('👴 Membre depuis 1 an'); }
  else if (ageDays > 90) { score += 20; badges.push('📅 Membre depuis 3 mois'); }
  else if (ageDays > 30) { score += 10; badges.push('📅 Membre depuis 1 mois'); }
  else { badges.push('🌱 Nouveau membre'); }

  // Avatar
  if (profile.avatar_url) { score += 10; badges.push('📷 Photo de profil'); }

  // Téléphone
  if (profile.phone) { score += 15; badges.push('📞 Téléphone renseigné'); }

  // Rôle
  if (profile.role === 'admin' || profile.role === 'moderator') {
    score += 40; badges.push('🛡️ Équipe Biguglia');
  } else if (profile.role === 'artisan_verified') {
    score += 30; badges.push('✅ Artisan vérifié');
  } else if (profile.role === 'artisan_pending') {
    score += 10;
  }

  // Publications
  const pubCount = profile.publication_count ?? 0;
  if (pubCount >= 20) { score += 20; badges.push('⭐ Membre actif'); }
  else if (pubCount >= 5) { score += 10; badges.push('📝 Contributeur'); }

  // Signalements reçus (malus)
  const reports = profile.reports_received ?? 0;
  if (reports > 5) score -= 30;
  else if (reports > 2) score -= 15;
  else if (reports > 0) score -= 5;

  score = Math.max(0, Math.min(100, score));

  // Niveau
  const level: TrustScore['level'] =
    score >= 70 ? 'verified' :
    score >= 40 ? 'trusted' :
    score >= 20 ? 'member' : 'new';

  const CONFIG = {
    new:      { label: 'Nouveau',      color: 'text-gray-500',    bg: 'bg-gray-100',    emoji: '🌱' },
    member:   { label: 'Membre',       color: 'text-blue-600',    bg: 'bg-blue-50',     emoji: '👤' },
    trusted:  { label: 'Fiable',       color: 'text-emerald-600', bg: 'bg-emerald-50',  emoji: '✅' },
    verified: { label: 'Certifié',     color: 'text-purple-600',  bg: 'bg-purple-50',   emoji: '🏆' },
  };

  return { score, level, badges, ...CONFIG[level] };
}

// ─── Vérifier si un contenu doit aller en modération ─────────────────────────
export function needsModeration(profile: {
  created_at: string;
  role: string;
  publication_count?: number;
}): boolean {
  // Admins et modérateurs = jamais de modération
  if (['admin', 'moderator'].includes(profile.role)) return false;

  // Nouveaux membres (< 7 jours) ET < 3 publications
  const isNew = isNewMember(profile.created_at);
  const pubCount = profile.publication_count ?? 0;

  return isNew && pubCount < 3;
}

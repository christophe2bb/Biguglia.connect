/**
 * moderation.ts — Système de modération centralisé Biguglia Connect
 *
 * Gère la validation pré-publication, les statuts de modération,
 * les niveaux de confiance auteur et les règles par thème.
 */

// ─── Statuts de modération ────────────────────────────────────────────────────
export type ModerationStatus =
  | 'brouillon'
  | 'en_attente_validation'
  | 'a_corriger'
  | 'refuse'
  | 'publie'
  | 'archive'
  | 'supprime_moderation';

export type ModerationDecision = 'accepter' | 'refuser' | 'demander_correction';

// ─── Types de contenu modérés ─────────────────────────────────────────────────
export type ContentType =
  | 'listing'
  | 'equipment'
  | 'help_request'
  | 'outing'
  | 'event'
  | 'lost_found'
  | 'collection_item'
  | 'association'
  | 'forum_post';

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; emoji: string; table: string }> = {
  listing:         { label: 'Annonce',          emoji: '📦', table: 'listings' },
  equipment:       { label: 'Matériel',          emoji: '🔧', table: 'equipment_items' },
  help_request:    { label: 'Coup de main',      emoji: '🤝', table: 'help_requests' },
  outing:          { label: 'Promenade',         emoji: '🚶', table: 'group_outings' },
  event:           { label: 'Événement',         emoji: '📅', table: 'local_events' },
  lost_found:      { label: 'Perdu / Trouvé',   emoji: '🔍', table: 'lost_found_items' },
  collection_item: { label: 'Collectionneur',    emoji: '🏺', table: 'collection_items' },
  association:     { label: 'Association',       emoji: '🏛️', table: 'associations' },
  forum_post:      { label: 'Forum',             emoji: '💬', table: 'forum_posts' },
};

// ─── Niveaux de confiance auteur ──────────────────────────────────────────────
export type TrustLevel = 'nouveau' | 'surveille' | 'fiable' | 'de_confiance';

export const TRUST_LEVEL_CONFIG: Record<TrustLevel, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  autoPublish: boolean;   // publication directe sans validation
  partialReview: boolean; // validation allégée
}> = {
  nouveau: {
    label: 'Nouveau',
    emoji: '🌱',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    description: 'Nouveau membre — toutes les publications sont validées',
    autoPublish: false,
    partialReview: false,
  },
  surveille: {
    label: 'Surveillé',
    emoji: '⚠️',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    description: 'Membre signalé — suivi renforcé des publications',
    autoPublish: false,
    partialReview: false,
  },
  fiable: {
    label: 'Fiable',
    emoji: '✅',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    description: 'Membre de confiance — validation allégée',
    autoPublish: false,
    partialReview: true,
  },
  de_confiance: {
    label: 'De confiance',
    emoji: '🏆',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    description: 'Membre certifié — publication directe',
    autoPublish: true,
    partialReview: false,
  },
};

// ─── Motifs de refus standardisés ────────────────────────────────────────────
export const REFUSAL_REASONS: { key: string; label: string; severity: 'low' | 'medium' | 'high' }[] = [
  { key: 'contenu_interdit',           label: 'Contenu interdit ou illégal',              severity: 'high' },
  { key: 'arnaque',                    label: 'Suspicion d\'arnaque ou escroquerie',       severity: 'high' },
  { key: 'spam',                       label: 'Spam ou contenu publicitaire',              severity: 'medium' },
  { key: 'doublon',                    label: 'Doublon d\'une publication existante',      severity: 'low' },
  { key: 'categorie_inadaptee',        label: 'Catégorie ou thème inadapté',              severity: 'low' },
  { key: 'commercial_non_autorise',    label: 'Contenu commercial non autorisé',          severity: 'medium' },
  { key: 'propos_injurieux',           label: 'Propos injurieux ou discriminatoires',      severity: 'high' },
  { key: 'manque_informations',        label: 'Informations insuffisantes ou manquantes', severity: 'low' },
  { key: 'incoherence',               label: 'Incohérence ou information erronée',        severity: 'medium' },
  { key: 'annonce_mensongere',         label: 'Annonce mensongère',                       severity: 'high' },
  { key: 'faux_profil',               label: 'Faux profil ou usurpation d\'identité',     severity: 'high' },
  { key: 'hors_zone',                  label: 'Publication hors zone géographique',       severity: 'low' },
];

// ─── Motifs de demande de correction ─────────────────────────────────────────
export const CORRECTION_REASONS: { key: string; label: string }[] = [
  { key: 'titre_vague',                label: 'Titre trop vague ou peu descriptif' },
  { key: 'description_incomplete',     label: 'Description incomplète ou trop courte' },
  { key: 'photos_insuffisantes',       label: 'Photos insuffisantes ou de mauvaise qualité' },
  { key: 'mauvaise_categorie',         label: 'Catégorie incorrecte, veuillez la corriger' },
  { key: 'lieu_imprecis',              label: 'Lieu trop imprécis ou manquant' },
  { key: 'date_manquante',             label: 'Date ou horaire manquant(e)' },
  { key: 'contradictions',             label: 'Contradictions dans le contenu' },
  { key: 'reformulation',             label: 'Reformulation nécessaire pour la clarté' },
  { key: 'contact_externe',            label: 'Coordonnées externes à supprimer (email, tél.)' },
  { key: 'prix_absent',                label: 'Prix ou conditions d\'échange manquants' },
];

// ─── Règles de validation par thème ──────────────────────────────────────────
export interface ValidationRule {
  field: string;
  label: string;
  check: (value: unknown, data?: Record<string, unknown>) => boolean;
  message: string;
  weight: number; // importance 1-3
}

const MIN_TITLE_LEN = 10;
const MIN_DESC_LEN = 30;

export const VALIDATION_RULES: Record<ContentType, ValidationRule[]> = {
  listing: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 3 },
    { field: 'category',    label: 'Catégorie',   check: v => Boolean(v), message: 'Catégorie obligatoire', weight: 2 },
    { field: 'price',       label: 'Prix',        check: v => v !== undefined && v !== null && v !== '', message: 'Prix ou condition d\'échange manquant', weight: 2 },
  ],
  equipment: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 3 },
    { field: 'category',    label: 'Catégorie',   check: v => Boolean(v), message: 'Catégorie obligatoire', weight: 2 },
  ],
  help_request: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 3 },
    { field: 'help_type',   label: 'Type d\'aide', check: v => Boolean(v), message: 'Type d\'aide obligatoire (demande, offre ou échange)', weight: 2 },
    { field: 'category',    label: 'Catégorie',   check: v => Boolean(v), message: 'Catégorie obligatoire', weight: 1 },
  ],
  outing: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 2 },
    { field: 'date',        label: 'Date',        check: v => Boolean(v), message: 'Date de promenade obligatoire', weight: 3 },
    { field: 'location',    label: 'Lieu',        check: v => typeof v === 'string' && v.trim().length > 3, message: 'Lieu de rendez-vous obligatoire', weight: 3 },
  ],
  event: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 2 },
    { field: 'date',        label: 'Date',        check: v => Boolean(v), message: 'Date de l\'événement obligatoire', weight: 3 },
    { field: 'location',    label: 'Lieu',        check: v => typeof v === 'string' && v.trim().length > 3, message: 'Lieu obligatoire', weight: 3 },
  ],
  lost_found: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= 20, message: 'Description trop courte (min 20 caractères)', weight: 3 },
    { field: 'type',        label: 'Type',        check: v => v === 'perdu' || v === 'trouve', message: 'Précisez si l\'objet est perdu ou trouvé', weight: 3 },
    { field: 'location',    label: 'Lieu',        check: v => typeof v === 'string' && v.trim().length > 3, message: 'Lieu approximatif obligatoire', weight: 2 },
  ],
  collection_item: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 2 },
    { field: 'category',    label: 'Catégorie',   check: v => Boolean(v), message: 'Catégorie de collection obligatoire', weight: 2 },
  ],
  association: [
    { field: 'name',        label: 'Nom',         check: v => typeof v === 'string' && v.trim().length >= 5, message: 'Nom trop court (min 5 caractères)', weight: 3 },
    { field: 'description', label: 'Description', check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`, weight: 3 },
    { field: 'category',    label: 'Catégorie',   check: v => Boolean(v), message: 'Catégorie obligatoire', weight: 2 },
  ],
  forum_post: [
    { field: 'title',       label: 'Titre',       check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN, message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`, weight: 3 },
    { field: 'content',     label: 'Contenu',     check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN, message: `Contenu trop court (min ${MIN_DESC_LEN} caractères)`, weight: 3 },
  ],
};

// ─── Mots/expressions suspects ────────────────────────────────────────────────
const SPAM_WORDS = [
  'bitcoin', 'crypto', 'ethereum', 'nft', 'investissement garanti',
  'gagner de l\'argent', 'revenus passifs', 'millionnaire',
  'cliquez ici', 'offre limitée', 'gratuit immédiatement',
  'sans engagement', 'meilleur prix garanti',
  'travail dissimulé', 'sans déclaration', 'au noir',
  'faux papiers', 'document officiel', 'wiring', 'money transfer',
  'western union', 'moneygram', 'escrow', 'paypal friends',
];

const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const URL_REGEX   = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const REPEAT_REGEX = /(.)\1{4,}/g;
const ALL_CAPS_REGEX = /\b[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]{4,}\b/g;

// ─── Types ────────────────────────────────────────────────────────────────────
export type SpamCheckResult = {
  isSpam: boolean;
  score: number;
  reasons: string[];
  level: 'ok' | 'warning' | 'blocked';
};

export type ValidationResult = {
  valid: boolean;
  errors: { field: string; label: string; message: string; weight: number }[];
  warnings: string[];
  completeness: number;  // 0-100
  riskScore: number;     // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldBlock: boolean;
  suggestions: string[];
};

// ─── Vérification anti-spam ───────────────────────────────────────────────────
export function checkSpam(text: string, options?: {
  allowPhone?: boolean;
  allowUrl?: boolean;
  allowEmail?: boolean;
}): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;
  const lower = text.toLowerCase();

  const foundWords = SPAM_WORDS.filter(w => lower.includes(w));
  if (foundWords.length > 0) {
    score += foundWords.length * 20;
    reasons.push(`Mots suspects : ${foundWords.slice(0, 3).join(', ')}`);
  }

  if (!options?.allowPhone && text.match(PHONE_REGEX)) {
    score += 25;
    reasons.push('Numéro de téléphone dans le texte');
  }

  if (!options?.allowUrl && text.match(URL_REGEX)) {
    score += 30;
    reasons.push('Lien externe détecté');
  }

  if (!options?.allowEmail && text.match(EMAIL_REGEX)) {
    score += 20;
    reasons.push('Adresse email dans le texte');
  }

  const repeats = text.match(REPEAT_REGEX);
  if (repeats && repeats.length > 2) { score += 15; reasons.push('Répétitions excessives'); }

  const capsWords = text.match(ALL_CAPS_REGEX);
  if (capsWords && capsWords.length > 5) { score += 10; reasons.push('Trop de majuscules'); }

  if (text.trim().length < 10) { score += 10; reasons.push('Texte trop court'); }

  const level: SpamCheckResult['level'] =
    score >= 50 ? 'blocked' : score >= 25 ? 'warning' : 'ok';

  return { isSpam: score >= 50, score: Math.min(score, 100), reasons, level };
}

// ─── Validation complète pré-publication ─────────────────────────────────────
export function validateContent(
  contentType: ContentType,
  data: Record<string, unknown>,
): ValidationResult {
  const rules = VALIDATION_RULES[contentType] || [];
  const errors: ValidationResult['errors'] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let riskScore = 0;

  // Vérifications des champs obligatoires
  for (const rule of rules) {
    const value = data[rule.field];
    if (!rule.check(value, data)) {
      errors.push({ field: rule.field, label: rule.label, message: rule.message, weight: rule.weight });
      if (rule.weight >= 2) riskScore += rule.weight * 10;
    }
  }

  // Vérification anti-spam sur les champs texte
  const textFields = ['title', 'description', 'content', 'name'];
  for (const field of textFields) {
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

  // Calcul du taux de complétude
  const totalWeight = rules.reduce((s, r) => s + r.weight, 0);
  const errorWeight = errors.reduce((s, e) => s + e.weight, 0);
  const completeness = totalWeight > 0
    ? Math.round(((totalWeight - errorWeight) / totalWeight) * 100)
    : 100;

  const riskLevel: ValidationResult['riskLevel'] =
    riskScore >= 60 ? 'critical' :
    riskScore >= 40 ? 'high' :
    riskScore >= 20 ? 'medium' : 'low';

  const shouldBlock = riskScore >= 60 || errors.some(e => e.weight === 3);

  return {
    valid: errors.length === 0 && riskScore < 60,
    errors,
    warnings,
    completeness,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    shouldBlock,
    suggestions,
  };
}

// ─── Déterminer le statut selon le niveau de confiance ───────────────────────
export function getModerationStatus(
  trustLevel: TrustLevel,
  role: string,
): ModerationStatus {
  if (['admin', 'moderator'].includes(role)) return 'publie';
  const cfg = TRUST_LEVEL_CONFIG[trustLevel];
  if (cfg.autoPublish) return 'publie';
  return 'en_attente_validation';
}

// ─── Calcul du niveau de confiance ───────────────────────────────────────────
export function computeTrustLevel(profile: {
  created_at: string;
  role: string;
  trust_level?: string;
  publication_count?: number;
  reports_received?: number;
}): TrustLevel {
  // Respect du champ explicite si admin l'a fixé
  if (profile.trust_level && ['nouveau', 'surveille', 'fiable', 'de_confiance'].includes(profile.trust_level)) {
    return profile.trust_level as TrustLevel;
  }

  const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
  const pubCount = profile.publication_count ?? 0;
  const reports = profile.reports_received ?? 0;

  if (reports > 3) return 'surveille';
  if (ageDays >= 180 && pubCount >= 10 && reports === 0) return 'de_confiance';
  if (ageDays >= 30 && pubCount >= 3 && reports <= 1) return 'fiable';
  return 'nouveau';
}

// ─── TrustScore (pour affichage) ─────────────────────────────────────────────
export type TrustScore = {
  score: number;
  level: TrustLevel;
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
  trust_level?: string;
}): TrustScore {
  let score = 0;
  const badges: string[] = [];

  const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
  if (ageDays > 365) { score += 30; badges.push('👴 Membre depuis 1 an'); }
  else if (ageDays > 90) { score += 20; badges.push('📅 Membre depuis 3 mois'); }
  else if (ageDays > 30) { score += 10; badges.push('📅 Membre depuis 1 mois'); }
  else { badges.push('🌱 Nouveau membre'); }

  if (profile.avatar_url) { score += 10; badges.push('📷 Photo de profil'); }
  if (profile.phone) { score += 15; badges.push('📞 Téléphone renseigné'); }

  if (['admin', 'moderator'].includes(profile.role)) {
    score += 40; badges.push('🛡️ Équipe Biguglia');
  } else if (profile.role === 'artisan_verified') {
    score += 30; badges.push('✅ Artisan vérifié');
  } else if (profile.role === 'artisan_pending') {
    score += 10;
  }

  const pubCount = profile.publication_count ?? 0;
  if (pubCount >= 20) { score += 20; badges.push('⭐ Membre actif'); }
  else if (pubCount >= 5) { score += 10; badges.push('📝 Contributeur'); }

  const reports = profile.reports_received ?? 0;
  if (reports > 5) score -= 30;
  else if (reports > 2) score -= 15;
  else if (reports > 0) score -= 5;

  score = Math.max(0, Math.min(100, score));
  const level = computeTrustLevel(profile);
  const cfg = TRUST_LEVEL_CONFIG[level];

  return { score, level, badges, label: cfg.label, color: cfg.color, bg: cfg.bg, emoji: cfg.emoji };
}

// ─── Check limite de publications ─────────────────────────────────────────────
export type PublicationLimitResult = {
  allowed: boolean;
  reason?: string;
  count: number;
  limit: number;
};

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

// ─── Vérifier si nouveau membre ───────────────────────────────────────────────
export function isNewMember(createdAt: string): boolean {
  return (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 3600 * 1000;
}

// ─── Détermine si la modération est nécessaire ────────────────────────────────
export function needsModeration(profile: {
  created_at: string;
  role: string;
  publication_count?: number;
  trust_level?: string;
}): boolean {
  if (['admin', 'moderator'].includes(profile.role)) return false;
  const level = computeTrustLevel(profile);
  return !TRUST_LEVEL_CONFIG[level].autoPublish;
}

// ─── Messages utilisateur par étape ──────────────────────────────────────────
export const MODERATION_MESSAGES = {
  submitted: (contentType: string) =>
    `Votre ${contentType} a bien été soumise. Elle est en attente de validation par notre équipe (généralement sous 24h). Vous pouvez suivre son statut depuis votre tableau de bord.`,

  accepted: (contentType: string) =>
    `Votre ${contentType} a été validée et est maintenant visible par tous les résidents. Merci pour votre contribution à Biguglia Connect !`,

  refused: (contentType: string, motive: string) =>
    `Votre ${contentType} n'a pas pu être publiée.\n\nMotif : ${motive}\n\nSi vous pensez qu'il s'agit d'une erreur, vous pouvez soumettre une nouvelle publication en respectant nos règles de la communauté.`,

  correction_requested: (contentType: string, motive: string) =>
    `Votre ${contentType} nécessite quelques corrections avant d'être publiée.\n\nCorrections demandées : ${motive}\n\nModifiez votre publication puis soumettez-la à nouveau pour validation.`,
};

// ─── SQL de migration ─────────────────────────────────────────────────────────
export const MODERATION_SQL = `-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTÈME DE MODÉRATION CENTRALISÉ — Biguglia Connect
-- À exécuter UNE SEULE FOIS dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonne trust_level sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'nouveau'
    CHECK (trust_level IN ('nouveau','surveille','fiable','de_confiance')),
  ADD COLUMN IF NOT EXISTS publication_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_received  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_note   TEXT;

-- 2. Table principale de file de modération
CREATE TABLE IF NOT EXISTS moderation_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type      TEXT NOT NULL
    CHECK (content_type IN ('listing','equipment','help_request','outing','event',
                            'lost_found','collection_item','association','forum_post')),
  content_id        UUID NOT NULL,
  content_title     TEXT,
  content_excerpt   TEXT,
  content_photos    TEXT[],
  author_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_trust      TEXT DEFAULT 'nouveau',
  status            TEXT NOT NULL DEFAULT 'en_attente_validation'
    CHECK (status IN ('brouillon','en_attente_validation','a_corriger',
                      'refuse','publie','archive','supprime_moderation')),
  risk_score        INT DEFAULT 0,
  risk_level        TEXT DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high','critical')),
  completeness      INT DEFAULT 100,
  validation_errors JSONB DEFAULT '[]',
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  decision          TEXT CHECK (decision IN ('accepter','refuser','demander_correction')),
  refusal_reason    TEXT,
  correction_reason TEXT,
  moderator_note    TEXT,
  resubmit_count    INT DEFAULT 0,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table d'historique d'audit
CREATE TABLE IF NOT EXISTS moderation_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id         UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL,
  content_id       UUID NOT NULL,
  author_id        UUID NOT NULL REFERENCES profiles(id),
  action           TEXT NOT NULL,
  old_status       TEXT,
  new_status       TEXT,
  decision         TEXT,
  reason           TEXT,
  moderator_id     UUID REFERENCES profiles(id),
  moderator_note   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_modqueue_status      ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_modqueue_type        ON moderation_queue(content_type);
CREATE INDEX IF NOT EXISTS idx_modqueue_author      ON moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_modqueue_submitted   ON moderation_queue(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_modqueue_risk        ON moderation_queue(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_modhist_queue        ON moderation_history(queue_id);
CREATE INDEX IF NOT EXISTS idx_modhist_content      ON moderation_history(content_id);

-- 5. Trigger updated_at sur moderation_queue
CREATE OR REPLACE FUNCTION update_modqueue_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_modqueue_updated_at ON moderation_queue;
CREATE TRIGGER trg_modqueue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_modqueue_updated_at();

-- 6. Trigger audit automatique dans moderation_history
CREATE OR REPLACE FUNCTION log_moderation_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO moderation_history(queue_id, content_type, content_id, author_id,
      action, old_status, new_status, decision, reason, moderator_id, moderator_note)
    VALUES (NEW.id, NEW.content_type, NEW.content_id, NEW.author_id,
      'status_change', OLD.status, NEW.status, NEW.decision,
      COALESCE(NEW.refusal_reason, NEW.correction_reason), NEW.reviewed_by, NEW.moderator_note);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_moderation ON moderation_queue;
CREATE TRIGGER trg_log_moderation
  AFTER UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION log_moderation_history();

-- 7. Trigger : incrémente publication_count sur profiles
CREATE OR REPLACE FUNCTION increment_publication_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'publie' AND (OLD.status IS NULL OR OLD.status != 'publie') THEN
    UPDATE profiles SET publication_count = COALESCE(publication_count, 0) + 1
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_increment_pub_count ON moderation_queue;
CREATE TRIGGER trg_increment_pub_count
  AFTER INSERT OR UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION increment_publication_count();

-- 8. Ajout colonne moderation_status sur chaque table de contenu
ALTER TABLE listings         ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE equipment_items  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE help_requests    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE group_outings    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE local_events     ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE forum_posts      ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';

-- 9. RLS sur moderation_queue
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Auteur voit ses propres entrées
DROP POLICY IF EXISTS "modq_author_select" ON moderation_queue;
CREATE POLICY "modq_author_select" ON moderation_queue
  FOR SELECT USING (author_id = auth.uid());

-- Modérateurs/admins voient tout
DROP POLICY IF EXISTS "modq_staff_select" ON moderation_queue;
CREATE POLICY "modq_staff_select" ON moderation_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Auteur peut insérer ses propres publications
DROP POLICY IF EXISTS "modq_author_insert" ON moderation_queue;
CREATE POLICY "modq_author_insert" ON moderation_queue
  FOR INSERT WITH CHECK (author_id = auth.uid());

-- Seuls admin/moderator peuvent UPDATE (décisions)
DROP POLICY IF EXISTS "modq_staff_update" ON moderation_queue;
CREATE POLICY "modq_staff_update" ON moderation_queue
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Auteur peut modifier son brouillon ou contenu "a_corriger"
DROP POLICY IF EXISTS "modq_author_update_draft" ON moderation_queue;
CREATE POLICY "modq_author_update_draft" ON moderation_queue
  FOR UPDATE USING (
    author_id = auth.uid()
    AND status IN ('brouillon','a_corriger')
  );

-- 10. RLS sur moderation_history
ALTER TABLE moderation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modhist_staff_select" ON moderation_history;
CREATE POLICY "modhist_staff_select" ON moderation_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS "modhist_staff_insert" ON moderation_history;
CREATE POLICY "modhist_staff_insert" ON moderation_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- 11. Vue KPI modération (pour dashboard admin)
CREATE OR REPLACE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                              AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation') AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')            AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')            AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')        AS correction,
  COUNT(*) FILTER (WHERE status = 'archive')           AS archived,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600)
    FILTER (WHERE reviewed_at IS NOT NULL)             AS avg_review_hours,
  COUNT(*) FILTER (WHERE risk_level IN ('high','critical')) AS high_risk,
  COUNT(*) FILTER (WHERE author_trust = 'nouveau')     AS new_authors,
  COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '24 hours') AS last_24h
FROM moderation_queue;

GRANT SELECT ON moderation_kpi TO authenticated;

COMMENT ON TABLE moderation_queue IS 'File de modération centralisée — toutes publications Biguglia Connect';
COMMENT ON TABLE moderation_history IS 'Audit trail complet des décisions de modération';
`;

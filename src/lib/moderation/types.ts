/**
 * moderation/types.ts
 * Types, enums, labels et motifs standardisés du système de modération.
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
  listing:         { label: 'Annonce',         emoji: '📦', table: 'listings' },
  equipment:       { label: 'Matériel',         emoji: '🔧', table: 'equipment_items' },
  help_request:    { label: 'Coup de main',     emoji: '🤝', table: 'help_requests' },
  outing:          { label: 'Promenade',        emoji: '🚶', table: 'group_outings' },
  event:           { label: 'Événement',        emoji: '📅', table: 'events' },
  lost_found:      { label: 'Perdu / Trouvé',  emoji: '🔍', table: 'lost_found_items' },
  collection_item: { label: 'Collectionneur',   emoji: '🏺', table: 'collection_items' },
  association:     { label: 'Association',      emoji: '🏛️', table: 'associations' },
  forum_post:      { label: 'Forum',            emoji: '💬', table: 'forum_posts' },
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
  autoPublish: boolean;
  partialReview: boolean;
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
  { key: 'contenu_interdit',        label: 'Contenu interdit ou illégal',               severity: 'high' },
  { key: 'arnaque',                 label: "Suspicion d'arnaque ou escroquerie",         severity: 'high' },
  { key: 'spam',                    label: 'Spam ou contenu publicitaire',               severity: 'medium' },
  { key: 'doublon',                 label: "Doublon d'une publication existante",        severity: 'low' },
  { key: 'categorie_inadaptee',     label: 'Catégorie ou thème inadapté',               severity: 'low' },
  { key: 'commercial_non_autorise', label: 'Contenu commercial non autorisé',           severity: 'medium' },
  { key: 'propos_injurieux',        label: 'Propos injurieux ou discriminatoires',       severity: 'high' },
  { key: 'manque_informations',     label: 'Informations insuffisantes ou manquantes',  severity: 'low' },
  { key: 'incoherence',             label: 'Incohérence ou information erronée',         severity: 'medium' },
  { key: 'annonce_mensongere',      label: 'Annonce mensongère',                        severity: 'high' },
  { key: 'faux_profil',             label: "Faux profil ou usurpation d'identité",      severity: 'high' },
  { key: 'hors_zone',               label: 'Publication hors zone géographique',        severity: 'low' },
];

// ─── Motifs de demande de correction ─────────────────────────────────────────
export const CORRECTION_REASONS: { key: string; label: string }[] = [
  { key: 'titre_vague',          label: 'Titre trop vague ou peu descriptif' },
  { key: 'description_incomplete', label: 'Description incomplète ou trop courte' },
  { key: 'photos_insuffisantes', label: 'Photos insuffisantes ou de mauvaise qualité' },
  { key: 'mauvaise_categorie',   label: 'Catégorie incorrecte, veuillez la corriger' },
  { key: 'lieu_imprecis',        label: 'Lieu trop imprécis ou manquant' },
  { key: 'date_manquante',       label: 'Date ou horaire manquant(e)' },
  { key: 'contradictions',       label: 'Contradictions dans le contenu' },
  { key: 'reformulation',        label: 'Reformulation nécessaire pour la clarté' },
  { key: 'contact_externe',      label: 'Coordonnées externes à supprimer (email, tél.)' },
  { key: 'prix_absent',          label: "Prix ou conditions d'échange manquants" },
];

// ─── Types résultats ──────────────────────────────────────────────────────────
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
  completeness: number;   // 0-100
  riskScore: number;      // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldBlock: boolean;
  suggestions: string[];
};

export type TrustScore = {
  score: number;
  level: TrustLevel;
  label: string;
  color: string;
  bg: string;
  emoji: string;
  badges: string[];
};

export type PublicationLimitResult = {
  allowed: boolean;
  reason?: string;
  count: number;
  limit: number;
};

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

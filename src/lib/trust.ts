/**
 * trust.ts — Moteur de confiance & réputation unifié Biguglia Connect
 *
 * Architecture en 4 couches :
 *   A – Contenu source (listing, événement, matériel, etc.)
 *   B – Interaction réelle (trust_interactions)
 *   C – Avis vérifié (reviews)
 *   D – Réputation agrégée (trust_profile_stats + profile_badges)
 *
 * Règles fondamentales :
 *   – Un avis ne peut être laissé qu'après une interaction completed
 *   – reviewer ≠ reviewed (contraint en DB)
 *   – Un seul avis par interaction
 *   – Fenêtre de 30 jours après completion
 */

import { createClient } from '@/lib/supabase/client';

// ─── Types exportés ────────────────────────────────────────────────────────────
export type InteractionSourceType =
  | 'listing' | 'equipment' | 'help_request' | 'lost_found'
  | 'association' | 'outing' | 'collection_item' | 'event'
  | 'promenade' | 'service_request';

export type InteractionStatus =
  | 'requested' | 'pending' | 'accepted' | 'rejected'
  | 'in_progress' | 'done' | 'cancelled' | 'disputed';

export type InteractionType =
  | 'transaction' | 'material_request' | 'help_match'
  | 'participation' | 'contact' | 'service_request';

export type BadgeCode =
  | 'new_member' | 'profile_complete' | 'email_verified' | 'phone_verified'
  | 'active_member' | 'fast_responder' | 'reliable_organizer' | 'reliable_vendor'
  | 'reliable_helper' | 'reliable_borrower' | 'trusted_member' | 'top_rated'
  | 'veteran' | 'admin_validated';

export interface TrustInteraction {
  id: string;
  source_type: InteractionSourceType;
  source_id: string;
  requester_id: string;
  receiver_id: string;
  interaction_type: InteractionType;
  status: InteractionStatus;
  review_unlocked: boolean;
  review_requester_done: boolean;
  review_receiver_done: boolean;
  conversation_id: string | null;
  status_history: Array<{ status: string; changed_at: string; note?: string }>;
  started_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Review {
  id: string;
  interaction_id: string | null;
  source_type: InteractionSourceType;
  source_id: string;
  author_id: string;
  target_user_id: string;
  rating: number;
  dim_communication?: number | null;
  dim_reliability?: number | null;
  dim_punctuality?: number | null;
  dim_quality?: number | null;
  comment?: string | null;
  would_recommend?: boolean | null;
  moderation_status: 'visible' | 'reported' | 'hidden' | 'deleted';
  created_at: string;
  // Joined
  author?: { id: string; full_name: string; avatar_url?: string | null };
  target_user?: { id: string; full_name: string; avatar_url?: string | null };
  tags?: string[];
}

export interface TrustProfileStats {
  profile_id: string;
  interactions_total: number;
  interactions_done: number;
  interactions_cancelled: number;
  interactions_disputed: number;
  reviews_received: number;
  avg_rating: number;
  avg_communication?: number | null;
  avg_reliability?: number | null;
  avg_punctuality?: number | null;
  avg_quality?: number | null;
  recommend_pct?: number | null;
  dist_1: number; dist_2: number; dist_3: number; dist_4: number; dist_5: number;
  trust_score: number;
  last_computed_at: string;
}

export interface ProfileBadge {
  id: string;
  profile_id: string;
  badge_code: BadgeCode;
  awarded_at: string;
  awarded_by: 'system' | 'admin';
}

// ─── Configuration des thèmes ─────────────────────────────────────────────────
export type ThemeConfig = {
  label: string;
  emoji: string;
  interactionType: InteractionType;
  reviewTrigger: string;       // Moment où l'avis est débloqué
  reviewWindow: number;        // Jours après completion
  dimensions: {
    key: 'dim_communication' | 'dim_reliability' | 'dim_punctuality' | 'dim_quality';
    label: string;
    emoji: string;
  }[];
  tags: string[];              // Tags suggérés
  revieweeLabel: string;       // "vendeur", "organisateur", etc.
  reviewerLabel: string;       // "acheteur", "participant", etc.
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
      { key: 'dim_communication', label: 'Communication', emoji: '💬' },
      { key: 'dim_reliability',   label: 'Organisation',  emoji: '📋' },
      { key: 'dim_punctuality',   label: 'Ponctualité',   emoji: '⏱️' },
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

// ─── Badges configuration ──────────────────────────────────────────────────────
export const BADGE_CONFIG: Record<BadgeCode, {
  label: string;
  emoji: string;
  description: string;
  color: string;
  bg: string;
}> = {
  new_member:         { label: 'Nouveau membre',    emoji: '🌱', description: 'Vient de rejoindre la communauté',              color: 'text-gray-600',    bg: 'bg-gray-100' },
  profile_complete:   { label: 'Profil complet',    emoji: '✍️', description: 'A renseigné toutes les infos de profil',        color: 'text-blue-600',    bg: 'bg-blue-50' },
  email_verified:     { label: 'Email vérifié',     emoji: '📧', description: 'Adresse email confirmée',                       color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  phone_verified:     { label: 'Tél. vérifié',      emoji: '📞', description: 'Numéro de téléphone renseigné',                 color: 'text-teal-600',    bg: 'bg-teal-50' },
  active_member:      { label: 'Membre actif',      emoji: '⭐', description: '10+ publications ou interactions',              color: 'text-amber-600',   bg: 'bg-amber-50' },
  fast_responder:     { label: 'Réactif',           emoji: '⚡', description: 'Répond rapidement aux messages',               color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  reliable_organizer: { label: 'Organisateur fiable', emoji: '📋', description: 'Organise des événements ou sorties réussis', color: 'text-purple-600',  bg: 'bg-purple-50' },
  reliable_vendor:    { label: 'Vendeur fiable',    emoji: '🛍️', description: 'Échanges annonces et collections bien notés',  color: 'text-blue-700',    bg: 'bg-blue-50' },
  reliable_helper:    { label: 'Aidant fiable',     emoji: '🤝', description: 'Aide apportée et bien évaluée',               color: 'text-orange-600',  bg: 'bg-orange-50' },
  reliable_borrower:  { label: 'Emprunteur sérieux',emoji: '🔧', description: 'Matériel rendu en bon état',                  color: 'text-teal-600',    bg: 'bg-teal-50' },
  trusted_member:     { label: 'Membre de confiance',emoji: '🛡️', description: 'Score de confiance > 70',                   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  top_rated:          { label: 'Top évalué',        emoji: '🏆', description: 'Moyenne ≥ 4.5 sur 5+ avis',                   color: 'text-yellow-700',  bg: 'bg-yellow-50' },
  veteran:            { label: 'Vétéran',           emoji: '👴', description: 'Membre depuis plus d\'1 an',                  color: 'text-rose-600',    bg: 'bg-rose-50' },
  admin_validated:    { label: 'Validé admin',      emoji: '✅', description: 'Identité vérifiée par l\'équipe',             color: 'text-green-700',   bg: 'bg-green-50' },
};

// ─── Calcul du score de confiance (client-side) ────────────────────────────────
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

export function computeUnifiedTrustScore(params: {
  created_at: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
  stats?: TrustProfileStats | null;
  badges?: BadgeCode[];
}): TrustScoreResult {
  let score = 0;
  const earnedBadges: BadgeCode[] = [];
  const details: Array<{ label: string; value: number; max: number }> = [];

  // Ancienneté (30 pts max)
  const ageDays = (Date.now() - new Date(params.created_at).getTime()) / 86_400_000;
  let ageScore = 0;
  if (ageDays > 365) { ageScore = 30; earnedBadges.push('veteran'); }
  else if (ageDays > 90) ageScore = 20;
  else if (ageDays > 30) ageScore = 10;
  else earnedBadges.push('new_member');
  score += ageScore;
  details.push({ label: 'Ancienneté', value: ageScore, max: 30 });

  // Profil complété (15 pts)
  let profileScore = 0;
  if (params.avatar_url) profileScore += 8;
  if (params.phone) { profileScore += 7; earnedBadges.push('phone_verified'); }
  if (profileScore >= 15) earnedBadges.push('profile_complete');
  score += profileScore;
  details.push({ label: 'Profil', value: profileScore, max: 15 });

  // Rôle admin/vérifié (25 pts)
  let roleScore = 0;
  if (['admin', 'moderator'].includes(params.role)) roleScore = 25;
  else if (params.role === 'artisan_verified') { roleScore = 20; earnedBadges.push('admin_validated'); }
  else if (params.role === 'artisan_pending') roleScore = 5;
  score += roleScore;
  if (roleScore > 0) details.push({ label: 'Statut vérifié', value: roleScore, max: 25 });

  // Avis reçus (30 pts)
  let reviewScore = 0;
  if (params.stats) {
    const { reviews_received, avg_rating, recommend_pct } = params.stats;
    reviewScore = Math.min(15, reviews_received * 2);
    if (avg_rating >= 4.5) { reviewScore += 15; earnedBadges.push('top_rated'); }
    else if (avg_rating >= 4.0) reviewScore += 10;
    else if (avg_rating >= 3.0) reviewScore += 5;
    if (recommend_pct && recommend_pct >= 80) earnedBadges.push('trusted_member');
    // Interactions complétées
    const doneRatio = params.stats.interactions_total > 0
      ? params.stats.interactions_done / params.stats.interactions_total : 0;
    if (doneRatio >= 0.8 && params.stats.interactions_done >= 3) earnedBadges.push('active_member');
  }
  score += reviewScore;
  details.push({ label: 'Avis & interactions', value: reviewScore, max: 30 });

  // Badges externes fournis
  if (params.badges) {
    params.badges.forEach(b => { if (!earnedBadges.includes(b)) earnedBadges.push(b); });
  }

  score = Math.max(0, Math.min(100, score));

  let level: TrustScoreResult['level'];
  let label: string, emoji: string, color: string, bg: string;
  if (score >= 75) {
    level = 'de_confiance'; label = 'De confiance'; emoji = '🛡️';
    color = 'text-purple-700'; bg = 'bg-purple-50';
  } else if (score >= 45) {
    level = 'fiable'; label = 'Fiable'; emoji = '✅';
    color = 'text-emerald-700'; bg = 'bg-emerald-50';
  } else {
    level = 'nouveau'; label = 'Nouveau'; emoji = '🌱';
    color = 'text-gray-600'; bg = 'bg-gray-100';
  }

  return { score, level, label, emoji, color, bg, badges: earnedBadges, details };
}

// ─── API helpers ───────────────────────────────────────────────────────────────

/** Récupère ou crée une interaction entre deux membres pour une source. */
export async function getOrCreateInteraction(params: {
  sourceType: InteractionSourceType;
  sourceId: string;
  receiverId: string;
  interactionType: InteractionType;
}): Promise<{ interaction: TrustInteraction | null; error: string | null; alreadyExists: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { interaction: null, error: 'Non connecté', alreadyExists: false };

  // Check existing
  const { data: existing } = await supabase
    .from('trust_interactions')
    .select('*')
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)
    .eq('requester_id', user.id)
    .maybeSingle();

  if (existing) return { interaction: existing as TrustInteraction, error: null, alreadyExists: true };

  // Create
  const { data, error } = await supabase
    .from('trust_interactions')
    .insert({
      source_type: params.sourceType,
      source_id: params.sourceId,
      requester_id: user.id,
      receiver_id: params.receiverId,
      interaction_type: params.interactionType,
      status: 'requested',
      status_history: [{ status: 'requested', changed_at: new Date().toISOString() }],
    })
    .select()
    .single();

  if (error) return { interaction: null, error: error.message, alreadyExists: false };
  return { interaction: data as TrustInteraction, error: null, alreadyExists: false };
}

/** Avance le statut d'une interaction. */
export async function updateInteractionStatus(
  interactionId: string,
  newStatus: InteractionStatus,
  note?: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('trust_interactions')
    .select('status_history, status')
    .eq('id', interactionId)
    .single();

  if (!existing) return { success: false, error: 'Interaction introuvable' };

  const newHistory = [
    ...(existing.status_history || []),
    { status: newStatus, changed_at: new Date().toISOString(), ...(note ? { note } : {}) },
  ];

  const updates: Record<string, unknown> = { status: newStatus, status_history: newHistory };
  if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString();
  if (newStatus === 'done') {
    updates.completed_at = new Date().toISOString();
    updates.review_unlocked = true;
  }

  const { error } = await supabase
    .from('trust_interactions')
    .update(updates)
    .eq('id', interactionId);

  return { success: !error, error: error?.message || null };
}

/** Soumet un avis. */
export async function submitReview(params: {
  interactionId: string;
  targetUserId: string;
  sourceType: InteractionSourceType;
  sourceId: string;
  rating: number;
  dimCommunication?: number | null;
  dimReliability?: number | null;
  dimPunctuality?: number | null;
  dimQuality?: number | null;
  comment?: string;
  wouldRecommend?: boolean;
  tags?: string[];
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Non connecté' };
  if (user.id === params.targetUserId) return { success: false, error: 'Auto-évaluation interdite' };

  // Verify interaction is done and unlocked
  const { data: interaction } = await supabase
    .from('trust_interactions')
    .select('status, review_unlocked, requester_id, receiver_id')
    .eq('id', params.interactionId)
    .single();

  if (!interaction) return { success: false, error: 'Interaction introuvable' };
  if (!interaction.review_unlocked) return { success: false, error: 'Avis pas encore débloqué' };
  if (interaction.requester_id !== user.id && interaction.receiver_id !== user.id) {
    return { success: false, error: 'Vous n\'êtes pas participant de cette interaction' };
  }

  // Insert review
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      interaction_id: params.interactionId,
      source_type: params.sourceType,
      source_id: params.sourceId,
      author_id: user.id,
      target_user_id: params.targetUserId,
      rating: params.rating,
      dim_communication: params.dimCommunication ?? null,
      dim_reliability: params.dimReliability ?? null,
      dim_punctuality: params.dimPunctuality ?? null,
      dim_quality: params.dimQuality ?? null,
      comment: params.comment || null,
      would_recommend: params.wouldRecommend ?? null,
    })
    .select('id')
    .single();

  if (reviewError) return { success: false, error: reviewError.message };

  // Insert tags
  if (params.tags?.length && review?.id) {
    await supabase.from('review_tags').insert(
      params.tags.map(tag => ({ review_id: review.id, tag }))
    );
  }

  // Mark review done for this user
  const field = interaction.requester_id === user.id
    ? 'review_requester_done'
    : 'review_receiver_done';
  await supabase.from('trust_interactions').update({ [field]: true }).eq('id', params.interactionId);

  // Insert notification to reviewed user
  await supabase.from('notifications').insert({
    user_id: params.targetUserId,
    type: 'new_review',
    title: 'Nouvel avis reçu',
    message: `Vous avez reçu un avis ${params.rating}/5 sur ${THEME_CONFIG[params.sourceType]?.label || params.sourceType}.`,
    link: '/dashboard/avis',
  });

  return { success: true, error: null };
}

/** Récupère les stats de confiance d'un profil. */
export async function fetchTrustStats(profileId: string): Promise<TrustProfileStats | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('trust_profile_stats')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return data as TrustProfileStats | null;
}

/** Récupère les badges d'un profil. */
export async function fetchProfileBadges(profileId: string): Promise<BadgeCode[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profile_badges')
    .select('badge_code')
    .eq('profile_id', profileId);
  return (data || []).map((r: { badge_code: string }) => r.badge_code as BadgeCode);
}

/** Récupère les avis reçus par un profil (visible seulement). */
export async function fetchPublicReviews(
  profileId: string,
  limit = 20,
): Promise<Review[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('reviews')
    .select(`
      id, source_type, source_id, rating,
      dim_communication, dim_reliability, dim_punctuality, dim_quality,
      comment, would_recommend, created_at,
      author:profiles!reviews_author_id_fkey(id, full_name, avatar_url),
      review_tags(tag)
    `)
    .eq('target_user_id', profileId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data || []) as unknown as Review[]).map(r => ({
    ...r,
    tags: (((r as unknown as Record<string, unknown>).review_tags as Array<{ tag: string }>) || []).map(t => t.tag),
  }));
}

/** Vérifie si l'utilisateur courant peut laisser un avis sur cette interaction. */
export async function canLeaveReview(interactionId: string): Promise<{
  canReview: boolean;
  alreadyDone: boolean;
  reason: string | null;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canReview: false, alreadyDone: false, reason: 'Non connecté' };

  const { data: interaction } = await supabase
    .from('trust_interactions')
    .select('status, review_unlocked, review_requester_done, review_receiver_done, requester_id, receiver_id, completed_at')
    .eq('id', interactionId)
    .single();

  if (!interaction) return { canReview: false, alreadyDone: false, reason: 'Interaction introuvable' };
  if (!interaction.review_unlocked) return { canReview: false, alreadyDone: false, reason: 'Interaction non terminée' };

  const isRequester = interaction.requester_id === user.id;
  const isReceiver = interaction.receiver_id === user.id;
  if (!isRequester && !isReceiver) return { canReview: false, alreadyDone: false, reason: 'Non participant' };

  const alreadyDone = isRequester ? interaction.review_requester_done : interaction.review_receiver_done;
  if (alreadyDone) return { canReview: false, alreadyDone: true, reason: 'Avis déjà laissé' };

  // Check time window (30 days)
  if (interaction.completed_at) {
    const daysSince = (Date.now() - new Date(interaction.completed_at).getTime()) / 86_400_000;
    if (daysSince > 30) return { canReview: false, alreadyDone: false, reason: 'Fenêtre de 30 jours expirée' };
  }

  // Check no existing review for this interaction
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('interaction_id', interactionId)
    .eq('author_id', user.id)
    .maybeSingle();

  if (existingReview) return { canReview: false, alreadyDone: true, reason: 'Avis déjà soumis' };

  return { canReview: true, alreadyDone: false, reason: null };
}

/** Awardgit badges automatiquement basé sur les stats. */
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
  if (ageDays > 365 && !existing.has('veteran')) toAward.push('veteran');
  if (ageDays <= 7 && !existing.has('new_member')) toAward.push('new_member');

  // Profil complet
  if (profile.avatar_url && profile.phone && !existing.has('profile_complete')) toAward.push('profile_complete');
  if (profile.phone && !existing.has('phone_verified')) toAward.push('phone_verified');

  // Stats
  if (stats) {
    if (stats.reviews_received >= 5 && stats.avg_rating >= 4.5 && !existing.has('top_rated')) toAward.push('top_rated');
    if (stats.trust_score >= 70 && !existing.has('trusted_member')) toAward.push('trusted_member');
    if (stats.interactions_done >= 10 && !existing.has('active_member')) toAward.push('active_member');
  }

  if (toAward.length === 0) return;

  await supabase.from('profile_badges').upsert(
    toAward.map(badge_code => ({ profile_id: profileId, badge_code, awarded_by: 'system' })),
    { onConflict: 'profile_id,badge_code', ignoreDuplicates: true }
  );
}

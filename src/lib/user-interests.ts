'use client';

/**
 * user-interests.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Système de personnalisation basé sur des signaux utilisateur simples.
 *
 * Philosophie : PAS d'IA, PAS de tracking serveur complexe.
 * On utilise des règles déterministes lisibles :
 *   1. Le rôle Supabase (artisan, resident, admin…)
 *   2. L'historique de navigation localStorage (sections visitées)
 *   3. Le secteur de résidence (home_sector_id sur le profil)
 *
 * Résultat : un UserInterestProfile qui pilote le scoring et l'affichage.
 *
 * Sécurité : tout est local au navigateur, aucune donnée sensible n'est
 * stockée — juste des compteurs de clics sur les rubriques.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Profile, UserRole } from '@/types';
import type { HomeFeedItemType } from '@/services/home/types';

// ─── Clés localStorage ────────────────────────────────────────────────────────

const LS_KEY_VISITS = 'bc_section_visits';     // { emploi: 12, forum: 3, … }
const LS_KEY_PROFILE = 'bc_interest_profile';  // Profil calculé mis en cache
const LS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // TTL 7 jours

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterestCategory =
  | 'emploi'       // Offres et demandes d'emploi
  | 'artisanat'    // Artisans, services, travaux
  | 'communaute'   // Forum, événements, sorties, associations
  | 'entraide'     // Coups de main, perdu/trouvé
  | 'annonces'     // Petites annonces, matériel
  | 'promenades';  // Promenades, nature, loisirs

export interface SectionVisitCounts {
  emploi:     number;
  artisans:   number;
  forum:      number;
  evenements: number;
  annonces:   number;
  materiel:   number;
  promenades: number;
  entraide:   number;
  [key: string]: number;
}

export interface UserInterestProfile {
  /** Catégorie principale déduite (rôle + comportement) */
  primary: InterestCategory;
  /** Catégories secondaires par ordre d'affinité */
  secondary: InterestCategory[];
  /** Pondérations pour les types de feed (multipliées au score standard) */
  feedWeights: Partial<Record<HomeFeedItemType, number>>;
  /** Quick-actions personnalisées pour la Home */
  quickActions: QuickAction[];
  /** Phrase de salutation personnalisée */
  greeting: string;
  /** Badge de profil affiché dans la bannière */
  badge: string;
  /** Couleur accent du profil (classe Tailwind) */
  accentColor: string;
  /** Source du profil pour debug */
  source: 'role' | 'behavior' | 'mixed';
  /** Timestamp de calcul */
  computedAt: number;
}

export interface QuickAction {
  label: string;
  emoji: string;
  href: string;
  highlight?: boolean; // Mis en avant visuellement
}

// ─── Mapping rôle → profil de base ───────────────────────────────────────────

const ROLE_PROFILES: Record<UserRole, Pick<UserInterestProfile, 'primary' | 'secondary' | 'feedWeights' | 'badge' | 'accentColor'>> = {
  artisan_verified: {
    primary: 'artisanat',
    secondary: ['emploi', 'annonces', 'communaute'],
    feedWeights: {
      job_offer:    1.6,  // Très pertinent : missions potentielles
      listing:      1.3,  // Matériaux, outils
      help_request: 1.2,  // Missions / coups de main pro
    },
    badge: '🔵 Artisan vérifié',
    accentColor: 'text-brand-600',
  },
  artisan_pending: {
    primary: 'artisanat',
    secondary: ['emploi', 'communaute'],
    feedWeights: {
      job_offer:    1.4,
      listing:      1.2,
    },
    badge: '⏳ Validation en cours',
    accentColor: 'text-amber-600',
  },
  resident: {
    primary: 'communaute',
    secondary: ['entraide', 'annonces', 'promenades'],
    feedWeights: {
      event:        1.3,
      help_request: 1.2,
      forum_topic:  1.2,
      outing:       1.2,
    },
    badge: '🏡 Habitant',
    accentColor: 'text-sky-600',
  },
  moderator: {
    primary: 'communaute',
    secondary: ['entraide', 'emploi', 'artisanat'],
    feedWeights: {
      forum_topic:  1.4,
      help_request: 1.3,
    },
    badge: '🛡️ Modérateur',
    accentColor: 'text-violet-600',
  },
  admin: {
    primary: 'communaute',
    secondary: ['emploi', 'artisanat', 'entraide'],
    feedWeights: {},
    badge: '⚙️ Administrateur',
    accentColor: 'text-rose-600',
  },
};

// ─── Quick-actions par profil ─────────────────────────────────────────────────

function buildQuickActions(primary: InterestCategory, role: UserRole): QuickAction[] {
  // Actions communes à tous
  const base: QuickAction[] = [
    { label: 'Recherche', emoji: '🔍', href: '/recherche' },
  ];

  const byProfile: Record<InterestCategory, QuickAction[]> = {
    artisanat: [
      { label: 'Mon profil pro', emoji: '🔧', href: '/dashboard/artisan', highlight: true },
      { label: 'Offres d\'emploi', emoji: '💼', href: '/emploi/offres', highlight: true },
      { label: 'Mes avis', emoji: '⭐', href: '/dashboard/avis' },
      { label: 'Mes stats', emoji: '📊', href: '/dashboard/artisan' },
    ],
    emploi: [
      { label: 'Offres d\'emploi', emoji: '💼', href: '/emploi/offres', highlight: true },
      { label: 'Déposer CV', emoji: '📄', href: '/emploi/demandes/publier', highlight: true },
      { label: 'Annonces', emoji: '📦', href: '/annonces' },
    ],
    communaute: [
      { label: 'Forum', emoji: '💬', href: '/forum', highlight: true },
      { label: 'Événements', emoji: '🎉', href: '/evenements', highlight: true },
      { label: 'Promenades', emoji: '🌿', href: '/promenades' },
      { label: 'Associations', emoji: '🤝', href: '/associations' },
    ],
    entraide: [
      { label: 'Coups de main', emoji: '🤝', href: '/coups-de-main', highlight: true },
      { label: 'Perdu/Trouvé', emoji: '🔍', href: '/perdu-trouve', highlight: true },
      { label: 'Forum', emoji: '💬', href: '/forum' },
    ],
    annonces: [
      { label: 'Annonces', emoji: '📦', href: '/annonces', highlight: true },
      { label: 'Matériel', emoji: '🛠️', href: '/materiel', highlight: true },
      { label: 'Publier', emoji: '➕', href: '/annonces/nouvelle' },
    ],
    promenades: [
      { label: 'Promenades', emoji: '🌿', href: '/promenades', highlight: true },
      { label: 'Sorties', emoji: '🥾', href: '/promenades', highlight: true },
      { label: 'Événements', emoji: '🎉', href: '/evenements' },
    ],
  };

  // Ajout contexte admin/modérateur
  if (role === 'admin' || role === 'moderator') {
    base.unshift({ label: 'Administration', emoji: '⚙️', href: '/admin', highlight: true });
  }

  return [...(byProfile[primary] ?? []), ...base].slice(0, 5);
}

// ─── Salutations contextuelles ────────────────────────────────────────────────

function buildGreeting(profile: Profile, primary: InterestCategory): string {
  const firstName = profile.full_name?.split(' ')[0] ?? 'vous';
  const hour = new Date().getHours();

  const timeGreet =
    hour < 6  ? 'Bonne nuit' :
    hour < 12 ? 'Bonjour' :
    hour < 18 ? 'Bonjour' :
                'Bonsoir';

  const contextual: Record<InterestCategory, string[]> = {
    artisanat: [
      `${timeGreet} ${firstName} ! Nouvelles missions disponibles.`,
      `${timeGreet} ${firstName} ! Des clients cherchent vos compétences.`,
      `${timeGreet} ${firstName} ! Votre profil est actif.`,
    ],
    emploi: [
      `${timeGreet} ${firstName} ! De nouvelles opportunités locales.`,
      `${timeGreet} ${firstName} ! Le marché local recrute.`,
    ],
    communaute: [
      `${timeGreet} ${firstName} ! La communauté est active.`,
      `${timeGreet} ${firstName} ! Il se passe des choses à Biguglia.`,
      `${timeGreet} ${firstName} ! Voici ce que font vos voisins.`,
    ],
    entraide: [
      `${timeGreet} ${firstName} ! Des voisins ont besoin d'aide.`,
      `${timeGreet} ${firstName} ! L'entraide locale est vivante.`,
    ],
    annonces: [
      `${timeGreet} ${firstName} ! De nouvelles annonces dans votre zone.`,
      `${timeGreet} ${firstName} ! Des bonnes affaires locales.`,
    ],
    promenades: [
      `${timeGreet} ${firstName} ! De belles sorties organisées.`,
      `${timeGreet} ${firstName} ! La nature corse vous attend.`,
    ],
  };

  const pool = contextual[primary] ?? [`${timeGreet} ${firstName} !`];
  // Rotation déterministe basée sur le jour de la semaine
  return pool[new Date().getDay() % pool.length];
}

// ─── Lecture/écriture localStorage ───────────────────────────────────────────

export function trackSectionVisit(section: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY_VISITS);
    const counts: SectionVisitCounts = raw ? JSON.parse(raw) : {};
    counts[section] = (counts[section] || 0) + 1;
    localStorage.setItem(LS_KEY_VISITS, JSON.stringify(counts));
    // Invalider le cache du profil calculé
    localStorage.removeItem(LS_KEY_PROFILE);
  } catch {
    // localStorage indisponible (SSR, private browsing) — silencieux
  }
}

function getVisitCounts(): SectionVisitCounts {
  if (typeof window === 'undefined') return {} as SectionVisitCounts;
  try {
    const raw = localStorage.getItem(LS_KEY_VISITS);
    return raw ? JSON.parse(raw) : {} as SectionVisitCounts;
  } catch {
    return {} as SectionVisitCounts;
  }
}

// ─── Calcul du profil comportemental ─────────────────────────────────────────

function computeBehavioralPrimary(visits: SectionVisitCounts): InterestCategory | null {
  const mapping: Record<string, InterestCategory> = {
    emploi: 'emploi', 'emploi/offres': 'emploi', 'emploi/demandes': 'emploi',
    artisans: 'artisanat',
    forum: 'communaute',
    evenements: 'communaute',
    associations: 'communaute',
    promenades: 'promenades',
    annonces: 'annonces',
    materiel: 'annonces',
    'coups-de-main': 'entraide',
    'perdu-trouve': 'entraide',
  };

  // Agréger les visites par catégorie d'intérêt
  const scores: Record<InterestCategory, number> = {
    emploi: 0, artisanat: 0, communaute: 0,
    entraide: 0, annonces: 0, promenades: 0,
  };

  for (const [section, count] of Object.entries(visits)) {
    const cat = mapping[section];
    if (cat) scores[cat] += count;
  }

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  if (total < 3) return null; // Pas assez de données comportementales

  const best = (Object.entries(scores) as [InterestCategory, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return best[1] > 0 ? best[0] : null;
}

// ─── API publique principale ──────────────────────────────────────────────────

/**
 * Calcule le profil d'intérêt de l'utilisateur.
 * Fusionne rôle + comportement. Le comportement prend le dessus après 5 visites.
 */
export function computeUserInterestProfile(profile: Profile): UserInterestProfile {
  // Cache 7 jours
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LS_KEY_PROFILE);
      if (cached) {
        const p: UserInterestProfile = JSON.parse(cached);
        if (Date.now() - p.computedAt < LS_MAX_AGE_MS) return p;
      }
    } catch { /* silencieux */ }
  }

  const roleBase = ROLE_PROFILES[profile.role] ?? ROLE_PROFILES.resident;
  const visits = getVisitCounts();
  const behavioralPrimary = computeBehavioralPrimary(visits);

  // Décision finale : comportement prime sur rôle si suffisamment de données
  const totalVisits = Object.values(visits).reduce((s, v) => s + v, 0);
  const primary: InterestCategory =
    (behavioralPrimary && totalVisits >= 5)
      ? behavioralPrimary
      : roleBase.primary;

  // Pondérations feed : fusion rôle + boosts comportementaux
  const feedWeights: Partial<Record<HomeFeedItemType, number>> = { ...roleBase.feedWeights };

  // Boosts comportementaux supplémentaires
  if ((visits.emploi ?? 0) + (visits['emploi/offres'] ?? 0) > 3) {
    feedWeights.job_offer  = Math.max(feedWeights.job_offer  ?? 1, 1.5);
    feedWeights.job_demand = Math.max(feedWeights.job_demand ?? 1, 1.3);
  }
  if ((visits.forum ?? 0) > 3) {
    feedWeights.forum_topic = Math.max(feedWeights.forum_topic ?? 1, 1.4);
  }
  if ((visits.evenements ?? 0) > 3) {
    feedWeights.event = Math.max(feedWeights.event ?? 1, 1.4);
  }
  if ((visits['coups-de-main'] ?? 0) > 2) {
    feedWeights.help_request = Math.max(feedWeights.help_request ?? 1, 1.4);
  }

  const source: UserInterestProfile['source'] =
    behavioralPrimary && totalVisits >= 5
      ? primary !== roleBase.primary ? 'behavior' : 'mixed'
      : 'role';

  const result: UserInterestProfile = {
    primary,
    secondary: roleBase.secondary,
    feedWeights,
    quickActions: buildQuickActions(primary, profile.role),
    greeting: buildGreeting(profile, primary),
    badge: roleBase.badge,
    accentColor: roleBase.accentColor,
    source,
    computedAt: Date.now(),
  };

  // Mise en cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(result));
    } catch { /* silencieux */ }
  }

  return result;
}

/**
 * Version légère pour les utilisateurs non connectés.
 * Profil générique basé sur l'heure et les visites.
 */
export function computeGuestProfile(): Pick<UserInterestProfile, 'quickActions' | 'greeting' | 'badge' | 'accentColor'> {
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  const visits = getVisitCounts();
  const totalVisits = Object.values(visits).reduce((s, v) => s + v, 0);

  // Si le visiteur a un historique, adapter les CTA
  const hasEmploiHistory = ((visits.emploi ?? 0) + (visits['emploi/offres'] ?? 0)) > 2;
  const hasCommunityHistory = ((visits.forum ?? 0) + (visits.evenements ?? 0)) > 2;

  const quickActions: QuickAction[] = hasEmploiHistory
    ? [
        { label: 'Offres d\'emploi', emoji: '💼', href: '/emploi/offres', highlight: true },
        { label: 'Artisans', emoji: '🔧', href: '/artisans' },
        { label: 'Annonces', emoji: '📦', href: '/annonces' },
        { label: 'Forum', emoji: '💬', href: '/forum' },
        { label: 'S\'inscrire', emoji: '🚀', href: '/inscription', highlight: true },
      ]
    : hasCommunityHistory
    ? [
        { label: 'Forum', emoji: '💬', href: '/forum', highlight: true },
        { label: 'Événements', emoji: '🎉', href: '/evenements', highlight: true },
        { label: 'Artisans', emoji: '🔧', href: '/artisans' },
        { label: 'S\'inscrire', emoji: '🚀', href: '/inscription', highlight: true },
      ]
    : [
        { label: 'Artisans', emoji: '🔧', href: '/artisans', highlight: true },
        { label: 'Annonces', emoji: '📦', href: '/annonces' },
        { label: 'Forum', emoji: '💬', href: '/forum' },
        { label: 'Emploi', emoji: '💼', href: '/emploi/offres' },
        { label: 'S\'inscrire', emoji: '🚀', href: '/inscription', highlight: true },
      ];

  const greeting = totalVisits > 5
    ? `${timeGreet} ! Vous connaissez déjà bien Biguglia Connect.`
    : `${timeGreet} ! Bienvenue à Biguglia Connect.`;

  return {
    quickActions,
    greeting,
    badge: '👋 Visiteur',
    accentColor: 'text-gray-600',
  };
}

/**
 * Retourne les poids du feed pour un profil (ou des poids neutres si non connecté).
 */
export function getFeedWeights(interestProfile: UserInterestProfile | null): Partial<Record<HomeFeedItemType, number>> {
  return interestProfile?.feedWeights ?? {};
}

/**
 * Tracker de visite à appeler dans les pages listées (côté client).
 * Usage : useEffect(() => { trackSectionVisit('emploi'); }, []);
 */
export { trackSectionVisit as trackVisit };

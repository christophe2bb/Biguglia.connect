/**
 * events.ts — Librairie métier pour le module Événements
 * Biguglia Connect
 *
 * Statuts français, transitions autorisées, configuration UI, SQL migration
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus =
  | 'a_venir'
  | 'complet'
  | 'reporte'
  | 'annule'
  | 'passe'
  | 'archive';

export type EventParticipantStatus =
  | 'inscrit'
  | 'confirme'
  | 'annule'
  | 'present'
  | 'absent'
  | 'liste_attente';

export interface EventStatusConfig {
  label: string;
  description: string;
  color: string;        // Tailwind text color
  bg: string;           // Tailwind bg color
  border: string;       // Tailwind border color
  badgeBg: string;      // badge background
  badgeText: string;    // badge text color
  dotColor: string;     // dot indicator color
  icon: string;         // emoji icon
  canRegister: boolean; // inscriptions possibles
  priority: number;     // tri
}

export interface EventParticipantStatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

export interface EventStatusTransition {
  from: EventStatus;
  to: EventStatus;
  label: string;
  description: string;
  requiresReason?: boolean;
  adminOnly?: boolean;
}

// ─── Catégories d'événements ─────────────────────────────────────────────────

export type EventCategory =
  | 'concert'
  | 'fete_locale'
  | 'marche_foire'
  | 'vide_grenier'
  | 'rencontre_asso'
  | 'atelier'
  | 'sortie_famille'
  | 'activite_enfant'
  | 'sport'
  | 'reunion_publique'
  | 'solidaire'
  | 'autres';

export interface EventCategoryConfig {
  id: EventCategory;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

export const EVENT_CATEGORY_CONFIG: Record<EventCategory, EventCategoryConfig> = {
  concert: {
    id: 'concert',
    label: 'Concert & spectacle',
    icon: '🎵',
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  fete_locale: {
    id: 'fete_locale',
    label: 'Fête locale',
    icon: '🎉',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  marche_foire: {
    id: 'marche_foire',
    label: 'Marché & foire',
    icon: '🛒',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  vide_grenier: {
    id: 'vide_grenier',
    label: 'Vide-grenier',
    icon: '📦',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  rencontre_asso: {
    id: 'rencontre_asso',
    label: 'Rencontre associative',
    icon: '🤝',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  atelier: {
    id: 'atelier',
    label: 'Atelier & formation',
    icon: '🎨',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  sortie_famille: {
    id: 'sortie_famille',
    label: 'Sortie famille',
    icon: '👨‍👩‍👧‍👦',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  activite_enfant: {
    id: 'activite_enfant',
    label: 'Activité enfant',
    icon: '🧸',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  sport: {
    id: 'sport',
    label: 'Sport & activité',
    icon: '⚽',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  reunion_publique: {
    id: 'reunion_publique',
    label: 'Réunion publique',
    icon: '🏛️',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  solidaire: {
    id: 'solidaire',
    label: 'Action solidaire',
    icon: '💚',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  autres: {
    id: 'autres',
    label: 'Autres',
    icon: '📌',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

export const EVENT_CATEGORIES_LIST: EventCategoryConfig[] = Object.values(EVENT_CATEGORY_CONFIG);

export function getEventCategory(id: string): EventCategoryConfig {
  return EVENT_CATEGORY_CONFIG[id as EventCategory] ?? EVENT_CATEGORY_CONFIG.autres;
}

// ─── Configuration des statuts ────────────────────────────────────────────────

export const EVENT_STATUS_CONFIG: Record<EventStatus, EventStatusConfig> = {
  a_venir: {
    label: 'À venir',
    description: 'Événement confirmé, inscriptions ouvertes',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: '🟢',
    canRegister: true,
    priority: 1,
  },
  complet: {
    label: 'Complet',
    description: 'Capacité maximale atteinte',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
    icon: '🟡',
    canRegister: false,
    priority: 2,
  },
  reporte: {
    label: 'Reporté',
    description: 'Événement reporté à une nouvelle date',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-800',
    dotColor: 'bg-violet-500',
    icon: '🔵',
    canRegister: false,
    priority: 3,
  },
  annule: {
    label: 'Annulé',
    description: 'Événement définitivement annulé',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    dotColor: 'bg-red-500',
    icon: '🔴',
    canRegister: false,
    priority: 4,
  },
  passe: {
    label: 'Passé',
    description: "L'événement a eu lieu",
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    dotColor: 'bg-slate-400',
    icon: '⚪',
    canRegister: false,
    priority: 5,
  },
  archive: {
    label: 'Archivé',
    description: 'Archivé, masqué des flux actifs',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    dotColor: 'bg-gray-400',
    icon: '⬜',
    canRegister: false,
    priority: 6,
  },
};

// ─── Configuration des statuts participants ───────────────────────────────────

export const EVENT_PARTICIPANT_STATUS_CONFIG: Record<EventParticipantStatus, EventParticipantStatusConfig> = {
  inscrit: {
    label: 'Inscrit',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: '✅',
  },
  confirme: {
    label: 'Confirmé',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '🔵',
  },
  annule: {
    label: 'Désisté',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '❌',
  },
  present: {
    label: 'Présent',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '👍',
  },
  absent: {
    label: 'Absent',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: '❓',
  },
  liste_attente: {
    label: "Liste d'attente",
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '⏳',
  },
};

// ─── Transitions autorisées ───────────────────────────────────────────────────

export const EVENT_STATUS_TRANSITIONS: EventStatusTransition[] = [
  // a_venir → complet (auto quand capacité atteinte)
  { from: 'a_venir', to: 'complet', label: 'Marquer complet', description: 'Capacité atteinte, fermer les inscriptions' },
  // a_venir → reporte
  { from: 'a_venir', to: 'reporte', label: 'Reporter', description: 'Nouveau date à définir', requiresReason: true },
  // a_venir → annule
  { from: 'a_venir', to: 'annule', label: 'Annuler', description: 'Annuler définitivement', requiresReason: true },
  // a_venir → passe (auto ou manuel)
  { from: 'a_venir', to: 'passe', label: 'Marquer passé', description: "L'événement a eu lieu" },
  // complet → a_venir (si place se libère)
  { from: 'complet', to: 'a_venir', label: 'Rouvrir inscriptions', description: 'Une place s\'est libérée' },
  // complet → reporte
  { from: 'complet', to: 'reporte', label: 'Reporter', description: 'Reporter même si complet', requiresReason: true },
  // complet → annule
  { from: 'complet', to: 'annule', label: 'Annuler', description: 'Annuler définitivement', requiresReason: true },
  // complet → passe
  { from: 'complet', to: 'passe', label: 'Marquer passé', description: "L'événement a eu lieu" },
  // reporte → a_venir (nouvelle date définie)
  { from: 'reporte', to: 'a_venir', label: 'Reprogrammer', description: 'Nouvelle date définie, réouvrir' },
  // reporte → annule
  { from: 'reporte', to: 'annule', label: 'Annuler', description: 'Finalement annuler', requiresReason: true },
  // passe → archive
  { from: 'passe', to: 'archive', label: 'Archiver', description: 'Déplacer vers les archives' },
  // annule → archive
  { from: 'annule', to: 'archive', label: 'Archiver', description: 'Déplacer vers les archives' },
];

// Transitions interditès (explicitement)
// passe → a_venir ❌
// annule → a_venir ❌
// archive → tout ❌

export function getAllowedTransitions(status: EventStatus): EventStatusTransition[] {
  return EVENT_STATUS_TRANSITIONS.filter(t => t.from === status);
}

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return EVENT_STATUS_TRANSITIONS.some(t => t.from === from && t.to === to);
}

// ─── Règles métier ────────────────────────────────────────────────────────────

/**
 * Retourne le statut effectif d'un événement (en tenant compte de la date et la capacité)
 */
export function resolveEventStatus(
  status: string,
  eventDate: string | null | undefined,
  participantsCount: number,
  capacity: number | null,
  isUnlimited: boolean,
): EventStatus {
  // Statuts définitifs — on ne les override pas
  if (status === 'annule') return 'annule';
  if (status === 'archive') return 'archive';
  if (status === 'reporte') return 'reporte';

  // Si date passée → passe (sauf annulé/archivé/reporté)
  if (eventDate) {
    const d = new Date(eventDate + 'T23:59:59');
    if (d < new Date()) {
      if (status === 'passe' || status === 'complet' || status === 'a_venir') return 'passe';
    }
  }

  // Si capacity atteinte → complet (sauf statuts définitifs)
  if (!isUnlimited && capacity !== null && participantsCount >= capacity) {
    return 'complet';
  }

  // Statuts déjà normalisés
  if (status === 'a_venir' || status === 'complet' || status === 'passe') {
    return status as EventStatus;
  }

  // Legacy mapping (ancien schéma)
  if (status === 'active' || status === 'publie' || status === 'brouillon' || status === 'open') return 'a_venir';
  if (status === 'cancelled' || status === 'annulee' || status === 'canceled') return 'annule';
  if (status === 'completed' || status === 'done' || status === 'terminee') return 'passe';
  if (status === 'archived' || status === 'archivee') return 'archive';
  if (status === 'full' || status === 'complete') return 'complet';
  if (status === 'postponed') return 'reporte';

  // Fallback sécurisé
  return 'a_venir';
}

/**
 * Calcule le nombre de places restantes
 */
export function getRemainingPlaces(
  capacity: number | null,
  isUnlimited: boolean,
  participantsCount: number,
): number | null {
  if (isUnlimited || capacity === null) return null;
  return Math.max(0, capacity - participantsCount);
}

/**
 * Vérifie si un utilisateur peut s'inscrire
 */
export function canUserRegister(
  eventStatus: EventStatus,
  registrationOpen: boolean,
  eventDate: string | null | undefined,
  remaining: number | null,
  isUnlimited: boolean,
): { allowed: boolean; reason?: string } {
  if (eventStatus === 'annule') return { allowed: false, reason: 'Événement annulé' };
  if (eventStatus === 'archive') return { allowed: false, reason: 'Événement archivé' };
  if (eventStatus === 'passe') return { allowed: false, reason: 'Événement terminé' };
  if (eventStatus === 'reporte') return { allowed: false, reason: 'Événement reporté' };
  if (!registrationOpen) return { allowed: false, reason: 'Inscriptions fermées' };
  if (!isUnlimited && remaining !== null && remaining <= 0) {
    return { allowed: false, reason: 'Événement complet' };
  }
  if (eventDate) {
    const d = new Date(eventDate + 'T23:59:59');
    if (d < new Date()) return { allowed: false, reason: 'Date dépassée' };
  }
  return { allowed: true };
}

// ─── Formatage ────────────────────────────────────────────────────────────────

export function formatEventDate(dateStr: string, withWeekday = true): string {
  const d = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = withWeekday
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  const s = d.toLocaleDateString('fr-FR', options);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatEventTime(time: string): string {
  return time ? time.substring(0, 5) : '';
}

export function daysUntilEvent(dateStr: string): number | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  return diff;
}

export function daysUntilLabel(dateStr: string): string | null {
  const diff = daysUntilEvent(dateStr);
  if (diff === null) return null;
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return 'Demain';
  if (diff <= 7) return `Dans ${diff} jours`;
  return null;
}

// ─── SQL Correctif urgent (à exécuter EN PREMIER si erreur de contrainte) ─────

export const EVENT_FIX_SQL = `-- ============================================================
-- ⚠️  CORRECTIF URGENT — local_events contrainte status + colonnes manquantes
-- Exécutez CE SCRIPT EN PREMIER si vous obtenez l'erreur :
--   "violates check constraint local_events_status_check"
--   "column e.capacity does not exist"
-- ============================================================

-- 1. Supprimer l'ancienne contrainte restrictive
DO $$
BEGIN
  -- Toutes les variantes possibles du nom de la contrainte
  ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
  ALTER TABLE local_events DROP CONSTRAINT IF EXISTS events_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 2. Ajouter les colonnes manquantes sur local_events (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='capacity') THEN
    ALTER TABLE local_events ADD COLUMN capacity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='is_unlimited') THEN
    ALTER TABLE local_events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='registration_open') THEN
    ALTER TABLE local_events ADD COLUMN registration_open BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='price_type') THEN
    ALTER TABLE local_events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='cancel_reason') THEN
    ALTER TABLE local_events ADD COLUMN cancel_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='postpone_reason') THEN
    ALTER TABLE local_events ADD COLUMN postpone_reason TEXT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 3. Migrer les anciens statuts legacy → statuts français
UPDATE local_events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
UPDATE local_events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
UPDATE local_events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
UPDATE local_events SET status = 'archive' WHERE status IN ('archived','archivee');
UPDATE local_events SET status = 'complet' WHERE status IN ('full','complete');
-- Tout statut non reconnu → a_venir
UPDATE local_events SET status = 'a_venir'
  WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');

-- 4. Remettre une contrainte large qui accepte TOUS les statuts (anciens + nouveaux)
DO $$
BEGIN
  ALTER TABLE local_events ADD CONSTRAINT local_events_status_check
    CHECK (status IN (
      'active','cancelled','completed','done','archived','full',
      'a_venir','complet','reporte','annule','passe','archive',
      'publie','brouillon'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ✅ Correctif appliqué — vous pouvez maintenant créer des événements
-- et exécuter le script de migration complet (EVENT_LIFECYCLE_SQL)
`;

// ─── SQL Migration complète ───────────────────────────────────────────────────

export const EVENT_LIFECYCLE_SQL = `-- ============================================================
-- ÉVÉNEMENTS — Migration cycle de vie complet
-- Biguglia Connect — À exécuter dans Supabase SQL Editor
-- IMPORTANT : Si vous avez l'erreur "local_events_status_check",
-- exécutez d'abord le script CORRECTIF (bloc rouge ci-dessus).
-- ============================================================

-- 0. Correctif préventif : supprimer toutes les anciennes contraintes status
DO $$
BEGIN
  ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
  ALTER TABLE local_events DROP CONSTRAINT IF EXISTS events_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 0b. Migrer les statuts legacy AVANT le renommage (idempotent)
UPDATE local_events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
UPDATE local_events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
UPDATE local_events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
UPDATE local_events SET status = 'archive' WHERE status IN ('archived','archivee','archive');
UPDATE local_events SET status = 'complet' WHERE status IN ('full','complete');
-- Tout statut non reconnu → a_venir par défaut
UPDATE local_events SET status = 'a_venir' 
  WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');

-- 1. Renommer local_events → events (ou créer si inexistant)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_events') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    ALTER TABLE local_events RENAME TO events;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    CREATE TABLE events (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      title             TEXT NOT NULL,
      subtitle          TEXT DEFAULT '',
      description       TEXT DEFAULT '',
      category          TEXT NOT NULL DEFAULT 'autres',
      event_date        DATE NOT NULL,
      event_end_date    DATE,
      start_time        TIME DEFAULT '18:00',
      end_time          TIME,
      location          TEXT DEFAULT 'Biguglia',
      location_area     TEXT DEFAULT '',
      location_city     TEXT DEFAULT 'Biguglia',
      location_detail   TEXT DEFAULT '',
      organizer_name    TEXT DEFAULT '',
      price_type        TEXT DEFAULT 'gratuit' CHECK (price_type IN ('gratuit','payant','libre')),
      price_amount      NUMERIC(10,2),
      capacity          INTEGER,
      is_unlimited      BOOLEAN DEFAULT false,
      status            TEXT DEFAULT 'a_venir' CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive')),
      registration_open BOOLEAN DEFAULT true,
      cover_photo_url   TEXT,
      tags              TEXT[] DEFAULT '{}',
      is_official       BOOLEAN DEFAULT false,
      report_reason     TEXT,
      cancel_reason     TEXT,
      postpone_reason   TEXT,
      original_event_date DATE,
      accessibility     TEXT DEFAULT '',
      contact_info      TEXT DEFAULT '',
      external_link     TEXT DEFAULT '',
      target_audience   TEXT DEFAULT '',
      created_at        TIMESTAMPTZ DEFAULT now(),
      updated_at        TIMESTAMPTZ DEFAULT now(),
      archived_at       TIMESTAMPTZ
    );
  END IF;
END$$;

-- 2. Ajouter les colonnes manquantes sur events (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='subtitle') THEN
    ALTER TABLE events ADD COLUMN subtitle TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_end_date') THEN
    ALTER TABLE events ADD COLUMN event_end_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_time') THEN
    ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '18:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_time') THEN
    ALTER TABLE events ADD COLUMN end_time TIME;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_area') THEN
    ALTER TABLE events ADD COLUMN location_area TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_city') THEN
    ALTER TABLE events ADD COLUMN location_city TEXT DEFAULT 'Biguglia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_detail') THEN
    ALTER TABLE events ADD COLUMN location_detail TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='price_type') THEN
    ALTER TABLE events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_unlimited') THEN
    ALTER TABLE events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_open') THEN
    ALTER TABLE events ADD COLUMN registration_open BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cover_photo_url') THEN
    ALTER TABLE events ADD COLUMN cover_photo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cancel_reason') THEN
    ALTER TABLE events ADD COLUMN cancel_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='postpone_reason') THEN
    ALTER TABLE events ADD COLUMN postpone_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='original_event_date') THEN
    ALTER TABLE events ADD COLUMN original_event_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='accessibility') THEN
    ALTER TABLE events ADD COLUMN accessibility TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='contact_info') THEN
    ALTER TABLE events ADD COLUMN contact_info TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='external_link') THEN
    ALTER TABLE events ADD COLUMN external_link TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='target_audience') THEN
    ALTER TABLE events ADD COLUMN target_audience TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='archived_at') THEN
    ALTER TABLE events ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
  -- Colonne status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'a_venir';
  END IF;
END$$;

-- 3. Migrer les anciens statuts vers les statuts français
UPDATE events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
UPDATE events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
UPDATE events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
UPDATE events SET status = 'archive' WHERE status IN ('archived','archivee');
UPDATE events SET status = 'complet' WHERE status IN ('full','complete');
-- Tout statut non reconnu → a_venir
UPDATE events SET status = 'a_venir'
  WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');

-- 4. Contrainte CHECK sur status (idempotent)
DO $$
BEGIN
  ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
  ALTER TABLE events ADD CONSTRAINT events_status_check
    CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive'));
EXCEPTION WHEN others THEN NULL;
END$$;

-- 5. Mettre à jour/créer event_participations → event_participants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
    ALTER TABLE event_participations RENAME TO event_participants;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
    CREATE TABLE event_participants (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id            UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      status              TEXT DEFAULT 'inscrit' CHECK (status IN ('inscrit','confirme','annule','present','absent','liste_attente')),
      joined_at           TIMESTAMPTZ DEFAULT now(),
      confirmed_at        TIMESTAMPTZ,
      cancelled_at        TIMESTAMPTZ,
      attendance_marked_at TIMESTAMPTZ,
      notes               TEXT DEFAULT '',
      created_at          TIMESTAMPTZ DEFAULT now(),
      updated_at          TIMESTAMPTZ DEFAULT now(),
      UNIQUE(event_id, user_id)
    );
  END IF;
END$$;

-- 6. Ajouter colonnes manquantes sur event_participants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='status') THEN
    ALTER TABLE event_participants ADD COLUMN status TEXT DEFAULT 'inscrit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='joined_at') THEN
    ALTER TABLE event_participants ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='confirmed_at') THEN
    ALTER TABLE event_participants ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='cancelled_at') THEN
    ALTER TABLE event_participants ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='attendance_marked_at') THEN
    ALTER TABLE event_participants ADD COLUMN attendance_marked_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='notes') THEN
    ALTER TABLE event_participants ADD COLUMN notes TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='updated_at') THEN
    ALTER TABLE event_participants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END$$;

-- 7. Table event_photos (enrichir si existante)
CREATE TABLE IF NOT EXISTS event_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_cover      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_photos' AND column_name='is_cover') THEN
    ALTER TABLE event_photos ADD COLUMN is_cover BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_photos' AND column_name='updated_at') THEN
    ALTER TABLE event_photos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END$$;

-- 8. Contrainte 1 seule photo de couverture par événement
CREATE UNIQUE INDEX IF NOT EXISTS event_photos_single_cover
  ON event_photos(event_id) WHERE is_cover = true;

-- 9. Table event_status_history
CREATE TABLE IF NOT EXISTS event_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 10. Table event_date_history (pour les reports)
CREATE TABLE IF NOT EXISTS event_date_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  old_event_date   DATE,
  new_event_date   DATE,
  old_start_time   TIME,
  new_start_time   TIME,
  changed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason           TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 11. Trigger updated_at sur events
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

DROP TRIGGER IF EXISTS trg_event_participants_updated_at ON event_participants;
CREATE TRIGGER trg_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- 12. Trigger log changement de statut
CREATE OR REPLACE FUNCTION log_event_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_status_history(event_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_event_status ON events;
CREATE TRIGGER trg_log_event_status
  AFTER UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_status_change();

-- 13. S'assurer que capacity et is_unlimited existent avant la vue
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_unlimited') THEN
    ALTER TABLE events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_open') THEN
    ALTER TABLE events ADD COLUMN registration_open BOOLEAN DEFAULT true;
  END IF;
END$$;

-- 13b. Vue résumé organisateur
DROP VIEW IF EXISTS event_organizer_summary;
CREATE VIEW event_organizer_summary AS
SELECT
  e.id,
  e.title,
  e.category,
  e.event_date,
  e.start_time,
  e.location,
  e.status,
  e.capacity,
  e.is_unlimited,
  e.registration_open,
  e.author_id,
  COUNT(ep.id) FILTER (WHERE ep.status != 'annule') AS participants_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'inscrit')         AS inscrit_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirme')        AS confirme_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'liste_attente')   AS attente_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'present')         AS present_count,
  CASE
    WHEN e.is_unlimited OR e.capacity IS NULL THEN NULL
    ELSE GREATEST(0, e.capacity - COUNT(ep.id) FILTER (WHERE ep.status != 'annule'))
  END AS remaining_places,
  CASE
    WHEN e.is_unlimited OR e.capacity IS NULL OR e.capacity = 0 THEN NULL
    ELSE ROUND(COUNT(ep.id) FILTER (WHERE ep.status != 'annule') * 100.0 / e.capacity)
  END AS fill_percentage
FROM events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
GROUP BY e.id;

-- 14. RLS events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_select"    ON events;
DROP POLICY IF EXISTS "events_insert_own"       ON events;
DROP POLICY IF EXISTS "events_update_own"       ON events;
DROP POLICY IF EXISTS "events_delete_own"       ON events;
DROP POLICY IF EXISTS "events_admin_all"        ON events;

CREATE POLICY "events_public_select" ON events
  FOR SELECT USING (status NOT IN ('archive') OR author_id = auth.uid());

CREATE POLICY "events_insert_own" ON events
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
  );

CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
  );

-- 15. RLS event_participants
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_select"  ON event_participants;
DROP POLICY IF EXISTS "ep_insert"  ON event_participants;
DROP POLICY IF EXISTS "ep_update"  ON event_participants;
DROP POLICY IF EXISTS "ep_delete"  ON event_participants;

CREATE POLICY "ep_select" ON event_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
  );

CREATE POLICY "ep_insert" ON event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ep_update" ON event_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
  );

CREATE POLICY "ep_delete" ON event_participants
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  );

-- 16. RLS event_photos
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ephoto_select" ON event_photos;
DROP POLICY IF EXISTS "ephoto_insert" ON event_photos;
DROP POLICY IF EXISTS "ephoto_delete" ON event_photos;

CREATE POLICY "ephoto_select" ON event_photos FOR SELECT USING (true);
CREATE POLICY "ephoto_insert" ON event_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
);
CREATE POLICY "ephoto_delete" ON event_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
);

-- 17. RLS event_status_history
ALTER TABLE event_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "esh_select" ON event_status_history;
CREATE POLICY "esh_select" ON event_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
);

-- 18. RLS event_date_history
ALTER TABLE event_date_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edh_select" ON event_date_history;
CREATE POLICY "edh_select" ON event_date_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderateur'))
);

-- 19. Index performances
CREATE INDEX IF NOT EXISTS idx_events_date         ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status        ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_author        ON events(author_id);
CREATE INDEX IF NOT EXISTS idx_events_category      ON events(category);
CREATE INDEX IF NOT EXISTS idx_ep_event_id          ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_user_id           ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_esh_event_id         ON event_status_history(event_id);
CREATE INDEX IF NOT EXISTS idx_edh_event_id         ON event_date_history(event_id);

-- ✅ Migration terminée — 8 tables, triggers, RLS, vue organisateur
`;

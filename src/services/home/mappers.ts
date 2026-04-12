// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Adaptateurs par vertical
// Chaque fonction transforme les données brutes d'une verticale
// vers le type canonique HomeFeedItem.
// Les alias Supabase (author:profiles, organizer:profiles) sont gérés ici.
// ─────────────────────────────────────────────────────────────────────────────

import type { HomeFeedItem, HomeFeedItemStatus, HomeFeedItemUrgency } from './types';

// ─── Utilitaires internes ─────────────────────────────────────────────────────

function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

function urgencyFromText(text: string | null | undefined): HomeFeedItemUrgency {
  const t = (text || '').toLowerCase();
  if (t.includes('urgent') || t.includes('aujourd') || t.includes('maintenant')) return 'high';
  if (t.includes('semaine') || t.includes('demain')) return 'medium';
  return 'low';
}

// Résout le profil auteur quelque soit l'alias utilisé (profiles, author, organizer, owner)
function resolveProfile(
  row: Record<string, unknown>
): { id: string; full_name?: string | null; avatar_url?: string | null } | null {
  const p = (row.author ?? row.organizer ?? row.owner ?? row.profiles) as
    | { id: string; full_name?: string | null; avatar_url?: string | null }
    | null
    | undefined;
  return p ?? null;
}

// ─── Types bruts Supabase (flexibles pour gérer les alias) ───────────────────
// Exportés pour permettre un typage fort dans feed.ts sans `any`.

export type RawProfile = { id: string; full_name?: string | null; avatar_url?: string | null };

export interface RawHelpRequest {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  urgency?: string | null;
  sector_id?: string | null;  // colonne réelle en DB (pas 'sector')
  created_at: string;
  updated_at?: string | null;
  // Supabase alias: author:profiles(...)
  author?: RawProfile | null;
  profiles?: RawProfile | null;
}

export interface RawEvent {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  event_date: string;
  location?: string | null;
  created_at: string;
  updated_at?: string | null;
  author?: RawProfile | null;
  profiles?: RawProfile | null;
}

export interface RawForumTopic {
  id: string;
  title: string;
  content?: string | null;
  status?: string | null;
  sector_id?: string | null;  // colonne réelle en DB (pas 'sector')
  created_at: string;
  updated_at?: string | null;
  reply_count?: number | null;
  author?: RawProfile | null;
  profiles?: RawProfile | null;
}

export interface RawLostFound {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  type?: string | null;
  location?: string | null;
  location_area?: string | null;  // colonne réelle dans lost_found_items
  created_at: string;
  updated_at?: string | null;
  author?: RawProfile | null;
  profiles?: RawProfile | null;
}

export interface RawListing {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  price?: number | null;
  category?: string | null;
  created_at: string;
  updated_at?: string | null;
  // listings: pas de jointure profiles dans le feed (FK ambiguë) — pas de profil auteur affiché
}

export interface RawOuting {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  outing_date: string;
  location?: string | null;
  meeting_point?: string | null;  // colonne réelle dans group_outings
  max_participants?: number | null;
  created_at: string;
  updated_at?: string | null;
  // group_outings utilise organizer_id → alias organizer:profiles!fkey(...)
  organizer?: RawProfile | null;
  author?: RawProfile | null;
  profiles?: RawProfile | null;
}

// ─── Adaptateur : Coups de main / Entraide ───────────────────────────────────

export function helpRequestsToFeedItems(rows: RawHelpRequest[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    const urgency: HomeFeedItemUrgency =
      r.urgency === 'urgent' ? 'high' :
      r.urgency === 'medium' ? 'medium' :
      urgencyFromText(r.title);

    const status: HomeFeedItemStatus =
      r.status === 'resolved' ? 'resolved' :
      r.status === 'in_progress' || r.status === 'active' ? 'active' : 'open';

    const badges: string[] = [];
    if (urgency === 'high') badges.push('Urgent');

    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'help_request',
      sourceModule: 'help_requests',
      title: r.title,
      summary: truncate(r.description),
      sector: r.sector_id ?? null,
      locationLabel: 'Biguglia',
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Habitant',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status,
      urgency,
      isUrgent: urgency === 'high',
      isResolved: status === 'resolved',
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/coups-de-main`,
      actionLabel: 'Voir la demande',
      badges,
    };
  });
}

// ─── Adaptateur : Événements ──────────────────────────────────────────────────

export function eventsToFeedItems(rows: RawEvent[]): HomeFeedItem[] {
  const now = new Date();
  return rows.map((r): HomeFeedItem => {
    // event_date peut être YYYY-MM-DD ou ISO complet
    const eventDate = new Date(r.event_date.includes('T') ? r.event_date : r.event_date + 'T00:00:00');
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const urgency: HomeFeedItemUrgency =
      daysUntil <= 1 ? 'high' :
      daysUntil <= 3 ? 'medium' : 'low';

    const badges: string[] = [];
    if (daysUntil === 0) badges.push('Aujourd\'hui');
    else if (daysUntil === 1) badges.push('Demain');
    else if (daysUntil <= 7) badges.push('Cette semaine');

    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'event',
      sourceModule: 'events',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: r.location || 'Biguglia',
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Organisateur',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      eventDate: r.event_date,
      status: 'upcoming',
      urgency,
      isUrgent: urgency === 'high',
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/evenements/${r.id}`,
      actionLabel: 'Voir l\'événement',
      badges,
      metadata: { daysUntil },
    };
  });
}

// ─── Adaptateur : Forum ───────────────────────────────────────────────────────

export function forumTopicsToFeedItems(rows: RawForumTopic[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    const replyCount = r.reply_count || 0;
    const urgency: HomeFeedItemUrgency = replyCount >= 5 ? 'medium' : 'low';

    const badges: string[] = [];
    if (replyCount > 0) badges.push(`${replyCount} réponse${replyCount > 1 ? 's' : ''}`);

    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'forum_topic',
      sourceModule: 'forum_topics',
      title: r.title,
      summary: truncate(r.content),
      sector: r.sector_id ?? null,
      locationLabel: 'Biguglia',
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Habitant',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status: 'active',
      urgency,
      isUrgent: false,
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/forum/${r.id}`,
      actionLabel: 'Lire la discussion',
      badges,
      metadata: { replyCount },
    };
  });
}

// ─── Adaptateur : Perdu / Trouvé ─────────────────────────────────────────────

export function lostFoundToFeedItems(rows: RawLostFound[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    // type peut être 'perdu'/'trouve' (FR) ou 'lost'/'found' (EN)
    const isLost = r.type === 'lost' || r.type === 'perdu'
      || r.title.toLowerCase().includes('perdu');
    // status peut être EN (resolved/found/returned) ou FR (restitue/clos/archive)
    const status: HomeFeedItemStatus =
      ['resolved', 'found', 'returned', 'restitue', 'clos', 'archive'].includes(r.status ?? '')
        ? 'resolved' : 'open';

    const location = r.location_area || r.location || 'Biguglia';

    const badges: string[] = [];
    badges.push(isLost ? 'Perdu' : 'Trouvé');
    if (status === 'open') badges.push('Actif');

    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'lost_found',
      sourceModule: 'lost_found_items',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: location,
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Habitant',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status,
      urgency: 'medium',
      isUrgent: false,
      isResolved: status === 'resolved',
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/perdu-trouve/${r.id}`,
      actionLabel: 'Voir l\'annonce',
      badges,
      metadata: { isLost },
    };
  });
}

// ─── Adaptateur : Annonces ────────────────────────────────────────────────────

export function listingsToFeedItems(rows: RawListing[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'listing',
      sourceModule: 'listings',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: 'Biguglia',
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Habitant',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status: 'active',
      urgency: 'low',
      isUrgent: false,
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/annonces/${r.id}`,
      actionLabel: 'Voir l\'annonce',
      badges: r.price === 0 ? ['Gratuit'] : r.price ? [`${r.price} €`] : [],
      metadata: { price: r.price, category: r.category },
    };
  });
}

// ─── Adaptateur : Promenades / Sorties ───────────────────────────────────────

export function outingsToFeedItems(rows: RawOuting[]): HomeFeedItem[] {
  const now = new Date();
  return rows.map((r): HomeFeedItem => {
    const outingDate = new Date(r.outing_date.includes('T') ? r.outing_date : r.outing_date + 'T00:00:00');
    const daysUntil = Math.ceil((outingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const badges: string[] = [];
    if (daysUntil === 0) badges.push('Aujourd\'hui');
    else if (daysUntil === 1) badges.push('Demain');
    else if (daysUntil <= 7) badges.push('Cette semaine');
    if (r.max_participants) badges.push(`${r.max_participants} places`);

    // meeting_point est la colonne réelle dans group_outings
    const locationLabel = r.meeting_point || r.location || 'Biguglia';

    const profile = resolveProfile(r as unknown as Record<string, unknown>);

    return {
      id: r.id,
      type: 'outing',
      sourceModule: 'group_outings',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel,
      author: profile ? {
        id: profile.id,
        name: profile.full_name || 'Organisateur',
        avatarUrl: profile.avatar_url,
      } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      eventDate: r.outing_date,
      status: 'upcoming',
      urgency: daysUntil <= 2 ? 'medium' : 'low',
      isUrgent: false,
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/promenades/sorties/${r.id}`,
      actionLabel: 'Voir la sortie',
      badges,
      metadata: { daysUntil, maxParticipants: r.max_participants },
    };
  });
}

// ─── Adaptateur : Offres d'emploi ─────────────────────────────────────────────

export interface RawJobOffer {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  full_description?: string | null;
  employer_name?: string | null;
  job_category?: string | null;
  contract_type?: string | null;
  location_city?: string | null;
  sector_id?: string | null;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  salary_period?: string | null;
  salary_type?: string | null;
  is_urgent?: boolean;
  provides_housing?: boolean;
  experience_level?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', interim: 'Intérim', saisonnier: 'Saisonnier',
  alternance: 'Alternance', stage: 'Stage', freelance: 'Freelance', extra: 'Extra',
};

const PERIOD_LABELS: Record<string, string> = {
  hourly: '/ h', daily: '/ j', monthly: '/ mois', yearly: '/ an',
};

function formatSalary(min?: number | null, max?: number | null, period?: string | null, type?: string | null): string | null {
  if (!min && !max) return null;
  const p = period ? (PERIOD_LABELS[period] ?? period) : '/ mois';
  const t = type ? ` ${type}` : '';
  if (min && max) return `${min.toLocaleString('fr-FR')} – ${max.toLocaleString('fr-FR')} €${p}${t}`;
  if (min) return `À partir de ${min.toLocaleString('fr-FR')} €${p}${t}`;
  return `Jusqu'à ${max!.toLocaleString('fr-FR')} €${p}${t}`;
}

export function jobOffersToFeedItems(rows: RawJobOffer[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    const badges: string[] = [];
    if (r.is_urgent) badges.push('Urgent');
    if (r.provides_housing) badges.push('Logement');
    const contractLabel = r.contract_type ? (CONTRACT_LABELS[r.contract_type] ?? r.contract_type.toUpperCase()) : null;
    if (contractLabel) badges.push(contractLabel);
    const salaryStr = formatSalary(r.salary_range_min, r.salary_range_max, r.salary_period, r.salary_type);
    if (salaryStr) badges.push(salaryStr);

    const summary = r.short_description
      ? truncate(r.short_description, 130)
      : r.employer_name
        ? `${r.employer_name} recrute${r.location_city ? ` à ${r.location_city}` : ''}.`
        : truncate(r.full_description, 130);

    return {
      id: r.id,
      type: 'job_offer',
      sourceModule: 'job_offers',
      title: r.title,
      summary,
      sector: r.sector_id,
      locationLabel: r.location_city ?? 'Biguglia',
      author: r.employer_name ? { id: r.id, name: r.employer_name } : undefined,
      createdAt: r.published_at ?? r.created_at,
      updatedAt: r.updated_at,
      status: 'active',
      urgency: r.is_urgent ? 'high' : 'medium',
      isUrgent: r.is_urgent ?? false,
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/emploi/offres/${r.slug}`,
      actionLabel: 'Voir l\'offre',
      badges,
      metadata: {
        employer: r.employer_name,
        contract: r.contract_type,
        category: r.job_category,
        salary: salaryStr,
      },
    };
  });
}

// ─── Adaptateur : Demandes d'emploi ──────────────────────────────────────────

export interface RawJobDemand {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  profile_description?: string | null;
  job_category?: string | null;
  desired_contract_types?: string[] | null;
  location_city?: string | null;
  sector_id?: string | null;
  availability_type?: string | null;
  experience_level?: string | null;
  salary_expectation_min?: number | null;
  salary_expectation_max?: number | null;
  is_urgent?: boolean;
  has_driving_license?: boolean;
  has_vehicle?: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Dispo immédiatement',
  week: 'Dispo cette semaine',
  month: 'Dispo ce mois-ci',
  flexible: 'Disponibilité flexible',
};

export function jobDemandsToFeedItems(rows: RawJobDemand[]): HomeFeedItem[] {
  return rows.map((r): HomeFeedItem => {
    const badges: string[] = [];
    if (r.is_urgent) badges.push('Urgent');
    const availLabel = r.availability_type ? (AVAILABILITY_LABELS[r.availability_type] ?? null) : null;
    if (availLabel) badges.push(availLabel);
    if (r.has_driving_license) badges.push('Permis');
    if (r.has_vehicle) badges.push('Véhicule');

    const summary = r.short_description
      ? truncate(r.short_description, 130)
      : truncate(r.profile_description, 130);

    return {
      id: r.id,
      type: 'job_demand',
      sourceModule: 'job_demands',
      title: r.title,
      summary,
      sector: r.sector_id,
      locationLabel: r.location_city ?? 'Biguglia',
      author: undefined,
      createdAt: r.published_at ?? r.created_at,
      updatedAt: r.updated_at,
      status: 'active',
      urgency: r.is_urgent ? 'high' : 'low',
      isUrgent: r.is_urgent ?? false,
      isResolved: false,
      freshnessScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      actionUrl: `/emploi/demandes/${r.slug}`,
      actionLabel: 'Voir le profil',
      badges,
      metadata: {
        category: r.job_category,
        contracts: r.desired_contract_types,
        availability: r.availability_type,
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Adaptateurs par vertical
// Chaque fonction transforme les données brutes d'une verticale
// vers le type canonique HomeFeedItem.
// Aucune logique métier des pages ne doit appeler ces fonctions directement.
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

// ─── Types bruts Supabase (minimaux, pour éviter les imports circulaires) ────

interface RawHelpRequest {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  urgency?: string | null;
  sector?: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface RawEvent {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  event_date: string;
  location?: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface RawForumTopic {
  id: string;
  title: string;
  content?: string | null;
  status?: string | null;
  sector?: string | null;
  created_at: string;
  updated_at?: string | null;
  reply_count?: number | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface RawLostFound {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  type?: string | null;           // 'lost' | 'found'
  location?: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface RawListing {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  price?: number | null;
  category?: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface RawOuting {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  outing_date: string;
  location?: string | null;
  max_participants?: number | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
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
      r.status === 'in_progress' ? 'active' : 'open';

    const badges: string[] = [];
    if (urgency === 'high') badges.push('Urgent');
    if (status === 'open') badges.push('En attente');

    return {
      id: r.id,
      type: 'help_request',
      sourceModule: 'help_requests',
      title: r.title,
      summary: truncate(r.description),
      sector: r.sector,
      locationLabel: r.sector ? `Biguglia · ${r.sector}` : 'Biguglia',
      author: r.profiles ? {
        id: r.profiles.id,
        name: r.profiles.full_name || 'Habitant',
        avatarUrl: r.profiles.avatar_url,
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
      actionUrl: `/coups-de-main/${r.id}`,
      actionLabel: 'Voir la demande',
      badges,
    };
  });
}

// ─── Adaptateur : Événements ──────────────────────────────────────────────────

export function eventsToFeedItems(rows: RawEvent[]): HomeFeedItem[] {
  const now = new Date();
  return rows.map((r): HomeFeedItem => {
    const eventDate = new Date(r.event_date);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const urgency: HomeFeedItemUrgency =
      daysUntil <= 1 ? 'high' :
      daysUntil <= 3 ? 'medium' : 'low';

    const badges: string[] = [];
    if (daysUntil === 0) badges.push('Aujourd\'hui');
    else if (daysUntil === 1) badges.push('Demain');
    else if (daysUntil <= 7) badges.push('Cette semaine');

    return {
      id: r.id,
      type: 'event',
      sourceModule: 'events',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: r.location || 'Biguglia',
      author: r.profiles ? {
        id: r.profiles.id,
        name: r.profiles.full_name || 'Organisateur',
        avatarUrl: r.profiles.avatar_url,
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
    const urgency: HomeFeedItemUrgency =
      replyCount >= 5 ? 'medium' : 'low';

    const badges: string[] = [];
    if (replyCount > 0) badges.push(`${replyCount} réponse${replyCount > 1 ? 's' : ''}`);

    return {
      id: r.id,
      type: 'forum_topic',
      sourceModule: 'forum_topics',
      title: r.title,
      summary: truncate(r.content),
      sector: r.sector,
      locationLabel: r.sector ? `Biguglia · ${r.sector}` : 'Biguglia',
      author: r.profiles ? {
        id: r.profiles.id,
        name: r.profiles.full_name || 'Habitant',
        avatarUrl: r.profiles.avatar_url,
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
    const isLost = r.type === 'lost' || r.title.toLowerCase().includes('perdu');
    const status: HomeFeedItemStatus =
      r.status === 'resolved' || r.status === 'found' ? 'resolved' : 'open';

    const badges: string[] = [];
    if (isLost) badges.push('Perdu');
    else badges.push('Trouvé');
    if (status === 'open') badges.push('Actif');

    return {
      id: r.id,
      type: 'lost_found',
      sourceModule: 'lost_and_found',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: r.location || 'Biguglia',
      author: r.profiles ? {
        id: r.profiles.id,
        name: r.profiles.full_name || 'Habitant',
        avatarUrl: r.profiles.avatar_url,
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
  return rows.map((r): HomeFeedItem => ({
    id: r.id,
    type: 'listing',
    sourceModule: 'listings',
    title: r.title,
    summary: truncate(r.description),
    sector: null,
    locationLabel: 'Biguglia',
    author: r.profiles ? {
      id: r.profiles.id,
      name: r.profiles.full_name || 'Habitant',
      avatarUrl: r.profiles.avatar_url,
    } : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: r.status === 'active' ? 'active' : 'closed',
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
  }));
}

// ─── Adaptateur : Promenades ──────────────────────────────────────────────────

export function outingsToFeedItems(rows: RawOuting[]): HomeFeedItem[] {
  const now = new Date();
  return rows.map((r): HomeFeedItem => {
    const outingDate = new Date(r.outing_date);
    const daysUntil = Math.ceil((outingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const badges: string[] = [];
    if (daysUntil === 0) badges.push('Aujourd\'hui');
    else if (daysUntil === 1) badges.push('Demain');
    else if (daysUntil <= 7) badges.push('Cette semaine');
    if (r.max_participants) badges.push(`${r.max_participants} places`);

    return {
      id: r.id,
      type: 'outing',
      sourceModule: 'group_outings',
      title: r.title,
      summary: truncate(r.description),
      sector: null,
      locationLabel: r.location || 'Biguglia',
      author: r.profiles ? {
        id: r.profiles.id,
        name: r.profiles.full_name || 'Organisateur',
        avatarUrl: r.profiles.avatar_url,
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
      actionUrl: `/promenades/${r.id}`,
      actionLabel: 'Voir la sortie',
      badges,
      metadata: { daysUntil, maxParticipants: r.max_participants },
    };
  });
}

/**
 * _mappers
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonctions pures : données brutes Supabase → SearchResult[]
 * Utilisées exclusivement par useSearchPage.
 */

import { SearchResult, ThemeBlock } from './_types';
import { THEMES, ThemeKey } from './_config';

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : undefined;

// ─── Helpers thème ────────────────────────────────────────────────────────────
function t(key: ThemeKey): Pick<SearchResult, 'theme' | 'themeLabel' | 'themeColor' | 'themeBg' | 'themeIcon'> {
  return {
    theme: key,
    themeLabel: THEMES[key].label,
    themeColor: THEMES[key].color,
    themeBg:    THEMES[key].bg,
    themeIcon:  THEMES[key].icon,
  };
}

type Photo = { url: string };

/** Type générique pour une ligne brute retournée par Supabase */
type RawRow = Record<string, unknown>;

// ─── Artisans ─────────────────────────────────────────────────────────────────
export function mapArtisans(rows: RawRow[]): SearchResult[] {
  return rows.map(a => ({
    id: `artisan-${a.id}`, title: (a.business_name as string) || 'Artisan',
    description: a.description as string | undefined,
    subtitle: (a.trade_category as { name?: string } | null)?.name,
    href: `/artisans/${a.id}`, location: a.service_area as string | undefined,
    badge: 'Vérifié ✓', ...t('artisan'),
  }));
}

// ─── Annonces ─────────────────────────────────────────────────────────────────
export function mapListings(rows: RawRow[], filterFree: boolean, filterLocation: string): SearchResult[] {
  return rows
    .filter(l => !filterFree || l.listing_type === 'free')
    .filter(l => !filterLocation || ((l.location as string) || '').toLowerCase().includes(filterLocation.toLowerCase()))
    .map(l => ({
      id: `listing-${l.id}`, title: l.title as string, description: l.description as string | undefined,
      href: `/annonces/${l.id}`,
      image: (l.photos as Photo[] | null)?.[0]?.url,
      price: l.listing_type !== 'free' ? l.price as number | undefined : undefined,
      isFree: l.listing_type === 'free',
      location: l.location as string | undefined,
      ...t('annonce'),
    }));
}

// ─── Matériel ─────────────────────────────────────────────────────────────────
export function mapEquipment(rows: RawRow[], filterFree: boolean): SearchResult[] {
  return rows
    .filter(e => !filterFree || e.is_free)
    .map(e => ({
      id: `equip-${e.id}`, title: e.title as string, description: e.description as string | undefined,
      href: `/materiel/${e.id}`,
      image: (e.photos as Photo[] | null)?.[0]?.url,
      price: e.is_free ? undefined : e.daily_rate as number | undefined,
      isFree: e.is_free as boolean,
      location: e.pickup_location as string | undefined,
      ...t('materiel'),
    }));
}

// ─── Entraide ─────────────────────────────────────────────────────────────────
export function mapHelps(rows: RawRow[]): SearchResult[] {
  return rows.map(h => ({
    id: `help-${h.id}`, title: h.title as string, description: h.description as string | undefined,
    href: `/coups-de-main#${h.id}`, location: h.location_city as string | undefined,
    badge: h.urgency === 'urgent' ? '🔴 Urgent' : undefined,
    ...t('aide'),
  }));
}

// ─── Promenades ───────────────────────────────────────────────────────────────
export function mapOutings(rows: RawRow[]): SearchResult[] {
  return rows.map(o => ({
    id: `outing-${o.id}`, title: o.title as string, description: o.description as string | undefined,
    href: '/promenades',
    image: (o.photos as Photo[] | null)?.[0]?.url,
    location: o.meeting_point as string | undefined,
    date: fmt(o.outing_date as string),
    ...t('promenade'),
  }));
}

// ─── Événements ───────────────────────────────────────────────────────────────
export function mapEvents(rows: RawRow[]): SearchResult[] {
  return rows.map(e => ({
    id: `event-${e.id}`, title: e.title as string, description: e.description as string | undefined,
    href: '/evenements',
    image: (e.photos as Photo[] | null)?.[0]?.url,
    price: e.is_free ? undefined : e.price as number | undefined,
    isFree: e.is_free as boolean, location: e.location as string | undefined,
    date: fmt(e.event_date as string),
    ...t('evenement'),
  }));
}

// ─── Forum ────────────────────────────────────────────────────────────────────
export function mapForum(rows: RawRow[]): SearchResult[] {
  return rows.map(f => {
    const author = f.author as { full_name?: string; avatar_url?: string } | null;
    const category = f.category as { name?: string } | null;
    return {
      id: `forum-${f.id}`, title: f.title as string,
      description: ((f.content as string) || '').slice(0, 100),
      href: `/forum/${f.id}`, subtitle: category?.name,
      author: author ? { name: author.full_name || 'Anonyme', avatar: author.avatar_url } : undefined,
      date: fmt(f.created_at as string),
      ...t('forum'),
    };
  });
}

// ─── Associations ─────────────────────────────────────────────────────────────
export function mapAssociations(rows: RawRow[]): SearchResult[] {
  return rows.map(a => ({
    id: `asso-${a.id}`, title: a.name as string, description: a.description_short as string | undefined,
    href: `/associations/${a.id}`, location: a.location as string | undefined,
    subtitle: a.category as string | undefined,
    ...t('association'),
  }));
}

// ─── Collections ──────────────────────────────────────────────────────────────
export function mapCollections(rows: RawRow[]): SearchResult[] {
  return rows.map(c => ({
    id: `col-${c.id}`, title: c.title as string, description: c.description as string | undefined,
    href: '/collectionneurs',
    image: (c.photos as Photo[] | null)?.[0]?.url,
    price: c.price as number | undefined,
    location: c.location as string | undefined, subtitle: c.category as string | undefined,
    ...t('collectionneur'),
  }));
}

// ─── Emploi ───────────────────────────────────────────────────────────────────
export function mapJobOffers(rows: RawRow[]): SearchResult[] {
  return rows.map(j => ({
    id: `joboffer-${j.id}`, title: j.title as string, description: j.short_description as string | undefined,
    href: `/emploi/offres/${j.slug}`, location: j.location_label as string | undefined,
    subtitle: j.job_category as string | undefined, badge: '💼 Offre',
    ...t('emploi'),
  }));
}

export function mapJobDemands(rows: RawRow[]): SearchResult[] {
  return rows.map(j => ({
    id: `jobdemand-${j.id}`, title: j.title as string, description: j.short_description as string | undefined,
    href: `/emploi/demandes/${j.slug}`, location: j.location_label as string | undefined,
    badge: '🙋 Demande',
    ...t('emploi'),
  }));
}

// ─── Perdu/Trouvé ─────────────────────────────────────────────────────────────
export function mapLostFound(rows: RawRow[]): SearchResult[] {
  return rows.map(lf => ({
    id: `lf-${lf.id}`, title: lf.title as string, description: lf.description as string | undefined,
    href: '/perdu-trouve', location: lf.location_area as string | undefined,
    subtitle: lf.category as string | undefined,
    date: fmt(lf.created_at as string),
    badge: lf.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé',
    ...t('perdu_trouve'),
  }));
}

// ─── Assemblage des blocs ─────────────────────────────────────────────────────
export function buildBlocks(
  mapped: Record<ThemeKey, SearchResult[]>,
  activeThemes: ThemeKey[],
  sortBy: string,
): { blocks: ThemeBlock[]; total: number } {
  const order: [ThemeKey, SearchResult[]][] = [
    ['artisan',        mapped.artisan],
    ['annonce',        mapped.annonce],
    ['emploi',         mapped.emploi],
    ['materiel',       mapped.materiel],
    ['aide',           mapped.aide],
    ['promenade',      mapped.promenade],
    ['evenement',      mapped.evenement],
    ['forum',          mapped.forum],
    ['association',    mapped.association],
    ['collectionneur', mapped.collectionneur],
    ['perdu_trouve',   mapped.perdu_trouve],
  ];

  const blocks: ThemeBlock[] = [];
  let total = 0;

  for (const [key, results] of order) {
    if (!results.length) continue;
    if (activeThemes.length > 0 && !activeThemes.includes(key)) continue;

    const sorted = sortBy === 'gratuit'
      ? [...results].sort((a, b) => (a.isFree ? -1 : 1) - (b.isFree ? -1 : 1))
      : [...results];

    blocks.push({ key, label: THEMES[key].label, color: THEMES[key].color, bg: THEMES[key].bg, border: THEMES[key].border, icon: THEMES[key].icon, results: sorted });
    total += sorted.length;
  }

  return { blocks, total };
}

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

// ─── Artisans ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapArtisans(rows: any[]): SearchResult[] {
  return rows.map(a => ({
    id: `artisan-${a.id}`, title: a.business_name || 'Artisan',
    description: a.description, subtitle: (a.trade_category as { name?: string } | null)?.name,
    href: `/artisans/${a.id}`, location: a.service_area, badge: 'Vérifié ✓', ...t('artisan'),
  }));
}

// ─── Annonces ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapListings(rows: any[], filterFree: boolean, filterLocation: string): SearchResult[] {
  return rows
    .filter(l => !filterFree || l.listing_type === 'free')
    .filter(l => !filterLocation || (l.location || '').toLowerCase().includes(filterLocation.toLowerCase()))
    .map(l => ({
      id: `listing-${l.id}`, title: l.title, description: l.description,
      href: `/annonces/${l.id}`,
      image: (l.photos as Photo[] | null)?.[0]?.url,
      price: l.listing_type !== 'free' ? l.price : undefined,
      isFree: l.listing_type === 'free',
      location: l.location,
      ...t('annonce'),
    }));
}

// ─── Matériel ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEquipment(rows: any[], filterFree: boolean): SearchResult[] {
  return rows
    .filter(e => !filterFree || e.is_free)
    .map(e => ({
      id: `equip-${e.id}`, title: e.title, description: e.description,
      href: `/materiel/${e.id}`,
      image: (e.photos as Photo[] | null)?.[0]?.url,
      price: e.is_free ? undefined : e.daily_rate,
      isFree: e.is_free,
      location: e.pickup_location,
      ...t('materiel'),
    }));
}

// ─── Entraide ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapHelps(rows: any[]): SearchResult[] {
  return rows.map(h => ({
    id: `help-${h.id}`, title: h.title, description: h.description,
    href: `/coups-de-main#${h.id}`, location: h.location_city,
    badge: h.urgency === 'urgent' ? '🔴 Urgent' : undefined,
    ...t('aide'),
  }));
}

// ─── Promenades ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOutings(rows: any[]): SearchResult[] {
  return rows.map(o => ({
    id: `outing-${o.id}`, title: o.title, description: o.description,
    href: '/promenades',
    image: (o.photos as Photo[] | null)?.[0]?.url,
    location: o.meeting_point,
    date: fmt(o.outing_date),
    ...t('promenade'),
  }));
}

// ─── Événements ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEvents(rows: any[]): SearchResult[] {
  return rows.map(e => ({
    id: `event-${e.id}`, title: e.title, description: e.description,
    href: '/evenements',
    image: (e.photos as Photo[] | null)?.[0]?.url,
    price: e.is_free ? undefined : e.price,
    isFree: e.is_free, location: e.location, date: fmt(e.event_date),
    ...t('evenement'),
  }));
}

// ─── Forum ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapForum(rows: any[]): SearchResult[] {
  return rows.map(f => {
    const author = f.author as { full_name?: string; avatar_url?: string } | null;
    const category = f.category as { name?: string } | null;
    return {
      id: `forum-${f.id}`, title: f.title, description: (f.content as string || '').slice(0, 100),
      href: `/forum/${f.id}`, subtitle: category?.name,
      author: author ? { name: author.full_name || 'Anonyme', avatar: author.avatar_url } : undefined,
      date: fmt(f.created_at),
      ...t('forum'),
    };
  });
}

// ─── Associations ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAssociations(rows: any[]): SearchResult[] {
  return rows.map(a => ({
    id: `asso-${a.id}`, title: a.name, description: a.description_short,
    href: `/associations/${a.id}`, location: a.location, subtitle: a.category,
    ...t('association'),
  }));
}

// ─── Collections ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCollections(rows: any[]): SearchResult[] {
  return rows.map((c: Record<string, unknown>) => ({
    id: `col-${c.id}`, title: c.title as string, description: c.description as string,
    href: '/collectionneurs',
    image: (c.photos as Photo[] | null)?.[0]?.url,
    price: c.price as number | undefined,
    location: c.location as string, subtitle: c.category as string,
    ...t('collectionneur'),
  }));
}

// ─── Emploi ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapJobOffers(rows: any[]): SearchResult[] {
  return rows.map((j: Record<string, unknown>) => ({
    id: `joboffer-${j.id}`, title: j.title as string, description: j.short_description as string,
    href: `/emploi/offres/${j.slug}`, location: j.location_label as string,
    subtitle: j.job_category as string, badge: '💼 Offre',
    ...t('emploi'),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapJobDemands(rows: any[]): SearchResult[] {
  return rows.map((j: Record<string, unknown>) => ({
    id: `jobdemand-${j.id}`, title: j.title as string, description: j.short_description as string,
    href: `/emploi/demandes/${j.slug}`, location: j.location_label as string,
    badge: '🙋 Demande',
    ...t('emploi'),
  }));
}

// ─── Perdu/Trouvé ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapLostFound(rows: any[]): SearchResult[] {
  return rows.map((lf: Record<string, unknown>) => ({
    id: `lf-${lf.id}`, title: lf.title as string, description: lf.description as string,
    href: '/perdu-trouve', location: lf.location_area as string, subtitle: lf.category as string,
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

    let sorted = [...results];
    if (sortBy === 'gratuit') sorted.sort((a, b) => (a.isFree ? -1 : 1) - (b.isFree ? -1 : 1));

    blocks.push({ key, label: THEMES[key].label, color: THEMES[key].color, bg: THEMES[key].bg, border: THEMES[key].border, icon: THEMES[key].icon, results: sorted });
    total += sorted.length;
  }

  return { blocks, total };
}

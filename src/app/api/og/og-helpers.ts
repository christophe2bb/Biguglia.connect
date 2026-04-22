/**
 * src/app/api/og/og-helpers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers purs (sans JSX, sans Edge runtime) pour la route /api/og.
 *
 * Séparé de route.tsx pour permettre les tests unitaires Vitest
 * (identique au pattern jsonld-schemas.ts / JsonLd.tsx).
 *
 * route.tsx re-exporte tout ce module.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Type d'annonce → couleur accent, emoji et libellé français */
export const TYPE_META: Record<string, { label: string; emoji: string; accent: string }> = {
  sale:     { label: 'À vendre',  emoji: '🏷️', accent: '#3b82f6' }, // blue-500
  wanted:   { label: 'Recherché', emoji: '🔍', accent: '#8b5cf6' }, // violet-500
  free:     { label: 'Gratuit',   emoji: '🎁', accent: '#22c55e' }, // green-500
  service:  { label: 'Service',   emoji: '🛠️', accent: '#f97316' }, // orange-500
  exchange: { label: 'Échange',   emoji: '🔄', accent: '#f59e0b' }, // amber-500
  rental:   { label: 'Location',  emoji: '🔑', accent: '#06b6d4' }, // cyan-500
};

/** Libellés courts des conditions (sans emoji, pour l'image OG) */
export const CONDITION_LABELS_SHORT: Record<string, string> = {
  neuf:      'Neuf',
  excellent: 'Excellent',
  tres_bon:  'Très bon état',
  bon:       'Bon état',
  usage:     'Usagé',
  a_reparer: 'À réparer',
  lot:       'Lot',
  passable:  'Passable',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tronque le titre à `max` caractères avec ellipse si nécessaire. */
export function truncateTitle(title: string, max = 72): string {
  const t = title.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Formate un prix (chaîne numérique → "X €" ou "Gratuit"). */
export function formatPriceBadge(price: string | null): string {
  if (!price) return '';
  const n = parseFloat(price);
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'Gratuit';
  return `${new Intl.NumberFormat('fr-FR').format(n)} €`;
}

/**
 * Parse les URLSearchParams et retourne les paramètres OG validés.
 * Retourne null si le paramètre obligatoire `title` est absent ou vide.
 */
export function parseOgParams(searchParams: URLSearchParams): {
  title: string;
  type: string;
  price: string | null;
  cat: string | null;
  cond: string | null;
} | null {
  const rawTitle = searchParams.get('title') ?? '';
  if (!rawTitle.trim()) return null;

  return {
    title: truncateTitle(rawTitle),
    type:  searchParams.get('type')  ?? 'sale',
    price: searchParams.get('price') ?? null,
    cat:   searchParams.get('cat')   ?? null,
    cond:  searchParams.get('cond')  ?? null,
  };
}

/**
 * Construit l'URL vers /api/og avec les paramètres d'une annonce.
 *
 * @param siteUrl  – URL de base du site (ex. "https://biguglia-connect.vercel.app")
 * @param params   – champs de l'annonce à encoder
 */
export function buildOgUrl(
  siteUrl: string,
  params: {
    title: string;
    type?: string;
    price?: number | null;
    cat?: string | null;
    cond?: string | null;
  },
): string {
  const url = new URL(`${siteUrl}/api/og`);
  url.searchParams.set('title', params.title);
  if (params.type) url.searchParams.set('type', params.type);
  if (params.price != null && params.price >= 0) url.searchParams.set('price', String(params.price));
  if (params.cat)  url.searchParams.set('cat',   params.cat);
  if (params.cond) url.searchParams.set('cond',  params.cond);
  return url.toString();
}

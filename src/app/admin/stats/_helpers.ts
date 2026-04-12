// ─── Helpers partagés — admin/stats ────────────────────────────────────────

import type { DailyPoint, KV } from './_types';

/** Retourne les 30 derniers jours sous forme ISO date (YYYY-MM-DD). */
export function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Compte le nombre d'éléments par jour sur une fenêtre de dates. */
export function countByDay(
  rows: { created_at: string }[],
  days: string[],
): DailyPoint[] {
  const map: Record<string, number> = {};
  days.forEach(d => { map[d] = 0; });
  rows.forEach(r => {
    const d = r.created_at?.slice(0, 10);
    if (d && map[d] !== undefined) map[d]++;
  });
  return days.map(d => ({ date: d.slice(5), value: map[d] }));
}

/** Extrait les N mots les plus fréquents d'une liste de textes. */
export function topWords(texts: string[], count = 12): KV[] {
  const stop = new Set([
    'le','la','les','de','du','des','un','une','et','en','au','aux',
    'pour','par','sur','dans','avec','est','pas','que','qui','ce',
    'je','il','elle','nous','vous','ils','sont','se','ne','à','ou',
    'mon','ma','mes','ton','ta','ses','son','notre','votre','leurs',
    'ça','a','y',
  ]);
  const freq: Record<string, number> = {};
  texts.forEach(t =>
    t.toLowerCase()
      .replace(/[^a-zàâéèêîôùûç\s]/g, ' ')
      .split(/\s+/)
      .forEach(w => {
        if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
      })
  );
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([name, value]) => ({ name, value }));
}

// ─── Formatters ────────────────────────────────────────────────────────────
export const fmt = new Intl.NumberFormat('fr-FR');
export const fmtTooltip = (v: unknown) => fmt.format(Number(v));

// ─── Palette couleurs ───────────────────────────────────────────────────────
export const COLORS = {
  brand:  '#f97316',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  red:    '#ef4444',
  amber:  '#f59e0b',
  teal:   '#14b8a6',
  indigo: '#6366f1',
  pink:   '#ec4899',
  gray:   '#94a3b8',
} as const;

export const PIE_COLORS = [
  COLORS.brand, COLORS.blue, COLORS.green,
  COLORS.purple, COLORS.red, COLORS.amber,
];

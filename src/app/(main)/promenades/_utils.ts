// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(min: number | null): string {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export function getDifficultyLevel(d: 'facile' | 'moyen' | 'difficile'): number {
  return d === 'facile' ? 1 : d === 'moyen' ? 2 : 3;
}

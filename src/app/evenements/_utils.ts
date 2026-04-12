import { EVENT_CATEGORIES } from './_constants';

// ─── Helpers dates ────────────────────────────────────────────────────────────
export function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function daysUntil(dateStr: string): string | null {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return 'Demain';
  return `Dans ${diff} j.`;
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isThisWeekend(dateStr: string): boolean {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = today.getDay();
  const daysUntilSat = (6 - dayOfWeek + 7) % 7;
  const sat = new Date(today); sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  return d >= sat && d <= sun;
}

export function getCat(id: string) {
  return EVENT_CATEGORIES.find(c => c.id === id) ?? EVENT_CATEGORIES[0];
}

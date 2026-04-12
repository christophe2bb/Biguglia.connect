/**
 * src/lib/events/formatting.ts
 *
 * Helpers de formatage de dates et d'heures pour le module Événements.
 */

/**
 * Formate une date d'événement en français.
 * @example formatEventDate('2024-07-14') → "Dimanche 14 juillet 2024"
 */
export function formatEventDate(dateStr: string, withWeekday = true): string {
  const d = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = withWeekday
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  const s = d.toLocaleDateString('fr-FR', options);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formate une heure HH:MM:SS en HH:MM.
 * @example formatEventTime('18:30:00') → "18:30"
 */
export function formatEventTime(time: string): string {
  return time ? time.substring(0, 5) : '';
}

/**
 * Retourne le nombre de jours entre aujourd'hui et la date de l'événement.
 * Valeur négative si l'événement est passé.
 */
export function daysUntilEvent(dateStr: string): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Retourne un libellé humain pour la proximité d'un événement
 * (uniquement si dans les 7 prochains jours).
 * @example daysUntilLabel('2024-07-14') → "Dans 3 jours"
 */
export function daysUntilLabel(dateStr: string): string | null {
  const diff = daysUntilEvent(dateStr);
  if (diff === null || diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return 'Demain';
  if (diff <= 7)  return `Dans ${diff} jours`;
  return null;
}

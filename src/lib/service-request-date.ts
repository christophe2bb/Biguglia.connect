/** Date civile locale du navigateur, sans décalage UTC. */
export function localISODate(now: Date = new Date()): string {
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Refuse une date passée sans rejeter le champ facultatif vide. */
export function isPreferredDatePast(date: string, now: Date = new Date()): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < localISODate(now);
}

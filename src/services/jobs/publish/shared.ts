/**
 * jobs/publish/shared.ts
 *
 * Utilitaires partagés entre publish-offer et publish-demand.
 */

/**
 * Generate a URL-safe slug from a title + short UUID suffix.
 * e.g. "Cuisinier en saison été" → "cuisinier-en-saison-ete-a1b2c3d4"
 */
export function generateSlug(title: string, uid: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base}-${uid.slice(0, 8)}`;
}

/**
 * Calculate expiry date from today.
 * @param days Number of days from now.
 */
export function expiryDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

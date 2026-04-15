import 'server-only';

/**
 * Retourne l'URL canonique du site (sans slash final).
 * Lève une erreur au build si NEXT_PUBLIC_SITE_URL est absente ou vide,
 * ce qui garantit que les canonicals, le sitemap et robots.txt sont toujours corrects en production.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) {
    throw new Error(
      '[getSiteUrl] La variable NEXT_PUBLIC_SITE_URL est manquante ou vide. ' +
      'Ajoutez-la dans Vercel → Settings → Environment Variables.',
    );
  }
  return url.replace(/\/$/, '');
}

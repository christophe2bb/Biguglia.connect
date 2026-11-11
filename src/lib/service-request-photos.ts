/**
 * Photos des demandes Services : seul un devis adressé à un artisan
 * utilise un bucket privé et un lien de lecture authentifié.
 */
export const QUOTE_PHOTO_BUCKET = 'service-quote-photos' as const;
export const PHOTO_BUCKET = 'photos' as const;
export type ServicePhotoBucket = typeof QUOTE_PHOTO_BUCKET | typeof PHOTO_BUCKET;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,180}\.(jpg|jpeg|png|webp|gif)$/i;

export function quotePhotoUrl(id: string, file: string): string {
  if (!UUID.test(id) || !FILE.test(file) || file.includes('..')) {
    throw new Error('Nom de photo privée invalide');
  }
  return `/api/service-requests/${id}/photos/${file}`;
}

export function servicePhotoLocation(url: string, id: string): {
  bucket: ServicePhotoBucket;
  path: string;
} | null {
  if (!UUID.test(id)) return null;
  const prefix = `requests/${id}/`;
  const privateUrl = `/api/service-requests/${id}/photos/`;
  if (url.startsWith(privateUrl)) {
    const name = url.slice(privateUrl.length);
    return FILE.test(name) && !name.includes('..')
      ? { bucket: QUOTE_PHOTO_BUCKET, path: prefix + name }
      : null;
  }

  try {
    const parsed = new URL(url);
    if (!/^https:$/.test(parsed.protocol) || parsed.search || parsed.hash) return null;
    const marker = '/storage/v1/object/public/photos/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0 || parsed.pathname.indexOf(marker, index + marker.length) !== -1) return null;
    const path = parsed.pathname.slice(index + marker.length);
    if (!path.startsWith(prefix)) return null;
    const filename = path.slice(prefix.length);
    if (!FILE.test(filename) || filename.includes('..')) return null;
    return { bucket: PHOTO_BUCKET, path };
  } catch {
    return null;
  }
}

import { describe, expect, it } from 'vitest';
import { quotePhotoUrl, servicePhotoLocation, QUOTE_PHOTO_BUCKET } from '../service-request-photos';

const id = '00000000-0000-4000-8000-000000000104';
const filename = 'quote_2026.jpg';

describe('Services — URL et chemin de photo', () => {
  it('crée un lien privé relatif, non public', () => {
    expect(quotePhotoUrl(id, filename)).toBe('/api/service-requests/' + id + '/photos/' + filename);
    expect(servicePhotoLocation(quotePhotoUrl(id, filename), id)).toEqual({
      bucket: QUOTE_PHOTO_BUCKET,
      path: 'requests/' + id + '/' + filename,
    });
  });

  it('conserve la compatibilité des photos de demande publique', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/photos/requests/' + id + '/' + filename;
    expect(servicePhotoLocation(url, id)).toEqual({ bucket: 'photos', path: 'requests/' + id + '/' + filename });
  });

  it('rejette une photo privée appartenant à une autre demande', () => {
    const another = '00000000-0000-4000-8000-000000000105';
    expect(servicePhotoLocation(quotePhotoUrl(another, filename), id)).toBeNull();
  });

  it('refuse les traversées, paramètres et extensions dangereuses', () => {
    expect(() => quotePhotoUrl(id, '../secret.jpg')).toThrow();
    expect(servicePhotoLocation('/api/service-requests/' + id + '/photos/pic.jpg?secret=1', id)).toBeNull();
    expect(servicePhotoLocation('/api/service-requests/' + id + '/photos/pic.svg', id)).toBeNull();
    expect(servicePhotoLocation('https://project.supabase.co/storage/v1/object/public/photos/requests/' + id + '/../other.jpg', id)).toBeNull();
  });
});

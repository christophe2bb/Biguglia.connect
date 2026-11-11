import { createClient } from '@/lib/supabase/client';
import type { ServicePhotoBucket } from '@/lib/service-request-photos';

/**
 * Suppression de photos par l'API, avec vérification de propriété côté serveur.
 * Ne donne jamais d'accès Storage DELETE direct au navigateur.
 */
export async function deletePhotoFiles(paths: string[], bucket: ServicePhotoBucket = 'photos'): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch('/api/storage/photos', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ paths, bucket }),
  });

  if (!response.ok) {
    throw new Error(`Suppression de photos refusée (HTTP ${response.status})`);
  }
}

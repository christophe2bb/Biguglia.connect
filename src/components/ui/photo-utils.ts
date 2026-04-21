/**
 * src/components/ui/photo-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitaires photos SANS 'use client' — importables depuis Server Components.
 *
 * Séparés de PhotoViewer.tsx (qui est 'use client') pour éviter que les
 * Server Components importent un module marqué 'use client' et déclenchent
 * une erreur de module boundary dans Next.js App Router.
 */

export interface PhotoItem {
  id?: string;
  url: string;
  display_order?: number;
  isPrimary?: boolean; // photo principale (index 0 ou marquée)
}

/**
 * Convertit un tableau de photos DB en PhotoItem[].
 * Trie par display_order, marque la première comme primaire.
 * Pure function — safe côté serveur ET côté client.
 */
export function toPhotoItems(
  photos: Array<{ url: string; display_order?: number; id?: string }> | null | undefined,
): PhotoItem[] {
  if (!photos?.length) return [];
  return [...photos]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((p, i) => ({ ...p, isPrimary: i === 0 }));
}

/**
 * src/lib/upload-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitaires sécurisés pour les uploads de fichiers côté client.
 *
 * Corrige CWE-22 (Path Traversal) : sans validation, file.name.split('.').pop()
 * peut retourner une extension arbitraire (ex. "php", "sh", "../evil") si le
 * fichier est renommé par un attaquant avant l'envoi.
 *
 * Principe de défense :
 *   1. Extraction de l'extension brute via split('.').pop()
 *   2. Normalisation en minuscule
 *   3. Vérification contre une allowlist stricte
 *   4. Fallback vers une extension sûre par défaut si non reconnue
 *
 * Usage :
 *   import { safeImageExt, safeDocExt } from '@/lib/upload-utils';
 *   const ext = safeImageExt(file.name);           // "jpg" | "jpeg" | "png" | "webp" | "gif"
 *   const ext = safeDocExt(file.name);             // "pdf" | "jpg" | "jpeg" | "png" | "webp"
 *   const path = `folder/${id}/${Date.now()}.${ext}`;
 */

/** Extensions autorisées pour les photos. */
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

/** Extensions autorisées pour les documents (CV, pièces justificatives). */
const ALLOWED_DOC_EXTS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

/**
 * Extrait et valide l'extension d'un nom de fichier image.
 * Retourne toujours une valeur de la liste blanche.
 *
 * @param filename  - Nom du fichier (ex. "photo.JPG", "img.php", "../../etc/passwd")
 * @param fallback  - Extension par défaut si non reconnue (default: "jpg")
 */
export function safeImageExt(filename: string, fallback = 'jpg'): string {
  const raw = filename.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_IMAGE_EXTS.has(raw) ? raw : fallback;
}

/**
 * Extrait et valide l'extension d'un nom de fichier document (CV, PDF…).
 * Retourne toujours une valeur de la liste blanche.
 *
 * @param filename  - Nom du fichier
 * @param fallback  - Extension par défaut si non reconnue (default: "pdf")
 */
export function safeDocExt(filename: string, fallback = 'pdf'): string {
  const raw = filename.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_DOC_EXTS.has(raw) ? raw : fallback;
}

/**
 * Extrait le chemin de stockage Supabase depuis une URL publique de façon sûre.
 *
 * Protège contre le path traversal lors de la suppression de fichiers :
 * un `photo.url` forgé avec `../` pourrait pointer en dehors du bucket attendu.
 *
 * Retourne `null` si l'URL ne correspond pas exactement au préfixe attendu,
 * ou si le chemin extrait contient des séquences de traversée (`..`).
 *
 * @param publicUrl  - URL publique Supabase (ex. "https://…/storage/v1/object/public/photos/…")
 * @param bucket     - Nom du bucket (ex. "photos", "documents")
 */
export function safeStoragePath(publicUrl: string, bucket: string): string | null {
  const separator = `/storage/v1/object/public/${bucket}/`;
  const parts = publicUrl.split(separator);
  if (parts.length !== 2 || !parts[1]) return null;
  const storagePath = parts[1];
  // Reject path traversal attempts
  if (storagePath.includes('..') || storagePath.startsWith('/')) return null;
  return storagePath;
}

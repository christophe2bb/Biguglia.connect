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
 *   import { safeImageExt, safeDocExt, safeRelativePath } from '@/lib/upload-utils';
 *   const ext  = safeImageExt(file.name);           // "jpg" | "jpeg" | "png" | "webp" | "gif"
 *   const ext  = safeDocExt(file.name);             // "pdf" | "jpg" | "jpeg" | "png" | "webp"
 *   const path = `folder/${id}/${Date.now()}.${ext}`;
 *
 *   // Pour valider un chemin relatif issu de la base de données avant createSignedUrl :
 *   const safe = safeRelativePath(storagePath); // null si traversée détectée
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

/**
 * Valide un chemin relatif Supabase Storage issu de la base de données.
 *
 * Usage : chemins stockés directement en BDD (ex. "userId/doc.pdf"),
 * avant de les passer à createSignedUrl() ou remove().
 * Contrairement à safeStoragePath() (qui attend une URL publique complète),
 * cette fonction accepte directement le chemin relatif.
 *
 * Protège contre CWE-22 : rejette tout chemin contenant ".." (traversée),
 * commençant par "/" (chemin absolu), ou vide.
 *
 * @param   relativePath - Chemin relatif (ex. "userId/doc.pdf", "documents/id/cv.pdf")
 * @returns Le chemin nettoyé du préfixe de bucket optionnel, ou null si invalide.
 *
 * @example
 *   safeRelativePath('userId/cv.pdf')            // → 'userId/cv.pdf'
 *   safeRelativePath('documents/userId/cv.pdf')  // → 'userId/cv.pdf'  (strip bucket prefix)
 *   safeRelativePath('../secret')                // → null
 *   safeRelativePath('/etc/passwd')              // → null
 */
export function safeRelativePath(
  relativePath: string,
  stripBucketPrefix?: string,
): string | null {
  if (!relativePath) return null;
  // Strip optional bucket prefix (ex. "documents/" → "")
  const path = stripBucketPrefix
    ? relativePath.replace(new RegExp(`^${stripBucketPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/`), '')
    : relativePath;
  // Reject path traversal and absolute paths
  if (path.includes('..') || path.startsWith('/') || !path) return null;
  return path;
}

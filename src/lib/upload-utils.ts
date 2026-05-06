/**
 * src/lib/upload-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitaires sécurisés pour les uploads de fichiers côté client.
 *
 * ## Architecture de sécurité upload (double couche)
 *
 * COUCHE 1 — Client (ce fichier) :
 *   • safeImageExt / safeDocExt : valide l'extension pour construire le path
 *   • uploadFile()              : envoie via /api/upload (jamais direct Supabase)
 *
 * COUCHE 2 — Serveur (src/app/api/upload/route.ts) :
 *   • Authentification obligatoire (session Supabase)
 *   • Validation magic bytes via `file-type` (FF D8 FF = JPEG réel, etc.)
 *   • Rejet de tout fichier dont le contenu réel ≠ son extension déclarée
 *   • Content-Type imposé = valeur détectée, pas celle du client
 *
 * Corrige CWE-22 (Path Traversal) et CWE-434 (Unrestricted Upload) :
 *   • L'extension client-side (safeImageExt) protège le nom de fichier
 *   • La validation magic-bytes serveur protège le contenu réel
 *
 * Usage recommandé :
 *   import { safeImageExt, uploadFile } from '@/lib/upload-utils';
 *   const ext = safeImageExt(file.name);
 *   const path = `photos/${userId}/${Date.now()}.${ext}`;
 *   const url = await uploadFile(file, 'photos', path); // valide les magic bytes côté serveur
 *
 *   // Pour valider un chemin relatif issu de la base de données avant createSignedUrl :
 *   const safe = safeRelativePath(storagePath); // null si traversée détectée
 */

/**
 * Envoie un fichier vers /api/upload (validation magic-bytes côté serveur).
 *
 * Ne jamais appeler supabase.storage.upload() directement depuis un composant
 * client — utiliser cette fonction à la place.
 *
 * @param file    - Fichier à uploader (File ou Blob)
 * @param bucket  - Bucket cible : "photos" | "job-documents" | "documents"
 * @param path    - Chemin relatif dans le bucket (ex. "userId/1234567890.jpg")
 * @param ownerId - UUID de l'utilisateur propriétaire du chemin.
 *                  Obligatoire pour les chemins entité-scopés (ex. listings/{id}/...).
 *                  Pour les chemins directement user-scopés (ex. {userId}/avatar.jpg),
 *                  peut être omis si le premier segment du chemin est déjà le userId.
 * @returns URL publique du fichier uploadé (ou chemin relatif pour les buckets privés)
 * @throws Error si le serveur rejette le fichier (type invalide, trop gros, non authentifié…)
 *
 * @example
 *   // Chemin directement user-scopé — ownerId optionnel (mais recommandé) :
 *   const url = await uploadFile(photo, 'photos', `${userId}/avatar.jpg`, userId);
 *
 *   // Chemin entité-scopé — ownerId obligatoire :
 *   const url = await uploadFile(photo, 'photos', `listings/${listingId}/${Date.now()}.jpg`, userId);
 */
/**
 * Compresse une image côté client via Canvas avant l'upload.
 * - Redimensionne à max 1920px (grande dimension)
 * - Qualité JPEG 0.82 → ~300-800 KB pour une photo de téléphone
 * - Ne touche pas aux GIF/AVIF (pas supportés par canvas.toBlob JPEG)
 * - Retourne le fichier original si la compression échoue ou si déjà petit
 */
export async function compressImage(
  file: File,
  maxPx = 1920,
  quality = 0.82,
): Promise<File> {
  // Forcer la conversion en JPEG pour les formats non supportés par Supabase bucket :
  // AVIF, HEIC, HEIF → on les convertit via Canvas même s'ils sont petits.
  const MUST_CONVERT = ['image/avif', 'image/heic', 'image/heif'];
  const mustConvert = MUST_CONVERT.includes(file.type);

  // Ne pas compresser si déjà sous 1.5 MB et format compatible (sauf MUST_CONVERT)
  if (!mustConvert && file.size <= 1.5 * 1024 * 1024) return file;
  // Ne pas tenter de compresser les GIF (animations) sauf conversion forcée
  if (!mustConvert && !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'].includes(file.type)) return file;

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else                 { width  = Math.round(width  * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          // Pour les formats à conversion forcée (AVIF/HEIC/HEIF), on accepte même
          // si le blob est plus grand — l'important est d'avoir un format compatible.
          if (!blob) { resolve(file); return; }
          if (!mustConvert && blob.size >= file.size) { resolve(file); return; }
          // Garder le nom original mais extension .jpg (canvas produit JPEG)
          const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export async function uploadFile(
  file: File | Blob,
  bucket: 'photos' | 'job-documents' | 'documents',
  path: string,
  ownerId?: string,
  /** Bearer token Supabase (access_token) — à passer pour garantir l'auth
   *  même si les cookies sont expirés (ex. après timeout AuthProvider). */
  accessToken?: string,
): Promise<string> {
  // Compression automatique pour les photos (bucket 'photos' uniquement)
  let fileToUpload = file;
  if (bucket === 'photos' && file instanceof File) {
    fileToUpload = await compressImage(file);
    // Adapter le path si l'extension a changé (.jpg après compression)
    if (fileToUpload !== file && path.match(/\.(png|webp)$/i)) {
      path = path.replace(/\.[^.]+$/, '.jpg');
    }
  }

  const form = new FormData();
  form.append('file',   fileToUpload);
  form.append('bucket', bucket);
  form.append('path',   path);
  if (ownerId) form.append('ownerId', ownerId);

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch('/api/upload', { method: 'POST', body: form, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; detected?: string };
    const detail = body.error ?? `HTTP ${res.status}`;
    throw new Error(`Upload refusé : ${detail}`);
  }

  const { url } = await res.json() as { url: string; path: string };
  return url;
}

/**
 * Comme uploadFile(), mais retourne le chemin Storage relatif au lieu de l'URL publique.
 * Utile pour les buckets privés (ex. "documents") où l'URL publique est vide.
 *
 * @param ownerId - UUID de l'utilisateur propriétaire du chemin (voir uploadFile()).
 *
 * @example
 *   const path = await uploadFileGetPath(file, 'documents', `${userId}/cv.pdf`, userId);
 *   // stocker `documents/${path}` en BDD, puis createSignedUrl pour lecture admin
 */
export async function uploadFileGetPath(
  file: File | Blob,
  bucket: 'documents' | 'job-documents',
  path: string,
  ownerId?: string,
): Promise<string> {
  const form = new FormData();
  form.append('file',   file);
  form.append('bucket', bucket);
  form.append('path',   path);
  if (ownerId) form.append('ownerId', ownerId);

  const res = await fetch('/api/upload', { method: 'POST', body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; detected?: string };
    const detail = body.error ?? `HTTP ${res.status}`;
    throw new Error(`Upload refusé : ${detail}`);
  }

  const { path: storagePath } = await res.json() as { url: string; path: string };
  return storagePath;
}

/** Extensions autorisées pour les photos. */
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

/**
 * Valeur à passer à l'attribut `accept` des `<input type="file">`.
 * Limite le sélecteur de fichiers aux seuls formats acceptés par le serveur,
 * empêchant les utilisateurs de sélectionner HEIC, BMP, TIFF, RAW, etc.
 * qui seraient rejetés par la validation magic-bytes côté serveur.
 */
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

/**
 * Taille maximale d'une photo acceptée côté client avant compression (en Mo).
 * La compression ramène automatiquement les fichiers sous 5 MB avant l'upload.
 * On accepte jusqu'à 20 MB bruts — cas réels : photos iPhone 12 MP ≈ 8-12 MB.
 */
export const MAX_PHOTO_MB = 20;

/**
 * Vérifie que le type MIME d'un fichier est accepté par le serveur.
 * À appeler côté client avant l'upload pour afficher un message d'erreur
 * immédiat plutôt que d'attendre un 415 du serveur.
 *
 * @param file - Fichier à valider
 * @returns true si le type est accepté, false sinon
 */
export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.split(',').includes(file.type);
}

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

/**
 * POST /api/upload
 * ──────────────────────────────────────────────────────────────────────────────
 * Proxy d'upload sécurisé : reçoit un fichier du navigateur, valide le contenu
 * réel via les magic bytes (signature binaire), puis le transfère vers Supabase
 * Storage.
 *
 * ## Pourquoi ce proxy existe
 *
 * L'upload direct client → Supabase ne valide QUE l'extension du nom de fichier
 * côté client (safeImageExt). Ce contrôle est insuffisant :
 *
 *   • file.type  est la valeur déclarée par le navigateur, forgeable en JS.
 *   • L'extension peut être renommée avant l'envoi (evil.php → photo.jpg).
 *   • Un SVG contenant <script> ou un HTML avec JS exécutable passe inaperçu.
 *
 * Cette route lit les 12 premiers bytes du fichier et vérifie la signature
 * binaire réelle (magic bytes) via le package `file-type` :
 *
 *   FF D8 FF        → JPEG
 *   89 50 4E 47     → PNG
 *   52 49 46 46     → WebP (RIFF…WEBP)
 *   47 49 46 38     → GIF
 *   00 00 00 xx 66 74 79 70 61 76 69 66 → AVIF
 *
 * Seuls ces 5 types sont autorisés. Tout autre contenu (PDF, SVG, HTML, PHP,
 * EXE, ZIP…) est rejeté avec 415 Unsupported Media Type.
 *
 * ## Flux de sécurité
 *
 *   Client → POST /api/upload (FormData) → magic-bytes check → Supabase Storage
 *
 * ## Buckets supportés
 *
 *   • photos         — images publiques (annonces, événements, profils…)
 *   • job-documents  — documents emploi (CV, pièces justificatives)
 *
 * ## Authentification
 *
 *   Requiert une session Supabase valide (cookie ou Bearer token).
 *   Un utilisateur non authentifié reçoit 401.
 *
 * ## Rate-limiting
 *
 *   Assuré par le middleware global (/api/* → 200 req/min).
 *   Le middleware applicatif peut être renforcé ici si besoin.
 *
 * ## Paramètres FormData
 *
 *   file     : Blob/File — le fichier à uploader
 *   bucket   : string   — "photos" | "job-documents"
 *   path     : string   — chemin de destination dans le bucket
 *                         (ex. "userId/1234567890.jpg")
 *
 * ## Réponses
 *
 *   200 { url: string }                     — URL publique du fichier uploadé
 *   400 { error: string }                   — Paramètre manquant ou invalide
 *   401 { error: "Non authentifié" }        — Session absente ou expirée
 *   413 { error: "Fichier trop volumineux" }— > 5 MB
 *   415 { error: "Type de fichier non autorisé", detected: string }
 *   500 { error: string }                   — Erreur Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-helper';
import { safeRelativePath } from '@/lib/upload-utils';

export const runtime = 'nodejs'; // file-type requires Node.js (Buffer API)
export const dynamic = 'force-dynamic';

// ── Configuration ─────────────────────────────────────────────────────────────

/** Taille maximale par bucket */
const MAX_SIZE_BY_BUCKET: Record<string, number> = {
  'photos':        5  * 1024 * 1024, // 5 MB
  'job-documents': 10 * 1024 * 1024, // 10 MB
  'documents':     10 * 1024 * 1024, // 10 MB — bucket privé artisans
};
/** Fallback si bucket non listé */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Buckets autorisés */
const ALLOWED_BUCKETS = new Set(['photos', 'job-documents', 'documents']);

/**
 * Types MIME réels autorisés (vérifiés par magic bytes, pas par file.type).
 * SVG intentionnellement exclu : peut contenir du JavaScript exécutable.
 * WebP inclus : signature RIFF…WEBP reconnue par file-type.
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  // Documents emploi uniquement :
  'application/pdf',
]);

/** Types MIME autorisés par bucket (contrôle secondaire après magic bytes) */
const BUCKET_ALLOWED_TYPES: Record<string, Set<string>> = {
  'photos':        new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  'job-documents': new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  'documents':     new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {

  // ① Authentification — session ou Bearer token
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ② Parser le FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const file   = formData.get('file');
  const bucket = formData.get('bucket');
  const path   = formData.get('path');

  // ③ Validation des paramètres
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Paramètre "file" manquant ou invalide' }, { status: 400 });
  }
  if (typeof bucket !== 'string' || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json(
      { error: `Bucket invalide. Valeurs autorisées : ${[...ALLOWED_BUCKETS].join(', ')}` },
      { status: 400 },
    );
  }
  if (typeof path !== 'string' || !path) {
    return NextResponse.json({ error: 'Paramètre "path" manquant' }, { status: 400 });
  }

  // ④ Validation du path (anti path-traversal)
  const safePath = safeRelativePath(path);
  if (!safePath) {
    return NextResponse.json({ error: 'Chemin de fichier invalide' }, { status: 400 });
  }

  // ⑤ Validation de la taille (avant de lire tout le buffer en mémoire)
  const maxBytes = MAX_SIZE_BY_BUCKET[bucket] ?? MAX_SIZE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${maxBytes / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  // ⑥ Lecture du buffer complet et détection des magic bytes
  const buffer = Buffer.from(await file.arrayBuffer());

  // fileTypeFromBuffer inspecte les premiers bytes (jusqu'à 4100 bytes)
  // pour identifier le type RÉEL du fichier, indépendamment de l'extension
  // et du Content-Type déclaré par le client.
  const detected = await fileTypeFromBuffer(buffer);

  // ⑦ Vérification du type MIME réel
  const detectedMime = detected?.mime ?? 'application/octet-stream';

  if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
    return NextResponse.json(
      {
        error: 'Type de fichier non autorisé. Seuls JPEG, PNG, WebP, GIF, AVIF et PDF sont acceptés.',
        detected: detectedMime,
      },
      { status: 415 },
    );
  }

  // ⑧ Vérification bucket × type (ex: pas de PDF dans le bucket photos)
  const bucketAllowed = BUCKET_ALLOWED_TYPES[bucket];
  if (bucketAllowed && !bucketAllowed.has(detectedMime)) {
    return NextResponse.json(
      {
        error: `Type "${detectedMime}" non autorisé dans le bucket "${bucket}".`,
        detected: detectedMime,
      },
      { status: 415 },
    );
  }

  // ⑨ Upload vers Supabase Storage via le client admin
  // Le client admin bypasse les RLS Storage pour permettre l'upload depuis
  // une API Route — la sécurité est garantie par la vérification d'auth (①)
  // et la validation magic-bytes (⑦).
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, buffer, {
      upsert: true,
      contentType: detectedMime, // on impose le vrai MIME, pas celui du client
    });

  if (error || !data) {
    return NextResponse.json(
      { error: `Erreur Supabase Storage : ${error?.message ?? 'inconnue'}` },
      { status: 500 },
    );
  }

  // ⑩ Récupérer l'URL publique et retourner url + path
  // Pour les buckets privés (documents), publicUrl sera vide mais path sera utilisable
  // pour créer une URL signée via createSignedUrl().
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, path: data.path }, { status: 200 });
}

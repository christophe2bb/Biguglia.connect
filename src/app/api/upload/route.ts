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
 *   Client → POST /api/upload (FormData) → auth → ownership → magic-bytes → Supabase Storage
 *
 * ## Buckets supportés
 *
 *   • photos         — images publiques (annonces, événements, profils…)
 *   • job-documents  — documents emploi (CV, pièces justificatives)
 *   • documents      — documents privés artisans (bucket privé)
 *
 * ## Authentification
 *
 *   Requiert une session Supabase valide (cookie ou Bearer token).
 *   Un utilisateur non authentifié reçoit 401.
 *
 * ## Validation du chemin (IDOR — CWE-639)
 *
 *   Toute la sécurité reposant sur la validation applicative (client admin
 *   bypass RLS), le chemin fourni par le client DOIT être validé côté serveur.
 *
 *   Règle : safePath.startsWith(`${userId}/`) **ou** l'entité référencée
 *   dans le chemin appartient à l'utilisateur connecté.
 *
 *   Deux stratégies selon le préfixe du chemin :
 *
 *   A. Chemins user-scoped  (premier segment = userId) :
 *      Vérifié par la règle startsWith(`${userId}/`).
 *      Ex. : `{userId}/avatar.jpg`, `{userId}/doc-label-ts.pdf`
 *
 *   B. Chemins entity-scoped (premier segment = catégorie) :
 *      L'entité référencée (2ème segment = entity UUID) est vérifiée en base
 *      via validatePathOwnership() : SELECT user_id FROM <table> WHERE id=?
 *      Ex. : `listings/{id}/ts.jpg`, `events/{id}/ts.jpg`, `cv/{demandId}.pdf`
 *
 *   Exception admin : le préfixe `__diagnostic__/` est réservé aux admins.
 *
 * ## Rate-limiting
 *
 *   Assuré par le middleware global (/api/* → 200 req/min).
 *   Le middleware applicatif peut être renforcé ici si besoin.
 *
 * ## Paramètres FormData
 *
 *   file     : Blob/File — le fichier à uploader
 *   bucket   : string   — "photos" | "job-documents" | "documents"
 *   path     : string   — chemin de destination dans le bucket
 *                         (ex. "userId/1234567890.jpg")
 *
 * ## Réponses
 *
 *   200 { url: string }                     — URL publique du fichier uploadé
 *   400 { error: string }                   — Paramètre manquant ou invalide
 *   401 { error: "Non authentifié" }        — Session absente ou expirée
 *   403 { error: "Chemin non autorisé" }    — IDOR : chemin hors périmètre user
 *   413 { error: "Fichier trop volumineux" }— > 5 MB
 *   415 { error: "Type de fichier non autorisé", detected: string }
 *   500 { error: string }                   — Erreur Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe } from '@/lib/supabase/auth-helper';
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

// ── Validation d'ownership (IDOR — CWE-639) ───────────────────────────────────

/**
 * Mapping préfixe de chemin → table Supabase + colonne user.
 *
 * Pour chaque catégorie, on connaît :
 *   - table    : table Supabase contenant l'entité
 *   - idColumn : colonne de clé primaire (UUID)
 *   - userCol  : colonne référençant l'auteur (doit être = userId)
 *   - idSegment: indice du segment du chemin contenant l'UUID de l'entité
 *                (ex. "listings/UUID/ts.jpg" → idSegment=1)
 */
interface OwnershipRule {
  table: string;
  idColumn: string;
  userCol: string;
  idSegment: number;
}

const ENTITY_OWNERSHIP_RULES: Record<string, OwnershipRule> = {
  // table            vraie table DB          PK       colonne owner              segment
  listings:        { table: 'listings',         idColumn: 'id', userCol: 'user_id',      idSegment: 1 },
  artisans:        { table: 'artisan_profiles', idColumn: 'id', userCol: 'user_id',      idSegment: 1 },
  requests:        { table: 'service_requests', idColumn: 'id', userCol: 'resident_id',  idSegment: 1 }, // ⚠️ resident_id (pas user_id)
  events:          { table: 'events',           idColumn: 'id', userCol: 'author_id',    idSegment: 1 }, // ⚠️ author_id
  associations:    { table: 'associations',     idColumn: 'id', userCol: 'author_id',    idSegment: 1 }, // ⚠️ author_id
  'coups-de-main': { table: 'help_requests',   idColumn: 'id', userCol: 'author_id',    idSegment: 1 }, // ⚠️ table=help_requests, author_id
  'lost-found':    { table: 'lost_found_items', idColumn: 'id', userCol: 'author_id',   idSegment: 1 }, // ⚠️ table=lost_found_items, author_id
  promenades:      { table: 'promenades',       idColumn: 'id', userCol: 'author_id',    idSegment: 1 }, // ⚠️ author_id
  outings:         { table: 'group_outings',    idColumn: 'id', userCol: 'organizer_id', idSegment: 1 }, // ⚠️ table=group_outings, organizer_id
  equipment:       { table: 'equipment_items',  idColumn: 'id', userCol: 'owner_id',     idSegment: 1 }, // ⚠️ table=equipment_items, owner_id
  forum:           { table: 'forum_topics',     idColumn: 'id', userCol: 'author_id',    idSegment: 1 }, // ⚠️ author_id
  cv:              { table: 'job_demands',      idColumn: 'id', userCol: 'user_id',      idSegment: 1 },
  collection:      { table: 'profiles',         idColumn: 'id', userCol: 'id',           idSegment: 1 }, // profile.id = owner
};

/**
 * Vérifie que le chemin est strictement borné à l'utilisateur connecté (IDOR).
 *
 * Stratégie en trois niveaux :
 *
 * 1. Chemin user-scoped   : premier segment = userId → autorisé directement.
 * 2. Chemin entity-scoped : premier segment = catégorie connue →
 *    vérifie en base que l'entité référencée appartient à userId.
 * 3. Chemin admin          : préfixe "__diagnostic__/" → vérifie rôle admin.
 *
 * @returns `null` si le chemin est autorisé.
 * @returns `NextResponse` 403 si l'accès est refusé.
 */
async function validatePathOwnership(
  safePath: string,
  userId: string,
): Promise<NextResponse | null> {
  const segments = safePath.split('/');
  const firstSegment = segments[0];

  // ── Niveau 1 : chemin user-scoped ────────────────────────────────────────────
  // Le premier segment EST l'userId (UUID v4).
  // Ex. : `{userId}/avatar.jpg`, `{userId}/doc-label-ts.pdf`
  if (firstSegment === userId) {
    return null; // autorisé
  }

  // ── Niveau 2 : chemin entity-scoped ─────────────────────────────────────────
  const rule = ENTITY_OWNERSHIP_RULES[firstSegment];
  if (rule) {
    const entityId = segments[rule.idSegment];
    if (!entityId) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(rule.table)
      .select(rule.userCol)
      .eq(rule.idColumn, entityId)
      .single();

    if (error || !data) {
      // Entité introuvable → refus (ne pas révéler l'existence ou non)
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    const ownerField = data as unknown as Record<string, unknown>;
    if (ownerField[rule.userCol] !== userId) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    return null; // autorisé
  }

  // ── Niveau 3 : préfixe admin ─────────────────────────────────────────────────
  // `__diagnostic__/` est réservé aux admins.
  if (firstSegment === '__diagnostic__') {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    const role = (data as { role?: string } | null)?.role;
    if (role === 'admin' || role === 'moderator') {
      return null; // autorisé
    }
    return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
  }

  // ── Par défaut : préfixe inconnu → refus ────────────────────────────────────
  return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {

  // ① CSRF — upload-utils.ts n'envoie pas de Bearer → cookie-only possible
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError as NextResponse;

  // ② Authentification — session ou Bearer token
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  const userId = user.id;

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

  // ④ Validation du path (anti path-traversal — CWE-22)
  const safePath = safeRelativePath(path);
  if (!safePath) {
    return NextResponse.json({ error: 'Chemin de fichier invalide' }, { status: 400 });
  }

  // ④-bis Validation d'ownership (anti IDOR — CWE-639)
  // Garantit qu'un utilisateur ne peut écrire QUE dans son périmètre :
  // soit son dossier personnel (userId/…), soit une entité dont il est auteur.
  const ownershipError = await validatePathOwnership(safePath, userId);
  if (ownershipError) return ownershipError;

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
  // une API Route — la sécurité est garantie par :
  //   • vérification d'auth (①)
  //   • validation d'ownership (④-bis)
  //   • validation magic-bytes (⑦)
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

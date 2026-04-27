/**
 * Tests unitaires pour POST /api/upload
 * ──────────────────────────────────────────────────────────────────────────────
 * Vérifie la validation magic-bytes, les contrôles d'authentification,
 * la validation de paramètres, la protection path-traversal (CWE-22)
 * et la validation d'ownership (IDOR — CWE-639).
 *
 * Architecture testée :
 *   Client → POST /api/upload
 *     → ① Auth
 *     → ② FormData
 *     → ③ Paramètres
 *     → ④ Path traversal
 *     → ④-bis Ownership (userId/ ou entity ownership via DB)
 *     → ⑤ Taille
 *     → ⑥ Magic-bytes
 *     → ⑦ MIME
 *     → ⑧ Bucket × type
 *     → ⑨ Supabase Storage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers pour créer des fichiers binaires de test ─────────────────────────

/** Magic bytes JPEG : FF D8 FF E0 */
function jpegBuffer(extraBytes = 100): Uint8Array {
  const buf = new Uint8Array(4 + extraBytes);
  buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF; buf[3] = 0xE0;
  return buf;
}

/**
 * Minimal valid 1×1 PNG (includes IHDR chunk so file-type can detect it).
 * Pure magic bytes + partial header are NOT sufficient — file-type needs the IHDR.
 */
function pngBuffer(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D,                           // IHDR length (13)
    0x49, 0x48, 0x44, 0x52,                           // "IHDR"
    0x00, 0x00, 0x00, 0x01,                           // width: 1
    0x00, 0x00, 0x00, 0x01,                           // height: 1
    0x08, 0x02,                                       // bit depth 8, colour type 2 (RGB)
    0x00, 0x00, 0x00,                                 // compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE,                           // CRC32
  ]);
}

/** Faux JPEG : octets PHP au lieu du vrai JPEG (attaque extension forgée) */
function phpInJpegBuffer(): Uint8Array {
  const phpCode = '<?php system($_GET["cmd"]); ?>';
  return new TextEncoder().encode(phpCode);
}

/** Faux JPEG : SVG avec script JS */
function svgInJpegBuffer(): Uint8Array {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  return new TextEncoder().encode(svg);
}

/** Buffer PDF : %PDF-1.4 */
function pdfBuffer(extraBytes = 100): Uint8Array {
  const header = new TextEncoder().encode('%PDF-1.4\n');
  const buf = new Uint8Array(header.length + extraBytes);
  buf.set(header);
  return buf;
}

// ── Constantes de test ────────────────────────────────────────────────────────

const TEST_USER_ID   = 'user-uuid-123';
const OTHER_USER_ID  = 'other-user-uuid-456';
const ENTITY_UUID    = 'entity-uuid-789';

// ── Mocks des dépendances ─────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Mock getUserFromRequest — par défaut : authentifié (retourne { id, email })
// Mock assertCsrfSafe — par défaut : requête safe (retourne null)
const mockGetUser = vi.fn();
const mockAssertCsrfSafe = vi.fn();
vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserFromRequest: mockGetUser,
  assertCsrfSafe: mockAssertCsrfSafe,
}));

// Mock createAdminClient — gère storage ET les requêtes ownership (from/select/eq/single)
const mockUpload    = vi.fn();
const mockGetUrl    = vi.fn();
const mockSingle    = vi.fn();
const mockEq        = vi.fn(() => ({ single: mockSingle }));
const mockSelect    = vi.fn(() => ({ eq: mockEq }));
const mockFromTable = vi.fn(() => ({ select: mockSelect }));

const mockStorage = {
  from: vi.fn(() => ({
    upload:       mockUpload,
    getPublicUrl: mockGetUrl,
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    storage: mockStorage,
    from: mockFromTable,
  })),
}));

// Mock safeRelativePath — déléguer à l'implémentation réelle
vi.mock('@/lib/upload-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/upload-utils')>();
  return actual;
});

// ── Utilitaire : créer un NextRequest POST avec FormData ──────────────────────

function makeRequest(
  fileBytes: Uint8Array | null,
  bucket   = 'photos',
  path     = `${TEST_USER_ID}/image.jpg`,
  filename = 'photo.jpg',
): NextRequest {
  const formData = new FormData();
  if (fileBytes !== null) {
    // Cast to ArrayBuffer to satisfy strict TypeScript Blob constructor typing
    const blob = new Blob([fileBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, filename);
  }
  formData.append('bucket', bucket);
  formData.append('path', path);

  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

// ── Suite de tests ─────────────────────────────────────────────────────────────

describe('POST /api/upload', () => {

  beforeEach(() => {
    vi.resetModules();
    // Par défaut : utilisateur authentifié (objet { id, email })
    mockGetUser.mockResolvedValue({ id: TEST_USER_ID, email: 'test@example.com' });
    // Par défaut : requête CSRF safe (null = pas d'erreur)
    mockAssertCsrfSafe.mockReturnValue(null);
    // Par défaut : upload Supabase réussi
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/image.jpg` }, error: null });
    mockGetUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/test/image.jpg' } });
    // Par défaut : entité appartient à l'utilisateur connecté
    mockSingle.mockResolvedValue({ data: { user_id: TEST_USER_ID, id: TEST_USER_ID }, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── ① CSRF ──────────────────────────────────────────────────────────────────

  it('retourne 403 si la vérification CSRF échoue (requête cross-site cookie-only)', async () => {
    mockAssertCsrfSafe.mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF check failed' }), { status: 403 }),
    );
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer()));
    expect(res.status).toBe(403);
    // getUserFromRequest ne doit pas être appelé — CSRF bloque avant l'auth
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  // ── ② Authentification ─────────────────────────────────────────────────────

  it('retourne 401 si l\'utilisateur n\'est pas authentifié', async () => {
    mockGetUser.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer()));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Non authentifié');
  });

  // ── ② Validation des paramètres ────────────────────────────────────────────

  it('retourne 400 si le fichier est absent', async () => {
    const { POST } = await import('../route');
    const formData = new FormData();
    formData.append('bucket', 'photos');
    formData.append('path', `${TEST_USER_ID}/img.jpg`);
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST', body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retourne 400 si le bucket est invalide', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'evil-bucket', `${TEST_USER_ID}/x.jpg`));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Bucket invalide');
  });

  it('retourne 400 si le path est vide', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', ''));
    expect(res.status).toBe(400);
  });

  // ── ③ Protection path-traversal (CWE-22) ──────────────────────────────────

  it('retourne 400 si le path contient un path-traversal (..)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', '../../../etc/passwd'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('invalide');
  });

  it('retourne 400 si le path commence par /', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', '/absolute/path.jpg'));
    expect(res.status).toBe(400);
  });

  // ── ④-bis Validation d'ownership (IDOR — CWE-639) ─────────────────────────
  // Garantit qu'un utilisateur ne peut écrire QUE dans son périmètre.

  describe('Ownership validation (CWE-639)', () => {

    // — Niveau 1 : chemins user-scoped (userId/ en premier segment) ────────────

    it('accepte un chemin user-scoped valide ({userId}/...)', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `${TEST_USER_ID}/avatar.jpg`));
      expect(res.status).toBe(200);
    });

    it('rejette un chemin dont le premier segment est un userId DIFFÉRENT (403)', async () => {
      const { POST } = await import('../route');
      // mockFromTable ne sera pas appelé car le premier segment est un UUID connu → nivel 1
      // mais OTHER_USER_ID !== TEST_USER_ID → refus par la règle userId-scoped
      // Et OTHER_USER_ID ne matche pas une règle entity-scoped → refus par défaut
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `${OTHER_USER_ID}/avatar.jpg`));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Chemin non autorisé');
    });

    // — Niveau 2 : chemins entity-scoped ─────────────────────────────────────

    it('accepte un chemin entity-scoped quand l\'entité appartient à l\'utilisateur', async () => {
      const { POST } = await import('../route');
      // mockSingle retourne user_id = TEST_USER_ID → autorisé
      mockSingle.mockResolvedValue({ data: { user_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `listings/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `listings/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('rejette un chemin entity-scoped quand l\'entité appartient à un AUTRE utilisateur (403)', async () => {
      const { POST } = await import('../route');
      // L'entité est possédée par OTHER_USER_ID, pas par TEST_USER_ID
      mockSingle.mockResolvedValue({ data: { user_id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `listings/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Chemin non autorisé');
    });

    it('rejette un chemin entity-scoped si l\'entité n\'existe pas en base (403)', async () => {
      const { POST } = await import('../route');
      // Entité introuvable → refus pour ne pas révéler l'existence
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `listings/nonexistent-uuid/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('rejette un chemin entity-scoped avec ID manquant (403)', async () => {
      const { POST } = await import('../route');
      // Chemin mal formé : "listings/" sans ID
      const res = await POST(makeRequest(jpegBuffer(), 'photos', 'listings/'));
      // safeRelativePath rejette les chemins se terminant par "/" (chemin vide après strip)
      // selon l'implémentation → 400 ou 403, les deux sont valides
      expect([400, 403]).toContain(res.status);
    });

    it('rejette un préfixe de chemin inconnu (403)', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `unknown-category/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Chemin non autorisé');
    });

    it('rejette le préfixe __diagnostic__ pour un utilisateur non-admin (403)', async () => {
      const { POST } = await import('../route');
      // mockSingle retourne un utilisateur avec rôle "resident" (pas admin)
      mockSingle.mockResolvedValue({ data: { role: 'resident' }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `__diagnostic__/test_${Date.now()}.png`));
      expect(res.status).toBe(403);
    });

    it('accepte le préfixe __diagnostic__ pour un admin', async () => {
      const { POST } = await import('../route');
      // mockSingle retourne un utilisateur avec rôle "admin"
      mockSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
      mockUpload.mockResolvedValue({ data: { path: '__diagnostic__/test.png' }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `__diagnostic__/test_${Date.now()}.png`));
      expect(res.status).toBe(200);
    });

    it('accepte le préfixe __diagnostic__ pour un moderator (role EN, pas moderateur FR)', async () => {
      const { POST } = await import('../route');
      // Vérifie que 'moderator' (anglais, valeur correcte de l'enum) est accepté
      // et que 'moderateur' (français, ancienne valeur invalide) ne serait PAS accepté.
      mockSingle.mockResolvedValue({ data: { role: 'moderator' }, error: null });
      mockUpload.mockResolvedValue({ data: { path: '__diagnostic__/test.png' }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `__diagnostic__/test_${Date.now()}.png`));
      expect(res.status).toBe(200);
    });

    it('rejette le préfixe __diagnostic__ pour role moderateur (FR invalide — 403)', async () => {
      const { POST } = await import('../route');
      // 'moderateur' est l'ancienne valeur française — ne doit plus être reconnue
      mockSingle.mockResolvedValue({ data: { role: 'moderateur' }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `__diagnostic__/test_${Date.now()}.png`));
      expect(res.status).toBe(403);
    });

    it('accepte le préfixe collection/{userId} (user-scoped via profile.id)', async () => {
      const { POST } = await import('../route');
      // collection/ est une règle entity-scoped vers profiles.id = profiles.id
      // mockSingle retourne { id: TEST_USER_ID }
      mockSingle.mockResolvedValue({ data: { id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `collection/${TEST_USER_ID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `collection/${TEST_USER_ID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('rejette collection/{autreUserId} (IDOR — 403)', async () => {
      const { POST } = await import('../route');
      // mockSingle retourne { id: OTHER_USER_ID } → owner ≠ current user
      mockSingle.mockResolvedValue({ data: { id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `collection/${OTHER_USER_ID}/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('accepte le chemin artisan docs user-scoped ({userId}/label.pdf)', async () => {
      const { POST } = await import('../route');
      mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/cv.pdf` }, error: null });
      const pdfBytes = pdfBuffer();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const fd = new FormData();
      fd.append('file', blob, 'cv.pdf');
      fd.append('bucket', 'documents');
      fd.append('path', `${TEST_USER_ID}/cv-label-${Date.now()}.pdf`);
      const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ── ③-bis : Régression mappings entity-scoped (Bloquant 2) ──────────────────
  // Vérifie que chaque préfixe utilise la bonne table ET la bonne colonne owner.
  // Avant le fix, tous ces préfixes renvoyaient 403 car la colonne était 'user_id'
  // alors que le schéma réel utilise resident_id / author_id / organizer_id / owner_id.

  describe('mappings entity-scoped corrigés (Bloquant 2)', () => {
    it('requests/ → service_requests.resident_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { resident_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `requests/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `requests/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('requests/ → service_requests.resident_id (403 si autre user)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { resident_id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `requests/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('events/ → events.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `events/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `events/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('events/ → events.author_id (403 si autre user)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `events/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('associations/ → associations.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `associations/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `associations/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('coups-de-main/ → help_requests.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `coups-de-main/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `coups-de-main/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('lost-found/ → lost_found_items.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `lost-found/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `lost-found/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('promenades/ → promenades.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `promenades/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `promenades/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('outings/ → group_outings.organizer_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { organizer_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `outings/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `outings/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('outings/ → group_outings.organizer_id (403 si autre user)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { organizer_id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `outings/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('equipment/ → equipment_items.owner_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { owner_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `equipment/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `equipment/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });

    it('equipment/ → equipment_items.owner_id (403 si autre user)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { owner_id: OTHER_USER_ID }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `equipment/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(403);
    });

    it('forum/ → forum_topics.author_id (200 si owner)', async () => {
      const { POST } = await import('../route');
      mockSingle.mockResolvedValue({ data: { author_id: TEST_USER_ID }, error: null });
      mockUpload.mockResolvedValue({ data: { path: `forum/${ENTITY_UUID}/ts.jpg` }, error: null });
      const res = await POST(makeRequest(jpegBuffer(), 'photos', `forum/${ENTITY_UUID}/ts.jpg`));
      expect(res.status).toBe(200);
    });
  });

  // ── ④ Validation de la taille ─────────────────────────────────────────────

  it('retourne 413 si le fichier dépasse 5 MB pour le bucket photos', async () => {
    const { POST } = await import('../route');
    const bigBuffer = new Uint8Array(6 * 1024 * 1024); // 6 MB
    bigBuffer[0] = 0xFF; bigBuffer[1] = 0xD8; bigBuffer[2] = 0xFF; // magic bytes JPEG
    const bigBlob = new Blob([bigBuffer.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', bigBlob, 'big.jpg');
    formData.append('bucket', 'photos');
    formData.append('path', `${TEST_USER_ID}/big.jpg`);
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('volumineux');
  });

  // ── ⑤ Validation magic bytes — ACCEPTÉS ──────────────────────────────────

  it('accepte un vrai JPEG (FF D8 FF)', async () => {
    const { POST } = await import('../route');
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/photo.jpg` }, error: null });
    const res = await POST(makeRequest(jpegBuffer(), 'photos', `${TEST_USER_ID}/photo.jpg`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('url');
    expect(body.url).toContain('cdn.example.com');
  });

  it('accepte un vrai PNG (89 50 4E 47 + IHDR)', async () => {
    const { POST } = await import('../route');
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/photo.png` }, error: null });
    const res = await POST(makeRequest(pngBuffer(), 'photos', `${TEST_USER_ID}/photo.png`, 'image.png'));
    expect(res.status).toBe(200);
  });

  // ── ⑤ Validation magic bytes — REJETÉS ───────────────────────────────────

  it('rejette un fichier PHP déguisé en .jpg (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(phpInJpegBuffer(), 'photos', `${TEST_USER_ID}/evil.jpg`));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('non autorisé');
    expect(body).toHaveProperty('detected');
  });

  it('rejette un SVG avec <script> déguisé en .jpg (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(svgInJpegBuffer(), 'photos', `${TEST_USER_ID}/evil.jpg`));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('non autorisé');
  });

  it('rejette un texte brut déguisé en image (415)', async () => {
    const { POST } = await import('../route');
    const textBytes = new TextEncoder().encode('Hello world, this is plain text');
    const res = await POST(makeRequest(textBytes, 'photos', `${TEST_USER_ID}/text.jpg`));
    expect(res.status).toBe(415);
  });

  // ── ⑥ Contrôle bucket × type ─────────────────────────────────────────────

  it('rejette un PDF dans le bucket photos (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(pdfBuffer(), 'photos', `${TEST_USER_ID}/cv.pdf`, 'cv.pdf'));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('"photos"');
  });

  it('accepte un PDF dans le bucket job-documents', async () => {
    const { POST } = await import('../route');
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/cv.pdf` }, error: null });
    const res = await POST(makeRequest(pdfBuffer(), 'job-documents', `${TEST_USER_ID}/cv.pdf`, 'cv.pdf'));
    expect(res.status).toBe(200);
  });

  // ── ⑦ Erreur Supabase Storage ─────────────────────────────────────────────

  it('retourne 500 si Supabase Storage échoue', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'Storage error' } });
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', `${TEST_USER_ID}/photo.jpg`));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Storage error');
  });

  // ── ⑧ Réponse 200 — structure ────────────────────────────────────────────

  it('retourne url et path dans la réponse 200', async () => {
    const { POST } = await import('../route');
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/photo.jpg` }, error: null });
    const res = await POST(makeRequest(jpegBuffer(), 'photos', `${TEST_USER_ID}/photo.jpg`));
    expect(res.status).toBe(200);
    const body = await res.json() as { url: string; path: string };
    expect(typeof body.url).toBe('string');
    expect(typeof body.path).toBe('string');
  });

  it('impose le vrai Content-Type (mime détecté) au lieu de celui du client', async () => {
    const { POST } = await import('../route');
    mockUpload.mockResolvedValue({ data: { path: `${TEST_USER_ID}/photo.jpg` }, error: null });
    // Upload a real PNG bytes but declare it as JPEG (typical attack: extension mismatch)
    const png = pngBuffer();
    const blob = new Blob([png.buffer as ArrayBuffer], { type: 'image/jpeg' }); // lie about MIME
    const fd = new FormData();
    fd.append('file', blob, 'photo.jpg');
    fd.append('bucket', 'photos');
    fd.append('path', `${TEST_USER_ID}/photo.jpg`);
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd });
    const res = await POST(req);
    // Route should succeed (PNG is allowed) but use the REAL detected MIME, not client-declared
    expect(res.status).toBe(200);
    // Supabase upload called with image/png (detected), NOT image/jpeg (client-declared)
    expect(mockUpload).toHaveBeenCalledWith(
      `${TEST_USER_ID}/photo.jpg`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: true }),
    );
  });
});

/**
 * Tests unitaires pour POST /api/upload
 * ──────────────────────────────────────────────────────────────────────────────
 * Vérifie la validation magic-bytes, les contrôles d'authentification,
 * la validation de paramètres et la protection path-traversal.
 *
 * Architecture testée :
 *   Client → POST /api/upload → ① Auth → ② FormData → ③ Path → ④ Size → ⑤ Magic-bytes → Supabase
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

// ── Mocks des dépendances ─────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Mock getUserFromRequest — par défaut : authentifié
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserFromRequest: mockGetUser,
}));

// Mock createAdminClient — par défaut : upload OK
const mockUpload  = vi.fn();
const mockGetUrl  = vi.fn();
const mockStorage = {
  from: vi.fn(() => ({
    upload:       mockUpload,
    getPublicUrl: mockGetUrl,
  })),
};
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    storage: mockStorage,
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
  path     = 'test/image.jpg',
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
    // Par défaut : utilisateur authentifié
    mockGetUser.mockResolvedValue('user-uuid-123');
    // Par défaut : upload Supabase réussi
    mockUpload.mockResolvedValue({ data: { path: 'test/image.jpg' }, error: null });
    mockGetUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/test/image.jpg' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── ① Authentification ─────────────────────────────────────────────────────

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
    formData.append('path', 'test/img.jpg');
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST', body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retourne 400 si le bucket est invalide', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'evil-bucket', 'x.jpg'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Bucket invalide');
  });

  it('retourne 400 si le path est vide', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', ''));
    expect(res.status).toBe(400);
  });

  // ── ③ Protection path-traversal ────────────────────────────────────────────

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

  // ── ④ Validation de la taille ─────────────────────────────────────────────

  it('retourne 413 si le fichier dépasse 5 MB pour le bucket photos', async () => {
    const { POST } = await import('../route');
    const bigBuffer = new Uint8Array(6 * 1024 * 1024); // 6 MB
    bigBuffer[0] = 0xFF; bigBuffer[1] = 0xD8; bigBuffer[2] = 0xFF; // magic bytes JPEG
    const bigBlob = new Blob([bigBuffer.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', bigBlob, 'big.jpg');
    formData.append('bucket', 'photos');
    formData.append('path', 'test/big.jpg');
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('volumineux');
  });

  // ── ⑤ Validation magic bytes — ACCEPTÉS ──────────────────────────────────

  it('accepte un vrai JPEG (FF D8 FF)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', 'user/photo.jpg'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('url');
    expect(body.url).toContain('cdn.example.com');
  });

  it('accepte un vrai PNG (89 50 4E 47 + IHDR)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(pngBuffer(), 'photos', 'user/photo.png', 'image.png'));
    expect(res.status).toBe(200);
  });

  // ── ⑤ Validation magic bytes — REJETÉS ───────────────────────────────────

  it('rejette un fichier PHP déguisé en .jpg (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(phpInJpegBuffer(), 'photos', 'user/evil.jpg'));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('non autorisé');
    expect(body).toHaveProperty('detected');
  });

  it('rejette un SVG avec <script> déguisé en .jpg (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(svgInJpegBuffer(), 'photos', 'user/evil.jpg'));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('non autorisé');
  });

  it('rejette un texte brut déguisé en image (415)', async () => {
    const { POST } = await import('../route');
    const textBytes = new TextEncoder().encode('Hello world, this is plain text');
    const res = await POST(makeRequest(textBytes, 'photos', 'user/text.jpg'));
    expect(res.status).toBe(415);
  });

  // ── ⑥ Contrôle bucket × type ─────────────────────────────────────────────

  it('rejette un PDF dans le bucket photos (415)', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(pdfBuffer(), 'photos', 'user/cv.pdf', 'cv.pdf'));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain('"photos"');
  });

  it('accepte un PDF dans le bucket job-documents', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(pdfBuffer(), 'job-documents', 'cv/user.pdf', 'cv.pdf'));
    expect(res.status).toBe(200);
  });

  // ── ⑦ Erreur Supabase Storage ─────────────────────────────────────────────

  it('retourne 500 si Supabase Storage échoue', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'Storage error' } });
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', 'user/photo.jpg'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Storage error');
  });

  // ── ⑧ Réponse 200 — structure ────────────────────────────────────────────

  it('retourne url et path dans la réponse 200', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest(jpegBuffer(), 'photos', 'events/123/photo.jpg'));
    expect(res.status).toBe(200);
    const body = await res.json() as { url: string; path: string };
    expect(typeof body.url).toBe('string');
    expect(typeof body.path).toBe('string');
  });

  it('impose le vrai Content-Type (mime détecté) au lieu de celui du client', async () => {
    const { POST } = await import('../route');
    // Upload a real PNG bytes but declare it as JPEG (typical attack: extension mismatch)
    const png = pngBuffer();
    const blob = new Blob([png.buffer as ArrayBuffer], { type: 'image/jpeg' }); // lie about MIME
    const fd = new FormData();
    fd.append('file', blob, 'photo.jpg');
    fd.append('bucket', 'photos');
    fd.append('path', 'user/photo.jpg');
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd });
    const res = await POST(req);
    // Route should succeed (PNG is allowed) but use the REAL detected MIME, not client-declared
    expect(res.status).toBe(200);
    // Supabase upload called with image/png (detected), NOT image/jpeg (client-declared)
    expect(mockUpload).toHaveBeenCalledWith(
      'user/photo.jpg',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: true }),
    );
  });
});

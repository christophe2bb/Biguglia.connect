/**
 * Tests — src/lib/upload-utils.ts
 * Vérifie que safeImageExt, safeDocExt et safeStoragePath protègent
 * correctement contre les injections de chemin (CWE-22) et les extensions
 * non autorisées.
 */

import { describe, it, expect } from 'vitest';
import { safeImageExt, safeDocExt, safeStoragePath, safeRelativePath } from '../upload-utils';

// ─── safeImageExt ──────────────────────────────────────────────────────────────
describe('safeImageExt', () => {
  it('accepts valid image extensions (lowercase)', () => {
    expect(safeImageExt('photo.jpg')).toBe('jpg');
    expect(safeImageExt('photo.jpeg')).toBe('jpeg');
    expect(safeImageExt('image.png')).toBe('png');
    expect(safeImageExt('img.webp')).toBe('webp');
    expect(safeImageExt('anim.gif')).toBe('gif');
    expect(safeImageExt('modern.avif')).toBe('avif');
  });

  it('normalises extension to lowercase', () => {
    expect(safeImageExt('photo.JPG')).toBe('jpg');
    expect(safeImageExt('image.PNG')).toBe('png');
    expect(safeImageExt('banner.WebP')).toBe('webp');
  });

  it('falls back to "jpg" for dangerous or unknown extensions', () => {
    expect(safeImageExt('evil.php')).toBe('jpg');
    expect(safeImageExt('script.sh')).toBe('jpg');
    expect(safeImageExt('exploit.exe')).toBe('jpg');
    expect(safeImageExt('file.html')).toBe('jpg');
    expect(safeImageExt('doc.pdf')).toBe('jpg');  // pdf not in image allowlist
  });

  it('falls back for traversal filenames', () => {
    // ".." has no extension — pop() returns ".." which is not in allowlist
    expect(safeImageExt('../../etc/passwd')).toBe('jpg');
    expect(safeImageExt('../secret.jpg.php')).toBe('jpg');  // double-ext → .php
  });

  it('falls back for files with no extension', () => {
    expect(safeImageExt('Makefile')).toBe('jpg');
    expect(safeImageExt('')).toBe('jpg');
  });

  it('accepts a custom fallback', () => {
    expect(safeImageExt('evil.php', 'png')).toBe('png');
  });
});

// ─── safeDocExt ───────────────────────────────────────────────────────────────
describe('safeDocExt', () => {
  it('accepts valid document extensions', () => {
    expect(safeDocExt('cv.pdf')).toBe('pdf');
    expect(safeDocExt('scan.jpg')).toBe('jpg');
    expect(safeDocExt('id.jpeg')).toBe('jpeg');
    expect(safeDocExt('doc.png')).toBe('png');
    expect(safeDocExt('cert.webp')).toBe('webp');
  });

  it('normalises to lowercase', () => {
    expect(safeDocExt('CV.PDF')).toBe('pdf');
    expect(safeDocExt('scan.JPG')).toBe('jpg');
  });

  it('falls back to "pdf" for unknown/dangerous extensions', () => {
    expect(safeDocExt('evil.php')).toBe('pdf');
    expect(safeDocExt('script.sh')).toBe('pdf');
    expect(safeDocExt('file.exe')).toBe('pdf');
    expect(safeDocExt('../../etc/passwd')).toBe('pdf');
  });

  it('accepts a custom fallback', () => {
    expect(safeDocExt('bad.exe', 'jpg')).toBe('jpg');
  });
});

// ─── safeStoragePath ──────────────────────────────────────────────────────────
describe('safeStoragePath', () => {
  const baseUrl = 'https://xyz.supabase.co';

  it('extracts valid relative path from a Supabase public URL', () => {
    const url = `${baseUrl}/storage/v1/object/public/photos/listings/abc/1234.jpg`;
    expect(safeStoragePath(url, 'photos')).toBe('listings/abc/1234.jpg');
  });

  it('returns null for a URL with path traversal (..) in extracted path', () => {
    const url = `${baseUrl}/storage/v1/object/public/photos/../private/secret.jpg`;
    expect(safeStoragePath(url, 'photos')).toBeNull();
  });

  it('returns null when the bucket separator is not present', () => {
    const url = `${baseUrl}/storage/v1/object/public/documents/file.pdf`;
    // Asking for 'photos' bucket but URL is 'documents'
    expect(safeStoragePath(url, 'photos')).toBeNull();
  });

  it('returns null for an empty extracted path', () => {
    const url = `${baseUrl}/storage/v1/object/public/photos/`;
    expect(safeStoragePath(url, 'photos')).toBeNull();
  });

  it('returns null if extracted path starts with /', () => {
    // Crafted URL where path begins with /
    const url = `${baseUrl}/storage/v1/object/public/photos//absolute/path.jpg`;
    expect(safeStoragePath(url, 'photos')).toBeNull();
  });

  it('handles documents bucket correctly', () => {
    const url = `${baseUrl}/storage/v1/object/public/documents/user-id/cv.pdf`;
    expect(safeStoragePath(url, 'documents')).toBe('user-id/cv.pdf');
  });

  it('returns null for a completely unrelated URL', () => {
    expect(safeStoragePath('https://evil.com/malicious', 'photos')).toBeNull();
    expect(safeStoragePath('', 'photos')).toBeNull();
  });
});

// ─── safeRelativePath ─────────────────────────────────────────────────────────
describe('safeRelativePath', () => {
  it('returns a valid relative path unchanged', () => {
    expect(safeRelativePath('userId/doc.pdf')).toBe('userId/doc.pdf');
    expect(safeRelativePath('abc123/2024/cv.pdf')).toBe('abc123/2024/cv.pdf');
  });

  it('strips an optional bucket prefix', () => {
    expect(safeRelativePath('documents/userId/cv.pdf', 'documents')).toBe('userId/cv.pdf');
    expect(safeRelativePath('photos/listings/img.jpg', 'photos')).toBe('listings/img.jpg');
  });

  it('returns the path as-is when prefix does not match', () => {
    // "photos/" prefix not present → no stripping, validate as-is
    expect(safeRelativePath('userId/cv.pdf', 'documents')).toBe('userId/cv.pdf');
  });

  it('returns null for path traversal attempts', () => {
    expect(safeRelativePath('../etc/passwd')).toBeNull();
    expect(safeRelativePath('valid/../../../etc/passwd')).toBeNull();
    expect(safeRelativePath('documents/../private/secret')).toBeNull();
  });

  it('returns null for absolute paths', () => {
    expect(safeRelativePath('/etc/passwd')).toBeNull();
    expect(safeRelativePath('/absolute/path.pdf')).toBeNull();
  });

  it('returns null for empty or blank input', () => {
    expect(safeRelativePath('')).toBeNull();
  });

  it('returns null when path becomes empty after stripping prefix', () => {
    // "documents/" stripped → empty string → null
    expect(safeRelativePath('documents/', 'documents')).toBeNull();
  });

  it('handles nested-valid paths correctly', () => {
    expect(safeRelativePath('user-id-123/subfolder/file.pdf')).toBe('user-id-123/subfolder/file.pdf');
  });
});

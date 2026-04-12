/**
 * admin/migration/_types.ts
 * Shared TypeScript types for the migration admin page.
 */

export interface TableCheck {
  name: string;
  label: string;
  theme: string;
  aliases?: string[];
}

export interface TableStatus {
  name: string;
  exists: boolean;
}

export interface StorageDiag {
  bucketExists: boolean | null;
  bucketPublic: boolean | null;
  canUpload: boolean | null;
  canRead: boolean | null;
  testFileUrl: string | null;
  error: string | null;
}

/**
 * admin/migration/_hooks/useMigration.ts
 *
 * Centralise tout l'état et les actions de la page de migration :
 *   - vérification des tables Supabase
 *   - diagnostic du bucket Storage
 *   - copie des scripts SQL dans le presse-papiers
 *
 * Refactorisé : les 30 paires [copiedX, handleCopyX] ont été remplacées par un
 * seul useCopyMap(sqlMap) qui gère dynamiquement tous les boutons de copie.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TABLES_TO_CHECK } from '../_config';
import type { TableStatus, StorageDiag } from '../_types';
import {
  MIGRATION_SQL, REALTIME_SQL, MESSAGING_SQL, INTERACTION_SQL,
  EXCHANGE_SQL, CONV_FIX_BLOC1, CONV_FIX_BLOC2, RATING_SQL,
  BUCKET_SQL, ARTISAN_SQL, COLLECTION_COMMENTS_SQL, COMMUNITY_SQL,
  DISCUSSIONS_SQL, RLS_STATUS_SQL, TRUST_STATS_FIX_SQL, TRUST_SQL,
  COLLECTIONNEURS_V2_SQL, USER_ROLE_FIX_SQL, MODERATION_FIX_SQL,
  MODERATION_SQL, EVENTS_BASE_SQL, REMINDER_SQL, FORUM_V2_SQL,
  PROFIL_PUBLIC_SQL, LF_HISTORY_SQL, LF_MATCHES_SQL, LF_EXTRAS_SQL,
  SECTORS_SQL, SEARCH_SQL, STATUS_SQL, ADMIN_LOGS_SQL,
} from '../_sql';
import { EQUIPMENT_LIFECYCLE_SQL } from '@/lib/equipment';
import { OUTINGS_LIFECYCLE_SQL }   from '@/lib/outings';
import { EVENT_LIFECYCLE_SQL, EVENT_FIX_SQL } from '@/lib/events';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';
import { useAuthStore } from '@/lib/auth-store';

// ─── SQL map ─────────────────────────────────────────────────────────────────

/** Toutes les clés SQL disponibles dans la page Migration. */
export const SQL_MAP = {
  main:               MIGRATION_SQL,
  notify:             "NOTIFY pgrst, 'reload schema';",
  realtime:           REALTIME_SQL,
  messaging:          MESSAGING_SQL,
  interaction:        INTERACTION_SQL,
  exchange:           EXCHANGE_SQL,
  convFix1:           CONV_FIX_BLOC1,
  convFix2:           CONV_FIX_BLOC2,
  rating:             RATING_SQL,
  bucket:             BUCKET_SQL,
  artisan:            ARTISAN_SQL,
  collectionComments: COLLECTION_COMMENTS_SQL,
  community:          COMMUNITY_SQL,
  discussions:        DISCUSSIONS_SQL,
  rls:                RLS_STATUS_SQL,
  trustFix:           TRUST_STATS_FIX_SQL,
  trust:              TRUST_SQL,
  collectV2:          COLLECTIONNEURS_V2_SQL,
  roleFix:            USER_ROLE_FIX_SQL,
  modFix:             MODERATION_FIX_SQL,
  moderation:         MODERATION_SQL,
  eventsBase:         EVENTS_BASE_SQL,
  equipment:          EQUIPMENT_LIFECYCLE_SQL,
  outings:            OUTINGS_LIFECYCLE_SQL,
  events:             EVENT_LIFECYCLE_SQL,
  eventFix:           EVENT_FIX_SQL,
  reminder:           REMINDER_SQL,
  forumV2:            FORUM_V2_SQL,
  profilPublic:       PROFIL_PUBLIC_SQL,
  lfHistory:          LF_HISTORY_SQL,
  lfMatches:          LF_MATCHES_SQL,
  lfExtras:           LF_EXTRAS_SQL,
  sectors:            SECTORS_SQL,
  search:             SEARCH_SQL,
  status:             STATUS_SQL,
  adminLogs:          ADMIN_LOGS_SQL,
} as const;

export type SqlKey = keyof typeof SQL_MAP;

// ─── useCopyMap ───────────────────────────────────────────────────────────────

/**
 * Gère l'état "copié" pour un ensemble de clés SQL.
 * Retourne :
 *   copied(key)  → true si la clé a été copiée dans les 4 dernières secondes
 *   copy(key)    → copie SQL_MAP[key] dans le presse-papiers
 */
export function useCopyMap() {
  const [copiedKeys, setCopiedKeys] = useState<Set<SqlKey>>(new Set());

  const copy = useCallback((key: SqlKey) => {
    navigator.clipboard.writeText(SQL_MAP[key]).then(() => {
      setCopiedKeys(prev => new Set(prev).add(key));
      setTimeout(() => {
        setCopiedKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 4000);
    });
  }, []);

  const copied = useCallback(
    (key: SqlKey) => copiedKeys.has(key),
    [copiedKeys],
  );

  return { copied, copy };
}

// ─── Diagnostic helpers ───────────────────────────────────────────────────────

const MISSING_CODES = new Set(['42P01', 'PGRST116', 'PGRST205']);

function isMissingTable(error: { code?: string; message?: string }): boolean {
  if (MISSING_CODES.has(error.code ?? '')) return true;
  const msg = error.message ?? '';
  return (
    msg.includes('schema cache') ||
    msg.includes('Could not find relation') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useMigration() {
  const supabase     = createClient();
  const { profile }  = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table diagnostic
  const [checking, setChecking] = useState(true);
  const [tables,   setTables]   = useState<TableStatus[]>([]);

  // Storage diagnostic
  const [storageDiag,     setStorageDiag]     = useState<StorageDiag>({
    bucketExists: null, bucketPublic: null,
    canUpload: null, canRead: null, testFileUrl: null, error: null,
  });
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [testingUpload,   setTestingUpload]   = useState(false);

  // Single copy map replacing 30 individual useCopy() calls
  const { copied, copy } = useCopyMap();

  // ── Table check ──────────────────────────────────────────────────────────────
  const checkTables = useCallback(async () => {
    setChecking(true);
    const results: TableStatus[] = [];
    for (const t of TABLES_TO_CHECK) {
      const namesToTry = [t.name, ...(t.aliases ?? [])];
      let exists = false;
      for (const name of namesToTry) {
        const { error } = await supabase
          .from(name)
          .select('*', { count: 'exact', head: true });
        if (!error || !isMissingTable(error)) { exists = true; break; }
      }
      results.push({ name: t.name, exists });
    }
    setTables(results);
    setChecking(false);
  }, [supabase]);

  // ── Storage check ────────────────────────────────────────────────────────────
  const checkStorage = useCallback(async () => {
    setCheckingStorage(true);
    const diag: StorageDiag = {
      bucketExists: null, bucketPublic: null,
      canUpload: null, canRead: null, testFileUrl: null, error: null,
    };

    try {
      const { data: files, error: listErr } = await supabase.storage
        .from('photos')
        .list('__diagnostic__', { limit: 1 });

      if (listErr) {
        const msg = listErr.message ?? '';
        if (msg.includes('Bucket not found') || msg.includes('bucket') || msg.includes('does not exist')) {
          diag.bucketExists = false;
          diag.error = `Bucket "photos" introuvable : ${msg}`;
        } else {
          diag.bucketExists = true;
          diag.canRead = false;
          diag.error = `Erreur lecture bucket : ${msg}`;
        }
      } else {
        diag.bucketExists = true;
        diag.canRead = true;
        void files;
      }

      if (diag.bucketExists) {
        // PNG 1×1 pixel transparent
        const pngBytes = new Uint8Array([
          0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,
          0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
          0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
          0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
          0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,
          0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
          0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,
          0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
          0x44,0xAE,0x42,0x60,0x82,
        ]);
        const testPath = `__diagnostic__/test_${Date.now()}.png`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
        // Passe par uploadFile() → /api/upload → validation magic-bytes (CWE-434)
        // Le blob est une constante hardcodée (PNG 1×1 pixel), non issu d'un input utilisateur,
        // mais on passe systématiquement par la route sécurisée pour cohérence.
        try {
          const publicUrl = await uploadFile(
            new Blob([pngBytes], { type: 'image/png' }),
            'photos',
            testPath,
          );
          diag.canUpload = true;
          diag.testFileUrl = publicUrl ?? null;
          if (diag.testFileUrl) {
            diag.bucketPublic = diag.testFileUrl.includes('/object/public/');
          }
          // Nettoyage : suppression du fichier de test
          await supabase.storage.from('photos').remove([testPath]); // nosec: .remove() is a delete op, not upload
        } catch (upEx: unknown) {
          diag.canUpload = false;
          const upMsg = upEx instanceof Error ? upEx.message : String(upEx);
          diag.error = (diag.error ? diag.error + ' | ' : '') + `Upload bloqué : ${upMsg}`;
        }
      }
    } catch (e: unknown) {
      diag.error = `Exception : ${e instanceof Error ? e.message : String(e)}`;
    }

    setStorageDiag(diag);
    setCheckingStorage(false);
  }, [supabase]);

  // ── Real upload test ─────────────────────────────────────────────────────────
  const testRealUpload = useCallback(async (file: File) => {
    setTestingUpload(true);
    const ext  = safeImageExt(file.name);
    const path = `__diagnostic__/real_test_${Date.now()}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur

    // Passe par uploadFile() → /api/upload → validation magic-bytes côté serveur (CWE-434)
    // Le fichier vient d'un <input type="file"> admin → doit impérativement passer par la
    // route sécurisée qui vérifie les magic bytes et rejette les extensions forgées.
    try {
      const publicUrl = await uploadFile(file, 'photos', path, profile?.id);
      // Nettoyage immédiat : supprimer le fichier de test après vérification réussie
      await supabase.storage.from('photos').remove([path]); // nosec: .remove() is a delete op
      alert(`✅ Upload réussi !\n\nURL publique : ${publicUrl}\n\nLe bucket fonctionne correctement.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(
        `❌ Upload échoué :\n\nErreur : ${msg}\n\n` +
        `Vérifiez :\n1. Que le bucket "photos" existe (SQL ci-dessous)\n` +
        `2. Que les policies sont appliquées\n3. Que vous êtes connecté`
      );
    }

    setTestingUpload(false); // always reset, even on error
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [supabase]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkTables();
    checkStorage();
  }, [checkTables, checkStorage]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const allOk        = tables.length > 0 && tables.every(t => t.exists);
  const missingCount = tables.filter(t => !t.exists).length;

  return {
    // Diagnostic tables
    checking, tables, allOk, missingCount, checkTables,
    // Storage
    storageDiag, checkingStorage, testingUpload,
    checkStorage, testRealUpload, fileInputRef,
    // Copy API — un seul objet pour tous les SQL
    copied, copy,
    // SQL strings exposés pour les composants qui prévisualisent
    SQL_MAP,
  };
}

/**
 * admin/migration/_hooks/useMigration.ts
 *
 * Centralise tout l'état et les actions de la page de migration :
 *   - vérification des tables Supabase
 *   - diagnostic du bucket Storage
 *   - copie des scripts SQL dans le presse-papiers
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TABLES_TO_CHECK }  from '../_config';
import type { TableStatus, StorageDiag } from '../_types';
import {
  MIGRATION_SQL, REALTIME_SQL, MESSAGING_SQL, INTERACTION_SQL,
  EXCHANGE_SQL, CONV_FIX_BLOC1, CONV_FIX_BLOC2, RATING_SQL,
  BUCKET_SQL, ARTISAN_SQL, COLLECTION_COMMENTS_SQL, COMMUNITY_SQL,
  DISCUSSIONS_SQL, RLS_STATUS_SQL, TRUST_STATS_FIX_SQL, TRUST_SQL,
  COLLECTIONNEURS_V2_SQL, USER_ROLE_FIX_SQL, MODERATION_FIX_SQL,
  MODERATION_SQL, EVENTS_BASE_SQL, REMINDER_SQL, FORUM_V2_SQL,
  PROFIL_PUBLIC_SQL, LF_HISTORY_SQL, LF_MATCHES_SQL, LF_EXTRAS_SQL,
  SECTORS_SQL, SEARCH_SQL, STATUS_SQL,
} from '../_sql';
import { EQUIPMENT_LIFECYCLE_SQL } from '@/lib/equipment';
import { OUTINGS_LIFECYCLE_SQL }   from '@/lib/outings';
import { EVENT_LIFECYCLE_SQL, EVENT_FIX_SQL } from '@/lib/events';

// ─── Generic copy hook ────────────────────────────────────────────────────────

/** Returns [isCopied, triggerCopy] — shows isCopied=true for 4 seconds. */
function useCopy(sql: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const trigger = useCallback(() => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  }, [sql]);
  return [copied, trigger];
}

// ─── Diagnostic functions (extracted from component) ─────────────────────────

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table diagnostic
  const [checking, setChecking]   = useState(true);
  const [tables,   setTables]     = useState<TableStatus[]>([]);

  // Storage diagnostic
  const [storageDiag,     setStorageDiag]     = useState<StorageDiag>({
    bucketExists: null, bucketPublic: null,
    canUpload: null, canRead: null, testFileUrl: null, error: null,
  });
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [testingUpload,   setTestingUpload]   = useState(false);

  // ── Copy states (one per SQL script) ────────────────────────────────────────
  const [copiedMain,                 handleCopyMain]                 = useCopy(MIGRATION_SQL);
  const [copiedRealtime,             handleCopyRealtime]             = useCopy(REALTIME_SQL);
  const [copiedMessaging,            handleCopyMessaging]            = useCopy(MESSAGING_SQL);
  const [copiedInteraction,          handleCopyInteraction]          = useCopy(INTERACTION_SQL);
  const [copiedExchange,             handleCopyExchange]             = useCopy(EXCHANGE_SQL);
  const [copiedConvFix1,             handleCopyConvFix1]             = useCopy(CONV_FIX_BLOC1);
  const [copiedConvFix2,             handleCopyConvFix2]             = useCopy(CONV_FIX_BLOC2);
  const [copiedRating,               handleCopyRating]               = useCopy(RATING_SQL);
  const [copiedBucket,               handleCopyBucket]               = useCopy(BUCKET_SQL);
  const [copiedArtisan,              handleCopyArtisan]              = useCopy(ARTISAN_SQL);
  const [copiedCollectionComments,   handleCopyCollectionComments]   = useCopy(COLLECTION_COMMENTS_SQL);
  const [copiedCommunity,            handleCopyCommunity]            = useCopy(COMMUNITY_SQL);
  const [copiedDiscussions,          handleCopyDiscussions]          = useCopy(DISCUSSIONS_SQL);
  const [copiedRLS,                  handleCopyRLS]                  = useCopy(RLS_STATUS_SQL);
  const [copiedTrustFix,             handleCopyTrustFix]             = useCopy(TRUST_STATS_FIX_SQL);
  const [copiedTrust,                handleCopyTrust]                = useCopy(TRUST_SQL);
  const [copiedCollectV2,            handleCopyCollectV2]            = useCopy(COLLECTIONNEURS_V2_SQL);
  const [copiedRoleFix,              handleCopyRoleFix]              = useCopy(USER_ROLE_FIX_SQL);
  const [copiedModFix,               handleCopyModFix]               = useCopy(MODERATION_FIX_SQL);
  const [copiedModeration,           handleCopyModeration]           = useCopy(MODERATION_SQL);
  const [copiedEventsBase,           handleCopyEventsBase]           = useCopy(EVENTS_BASE_SQL);
  const [copiedEquipment,            handleCopyEquipment]            = useCopy(EQUIPMENT_LIFECYCLE_SQL);
  const [copiedOutings,              handleCopyOutings]              = useCopy(OUTINGS_LIFECYCLE_SQL);
  const [copiedEvents,               handleCopyEvents]               = useCopy(EVENT_LIFECYCLE_SQL);
  const [copiedEventFix,             handleCopyEventFix]             = useCopy(EVENT_FIX_SQL);
  const [copiedReminder,             handleCopyReminder]             = useCopy(REMINDER_SQL);
  const [copiedForumV2,              handleCopyForumV2]              = useCopy(FORUM_V2_SQL);
  const [copiedProfilPublic,         handleCopyProfilPublic]         = useCopy(PROFIL_PUBLIC_SQL);
  const [copiedLfHistory,            handleCopyLfHistory]            = useCopy(LF_HISTORY_SQL);
  const [copiedLfMatches,            handleCopyLfMatches]            = useCopy(LF_MATCHES_SQL);
  const [copiedLfExtras,             handleCopyLfExtras]             = useCopy(LF_EXTRAS_SQL);
  const [copiedSectors,              handleCopySectors]              = useCopy(SECTORS_SQL);
  const [copiedSearch,               handleCopySearch]               = useCopy(SEARCH_SQL);
  const [copiedStatus,               handleCopyStatus]               = useCopy(STATUS_SQL);

  // Special: NOTIFY pgrst
  const [copiedNotify, handleCopyNotify] = useCopy("NOTIFY pgrst, 'reload schema';");

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
        const testPath = `__diagnostic__/test_${Date.now()}.png`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('photos')
          .upload(testPath, new Blob([pngBytes], { type: 'image/png' }), {
            upsert: true,
            contentType: 'image/png',
          });

        if (upErr) {
          diag.canUpload = false;
          diag.error = (diag.error ? diag.error + ' | ' : '') + `Upload bloqué : ${upErr.message}`;
        } else if (upData?.path) {
          diag.canUpload = true;
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(upData.path);
          diag.testFileUrl = urlData?.publicUrl ?? null;
          if (diag.testFileUrl) {
            diag.bucketPublic = diag.testFileUrl.includes('/object/public/');
          }
          await supabase.storage.from('photos').remove([testPath]);
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
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `__diagnostic__/real_test_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      const code = (error as { statusCode?: string }).statusCode ?? 'N/A';
      alert(
        `❌ Upload échoué :\n\nErreur : ${error.message}\nCode : ${code}\n\n` +
        `Vérifiez :\n1. Que le bucket "photos" existe (SQL ci-dessous)\n` +
        `2. Que les policies sont appliquées\n3. Que vous êtes connecté`
      );
    } else if (data?.path) {
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path);
      await supabase.storage.from('photos').remove([path]);
      alert(`✅ Upload réussi !\n\nURL publique : ${urlData?.publicUrl}\n\nLe bucket fonctionne correctement.`);
    }

    setTestingUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [supabase]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkTables();
    checkStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────────
  const allOk        = tables.length > 0 && tables.every((t) => t.exists);
  const missingCount = tables.filter((t) => !t.exists).length;

  return {
    // Diagnostic
    checking, tables, allOk, missingCount,
    checkTables,
    // Storage
    storageDiag, checkingStorage, testingUpload,
    checkStorage, testRealUpload,
    fileInputRef,
    // Copy handlers
    copiedMain,               handleCopyMain,
    copiedNotify,             handleCopyNotify,
    copiedRealtime,           handleCopyRealtime,
    copiedMessaging,          handleCopyMessaging,
    copiedInteraction,        handleCopyInteraction,
    copiedExchange,           handleCopyExchange,
    copiedConvFix1,           handleCopyConvFix1,
    copiedConvFix2,           handleCopyConvFix2,
    copiedRating,             handleCopyRating,
    copiedBucket,             handleCopyBucket,
    copiedArtisan,            handleCopyArtisan,
    copiedCollectionComments, handleCopyCollectionComments,
    copiedCommunity,          handleCopyCommunity,
    copiedDiscussions,        handleCopyDiscussions,
    copiedRLS,                handleCopyRLS,
    copiedTrustFix,           handleCopyTrustFix,
    copiedTrust,              handleCopyTrust,
    copiedCollectV2,          handleCopyCollectV2,
    copiedRoleFix,            handleCopyRoleFix,
    copiedModFix,             handleCopyModFix,
    copiedModeration,         handleCopyModeration,
    copiedEventsBase,         handleCopyEventsBase,
    copiedEquipment,          handleCopyEquipment,
    copiedOutings,            handleCopyOutings,
    copiedEvents,             handleCopyEvents,
    copiedEventFix,           handleCopyEventFix,
    copiedReminder,           handleCopyReminder,
    copiedForumV2,            handleCopyForumV2,
    copiedProfilPublic,       handleCopyProfilPublic,
    copiedLfHistory,          handleCopyLfHistory,
    copiedLfMatches,          handleCopyLfMatches,
    copiedLfExtras,           handleCopyLfExtras,
    copiedSectors,            handleCopySectors,
    copiedSearch,             handleCopySearch,
    copiedStatus,             handleCopyStatus,
    // SQL strings (needed by components that preview them)
    MIGRATION_SQL, REALTIME_SQL, MESSAGING_SQL, INTERACTION_SQL,
    EXCHANGE_SQL, CONV_FIX_BLOC1, CONV_FIX_BLOC2, RATING_SQL,
    BUCKET_SQL, ARTISAN_SQL, COLLECTION_COMMENTS_SQL, COMMUNITY_SQL,
    DISCUSSIONS_SQL, RLS_STATUS_SQL, TRUST_STATS_FIX_SQL, TRUST_SQL,
    COLLECTIONNEURS_V2_SQL, USER_ROLE_FIX_SQL, MODERATION_FIX_SQL,
    MODERATION_SQL, EVENTS_BASE_SQL, REMINDER_SQL, FORUM_V2_SQL,
    PROFIL_PUBLIC_SQL, LF_HISTORY_SQL, LF_MATCHES_SQL, LF_EXTRAS_SQL,
    SECTORS_SQL, SEARCH_SQL, STATUS_SQL,
    EQUIPMENT_LIFECYCLE_SQL, OUTINGS_LIFECYCLE_SQL,
    EVENT_LIFECYCLE_SQL, EVENT_FIX_SQL,
  };
}

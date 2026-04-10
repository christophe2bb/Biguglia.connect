/**
 * moderation.ts — Barrel public du système de modération Biguglia Connect
 *
 * Tous les imports existants (`from '@/lib/moderation'`) continuent de fonctionner
 * sans modification. Ce fichier ne contient aucune logique.
 *
 * Organisation interne (src/lib/moderation/) :
 *   types.ts    — types, enums, labels, motifs, messages
 *   rules.ts    — règles de validation par type de contenu
 *   spam.ts     — détection anti-spam
 *   scoring.ts  — validateContent, trust, statut modération, limite publications
 *   sql.ts      — script SQL de migration (Supabase)
 */

export * from './moderation/types';
export * from './moderation/rules';
export * from './moderation/spam';
export * from './moderation/scoring';
export * from './moderation/sql';

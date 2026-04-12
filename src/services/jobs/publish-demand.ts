/**
 * @deprecated
 * Ce fichier est un point d'entrée retro-compatible.
 * Importez directement depuis '@/services/jobs/publish'.
 *
 * @example
 *   import { publishJobDemand }   from '@/services/jobs/publish';
 *   import type { PublishDemandInput, PublishDemandResult } from '@/services/jobs/publish';
 */

export { publishJobDemand } from './publish/demand';
export type { PublishDemandInput, PublishDemandResult } from './publish/demand';

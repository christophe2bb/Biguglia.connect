/** Maximum number of conversation IDs passed to the Postgres IN clause.
 *  Exported here (not from route.ts) to avoid Next.js route-file constraint
 *  that only allows HTTP handler exports from route files. */
export const MAX_CONV_IDS = 500;

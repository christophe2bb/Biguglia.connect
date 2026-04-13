/**
 * src/__mocks__/server-only.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Mock Vitest pour le package 'server-only'.
 *
 * Pourquoi ce fichier existe :
 *   Le package 'server-only' (v0.0.1) utilise la condition d'export
 *   'react-server' pour résoudre vers empty.js dans les Server Components
 *   Next.js. Dans tout autre contexte (client, Edge, Node.js, Vitest), il
 *   résout vers index.js qui throw immédiatement :
 *     "This module cannot be imported from a Client Component module."
 *
 *   Vitest tourne dans Node.js sans condition 'react-server' → les tests
 *   des modules server-side (server.ts, auth-helper.ts, admin-guard.ts,
 *   admin-layout-guard.ts) échouent à l'import avant même d'atteindre les cas
 *   de test.
 *
 * Solution :
 *   vitest.config.ts alias 'server-only' vers ce fichier vide dans
 *   l'environnement de test uniquement. En production/build Next.js,
 *   le vrai package est utilisé et la protection reste active.
 *
 * Sécurité :
 *   Ce mock n'affaiblit pas la protection en prod. Il permet uniquement aux
 *   tests unitaires de charger les modules concernés. Les tests eux-mêmes
 *   tournent dans Node.js (jamais dans un navigateur), donc la contrainte
 *   "server-only" est respectée de facto.
 */

// Module vide — no-op intentionnel pour les tests
export {};

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/app/api/**/*.ts'],
    },
    // 'server-only' lance une erreur dans tout environnement non-React-Server.
    // En test (Node.js/Vitest), il n'y a pas de condition 'react-server' →
    // le module par défaut throw. On le remplace par un module vide pour
    // permettre aux tests des modules server-side de s'exécuter normalement.
    // Ce mock est inoffensif : les tests ne tournent de toute façon jamais
    // dans un navigateur, ils sont déjà côté serveur.
    alias: {
      'server-only': require.resolve('./src/__mocks__/server-only.ts'),
    },
  },
});

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

// ─── Domaines Supabase autorisés pour le CSP ─────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '');

// ─── Content-Security-Policy ──────────────────────────────────────────────────
//
// ┌─ NONCES CSP — IMPLÉMENTATION ACTIVE ─────────────────────────────────────┐
// │                                                                            │
// │  STATUT : Implémenté — Phase 1+2+3 complétées (CWE-79 / OWASP A05)       │
// │                                                                            │
// │  ARCHITECTURE : La CSP est générée DYNAMIQUEMENT par le middleware,       │
// │  pas ici (next.config.js). Voir src/middleware.ts → buildCsp().           │
// │                                                                            │
// │  FLUX PAR REQUÊTE :                                                        │
// │   1. middleware.ts génère un nonce via generateNonce() (128 bits)          │
// │   2. Le nonce est injecté dans le header CSP response :                   │
// │      script-src 'nonce-{nonce}' 'strict-dynamic'                          │
// │   3. Le nonce est passé via request header x-nonce aux Server Components  │
// │   4. layout.tsx + JsonLd.tsx lisent x-nonce via next/headers              │
// │   5. Next.js 15 lit automatiquement le nonce depuis la CSP response       │
// │      header et l'applique à tous ses scripts SSR inline                   │
// │      (hydratation, RSC payload, __NEXT_DATA__)                            │
// │      Ref: next/dist/server/app-render/get-script-nonce-from-header.js     │
// │                                                                            │
// │  'unsafe-inline' RETIRÉ de script-src en production.                      │
// │  'strict-dynamic' propagate la confiance aux scripts chargés              │
// │  dynamiquement par les scripts noncés.                                    │
// │                                                                            │
// │  style-src — 'unsafe-inline' CONSERVÉ (chantier distinct) :              │
// │    154 occurrences de style={{...}} + Tailwind JIT. Migration nonces      │
// │    style-src = refonte UI complète — post-prod.                           │
// │                                                                            │
// │  connect-src — Sentry :                                                   │
// │    Sentry envoie les événements à *.ingest.sentry.io et                  │
// │    *.ingest.us.sentry.io. browser.sentry-cdn.com : nécessaire pour        │
// │    le chargement lazy de Sentry Replay (lazyLoadIntegration).             │
// │    blob: nécessaire pour Sentry Replay workers via blob: URLs.            │
// └────────────────────────────────────────────────────────────────────────────┘
//
// La CSP est désormais définie dans src/middleware.ts (buildCsp function).
// Les autres headers de sécurité (HSTS, X-Frame-Options, etc.) restent ici.
//
// ⚠️  NE PAS remettre Content-Security-Policy dans securityHeaders ci-dessous :
//     Le middleware applique la CSP dynamique avec nonce sur chaque requête.
//     Un header statique ici remplacerait le nonce dynamique et casserait la CSP.

// ─── Permissions-Policy ───────────────────────────────────────────────────────
// Source unique : next.config.js.
// vercel.json ne définit PAS la CSP et utilise un sous-ensemble des directives
// ci-dessous (sans autoplay, encrypted-media, fullscreen, picture-in-picture,
// ambient-light-sensor) — vercel.json est conservé pour la config de déploiement
// uniquement, ses headers sont ignorés au profit de ceux-ci.
// Note: 'ambient-light-sensor' est non reconnu par Chrome/Firefox modernes — retiré
const PermissionsPolicy = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
  'autoplay=(self)',
  'fullscreen=(self)',
  'picture-in-picture=()',
].join(', ');

// ─── En-têtes de sécurité ──────────────────────────────────────────────────────
// NOTE : Content-Security-Policy est absent ici car il est généré DYNAMIQUEMENT
// par src/middleware.ts avec un nonce unique par requête (voir buildCsp()).
// Tous les autres en-têtes de sécurité restent statiques.
const securityHeaders = [
  // Content-Security-Policy → src/middleware.ts (dynamique, avec nonce)
  { key: 'Strict-Transport-Security',     value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',               value: 'DENY' },
  { key: 'X-Content-Type-Options',        value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',        value: 'on' },
  { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',            value: PermissionsPolicy },
  // X-XSS-Protection intentionnellement retiré (PR #434, 2026-04-27).
  // Ce header est obsolète : Chrome l'a supprimé (v78+), Firefox ne l'a
  // jamais supporté, Safari l'a retiré (v16+). MDN le classe « déprecié ».
  // Pire : la valeur '1; mode=block' peut introduire des side-channel XSS
  // sur les anciens IE (CVE style — XSS auditor bypass). La CSP avec nonce
  // + strict-dynamic (src/middleware.ts buildCsp()) est la vraie protection.
  // Ref : https://owasp.org/www-project-secure-headers/#x-xss-protection
  { key: 'Cross-Origin-Opener-Policy',    value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy',  value: 'cross-origin' },
];

// ─── NOTE LIGHTHOUSE : Polyfills "Ancient JavaScript" (chunk 9446-*) ──────────
//
// Lighthouse signale systématiquement 13.1 KB de polyfills "Ancient JavaScript" :
//   Array.prototype.at, .flat, .flatMap, Object.fromEntries, Object.hasOwn,
//   String.prototype.trimEnd, String.prototype.trimStart.
//
// SOURCE CONFIRMÉE : node_modules/next/dist/build/polyfills/polyfill-module.js
// Ce fichier est un module interne de Next.js, injecté dans TOUS les builds
// indépendamment du browserslist et de la cible tsconfig.
//
// STATUT : UNFIXABLE côté application.
// Suivi : https://github.com/vercel/next.js/issues/21521
// Next.js bundle ses propres polyfills pour garantir la compatibilité avec
// les navigateurs cibles du framework (ES5+). Même avec browserslist
// chrome>=100, Next.js injecte toujours ce module.
//
// ⚠️  NE PAS essayer de "corriger" ceci via des deps npm ou tsconfig :
//     - Supprimer/modifier des packages npm n'a aucun effet sur ce chunk.
//     - Changer tsconfig.target n'affecte pas le bundler webpack de Next.js.
//     - Seule une PR dans le repo next.js lui-même pourrait le corriger.
// ─────────────────────────────────────────────────────────────────────────────

const nextConfig = {
  // ─── Options globales ────────────────────────────────────────────────────────
  // Supprime le header X-Powered-By: Next.js (fingerprinting inutile en prod).
  poweredByHeader: false,

  // ─── Performance compiler options ───────────────────────────────────────────
  // Remove console.log in production builds (keep warn/error for Sentry)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['warn', 'error'] }
      : false,
  },

  // ─── Experimental optimisations ─────────────────────────────────────────────
  experimental: {
    // Optimise package imports to reduce JS bundle size (tree-shaking icons etc.)
    // Next.js rewrites barrel imports into direct sub-path imports at build time,
    // eliminating unused exports without requiring manual import path changes.
    // Impact estimé : -15 à -30 KB gzipped sur le bundle client initial.
    optimizePackageImports: [
      'lucide-react',          // ~1000 icônes → seules les utilisées sont bundlées
      '@supabase/supabase-js', // SDK Supabase complet → seuls les modules utilisés
      'date-fns',              // 200+ helpers → seuls les imports actifs (~5)
      'recharts',              // 60+ composants → uniquement admin/stats (lazy)
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-toast',
    ],
  },

  images: {
    // ── Formats modernes ───────────────────────────────────────────────────────
    // AVIF compresse ~50% mieux que WebP, ~80% mieux que JPEG.
    // Next.js servira AVIF aux navigateurs qui le supportent, WebP aux autres,
    // JPEG/PNG en fallback — sans aucun changement dans le code.
    formats: ['image/avif', 'image/webp'],

    // ── Responsive breakpoints ─────────────────────────────────────────────────
    // Correspond aux breakpoints Tailwind utilisés dans le projet (sm:, md:, lg:, xl:).
    // Next.js génère les variantes à la demande et les met en cache.
    deviceSizes: [375, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes:  [16, 32, 48, 64, 96, 128, 192, 256, 384],

    // ── Cache des images optimisées ────────────────────────────────────────────
    // 30 jours → réduit les régénérations Vercel et la bande passante.
    minimumCacheTTL: 2592000,

    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // genspark.ai retiré (2026-04-27) : aucun usage applicatif dans src/
      // (sspark.genspark.ai, **.genspark.ai, www.genspark.ai supprimés pour
      // réduire la surface autorisée — voir SECURITY.md §3.6)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        // Toutes les pages (hors assets statiques)
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: securityHeaders,
      },

      {
        // Assets statiques : cache long + CORP
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control',                 value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy',  value: 'same-origin' },
        ],
      },
      {
        // Images optimisées Next.js
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

// ─── Sentry webpack plugin ────────────────────────────────────────────────────
//
// withSentryConfig() enrobe nextConfig pour :
//   1. Uploader les source maps vers Sentry au moment du build (prod uniquement).
//      Permet d'afficher le code source original dans les stack traces Sentry,
//      même si le code est minifié/obfusqué en production.
//   2. Injecter automatiquement les appels Sentry dans les routes Next.js
//      (auto-instrumentation des API Routes, Server Components, etc.).
//   3. Tree-shaking du SDK Sentry côté client pour réduire la taille du bundle.
//
// Variables d'env requises au build (Vercel → Settings → Environment Variables) :
//   SENTRY_DSN             — DSN du projet Sentry (aussi NEXT_PUBLIC_SENTRY_DSN)
//   SENTRY_ORG             — slug de l'organisation Sentry  (ex: biguglia-connect)
//   SENTRY_PROJECT         — slug du projet Sentry           (ex: biguglia-connect-nextjs)
//   SENTRY_AUTH_TOKEN      — auth token Sentry pour l'upload des source maps
//                            (à générer dans Sentry → Settings → Auth Tokens)
//
// En l'absence de SENTRY_AUTH_TOKEN (développement local), withSentryConfig
// désactive silencieusement l'upload des source maps mais n'échoue pas le build.

let wrappedConfig = nextConfig;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require('@sentry/nextjs');

  wrappedConfig = withSentryConfig(nextConfig, {
    // ── Organisation & projet Sentry ──────────────────────────────────────
    org:     process.env.SENTRY_ORG     ?? 'biguglia-connect',
    project: process.env.SENTRY_PROJECT ?? 'biguglia-connect-nextjs',

    // ── Source maps ───────────────────────────────────────────────────────
    // Uploader les source maps en silence (sans log verbose) au build.
    // Les source maps sont supprimées du déploiement public après upload.
    silent:              !isDev,
    // widenClientFileUpload désactivé : rallonge le build de ~60–90 s supplémentaires
    // en uploadant tous les chunks client (y compris node_modules). Le bénéfice
    // (meilleures stack traces pour les libs tierces) ne justifie pas le coût
    // Build Minutes sur Vercel Pro. Réactiver ponctuellement si debug lib tierce.
    widenClientFileUpload: false,

    // ── Auto-instrumentation ──────────────────────────────────────────────
    // Sentry v10 : les options autoInstrument* ont été déplacées sous `webpack`.
    // Le plugin détecte et enrobe automatiquement les API Routes, middleware
    // et App Directory via le plugin webpack — aucune config manuelle nécessaire.
    // (Les anciennes options autoInstrumentServerFunctions etc. sont dépréciées.)

    // ── Bundle client ─────────────────────────────────────────────────────
    // Désactive le SDK Sentry dans le bundle navigateur si pas de DSN configuré.
    // Évite d'alourdir le bundle en développement local.
    disableClientWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,

    // ── Tunneling ────────────────────────────────────────────────────────
    // Route les requêtes Sentry via /api/sentry-tunnel pour éviter les
    // bloqueurs de pub (ad-blockers bloquent souvent *.sentry.io).
    //
    // IMPORTANT : le plugin Sentry N'INJECTE PAS de route.ts — il injecte
    // une règle Next.js `rewrites` qui intercepte UNIQUEMENT les requêtes
    // portant les query params ?o=<orgid>&p=<projectid> et les redirige
    // vers https://o:<orgid>.ingest.sentry.io/api/…/envelope/
    // Les requêtes sans ces params atteignent normalement le handler suivant.
    //
    // /api/monitoring est réservé exclusivement au health-check maison
    // (src/app/api/monitoring/route.ts — Vercel probes, UptimeRobot, etc.).
    // /api/sentry-tunnel est le point d'entrée dédié au tunnel Sentry :
    // les vrais appels SDK arrivent avec ?o=<orgid>&p=<projectid> et sont
    // réécrits vers ingest.sentry.io avant d'atteindre tout handler.
    // Un GET sans ces params reçoit un 204 du stub route.ts de fallback.
    tunnelRoute: '/api/sentry-tunnel',

    // ── Nettoyage des source maps ─────────────────────────────────────────
    // Supprime les .map du déploiement après upload (pas exposés publiquement).
    deleteSourcemapsAfterUpload: true,

    // ── Réduction du bruit en dev ─────────────────────────────────────────
    hideSourceMaps: true,
  });
} catch {
  // @sentry/nextjs non installé ou erreur de config → on sert nextConfig brut
  console.warn('[next.config] Sentry non chargé — monitoring désactivé.');
}

module.exports = wrappedConfig;

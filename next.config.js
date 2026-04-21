/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

// ─── Domaines Supabase autorisés pour le CSP ─────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '');

// ─── Content-Security-Policy ──────────────────────────────────────────────────
//
// script-src — décisions :
//
//  'unsafe-eval'   RETIRÉ en prod.
//    Aucun usage réel dans le code (pas d'eval(), new Function(), ni recharts/
//    framer-motion qui l'exigeraient). Next.js SWC compile en prod sans eval.
//    Conservé UNIQUEMENT en développement pour le HMR (hot-module replacement)
//    de Next.js et les source maps.
//
//  'unsafe-inline' CONSERVÉ (nécessaire).
//    Next.js 14 App Router injecte des scripts inline pour l'hydratation SSR
//    (__NEXT_DATA__, composants serveur). La suppression exigerait une
//    implémentation complète de nonces via middleware — chantier séparé.
//
//  'strict-dynamic' NON ajouté pour l'instant.
//    En combinaison avec nonce, il remplacerait 'unsafe-inline' pour les scripts
//    inline légitimes. À activer lors de la migration nonce.
//
// style-src — 'unsafe-inline' requis :
//    Deux <style> tags dans des pages (evenements, perdu-trouve/[id]) +
//    style={{...}} inline via Tailwind/framer-motion. Suppression = chantier UI.
//
// connect-src — Sentry :
//    Sentry envoie les événements à *.ingest.sentry.io et *.ingest.us.sentry.io
//    via fetch() depuis le navigateur. Ces domaines DOIVENT être autorisés sinon
//    les erreurs front-end ne remontent jamais à Sentry.
//
// blob: est nécessaire pour Sentry Replay qui crée des workers via blob: URLs
//
// https://browser.sentry-cdn.com : Sentry Replay est chargé LAZY depuis ce CDN
//   via lazyLoadIntegration('replayIntegration'). Sans cette entrée, le navigateur
//   bloque le chargement et lève une violation CSP dans la console.
//   Voir sentry.client.config.ts — Sentry.lazyLoadIntegration('replayIntegration').
const scriptSrcProd = "'self' 'unsafe-inline' blob: https://vercel.live https://*.vercel-scripts.com https://browser.sentry-cdn.com";
const scriptSrcDev  = "'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live https://*.vercel-scripts.com https://browser.sentry-cdn.com";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src  ${isDev ? scriptSrcDev : scriptSrcProd};
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com data:;
  img-src     'self' data: blob:
              https://*.supabase.co https://*.supabase.in
              https://images.unsplash.com https://*.genspark.ai
              https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
  connect-src 'self'
              https://${supabaseHost}
              wss://${supabaseHost}
              https://*.supabase.co wss://*.supabase.co
              https://*.supabase.in  wss://*.supabase.in
              https://vercel.live https://*.vercel-scripts.com
              https://vitals.vercel-insights.com
              https://*.ingest.sentry.io
              https://*.ingest.us.sentry.io;
  worker-src  'self' blob:;
  frame-src   https://vercel.live;
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  upgrade-insecure-requests;
`
  .replace(/\n/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

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
const securityHeaders = [
  { key: 'Content-Security-Policy',       value: ContentSecurityPolicy },
  { key: 'Strict-Transport-Security',     value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',               value: 'DENY' },
  { key: 'X-Content-Type-Options',        value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',        value: 'on' },
  { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',            value: PermissionsPolicy },
  { key: 'X-XSS-Protection',             value: '1; mode=block' },
  { key: 'Cross-Origin-Opener-Policy',    value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy',  value: 'cross-origin' },
];

const nextConfig = {
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
      { protocol: 'https', hostname: 'sspark.genspark.ai' },
      { protocol: 'https', hostname: '**.genspark.ai' },
      { protocol: 'https', hostname: 'www.genspark.ai' },
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
    widenClientFileUpload: true,  // capture plus de fichiers client pour de meilleures stack traces

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
    // Route les requêtes Sentry via /api/monitoring pour éviter les bloqueurs
    // de pub (ad-blockers bloquent souvent *.sentry.io).
    // La route /api/monitoring/route.ts est créée automatiquement par le plugin.
    tunnelRoute: '/api/monitoring',

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

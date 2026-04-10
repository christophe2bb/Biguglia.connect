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
const scriptSrcProd = "'self' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com";
const scriptSrcDev  = "'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com";

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
              https://vitals.vercel-insights.com;
  frame-src   'none';
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
const PermissionsPolicy = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
  'ambient-light-sensor=()',
  'autoplay=(self)',
  'encrypted-media=(self)',
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
  images: {
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

module.exports = nextConfig;

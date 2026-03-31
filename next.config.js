/** @type {import('next').NextConfig} */

// ─── Domaines Supabase autorisés pour le CSP ─────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '');

// ─── Content-Security-Policy ──────────────────────────────────────────────────
// Politique stricte : seules les origines explicitement listées sont autorisées.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src  'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com;
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com data:;
  img-src     'self' data: blob: https://*.supabase.co https://*.supabase.in
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

// ─── En-têtes de sécurité communs ─────────────────────────────────────────────
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: PermissionsPolicy,
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin',
  },
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
        // Appliquer à toutes les pages (sauf assets statiques)
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: securityHeaders,
      },
      {
        // Assets statiques : cache long + CORP
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Images optimisées
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

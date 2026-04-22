/**
 * src/app/layout.tsx — Root Layout (Server Component)
 *
 * Responsabilité UNIQUE : enveloppe HTML/body + metadata globale.
 * Aucun composant client ici (pas de Navbar, AuthProvider, Toaster).
 *
 * Architecture des layouts :
 *   src/app/layout.tsx              ← ce fichier  (html + body + metadata)
 *   src/app/(main)/layout.tsx       ← shell public (AuthProvider + Navbar + Footer + Toaster)
 *   src/app/admin/layout.tsx        ← passthrough (metadata noindex)
 *   src/app/(private)/layout.tsx    ← shell privé  (AuthProvider + Navbar + Toaster, pas de Footer)
 *   src/app/connexion/layout.tsx    ← metadata noindex seulement
 *   src/app/inscription/layout.tsx  ← idem
 *   ...
 *
 * ─── Nonce CSP ───────────────────────────────────────────────────────────────
 *
 *   Le nonce CSP est généré par le middleware (src/middleware.ts) et passé
 *   via le request header x-nonce. Ce layout le lit via next/headers et le
 *   transmet au composant JsonLd (via prop `nonce`).
 *
 *   Next.js 15 lit lui-même le nonce depuis le header Content-Security-Policy
 *   de la RESPONSE et l'applique automatiquement à ses scripts SSR inline
 *   (__NEXT_DATA__, RSC payload, hydratation). Ce layout n'a pas besoin
 *   de créer de <Script> manuels pour ces scripts Next.js internes.
 *
 *   Ref: next/dist/server/app-render/get-script-nonce-from-header.js
 */

import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { getSiteUrl } from '@/lib/seo/site-url';

const SITE_URL  = getSiteUrl();
const SITE_NAME = 'Biguglia Connect';
const DEFAULT_TITLE = 'Biguglia Connect — Artisans & Services Locaux à Biguglia';
const DEFAULT_DESC  =
  'La plateforme locale de Biguglia (Haute-Corse) : trouvez des artisans vérifiés, déposez des annonces, échangez du matériel, participez au forum et rejoignez la communauté du village.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/biguglia-hero.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  keywords: [
    'artisans Biguglia', 'plombier Biguglia', 'électricien Biguglia',
    'services locaux Corse', 'artisan Haute-Corse', 'forum Biguglia',
    'annonces Biguglia', 'communauté Biguglia', 'maçon Corse', 'peintre Corse',
    'petites annonces Corse', 'entraide village Biguglia',
  ],
  authors:   [{ name: SITE_NAME, url: SITE_URL }],
  creator:   SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: SITE_URL },
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:                true,
      follow:               true,
      'max-video-preview':  -1,
      'max-image-preview':  'large',
      'max-snippet':        -1,
    },
  },
  openGraph: {
    type:        'website',
    locale:      'fr_FR',
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Biguglia Connect' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images:      [DEFAULT_OG_IMAGE],
    creator:     '@biguglia_connect',
  },
  icons: {
    icon:    [{ url: '/favicon.ico', sizes: 'any' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple:   '/favicon.svg',
    shortcut:'/favicon.ico',
  },
  // manifest is intentionally omitted here — Next.js 14 hardcodes crossOrigin="use-credentials"
  // on the generated <link rel="manifest"> which breaks PWA installs.
  // The tag is added manually in the <head> below without the crossOrigin attribute.
};

export const viewport: Viewport = {
  themeColor:   '#2563eb',
  colorScheme:  'light',
  width:        'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ── Nonce CSP ──────────────────────────────────────────────────────────────
  // Injecté par src/middleware.ts via le request header x-nonce.
  // Utilisé par JsonLd.tsx pour ses balises <script type="application/ld+json">.
  // Next.js 15 gère automatiquement ses propres scripts SSR inline via le
  // header Content-Security-Policy de la response (nonce extrait par
  // get-script-nonce-from-header.js) — pas besoin de le passer à <Script>.
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="fr">
      <head>
        {/* Manifest sans crossOrigin — Next.js 14 hardcode crossOrigin="use-credentials"
            via l'API metadata, ce qui empêche le chargement du manifest hors iframe. */}
        <link rel="manifest" href="/manifest.json" />

        {/* ── Hints réseau ─────────────────────────────────────────────────────
            RÈGLE DE CADRAGES (Lighthouse "Origines préconnectées") :
            • preconnect ne doit pointer QUE vers des origines effectivement
              fetchées pendant le rendu INITIAL côté client.
            • Supabase est appelé SSR (server-side) et côté client uniquement
              APRÈS hydratation (auth store) → pas un candidat preconnect global.
            • Next.js 15 App Router gère lui-même le preload de l'image LCP via
              ReactDOM.preload() lorsque priority=true est posé sur <Image>.
              Le preload pointe sur /_next/image?url=... (URL réelle de l'img).
              Un <link rel="preload" href="/images/biguglia-hero.jpg"> serait
              une URL DIFFÉRENTE de l'img src → doublon inutile + warning Lighthouse.
            • fetchPriority="high" est passé directement au composant <Image>
              dans page.tsx → il apparaît dans l'attribut fetchpriority de l'<img>.
            ─────────────────────────────────────────────────────────────────── */}
        {/* dns-prefetch Supabase : résolution DNS anticipée pour le premier fetch
            client (auth refresh, realtime). Moins agressif que preconnect —
            pas de TCP ni TLS prématuré, pas de warning Lighthouse.             */}
        <link rel="dns-prefetch" href="https://qmrkacrpncdkhofiqlrg.supabase.co" />
      </head>
      <body className="min-h-screen flex flex-col bg-white">
        {/* Skip-to-content : visible uniquement à la navigation clavier (Tab depuis le haut) */}
        <a href="#main-content" className="skip-to-content">
          Aller au contenu principal
        </a>
        {/*
          Le nonce est passé aux children via React context si nécessaire.
          Pour l'instant, seul JsonLd.tsx l'utilise directement via sa prop.
          Les Server Components descendants lisent x-nonce via headers() directement.
        */}
        <div id="main-content" data-nonce={nonce || undefined}>
          {children}
        </div>
      </body>
    </html>
  );
}

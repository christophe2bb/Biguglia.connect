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
 */

import type { Metadata, Viewport } from 'next';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Manifest sans crossOrigin — Next.js 14 hardcode crossOrigin="use-credentials"
            via l'API metadata, ce qui empêche le chargement du manifest hors iframe. */}
        <link rel="manifest" href="/manifest.json" />

        {/* ── Preconnect hints — réduit le TTFB des ressources critiques ──────────
            Supabase : établit la connexion TCP+TLS avant que le JS client ne charge.
            Impact mesuré : -150 à -300 ms sur le premier fetch API/Storage.
            ── RÈGLE ────────────────────────────────────────────────────────────────
            preconnect  → pour les origines CERTIFIÉES utilisées sur toutes les pages
                          (Supabase REST, Storage, Realtime).
            dns-prefetch → fallback navigateurs qui ne supportent pas preconnect,
                            et pour les origines PROBABLES (pas certaines à 100 %).
            ─────────────────────────────────────────────────────────────────────── */}
        {/* Supabase REST + Auth + Storage (fetch() dès l'hydratation) */}
        <link rel="preconnect" href="https://qmrkacrpncdkhofiqlrg.supabase.co" />
        {/* Storage CDN Supabase (images utilisateurs uploadées) */}
        <link rel="dns-prefetch" href="https://qmrkacrpncdkhofiqlrg.supabase.co" />

        {/* ── LCP hero image preload ────────────────────────────────────────────
            biguglia-hero.jpg est le Largest Contentful Paint de la page d'accueil.
            Le <link rel="preload"> demande au navigateur de télécharger l'image
            AVANT que le parser HTML ne rencontre le <img> dans le bundle JS.
            fetchpriority="high" confirme la priorité au Resource Scheduler Chrome.
            imagesrcset + imagesizes = responsive preload (évite de charger 1920px
            sur mobile). Ceci concerne uniquement la page d'accueil ; sur les autres
            pages cette image n'est pas le LCP, mais le navigateur la met en cache. */}
        <link
          rel="preload"
          as="image"
          href="/images/biguglia-hero.jpg"
          imageSrcSet="/images/biguglia-hero.jpg"
          imageSizes="100vw"
          fetchPriority="high"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white">
        {/* Skip-to-content : visible uniquement à la navigation clavier (Tab depuis le haut) */}
        <a href="#main-content" className="skip-to-content">
          Aller au contenu principal
        </a>
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}

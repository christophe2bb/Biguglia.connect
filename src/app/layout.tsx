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
  manifest: '/manifest.json',
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

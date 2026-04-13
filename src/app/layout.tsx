import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';

// ─── URL canonique du site ────────────────────────────────────────────────────
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const SITE_NAME = 'Biguglia Connect';
const DEFAULT_TITLE = 'Biguglia Connect — Artisans & Services Locaux à Biguglia';
const DEFAULT_DESC =
  'La plateforme locale de Biguglia (Haute-Corse) : trouvez des artisans vérifiés, déposez des annonces, échangez du matériel, participez au forum et rejoignez la communauté du village.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/biguglia-hero.jpg`;

// ─── Metadata globale ─────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // Titre avec template pour les sous-pages
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  description: DEFAULT_DESC,

  // Mots-clés (signal faible mais utile pour les moteurs)
  keywords: [
    'artisans Biguglia', 'plombier Biguglia', 'électricien Biguglia',
    'services locaux Corse', 'artisan Haute-Corse', 'forum Biguglia',
    'annonces Biguglia', 'communauté Biguglia', 'maçon Corse', 'peintre Corse',
    'petites annonces Corse', 'entraide village Biguglia',
  ],

  // Auteur & éditeur
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  // Canonical + robots
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

  // ── Open Graph ──────────────────────────────────────────────────────────────
  openGraph: {
    type:        'website',
    locale:      'fr_FR',
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [
      {
        url:    DEFAULT_OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    'Biguglia Connect — Plateforme locale de Biguglia, Corse',
      },
    ],
  },

  // ── Twitter / X Card ────────────────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    title:       DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images:      [DEFAULT_OG_IMAGE],
    creator:     '@biguglia_connect',
  },

  // ── Icônes ──────────────────────────────────────────────────────────────────
  icons: {
    icon:       [
      { url: '/favicon.ico',            sizes: 'any' },
      { url: '/favicon.svg',            type: 'image/svg+xml' },
    ],
    apple:      '/favicon.svg',
    shortcut:   '/favicon.ico',
  },

  // ── Manifest PWA ────────────────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Vérification moteurs ────────────────────────────────────────────────────
  // verification: { google: 'VOTRE_CODE_GOOGLE_SEARCH_CONSOLE' },
};

// ─── Viewport (thème couleur, responsive) ────────────────────────────────────

export const viewport: Viewport = {
  themeColor:    '#2563eb',
  colorScheme:   'light',
  width:         'device-width',
  initialScale:  1,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col bg-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background:   '#fff',
                color:        '#1f2937',
                border:       '1px solid #f3f4f6',
                borderRadius: '12px',
                boxShadow:    '0 10px 40px rgba(0,0,0,0.1)',
                fontSize:     '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

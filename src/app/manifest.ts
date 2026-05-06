/**
 * src/app/manifest.ts — PWA Manifest (Next.js 15 API)
 *
 * Next.js 15 génère automatiquement le <link rel="manifest"> via cette
 * convention de fichier, SANS ajouter crossOrigin="use-credentials".
 * Cela corrige l'erreur "contentscript.js removing <link rel='manifest'>"
 * causée par des extensions Chrome qui bloquent les manifests avec credentials.
 *
 * Ce fichier remplace la balise <link rel="manifest"> manuelle dans layout.tsx.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Biguglia Connect',
    short_name:       'Biguglia',
    description:      'La plateforme locale de Biguglia — Artisans, Annonces & Communauté',
    start_url:        '/',
    display:          'standalone',
    background_color: '#ffffff',
    theme_color:      '#2563eb',
    orientation:      'portrait-primary',
    lang:             'fr',
    icons: [
      {
        src:     '/favicon.svg',
        sizes:   'any',
        type:    'image/svg+xml',
        purpose: 'any',
      },
      {
        src:     '/favicon.ico',
        sizes:   '48x48',
        type:    'image/x-icon',
      },
    ],
    categories: ['lifestyle', 'social', 'utilities'],
    screenshots: [
      {
        src:   '/images/biguglia-hero.jpg',
        sizes: '1024x601',
        type:  'image/jpeg',
        label: 'Biguglia Connect — Accueil',
      },
    ],
  };
}

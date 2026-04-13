/**
 * src/app/robots.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Fichier robots.txt généré par Next.js App Router.
 * Accessible sur : https://biguglia-connect.vercel.app/robots.txt
 *
 * Règles :
 *   • Googlebot et bots génériques → autorisés sur les pages publiques
 *   • Pages privées/admin/API → interdites
 *   • Sitemap déclaré explicitement
 */

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Tous les bots
        userAgent: '*',
        allow: [
          '/',
          '/artisans',
          '/artisans/',
          '/annonces',
          '/annonces/',
          '/forum',
          '/forum/',
          '/emploi/',
          '/evenements',
          '/evenements/',
          '/promenades',
          '/materiel',
          '/coups-de-main',
          '/associations',
          '/associations/',
          '/collectionneurs',
          '/perdu-trouve',
          '/confiance',
          '/aide',
          '/mentions-legales',
          '/confidentialite',
          '/cgu',
          // ── Pages SEO locales (trafic qualifié) ──
          '/artisans-biguglia',
          '/services-biguglia',
          '/emploi-biguglia',
          '/evenements-biguglia',
          '/associations-biguglia',
          '/annonces-biguglia',
          '/forum-biguglia',
          '/communaute',
          '/communaute/',
          // ── Pages par métier artisan ──────────────
          '/artisans/metier/',
        ],
        disallow: [
          // Pages privées
          '/admin/',
          '/dashboard',
          '/profil',
          '/profil/',
          '/messages',
          '/messages/',
          '/mes-echanges',
          '/notifications',
          '/notifications/',
          // Routes API (jamais indexées)
          '/api/',
          // Pages auth
          '/connexion',
          '/inscription',
          '/mot-de-passe-oublie',
          '/auth/',
          // Recherche (paramètres variables = contenu dupliqué)
          '/recherche',
        ],
      },
      {
        // GPTBot (OpenAI) — bloquer le scraping pour l'IA
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        // ChatGPT-User
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        // Google-Extended (Gemini training)
        userAgent: 'Google-Extended',
        disallow: ['/'],
      },
      {
        // CCBot (Common Crawl — utilisé pour entraîner des LLM)
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  };
}

/**
 * src/app/sitemap.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Sitemap XML dynamique généré par Next.js App Router.
 * Accessible sur : https://biguglia-connect.vercel.app/sitemap.xml
 *
 * Stratégie :
 *   • Pages statiques publiques → always/weekly/monthly selon fréquence de MAJ
 *   • Pages SEO locales (/services-biguglia, /emploi-biguglia…) → weekly, haute priorité
 *   • Pages métiers artisans (/artisans/metier/[slug]) → weekly, priorité 0.85
 *   • Pages dynamiques (artisans) → requête Supabase anon (lecture publique RLS)
 *   • Pages privées (admin, dashboard, profil, messages) → EXCLUES
 *   • Pages légales → monthly, faible priorité
 *
 * Priorités SEO :
 *   1.0 → Accueil
 *   0.95 → Pages SEO locales (/services-biguglia, /emploi-biguglia…)
 *   0.9  → Pages clés (artisans, annonces, forum, emploi)
 *   0.85 → Pages par métier (/artisans/metier/[slug])
 *   0.8  → Pages thématiques (événements, promenades, matériel…)
 *   0.75 → Pages communautaires (/communaute)
 *   0.7  → Pages artisans individuels
 *   0.5  → Pages légales, aide
 *   0.3  → Pages auth (connexion, inscription)
 */

import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ALL_TRADE_SLUGS } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Pages SEO locales (haute priorité — cibles de trafic qualifié) ─────────

  const seoLocalPages: MetadataRoute.Sitemap = [
    // ── Hub principal artisans (priorité maximale pour capter les requêtes à fort volume) ──
    {
      url:             `${SITE_URL}/artisans-biguglia`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.97,
    },
    {
      url:             `${SITE_URL}/services-biguglia`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.95,
    },
    {
      url:             `${SITE_URL}/emploi-biguglia`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.95,
    },
    {
      url:             `${SITE_URL}/evenements-biguglia`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.90,
    },
    {
      url:             `${SITE_URL}/associations-biguglia`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.90,
    },
    {
      url:             `${SITE_URL}/annonces-biguglia`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.90,
    },
    {
      url:             `${SITE_URL}/forum-biguglia`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.85,
    },
    {
      url:             `${SITE_URL}/communaute`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.75,
    },
  ];

  // ── Pages par métier artisan — générées statiquement au build ────────────

  const tradePages: MetadataRoute.Sitemap = ALL_TRADE_SLUGS.map(slug => ({
    url:             `${SITE_URL}/artisans/metier/${slug}`,
    lastModified:    now,
    changeFrequency: 'weekly' as const,
    priority:        0.85,
  }));

  // ── Pages statiques publiques ─────────────────────────────────────────────

  const staticPages: MetadataRoute.Sitemap = [
    // Accueil — priorité maximale
    {
      url:              SITE_URL,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         1.0,
    },
    // Pages clés — contenu fréquent
    {
      url:              `${SITE_URL}/artisans`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/annonces`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/forum`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/emploi/offres`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/emploi/demandes`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.8,
    },
    // Pages thématiques
    {
      url:              `${SITE_URL}/evenements`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${SITE_URL}/promenades`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${SITE_URL}/materiel`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${SITE_URL}/coups-de-main`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${SITE_URL}/associations`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${SITE_URL}/collectionneurs`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.7,
    },
    {
      url:              `${SITE_URL}/perdu-trouve`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.7,
    },
    // Pages de confiance & info
    {
      url:              `${SITE_URL}/confiance`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${SITE_URL}/aide`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.5,
    },
    // Pages légales
    {
      url:              `${SITE_URL}/mentions-legales`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
    {
      url:              `${SITE_URL}/confidentialite`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
    {
      url:              `${SITE_URL}/cgu`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
  ];

  // ── Pages dynamiques : profils artisans vérifiés ──────────────────────────
  // Lecture via anon client (RLS publique pour artisans vérifiés)

  let artisanPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient();
    const { data: artisans } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'artisan_verified')
      .order('updated_at', { ascending: false })
      .limit(500); // Cap à 500 pour la perf

    if (artisans && artisans.length > 0) {
      artisanPages = artisans.map(artisan => ({
        url:             `${SITE_URL}/artisans/${artisan.id}`,
        lastModified:    artisan.updated_at ? new Date(artisan.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority:        0.7,
      }));
    }
  } catch {
    // Si la DB est indisponible, on génère quand même le sitemap sans les artisans
    console.warn('[sitemap] Impossible de récupérer les artisans depuis Supabase');
  }

  return [
    ...seoLocalPages,
    ...tradePages,
    ...staticPages,
    ...artisanPages,
  ];
}

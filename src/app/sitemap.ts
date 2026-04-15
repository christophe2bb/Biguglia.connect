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
 *   • Pages dynamiques → client anon public (pas de cookies, pas de session)
 *     – artisans vérifiés     /artisans/[id]
 *     – annonces actives      /annonces/[id]
 *     – événements publics    /evenements/[id]
 *     – sujets forum          /forum/[id]
 *     – associations          /associations/[id]
 *     – objets collectionneurs/[id]
 *     – matériel partagé      /materiel/[id]
 *     – perdu/trouvé          /perdu-trouve/[id]
 *     – promenades/sorties    /promenades/sorties/[id]
 *   • Pages privées (admin, dashboard, profil, messages) → EXCLUES
 *   • Pages légales → monthly, faible priorité
 *
 * Priorités SEO :
 *   1.0  → Accueil
 *   0.97 → Hub artisans-biguglia
 *   0.95 → Pages SEO locales (/services-biguglia, /emploi-biguglia…)
 *   0.90 → Pages clés listes (artisans, annonces, forum, emploi)
 *   0.85 → Pages par métier (/artisans/metier/[slug])
 *   0.80 → Pages thématiques
 *   0.75 → Fiches dynamiques individuelles (artisans, annonces, events…)
 *   0.65 → Fiches secondaires (collectionneurs, matériel, perdu-trouvé, promenades)
 *   0.50 → Pages confiance / aide
 *   0.30 → Pages légales / auth
 *
 * Client Supabase : createSupabaseClient direct (anon key, pas de cookies).
 * Chaque bloc est enveloppé dans un try/catch — le sitemap est toujours généré.
 */

import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ALL_TRADE_SLUGS } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

/** Client public anon — pas de session, pas de cookies. Idéal pour un sitemap. */
function getPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now      = new Date();
  const supabase = getPublicClient();

  // ── Pages SEO locales (cibles trafic qualifié) ────────────────────────────

  const seoLocalPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/artisans-biguglia`,    lastModified: now, changeFrequency: 'weekly', priority: 0.97 },
    { url: `${SITE_URL}/services-biguglia`,    lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE_URL}/emploi-biguglia`,      lastModified: now, changeFrequency: 'daily',  priority: 0.95 },
    { url: `${SITE_URL}/evenements-biguglia`,  lastModified: now, changeFrequency: 'weekly', priority: 0.90 },
    { url: `${SITE_URL}/associations-biguglia`,lastModified: now, changeFrequency: 'weekly', priority: 0.90 },
    { url: `${SITE_URL}/annonces-biguglia`,    lastModified: now, changeFrequency: 'daily',  priority: 0.90 },
    { url: `${SITE_URL}/forum-biguglia`,       lastModified: now, changeFrequency: 'daily',  priority: 0.85 },
    { url: `${SITE_URL}/communaute`,           lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
  ];

  // ── Pages par métier artisan — statiques au build ─────────────────────────

  const tradePages: MetadataRoute.Sitemap = ALL_TRADE_SLUGS.map(slug => ({
    url:             `${SITE_URL}/artisans/metier/${slug}`,
    lastModified:    now,
    changeFrequency: 'weekly' as const,
    priority:        0.85,
  }));

  // ── Pages statiques publiques ─────────────────────────────────────────────

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                              lastModified: now, changeFrequency: 'daily',   priority: 1.0  },
    { url: `${SITE_URL}/artisans`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/annonces`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/forum`,                   lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/emploi/offres`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/emploi/demandes`,         lastModified: now, changeFrequency: 'daily',   priority: 0.8  },
    { url: `${SITE_URL}/evenements`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8  },
    { url: `${SITE_URL}/promenades`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8  },
    { url: `${SITE_URL}/materiel`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.8  },
    { url: `${SITE_URL}/coups-de-main`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.8  },
    { url: `${SITE_URL}/associations`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.8  },
    { url: `${SITE_URL}/collectionneurs`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${SITE_URL}/perdu-trouve`,            lastModified: now, changeFrequency: 'daily',   priority: 0.7  },
    { url: `${SITE_URL}/confiance`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${SITE_URL}/aide`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.5  },
    { url: `${SITE_URL}/mentions-legales`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3  },
    { url: `${SITE_URL}/confidentialite`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3  },
    { url: `${SITE_URL}/cgu`,                     lastModified: now, changeFrequency: 'yearly',  priority: 0.3  },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  type Row = { id: string; updated_at?: string | null };

  function toPages(
    rows: Row[] | null | undefined,
    base: string,
    priority: number,
    freq: MetadataRoute.Sitemap[number]['changeFrequency'],
  ): MetadataRoute.Sitemap {
    return (rows ?? []).map(r => ({
      url:             `${SITE_URL}/${base}/${r.id}`,
      lastModified:    r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: freq,
      priority,
    }));
  }

  // ── Requêtes dynamiques (toutes en parallèle) ─────────────────────────────

  const [
    artisansRes,
    listingsRes,
    eventsRes,
    forumRes,
    assosRes,
    collectionRes,
    materielRes,
    lfRes,
    promenadesRes,
  ] = await Promise.allSettled([

    // 1. Profils artisans vérifiés
    supabase
      .from('artisan_profiles')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(500),

    // 2. Annonces actives
    supabase
      .from('listings')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(500),

    // 3. Événements publiés (non annulés)
    supabase
      .from('events')
      .select('id, updated_at')
      .neq('status', 'annule')
      .order('updated_at', { ascending: false })
      .limit(300),

    // 4. Sujets forum ouverts (forum_topics v2)
    supabase
      .from('forum_topics')
      .select('id, updated_at')
      .not('status', 'eq', 'archive')
      .order('updated_at', { ascending: false })
      .limit(300),

    // 5. Associations publiées
    supabase
      .from('associations')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),

    // 6. Objets collectionneurs actifs
    supabase
      .from('collection_items')
      .select('id, updated_at')
      .eq('status', 'actif')
      .order('updated_at', { ascending: false })
      .limit(300),

    // 7. Matériel partagé disponible
    supabase
      .from('equipment_items')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(300),

    // 8. Annonces perdu/trouvé actives
    supabase
      .from('lost_found_items')
      .select('id, updated_at')
      .in('status', ['perdu', 'trouve', 'identifie'])
      .order('updated_at', { ascending: false })
      .limit(300),

    // 9. Promenades/sorties en groupe
    supabase
      .from('group_outings')
      .select('id, updated_at')
      .neq('status', 'annule')
      .order('updated_at', { ascending: false })
      .limit(200),
  ]);

  // ── Construction des blocs (silencieux si erreur) ─────────────────────────

  const artisanPages    = toPages(artisansRes.status    === 'fulfilled' ? artisansRes.value.data    : null, 'artisans',         0.75, 'weekly');
  const listingPages    = toPages(listingsRes.status    === 'fulfilled' ? listingsRes.value.data    : null, 'annonces',         0.75, 'weekly');
  const eventPages      = toPages(eventsRes.status      === 'fulfilled' ? eventsRes.value.data      : null, 'evenements',       0.70, 'weekly');
  const forumPages      = toPages(forumRes.status       === 'fulfilled' ? forumRes.value.data       : null, 'forum',            0.65, 'weekly');
  const assoPages       = toPages(assosRes.status       === 'fulfilled' ? assosRes.value.data       : null, 'associations',     0.65, 'monthly');
  const collectionPages = toPages(collectionRes.status  === 'fulfilled' ? collectionRes.value.data  : null, 'collectionneurs',  0.60, 'weekly');
  const materielPages   = toPages(materielRes.status    === 'fulfilled' ? materielRes.value.data    : null, 'materiel',         0.60, 'weekly');
  const lfPages         = toPages(lfRes.status          === 'fulfilled' ? lfRes.value.data          : null, 'perdu-trouve',     0.65, 'daily');
  const promenadePages  = toPages(promenadesRes.status  === 'fulfilled' ? promenadesRes.value.data  : null, 'promenades/sorties', 0.60, 'weekly');

  return [
    ...staticPages,
    ...seoLocalPages,
    ...tradePages,
    // Fiches individuelles — par ordre de priorité SEO décroissante
    ...artisanPages,
    ...listingPages,
    ...eventPages,
    ...lfPages,
    ...forumPages,
    ...assoPages,
    ...collectionPages,
    ...materielPages,
    ...promenadePages,
  ];
}

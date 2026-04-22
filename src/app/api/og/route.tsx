/**
 * GET /api/og
 * ─────────────────────────────────────────────────────────────────────────────
 * Génère dynamiquement une image Open Graph 1200×630 pour les annonces sans photo.
 *
 * Paramètres de requête :
 *   title   – titre de l'annonce (obligatoire, max 72 car. affiché)
 *   type    – listing_type : sale | wanted | free | service | exchange | rental
 *   price   – prix en EUR (optionnel, chaîne numérique)
 *   cat     – nom de catégorie (optionnel)
 *   cond    – condition : neuf | tres_bon | bon | usage | a_reparer | lot | excellent | passable
 *
 * Runtime : Edge (compatible Vercel, < 30 ms cold-start)
 * Sortie  : image/png 1200×630
 * Cache   : public, 7 jours (s-maxage=604800, stale-while-revalidate=86400)
 *
 * Design :
 *   • Fond dégradé bleu-indigo (couleur de marque Biguglia Connect)
 *   • Bande de couleur supérieure selon le type d'annonce
 *   • Emoji + nom du type en haut à gauche
 *   • Titre centré (grand, blanc, gras) avec retour automatique
 *   • Badges prix / catégorie / état en bas
 *   • Nom du site en bas à droite
 */

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

// Helpers purs — importés depuis og-helpers.ts (séparé de ce fichier pour
// permettre les tests Vitest sans Edge runtime ni JSX).
// NB : ne jamais re-exporter depuis un fichier route.tsx — Next.js interdit
// tout export qui ne fait pas partie du contrat Route (GET, POST, runtime…).
import {
  TYPE_META,
  CONDITION_LABELS_SHORT,
  formatPriceBadge,
  parseOgParams,
} from './og-helpers';

export const runtime = 'edge';

// ─── Dimensions ───────────────────────────────────────────────────────────────

const WIDTH  = 1200;
const HEIGHT = 630;
const SITE_NAME = 'Biguglia Connect';

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const parsed = parseOgParams(searchParams);

  // Paramètre `title` obligatoire
  if (!parsed) {
    return new Response('Missing required param: title', { status: 400 });
  }

  const { title, type, price, cat, cond } = parsed;
  const meta = TYPE_META[type] ?? TYPE_META.sale;
  const priceBadge = formatPriceBadge(price);
  const condLabel  = cond ? CONDITION_LABELS_SHORT[cond] ?? null : null;

  // Badges bas de page (filtre les valeurs vides)
  const badges: string[] = [priceBadge, cat ?? '', condLabel ?? ''].filter(Boolean);

  const image = new ImageResponse(
    (
      <div
        style={{
          width:      WIDTH,
          height:     HEIGHT,
          display:    'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)',
          fontFamily: 'system-ui, sans-serif',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        {/* ── Cercles décoratifs (profondeur visuelle) ── */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
          }}
        />

        {/* ── Bande couleur accent en haut ── */}
        <div
          style={{
            width: '100%',
            height: 8,
            background: meta.accent,
            display: 'flex',
            flexShrink: 0,
          }}
        />

        {/* ── Badge type annonce (haut gauche) ── */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        10,
            margin:     '32px 48px 0',
          }}
        >
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              background:   `${meta.accent}33`,
              border:       `2px solid ${meta.accent}`,
              borderRadius: 100,
              padding:      '8px 20px',
            }}
          >
            <span style={{ fontSize: 22 }}>{meta.emoji}</span>
            <span
              style={{
                fontSize:   18,
                fontWeight: 700,
                color:      '#fff',
                letterSpacing: '0.02em',
              }}
            >
              {meta.label}
            </span>
          </div>
        </div>

        {/* ── Titre (zone centrale — flex grow) ── */}
        <div
          style={{
            flex:           1,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '0 64px',
          }}
        >
          <div
            style={{
              fontSize:   title.length > 50 ? 48 : 60,
              fontWeight: 800,
              color:      '#ffffff',
              textAlign:  'center',
              lineHeight: 1.2,
              textShadow: '0 2px 20px rgba(0,0,0,0.4)',
              maxWidth:   1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* ── Bas de page : badges + nom du site ── */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 48px 36px',
          }}
        >
          {/* Badges (prix, catégorie, état) */}
          <div style={{ display: 'flex', gap: 12 }}>
            {badges.map((badge, i) => (
              <div
                key={i}
                style={{
                  display:      'flex',
                  padding:      '8px 18px',
                  background:   'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 8,
                  border:       '1px solid rgba(255,255,255,0.2)',
                  fontSize:     18,
                  fontWeight:   600,
                  color:        '#f1f5f9',
                }}
              >
                {badge}
              </div>
            ))}
          </div>

          {/* Nom du site */}
          <div
            style={{
              fontSize:     20,
              fontWeight:   700,
              color:        'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em',
            }}
          >
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    {
      width:  WIDTH,
      height: HEIGHT,
    },
  );

  // Cache 7 jours côté CDN, 24 h stale-while-revalidate
  image.headers.set(
    'Cache-Control',
    'public, s-maxage=604800, stale-while-revalidate=86400',
  );

  return image;
}

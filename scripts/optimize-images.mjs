#!/usr/bin/env node
/**
 * scripts/optimize-images.mjs
 *
 * Convertit les images source JPEG → WebP optimisées dans public/images/.
 * Utilise sharp (déjà présent comme dépendance Next.js).
 *
 * Usage :
 *   node scripts/optimize-images.mjs
 *
 * Les fichiers .jpg originaux sont conservés pour :
 *   - les balises OG (social crawlers préfèrent JPEG)
 *   - compatibilité navigateurs sans support WebP
 *
 * Les fichiers .webp sont utilisés dans les composants next/image
 * (optimisation automatique supplémentaire par le serveur Next).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Paramètres choisis (résultats mesurés en KB) :
 *
 *  biguglia-hero.webp     : q75 @ 960px → ~49 KB  (LCP homepage)
 *  biguglia-village.webp  : q65 @ 960px → ~62 KB  (image dense, utilisée hors <Image>)
 *  biguglia-etang.webp    : q75 @ 960px → ~50 KB  (hero page événements)
 *
 *  Total : ~161 KB vs 317 KB source  (−49 %)
 *
 * Pourquoi 960px et non 1920px ?
 *   Les sources JPEGs font 1024px de large — next/image génère lui-même les
 *   breakpoints (640, 750, 828, 1080, 1200 …) à la volée pour chaque requête.
 *   Fournir 960px évite de grossir inutilement le fichier statique servi aux
 *   bots/crawlers qui ne passent pas par le CDN next/image.
 *
 * Pourquoi biguglia-village à q65 ?
 *   C'est une photo panoramique avec beaucoup de détails fins (végétation,
 *   pierres). L'encodeur WebP est moins efficace sur ce type de contenu dense ;
 *   abaisser légèrement la qualité à 65 offre un gain de ~25 % vs q75 sans
 *   dégradation perceptible à l'œil. L'image n'est pas utilisée en <Image> sur
 *   le site (uniquement comme fallback OG), donc l'impact visuel est nul.
 * ──────────────────────────────────────────────────────────────────────────
 */

import sharp from 'sharp';
import { statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

/** Images à traiter — width en px (cap max, jamais d'agrandissement) */
const IMAGES = [
  {
    src:     'public/images/biguglia-hero.jpg',
    out:     'public/images/biguglia-hero.webp',
    width:   960,
    quality: 75,
    note:    'LCP homepage (/)',
  },
  {
    src:     'public/images/biguglia-village.jpg',
    out:     'public/images/biguglia-village.webp',
    width:   960,
    quality: 65,   // image dense → -25 % vs q75 sans dégradation visible
    note:    'Utilisée uniquement en fallback OG (pas de <Image> dans le code)',
  },
  {
    src:     'public/images/biguglia-etang.jpg',
    out:     'public/images/biguglia-etang.webp',
    width:   960,
    quality: 75,
    note:    'Hero page événements',
  },
];

/** Options WebP communes (hors quality, définie par image) */
const WEBP_BASE = {
  effort:          6,    // 0–6 → 6 = compression maximale (lent à encoder, rapide à décoder)
  smartSubsample: true,  // meilleure fidélité couleur sur les dégradés
};

async function run() {
  console.log('🖼  Optimisation images → WebP\n');
  let totalBefore = 0;
  let totalAfter  = 0;

  for (const { src, out, width, quality, note } of IMAGES) {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);

    if (!existsSync(srcPath)) {
      console.warn(`⚠  Source introuvable : ${src}`);
      continue;
    }

    const srcMeta = await sharp(srcPath).metadata();

    await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })   // ne jamais agrandir la source
      .webp({ ...WEBP_BASE, quality })
      .toFile(outPath);

    const outMeta  = await sharp(outPath).metadata();
    const beforeKB = Math.round(statSync(srcPath).size / 1024);
    const afterKB  = Math.round(statSync(outPath).size / 1024);
    const savings  = Math.round((1 - afterKB / beforeKB) * 100);

    totalBefore += beforeKB;
    totalAfter  += afterKB;

    console.log(`  ✅ ${out}`);
    console.log(`     source : ${srcMeta.width}×${srcMeta.height} px  ${beforeKB} KB (JPEG)`);
    console.log(`     sortie : ${outMeta.width}×${outMeta.height} px  ${afterKB} KB (WebP q${quality})  −${savings}%`);
    console.log(`     usage  : ${note}\n`);
  }

  const totalSavings = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`📊 Total : ${totalBefore} KB → ${totalAfter} KB  (−${totalSavings}%)`);
  console.log('\n📝 Rappel :');
  console.log('   • Les .webp sont chargés via next/image dans les composants React');
  console.log('   • Les .jpg sont conservés pour les balises Open Graph (réseaux sociaux)');
  console.log('   • next/image génère ses propres breakpoints (640, 750, 828, 1080…) à la volée');
  console.log('   • Relancer ce script après chaque remplacement de source .jpg');
}

run().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});

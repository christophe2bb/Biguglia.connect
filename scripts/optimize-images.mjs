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
 *   - compatibilité IE11 / lecteurs d'écran anciens
 *
 * Les fichiers .webp sont utilisés dans les composants next/image
 * (optimisation automatique supplémentaire par le serveur Next).
 */

import sharp from 'sharp';
import { statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

/** Images à traiter  */
const IMAGES = [
  { src: 'public/images/biguglia-hero.jpg',    out: 'public/images/biguglia-hero.webp',    width: 1920 },
  { src: 'public/images/biguglia-village.jpg', out: 'public/images/biguglia-village.webp', width: 1920 },
  { src: 'public/images/biguglia-etang.jpg',   out: 'public/images/biguglia-etang.webp',   width: 1920 },
];

/** Paramètres WebP — balance qualité/poids  */
const WEBP_OPTIONS = {
  quality:         75,   // 75 = excellent rendu, ~25 % plus léger qu'un JPEG équivalent
  effort:           6,   // 0–6 (6 = compression maximale, plus lent)
  smartSubsample: true,  // meilleure fidélité couleur sur les dégradés
};

async function run() {
  console.log('🖼  Optimisation images → WebP\n');
  let totalBefore = 0;
  let totalAfter  = 0;

  for (const { src, out, width } of IMAGES) {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);

    if (!existsSync(srcPath)) {
      console.warn(`⚠  Source introuvable : ${src}`);
      continue;
    }

    await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })
      .webp(WEBP_OPTIONS)
      .toFile(outPath);

    const beforeKB = Math.round(statSync(srcPath).size / 1024);
    const afterKB  = Math.round(statSync(outPath).size / 1024);
    const savings  = Math.round((1 - afterKB / beforeKB) * 100);

    totalBefore += beforeKB;
    totalAfter  += afterKB;

    console.log(`  ✅ ${out}`);
    console.log(`     ${beforeKB} KB (JPEG) → ${afterKB} KB (WebP)  –${savings}%`);
  }

  const totalSavings = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`\n📊 Total : ${totalBefore} KB → ${totalAfter} KB  (−${totalSavings}%)`);
  console.log('\n📝 Rappel :');
  console.log('   • Les .webp sont chargés via next/image dans les composants');
  console.log('   • Les .jpg sont conservés pour les balises Open Graph (réseaux sociaux)');
  console.log('   • next/image optimise également le WebP à la volée (redimensionnement selon sizes={})');
}

run().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});

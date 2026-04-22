/**
 * src/components/seo/JsonLd.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Composant serveur pour injecter du JSON-LD (données structurées Schema.org).
 * Améliore les Rich Results dans Google (étoiles, FAQ, breadcrumbs, etc.)
 *
 * Usage :
 *   // Sans nonce (nonce lu automatiquement via headers()) :
 *   <JsonLd data={localBusinessSchema} />
 *
 *   // Avec nonce explicite (quand le parent a déjà lu headers()) :
 *   const nonce = (await headers()).get('x-nonce') ?? '';
 *   <JsonLd data={breadcrumbSchema([…])} nonce={nonce} />
 *
 * Ne rien importer de client ici (pas de 'use client').
 *
 * Architecture :
 *   • Les helpers purs (sans JSX) vivent dans ./jsonld-schemas.ts
 *     → testables avec Vitest (environnement Node, pas de JSX)
 *   • Ce fichier contient uniquement le composant React <JsonLd>
 *     et re-exporte tous les helpers pour que les imports existants
 *     `from '@/components/seo/JsonLd'` continuent de fonctionner.
 *
 * ─── Nonce CSP ────────────────────────────────────────────────────────────────
 *
 *   La balise <script type="application/ld+json"> nécessite un attribut nonce
 *   pour passer la Content-Security-Policy sans 'unsafe-inline' dans script-src.
 *
 *   Le nonce est généré par le middleware (src/middleware.ts) et transmis via
 *   le request header x-nonce. Ce composant le lit via next/headers.
 *
 *   Ref : https://www.w3.org/TR/CSP3/#script-nonce
 */

import { headers } from 'next/headers';

// ─── Re-export tous les helpers purs ─────────────────────────────────────────
// Les imports existants `from '@/components/seo/JsonLd'` continuent de fonctionner.
export {
  websiteSchema,
  localBusinessSchema,
  organizationSchema,
  breadcrumbSchema,
  faqSchema,
  jobPostingSchema,
  eventSchema,
  artisanPersonSchema,
  serviceSchema,
  occupationSchema,
  forumPostingSchema,
  collectionPageSchema,
  siteNavigationSchema,
  itemListSchema,
  mapConditionToSchema,
  productOfferSchema,
  sportsOrganizationSchema,
  howToSchema,
  articleSchema,
  localServiceSchema,
  webPageSchema,
  placeSchema,
} from './jsonld-schemas';

// ─── Composant React (JSX) ───────────────────────────────────────────────────

interface JsonLdProps {
  data: Record<string, unknown>;
  /**
   * Nonce CSP pour la balise <script type="application/ld+json">.
   * Si non fourni, le composant lit x-nonce depuis les request headers
   * via next/headers (Server Component uniquement).
   *
   * Passer le nonce explicitement depuis le parent évite un appel
   * supplémentaire à headers() si le parent l'a déjà lu.
   */
  nonce?: string;
}

/**
 * Échappe les séquences dangereuses dans une chaîne JSON-LD pour éviter
 * les injections XSS par fermeture prématurée du tag <script>.
 *
 * Remplace :
 *   </script>  →  <\/script>   (fermeture de balise)
 *   <!--       →  <\!--        (ouverture de commentaire HTML)
 *   -->        →  --\>         (fermeture de commentaire HTML — défense en profondeur)
 *
 * Ces substitutions sont transparentes pour les parseurs JSON-LD
 * (les consommateurs SERPs/Schema.org ignorent l'échappement JS).
 *
 * Ref : https://cheatsheetseries.owasp.org/cheatsheets/XSS_Prevention_Cheat_Sheet.html
 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 0)
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g,        '<\\!--')
    .replace(/-->/g,         '--\\>');
}

/**
 * Injecte un bloc <script type="application/ld+json"> dans le <head>.
 * Next.js App Router l'élève automatiquement dans le <head>.
 *
 * La sortie est assainie via safeJsonLd() pour prévenir les injections XSS
 * par fermeture prématurée du tag <script> (ex. si data contient "</script>").
 *
 * Le nonce est requis pour la CSP sans 'unsafe-inline'.
 * Il est lu depuis les request headers (x-nonce injecté par le middleware)
 * si non fourni explicitement.
 */
export async function JsonLd({ data, nonce: nonceProp }: JsonLdProps) {
  // Lire le nonce depuis les request headers si non fourni explicitement
  let nonce = nonceProp;
  if (!nonce) {
    const headersList = await headers();
    nonce = headersList.get('x-nonce') ?? undefined;
  }

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // nosec react/no-danger — dangerouslySetInnerHTML est intentionnel ici.
      // • Seul moyen d'injecter du JSON-LD dans une balise <script type="application/ld+json">
      //   (requis pour les Rich Results Google / Schema.org).
      // • La sortie est assainie par safeJsonLd() :
      //     </script> → <\/script>   (bloque la fermeture prématurée)
      //     <!--       → <\!--       (bloque les commentaires HTML)
      //     -->        → --\>        (défense en profondeur)
      // • Le nonce est requis pour la CSP sans 'unsafe-inline' dans script-src.
      // • Confirmé faux positif par Aikido AI triage (score abaissé, AutoFix impossible).
      // • Ref OWASP : https://cheatsheetseries.owasp.org/cheatsheets/XSS_Prevention_Cheat_Sheet.html
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} // nosec
    />
  );
}

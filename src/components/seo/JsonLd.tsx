/**
 * src/components/seo/JsonLd.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Composant serveur pour injecter du JSON-LD (données structurées Schema.org).
 * Améliore les Rich Results dans Google (étoiles, FAQ, breadcrumbs, etc.)
 *
 * Usage :
 *   <JsonLd data={localBusinessSchema} />
 *   <JsonLd data={breadcrumbSchema([…])} />
 *   <JsonLd data={productOfferSchema({…})} />
 *
 * Ne rien importer de client ici (pas de 'use client').
 *
 * Architecture :
 *   • Les helpers purs (sans JSX) vivent dans ./jsonld-schemas.ts
 *     → testables avec Vitest (environnement Node, pas de JSX)
 *   • Ce fichier contient uniquement le composant React <JsonLd>
 *     et re-exporte tous les helpers pour que les imports existants
 *     `from '@/components/seo/JsonLd'` continuent de fonctionner.
 */

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
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // nosec react/no-danger — dangerouslySetInnerHTML est intentionnel ici.
      // • Seul moyen d'injecter du JSON-LD dans une balise <script type="application/ld+json">
      //   (requis pour les Rich Results Google / Schema.org).
      // • La sortie est assainie par safeJsonLd() :
      //     </script> → <\/script>   (bloque la fermeture prématurée)
      //     <!--       → <\!--       (bloque les commentaires HTML)
      //     -->        → --\>        (défense en profondeur)
      // • Confirmé faux positif par Aikido AI triage (score abaissé, AutoFix impossible).
      // • Ref OWASP : https://cheatsheetseries.owasp.org/cheatsheets/XSS_Prevention_Cheat_Sheet.html
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} // nosec
    />
  );
}

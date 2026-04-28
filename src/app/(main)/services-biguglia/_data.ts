/**
 * src/app/(main)/services-biguglia/_data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques de la page hub Services Biguglia.
 * Sans 'use client' — importable depuis Server Components.
 */

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment trouver un artisan fiable à Biguglia ?',
    a: 'Sur Biguglia Connect, chaque artisan est vérifié manuellement par notre équipe : SIRET, assurance RC Pro et pièce d\'identité contrôlés. Vous pouvez consulter les avis de vrais clients et contacter directement l\'artisan sans intermédiaire ni commission.',
  },
  {
    q: 'Les artisans de Biguglia interviennent-ils dans les communes voisines ?',
    a: 'Oui, la plupart des artisans référencés couvrent également les communes proches : Borgo, Furiani, Lucciana, Bastia et les villages de la plaine orientale de Haute-Corse (2B).',
  },
  {
    q: 'Comment déposer une demande de devis à Biguglia ?',
    a: 'Rendez-vous sur la page "Déposer une demande" de Biguglia Connect. Décrivez votre projet en 2 minutes et les artisans locaux vous contactent directement avec un devis gratuit et sans engagement.',
  },
  {
    q: 'Les avis sur les artisans de Biguglia sont-ils fiables ?',
    a: 'Oui, tous les avis proviennent d\'échanges réels entre un habitant et un artisan via Biguglia Connect. Ils sont modérés avant publication et impossibles à falsifier.',
  },
  {
    q: 'Biguglia Connect est-il gratuit pour trouver un artisan ?',
    a: 'Oui, la consultation des profils, la lecture des avis et la prise de contact sont entièrement gratuites pour les habitants. Les artisans bénéficient également d\'une inscription gratuite.',
  },
  {
    q: 'Quels travaux sont les plus demandés à Biguglia ?',
    a: 'À Biguglia, les demandes les plus fréquentes concernent la plomberie (fuites, chauffe-eau, salle de bain), l\'électricité (mise aux normes, tableau électrique), la maçonnerie (clôtures, murs, dalles) et la peinture intérieure. La rénovation globale de maisons corses est aussi très courante.',
  },
  {
    q: 'Comment vérifier qu\'un artisan est bien assuré à Biguglia ?',
    a: 'Sur Biguglia Connect, la validité de l\'assurance RC Pro et décennale est vérifiée lors de l\'inscription. Vous pouvez également demander à l\'artisan de vous transmettre directement son attestation d\'assurance avant de signer un devis.',
  },
];

// ─── Catégories de services ───────────────────────────────────────────────────

export const SERVICE_CATEGORIES: { slug: string; title: string; desc: string; href: string }[] = [
  {
    slug:  'plomberie',
    title: 'Plomberie à Biguglia',
    desc:  'Fuites, chauffe-eau, salle de bain, raccordement — interventions rapides en 24–48 h.',
    href:  '/artisans/metier/plomberie',
  },
  {
    slug:  'electricite',
    title: 'Électricité à Biguglia',
    desc:  'Mise aux normes, tableau électrique, domotique, pose de prises et éclairage.',
    href:  '/artisans/metier/electricite',
  },
  {
    slug:  'maconnerie',
    title: 'Maçonnerie à Biguglia',
    desc:  'Gros œuvre, clôtures, dallages, reprises de façade — maçons locaux certifiés.',
    href:  '/artisans/metier/maconnerie',
  },
  {
    slug:  'peinture',
    title: 'Peinture à Biguglia',
    desc:  'Intérieur, extérieur, ravalement de façade — peintres locaux avec avis vérifiés.',
    href:  '/artisans/metier/peinture',
  },
  {
    slug:  'menuiserie',
    title: 'Menuiserie à Biguglia',
    desc:  'Fenêtres, portes, parquet, mobilier sur mesure — artisans du bois locaux.',
    href:  '/artisans/metier/menuiserie',
  },
  {
    slug:  'jardinage',
    title: 'Jardinage à Biguglia',
    desc:  'Entretien de jardin, taille, élagage, création de massifs et pelouses.',
    href:  '/artisans/metier/jardinage',
  },
];

// ─── Services d'urgence ───────────────────────────────────────────────────────

export const EMERGENCY_SERVICES: { emoji: string; title: string; desc: string; href: string }[] = [
  {
    emoji: '🚨',
    title: 'Plombier urgence Biguglia',
    desc:  'Fuite d\'eau, dégât des eaux, chauffe-eau en panne — intervention rapide 7j/7, y compris le week-end.',
    href:  '/artisans/metier/plomberie',
  },
  {
    emoji: '⚡',
    title: 'Électricien urgence Biguglia',
    desc:  'Panne de courant, court-circuit, disjoncteur — dépannage électrique en urgence sur Biguglia et Haute-Corse.',
    href:  '/artisans/metier/electricite',
  },
  {
    emoji: '🔑',
    title: 'Serrurier urgence Biguglia',
    desc:  'Clé cassée, porte claque, cambriolage — serrurier disponible rapidement à Biguglia et communes voisines.',
    href:  '/artisans/metier/serrurerie',
  },
  {
    emoji: '🌪️',
    title: 'Vitrerie urgence Biguglia',
    desc:  'Vitre cassée, fenêtre fracturée — remplacement de vitres en urgence pour sécuriser votre logement à Biguglia.',
    href:  '/artisans/metier/vitrerie',
  },
];

/**
 * src/lib/seo/local-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données SEO locales — référentiel statique de toutes les méta-informations
 * géographiques et catégorielles pour Biguglia Connect.
 *
 * Utilisé par :
 *   – Les pages catégories artisans (/artisans/metier/[slug])
 *   – Les landing pages SEO (/services-biguglia, /emploi-biguglia…)
 *   – Le sitemap dynamique
 *   – Les schémas JSON-LD
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Constantes géographiques ─────────────────────────────────────────────────

export const GEO = {
  city:        'Biguglia',
  department:  'Haute-Corse',
  region:      'Corse',
  postalCode:  '20620',
  country:     'France',
  countryCode: 'FR',
  iso:         '2B',
  lat:         42.5747,
  lng:         9.4436,
} as const;

// ─── Métiers artisans avec données SEO complètes ──────────────────────────────

export interface TradeMeta {
  /** slug URL — identique à la valeur dans trade_categories.slug */
  slug:        string;
  /** Nom singulier */
  name:        string;
  /** Nom pluriel */
  namePlural:  string;
  /** Emoji représentatif */
  emoji:       string;
  /** Titre H1 de la page catégorie */
  h1:          string;
  /** Meta title (≤ 60 chars) */
  title:       string;
  /** Meta description (≤ 160 chars) */
  description: string;
  /** Intro longue indexable (2-3 phrases) */
  intro:       string;
  /** FAQ locale — 3 questions ciblées */
  faq:         Array<{ q: string; a: string }>;
  /** Services associés (pour le maillage interne) */
  relatedSlugs: string[];
  /** Couleur Tailwind */
  color:       string;
}

export const TRADE_META: TradeMeta[] = [
  {
    slug:        'plomberie',
    name:        'Plombier',
    namePlural:  'Plombiers',
    emoji:       '🔧',
    h1:          'Plombiers à Biguglia',
    title:       'Plombier à Biguglia — Vérifiés & Disponibles (Haute-Corse)',
    description: 'Trouvez un plombier à Biguglia : fuite, chauffe-eau, installation sanitaire. Artisans vérifiés avec avis réels. Contactez directement.',
    intro:       'Vous cherchez un plombier à Biguglia ou en Haute-Corse ? Biguglia Connect référence les plombiers locaux vérifiés — SIRET, assurance RC Pro, identité contrôlée. Chaque profil affiche les avis de vrais clients du village.',
    faq: [
      { q: 'Comment trouver un plombier de confiance à Biguglia ?', a: 'Sur Biguglia Connect, chaque plombier est vérifié manuellement : SIRET, assurance RC Pro et pièce d\'identité. Consultez les avis des habitants et contactez directement le professionnel.' },
      { q: 'Quel est le délai d\'intervention d\'un plombier à Biguglia ?', a: 'La plupart des plombiers référencés proposent des interventions sous 24 à 48 h. En cas d\'urgence, précisez-le dans votre message pour obtenir une réponse prioritaire.' },
      { q: 'Les plombiers de Biguglia interviennent-ils dans les villages voisins ?', a: 'Oui, la majorité des artisans couvrent également les communes proches : Borgo, Furiani, Lucciana et le bassin de Bastia.' },
    ],
    relatedSlugs: ['electricite', 'climatisation'],
    color:        'sky',
  },
  {
    slug:        'electricite',
    name:        'Électricien',
    namePlural:  'Électriciens',
    emoji:       '⚡',
    h1:          'Électriciens à Biguglia',
    title:       'Électricien à Biguglia — Certifiés & Vérifiés (Haute-Corse)',
    description: 'Électriciens à Biguglia vérifiés : installation, dépannage, mise aux normes. Devis gratuit. Artisans certifiés avec avis clients réels.',
    intro:       'Besoin d\'un électricien à Biguglia ? Biguglia Connect répertorie les électriciens locaux certifiés — installation neuve, rénovation, mise aux normes NF C 15-100. Chaque artisan est vérifié par notre équipe avant publication.',
    faq: [
      { q: 'Comment trouver un électricien certifié à Biguglia ?', a: 'Biguglia Connect vérifie les certifications de chaque électricien (habilitation électrique, assurance). Consultez les profils, lisez les avis et demandez un devis directement en ligne.' },
      { q: 'Quels travaux électriques sont réalisés à Biguglia ?', a: 'Installation de tableau électrique, mise aux normes, câblage, domotique, borne de recharge véhicule électrique, et dépannage urgent.' },
      { q: 'Un électricien de Biguglia peut-il intervenir rapidement ?', a: 'Oui, plusieurs électriciens proposent des interventions d\'urgence le jour même. Signalez votre urgence directement dans le message.' },
    ],
    relatedSlugs: ['plomberie', 'climatisation', 'bricolage'],
    color:        'yellow',
  },
  {
    slug:        'maconnerie',
    name:        'Maçon',
    namePlural:  'Maçons',
    emoji:       '🏗️',
    h1:          'Maçons à Biguglia',
    title:       'Maçon à Biguglia — Gros Œuvre & Rénovation (Haute-Corse)',
    description: 'Maçons à Biguglia pour gros œuvre, rénovation, terrasse, enduit. Artisans vérifiés, avis clients. Devis gratuit en Haute-Corse.',
    intro:       'Trouvez un maçon fiable à Biguglia pour vos travaux de gros œuvre, rénovation ou construction. Les maçons listés sur Biguglia Connect sont tous vérifiés : SIRET contrôlé, assurance décennale et avis authentiques.',
    faq: [
      { q: 'Comment choisir un bon maçon à Biguglia ?', a: 'Vérifiez que le maçon dispose d\'une assurance décennale obligatoire et d\'un SIRET valide. Sur Biguglia Connect, ces éléments sont contrôlés avant tout référencement.' },
      { q: 'Quels travaux de maçonnerie sont possibles à Biguglia ?', a: 'Fondations, élévation de murs, rénovation de façade, création de terrasse, enduit, carrelage extérieur et travaux de réhabilitation.' },
      { q: 'Les maçons de Biguglia font-ils des devis gratuits ?', a: 'Oui, la majorité des artisans proposent un devis gratuit et sans engagement. Contactez-les directement via leur profil.' },
    ],
    relatedSlugs: ['peinture', 'menuiserie', 'jardinage'],
    color:        'stone',
  },
  {
    slug:        'peinture',
    name:        'Peintre',
    namePlural:  'Peintres',
    emoji:       '🎨',
    h1:          'Peintres & Décorateurs à Biguglia',
    title:       'Peintre à Biguglia — Intérieur, Extérieur & Décoration (Corse)',
    description: 'Peintres à Biguglia : peinture intérieure, façade, décoration. Artisans vérifiés avec avis. Devis gratuit en Haute-Corse.',
    intro:       'Vous avez un projet de peinture à Biguglia ? Que ce soit pour un rafraîchissement intérieur, une façade ou un chantier de rénovation, Biguglia Connect met en relation avec les peintres locaux vérifiés et bien notés.',
    faq: [
      { q: 'Quel est le prix d\'un peintre à Biguglia ?', a: 'Le tarif varie selon la surface et le type de prestation (préparation, enduit, finition). Demandez plusieurs devis sur Biguglia Connect pour comparer.' },
      { q: 'Les peintres de Biguglia interviennent-ils aussi sur les façades ?', a: 'Oui, plusieurs peintres couvrent à la fois les travaux intérieurs et la réfection de façades extérieures.' },
      { q: 'Comment vérifier la qualité d\'un peintre à Biguglia ?', a: 'Consultez les photos de réalisations et les avis laissés par d\'autres habitants sur Biguglia Connect. Chaque artisan a un score de confiance visible.' },
    ],
    relatedSlugs: ['maconnerie', 'menuiserie', 'bricolage'],
    color:        'pink',
  },
  {
    slug:        'menuiserie',
    name:        'Menuisier',
    namePlural:  'Menuisiers',
    emoji:       '🪵',
    h1:          'Menuisiers à Biguglia',
    title:       'Menuisier à Biguglia — Fenêtres, Portes & Ébénisterie (Corse)',
    description: 'Menuisiers à Biguglia : fenêtres, portes, volets, cuisine, parquet. Artisans vérifiés. Devis gratuit en Haute-Corse.',
    intro:       'Vous cherchez un menuisier à Biguglia pour vos fenêtres, portes, volets ou aménagements intérieurs ? Les menuisiers de Biguglia Connect sont sélectionnés pour leur sérieux, leurs qualifications et leurs avis clients.',
    faq: [
      { q: 'Quels travaux de menuiserie propose-t-on à Biguglia ?', a: 'Pose de fenêtres double vitrage, portes d\'entrée, volets roulants, parquet, escaliers, cuisine sur mesure et mobilier.' },
      { q: 'Comment choisir un menuisier fiable à Biguglia ?', a: 'Sur Biguglia Connect, chaque menuisier est vérifié : assurance, SIRET et avis de clients locaux. Consultez les photos de réalisations.' },
      { q: 'Les menuisiers de Biguglia proposent-ils du sur-mesure ?', a: 'Oui, plusieurs artisans proposent la fabrication et la pose de menuiseries sur mesure pour s\'adapter aux maisons et appartements locaux.' },
    ],
    relatedSlugs: ['peinture', 'maconnerie', 'bricolage'],
    color:        'amber',
  },
  {
    slug:        'climatisation',
    name:        'Climatiseur',
    namePlural:  'Installateurs climatisation',
    emoji:       '❄️',
    h1:          'Climatisation à Biguglia',
    title:       'Climatisation à Biguglia — Installation & Entretien (Corse)',
    description: 'Installez votre climatisation à Biguglia : pompe à chaleur, split, entretien. Artisans certifiés RGE. Devis gratuit Haute-Corse.',
    intro:       'Avec les étés corses, la climatisation est indispensable à Biguglia. Trouvez un installateur certifié sur Biguglia Connect : installation de split, pompe à chaleur, entretien annuel. Artisans certifiés RGE et Qualibat.',
    faq: [
      { q: 'Quel type de climatisation est adapté à Biguglia ?', a: 'Les splits mono ou multi-split sont les plus courants. En raison du climat méditerranéen corse, une climatisation réversible (chaud/froid) est souvent recommandée.' },
      { q: 'Faut-il un artisan certifié pour installer la climatisation à Biguglia ?', a: 'Oui, l\'installation de climatisation avec fluides frigorigènes requiert une attestation de capacité délivrée par le gouvernement. Nos artisans possèdent cette certification.' },
      { q: 'Quel est le coût d\'une climatisation à Biguglia ?', a: 'Comptez entre 1 500 € et 4 000 € pour une installation complète selon la puissance. Des aides (MaPrimeRénov\') peuvent réduire le coût.' },
    ],
    relatedSlugs: ['electricite', 'plomberie'],
    color:        'cyan',
  },
  {
    slug:        'jardinage',
    name:        'Jardinier',
    namePlural:  'Jardiniers',
    emoji:       '🌿',
    h1:          'Jardiniers & Paysagistes à Biguglia',
    title:       'Jardinier à Biguglia — Entretien Jardin & Paysagiste (Corse)',
    description: 'Jardiniers à Biguglia : taille, tonte, élagage, création jardin. Artisans vérifiés avec avis. Devis gratuit en Haute-Corse.',
    intro:       'Trouvez un jardinier ou paysagiste à Biguglia pour l\'entretien de votre jardin, l\'élagage de vos arbres ou la création d\'espaces verts. Les prestataires listés sur Biguglia Connect sont vérifiés et recommandés par les habitants.',
    faq: [
      { q: 'Quels services de jardinage sont disponibles à Biguglia ?', a: 'Tonte, taille de haies et arbres, élagage, débroussaillage, création de jardin méditerranéen, arrosage automatique et entretien en contrat annuel.' },
      { q: 'À quelle fréquence entretenir son jardin à Biguglia ?', a: 'Dans le climat corse, un entretien bimensuel de mars à octobre est recommandé. Certains jardiniers proposent des contrats annuels avantageux.' },
      { q: 'Un jardinier de Biguglia peut-il créer un jardin résistant à la sécheresse ?', a: 'Oui, plusieurs paysagistes locaux sont spécialisés dans les jardins méditerranéens économes en eau avec des essences adaptées au climat corse.' },
    ],
    relatedSlugs: ['maconnerie', 'bricolage'],
    color:        'green',
  },
  {
    slug:        'bricolage',
    name:        'Bricoleur / Aide à domicile',
    namePlural:  'Bricoleurs & Aides à domicile',
    emoji:       '🛠️',
    h1:          'Bricoleurs & Petits Travaux à Biguglia',
    title:       'Bricolage & Petits Travaux à Biguglia — Aide à domicile (Corse)',
    description: 'Bricoleurs à Biguglia pour petits travaux, montage, réparation. Service rapide et vérifié. Devis gratuit en Haute-Corse.',
    intro:       'Besoin d\'un coup de main pour des petits travaux à Biguglia ? Montage de meubles, petites réparations, fixations… Les bricoleurs référencés sur Biguglia Connect sont des habitants vérifiés, disponibles rapidement et à des tarifs raisonnables.',
    faq: [
      { q: 'Quels petits travaux peut-on confier à un bricoleur à Biguglia ?', a: 'Montage de meubles IKEA, installation d\'étagères, pose de rideaux, petites réparations, remplacement d\'ampoules ou de robinetterie simple, et aide à domicile.' },
      { q: 'Comment trouver un bricoleur fiable à Biguglia ?', a: 'Sur Biguglia Connect, les prestataires sont évalués par leurs voisins. Consultez les avis, le score de confiance et contactez directement.' },
      { q: 'Les bricoleurs de Biguglia sont-ils disponibles le week-end ?', a: 'Oui, plusieurs proposent des interventions le samedi matin. Précisez vos disponibilités dans votre message.' },
    ],
    relatedSlugs: ['electricite', 'plomberie', 'menuiserie'],
    color:        'orange',
  },
  // ── Sous-catégories supplémentaires ──────────────────────────────────────
  {
    slug:        'carrelage',
    name:        'Carreleur',
    namePlural:  'Carreleurs',
    emoji:       '🪟',
    h1:          'Carreleurs à Biguglia',
    title:       'Carreleur à Biguglia — Pose Carrelage & Faïence (Haute-Corse)',
    description: 'Carreleurs à Biguglia : pose de carrelage sol, mur, salle de bain, terrasse. Artisans vérifiés. Devis gratuit en Haute-Corse.',
    intro:       'Vous rénovez votre salle de bain ou souhaitez poser du carrelage à Biguglia ? Biguglia Connect référence les carreleurs locaux vérifiés, spécialisés dans la pose de carrelage intérieur, de faïence et de revêtements extérieurs adaptés au climat corse.',
    faq: [
      { q: 'Quel carrelage est adapté aux terrasses à Biguglia ?', a: 'En raison du climat méditerranéen, privilégiez un carrelage en grès cérame non poreux, antidérapant et résistant au gel. Les carreleurs locaux connaissent les spécificités du terrain corse.' },
      { q: 'Combien coûte la pose de carrelage à Biguglia ?', a: 'Le tarif varie de 25 à 60 €/m² selon la complexité (joints, découpes, format). Demandez plusieurs devis via Biguglia Connect pour comparer.' },
      { q: 'Un carreleur de Biguglia peut-il intervenir en rénovation ?', a: 'Oui, la plupart des carreleurs interviennent aussi bien en neuf qu\'en rénovation, avec dépose de l\'ancien revêtement si nécessaire.' },
    ],
    relatedSlugs: ['maconnerie', 'plomberie', 'peinture'],
    color:        'slate',
  },
  {
    slug:        'toiture',
    name:        'Couvreur',
    namePlural:  'Couvreurs',
    emoji:       '🏠',
    h1:          'Couvreurs & Toiture à Biguglia',
    title:       'Couvreur à Biguglia — Réparation & Rénovation Toiture (Corse)',
    description: 'Couvreurs à Biguglia : réparation toiture, fuite, zinguerie, isolation. Artisans vérifiés avec assurance décennale. Devis gratuit Corse.',
    intro:       'Votre toiture fuit ou nécessite une rénovation à Biguglia ? Les couvreurs référencés sur Biguglia Connect sont vérifiés, assurés décennalement et expérimentés dans les toitures corses — tuiles canal, ardoises et terrasses.',
    faq: [
      { q: 'Comment réparer une fuite de toiture à Biguglia ?', a: 'Contactez rapidement un couvreur via Biguglia Connect. Décrivez la localisation de la fuite et joignez une photo si possible pour obtenir un diagnostic rapide.' },
      { q: 'Faut-il une assurance décennale pour les travaux de toiture ?', a: 'Oui, toute intervention sur une toiture est soumise à la garantie décennale obligatoire. Tous les couvreurs de Biguglia Connect sont vérifiés avec leur assurance.' },
      { q: 'Quel est le prix d\'une réfection de toiture à Biguglia ?', a: 'Comptez entre 80 et 150 €/m² pour une réfection complète selon les matériaux. La tuile canal, typique de Corse, nécessite un savoir-faire local spécifique.' },
    ],
    relatedSlugs: ['maconnerie', 'menuiserie', 'peinture'],
    color:        'red',
  },
  {
    slug:        'serrurerie',
    name:        'Serrurier',
    namePlural:  'Serruriers',
    emoji:       '🔑',
    h1:          'Serruriers à Biguglia',
    title:       'Serrurier à Biguglia — Dépannage & Sécurité (Haute-Corse)',
    description: 'Serruriers à Biguglia : dépannage urgence, ouverture de porte, blindage, installation serrure. Artisans vérifiés disponibles rapidement.',
    intro:       'Vous êtes bloqué dehors ou souhaitez sécuriser votre logement à Biguglia ? Les serruriers référencés sur Biguglia Connect interviennent rapidement pour l\'ouverture de portes, le remplacement de serrures et l\'installation de systèmes de sécurité.',
    faq: [
      { q: 'Un serrurier de Biguglia peut-il intervenir en urgence ?', a: 'Oui, plusieurs serruriers référencés sur Biguglia Connect proposent des interventions d\'urgence. Contactez-les directement via leur profil pour connaître leur disponibilité.' },
      { q: 'Quel est le prix d\'une ouverture de porte à Biguglia ?', a: 'Le tarif d\'ouverture sans dégât varie de 80 à 200 € selon l\'heure et la complexité de la serrure. Demandez le devis avant toute intervention.' },
      { q: 'Comment sécuriser ma maison à Biguglia ?', a: 'Un serrurier peut installer une serrure multipoints, une porte blindée ou un système de verrou supplémentaire. Consultez les profils Biguglia Connect pour comparer les prestations.' },
    ],
    relatedSlugs: ['bricolage', 'menuiserie'],
    color:        'zinc',
  },
  {
    slug:        'coiffure',
    name:        'Coiffeur',
    namePlural:  'Coiffeurs',
    emoji:       '✂️',
    h1:          'Coiffeurs à Biguglia',
    title:       'Coiffeur à Biguglia — Salon & Coiffure à Domicile (Corse)',
    description: 'Coiffeurs à Biguglia : salon de coiffure, coiffure à domicile, mariage. Professionnels vérifiés avec avis clients réels en Haute-Corse.',
    intro:       'Trouvez un coiffeur à Biguglia : salon de quartier, coiffure à domicile ou prestation mariage. Les coiffeurs référencés sur Biguglia Connect sont des professionnels locaux, évalués par les habitants du village et des communes voisines.',
    faq: [
      { q: 'Y a-t-il des coiffeurs à domicile à Biguglia ?', a: 'Oui, plusieurs coiffeurs proposent des déplacements à domicile à Biguglia et dans les communes voisines. Idéal pour les personnes à mobilité réduite ou pour une prestation personnalisée.' },
      { q: 'Comment réserver chez un coiffeur à Biguglia ?', a: 'Consultez les profils sur Biguglia Connect, lisez les avis de clients locaux et contactez directement le coiffeur pour prendre rendez-vous.' },
      { q: 'Les coiffeurs de Biguglia proposent-ils des prestations mariage ?', a: 'Oui, plusieurs coiffeurs sont spécialisés dans les coiffures de cérémonie et proposent des prestations à domicile ou en salon pour les mariages en Corse.' },
    ],
    relatedSlugs: ['bricolage'],
    color:        'rose',
  },
  {
    slug:        'nettoyage',
    name:        'Agent de nettoyage',
    namePlural:  'Services de nettoyage',
    emoji:       '🧹',
    h1:          'Nettoyage & Ménage à Biguglia',
    title:       'Nettoyage à Biguglia — Ménage, Vitres & Fin de Chantier (Corse)',
    description: 'Services de nettoyage à Biguglia : ménage, vitres, fin de chantier, remise en état. Professionnels vérifiés. Devis gratuit en Haute-Corse.',
    intro:       'Vous cherchez un service de nettoyage ou de ménage à Biguglia ? Biguglia Connect référence les prestataires locaux vérifiés pour l\'entretien de votre maison, le nettoyage de fins de chantier, le lavage de vitres et les remises en état.',
    faq: [
      { q: 'Quels services de nettoyage sont disponibles à Biguglia ?', a: 'Ménage régulier, grand ménage de printemps, lavage de vitres, nettoyage après travaux, remise en état avant location et nettoyage de locaux professionnels.' },
      { q: 'Comment trouver un service de ménage fiable à Biguglia ?', a: 'Consultez les profils sur Biguglia Connect avec les avis de vrais voisins. Chaque prestataire est évalué sur sa ponctualité, sa fiabilité et la qualité de son travail.' },
      { q: 'Les agents de nettoyage de Biguglia interviennent-ils régulièrement ?', a: 'Oui, plusieurs proposent des prestations récurrentes (hebdomadaire, bimensuelle) à tarif préférentiel. Précisez votre besoin lors du premier contact.' },
    ],
    relatedSlugs: ['bricolage', 'jardinage'],
    color:        'teal',
  },
  {
    slug:        'transport',
    name:        'Transporteur / Déménageur',
    namePlural:  'Transporteurs & Déménageurs',
    emoji:       '🚚',
    h1:          'Déménagement & Transport à Biguglia',
    title:       'Déménagement à Biguglia — Transport & Livraison (Haute-Corse)',
    description: 'Déménageurs et transporteurs à Biguglia : déménagement, livraison, transport de meubles. Professionnels vérifiés. Devis gratuit en Corse.',
    intro:       'Vous déménagez à Biguglia ou cherchez un service de transport de meubles en Haute-Corse ? Les déménageurs référencés sur Biguglia Connect sont des professionnels locaux fiables, habitués aux contraintes du terrain corse.',
    faq: [
      { q: 'Combien coûte un déménagement à Biguglia ?', a: 'Le tarif dépend du volume et de la distance. Comptez en général entre 500 et 2 000 € pour un déménagement local. Demandez plusieurs devis sur Biguglia Connect.' },
      { q: 'Les déménageurs de Biguglia peuvent-ils transporter des objets lourds ?', a: 'Oui, les déménageurs professionnels sont équipés pour le transport de meubles, électroménager et objets encombrants. Précisez la nature des objets lors de votre demande.' },
      { q: 'Peut-on trouver un simple service de livraison à Biguglia ?', a: 'Oui, certains transporteurs locaux proposent aussi des livraisons ponctuelles pour des objets achetés en ligne ou en occasion. Consultez les profils sur Biguglia Connect.' },
    ],
    relatedSlugs: ['bricolage', 'maconnerie'],
    color:        'blue',
  },
];

// ─── Map par slug ─────────────────────────────────────────────────────────────

export const TRADE_META_MAP = Object.fromEntries(
  TRADE_META.map(t => [t.slug, t]),
) as Record<string, TradeMeta | undefined>;

// ─── Toutes les slugs valides ─────────────────────────────────────────────────

export const ALL_TRADE_SLUGS = TRADE_META.map(t => t.slug);

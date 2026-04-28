/**
 * src/app/(main)/forum-biguglia/_data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques de la page hub Forum Biguglia.
 * Sans 'use client' — importable depuis Server Components.
 */

// ─── Catégories du forum ──────────────────────────────────────────────────────

export const FORUM_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vie_locale: { label: 'Vie locale',  emoji: '🏘️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  travaux:    { label: 'Travaux',     emoji: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  entraide:   { label: 'Entraide',   emoji: '🤝', color: 'bg-green-50 text-green-700 border-green-200' },
  nature:     { label: 'Nature',     emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  loisirs:    { label: 'Loisirs',    emoji: '🎉', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  securite:   { label: 'Sécurité',  emoji: '🔒', color: 'bg-red-50 text-red-700 border-red-200' },
  annonces:   { label: 'Annonces',  emoji: '📢', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autre:      { label: 'Autre',      emoji: '💬', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── Sujets phares ────────────────────────────────────────────────────────────

export const TOPIC_SPOTLIGHTS: {
  category: string;
  emoji: string;
  title: string;
  desc: string;
  examples: string[];
  href: string;
}[] = [
  {
    category: 'vie_locale',
    emoji: '🏘️',
    title: 'Vie locale à Biguglia',
    desc: 'Travaux municipaux, arrêtés, nouveaux commerces, fermetures de routes, informations pratiques sur la commune. La catégorie la plus consultée du forum.',
    examples: ['Chantier rue principale', 'Nouveau médecin à Biguglia ?', 'Horaires mairie', 'Collecte des ordures'],
    href: '/forum?categorie=vie_locale',
  },
  {
    category: 'travaux',
    emoji: '🔧',
    title: 'Travaux & Artisans',
    desc: 'Recommandations d\'artisans locaux, avis sur des prestataires, questions techniques de bricolage et rénovation. Les habitants de Biguglia partagent leurs bonnes adresses.',
    examples: ['Bon plombier ?', 'Maçon sérieux', 'Prix devis peinture', 'Isolation maison corse'],
    href: '/forum?categorie=travaux',
  },
  {
    category: 'entraide',
    emoji: '🤝',
    title: 'Entraide & Coups de main',
    desc: 'Demandes et offres d\'aide entre voisins : garde d\'animaux, déménagement, courses, dépannage informatique… La solidarité de proximité au cœur de la communauté de Biguglia.',
    examples: ['Besoin d\'aide déménagement', 'Qui prête une remorque ?', 'Garde chat vacances', 'Babysitting'],
    href: '/forum?categorie=entraide',
  },
  {
    category: 'nature',
    emoji: '🌿',
    title: 'Étang & Nature',
    desc: 'Discussions sur l\'étang de Biguglia (réserve naturelle), observations d\'oiseaux (flamants roses, hérons), qualité de l\'eau, sorties naturalistes et préservation de l\'environnement local.',
    examples: ['Flamants roses vus', 'Qualité eau étang', 'Rando autour de l\'étang', 'Espèces protégées'],
    href: '/forum?categorie=nature',
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment participer au forum de Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect et accédez au forum immédiatement. Vous pouvez créer des sujets, répondre aux messages et interagir avec vos voisins. Seule une adresse email valide est nécessaire — vos coordonnées personnelles restent confidentielles.',
  },
  {
    q: 'Quels sujets peut-on aborder sur le forum de Biguglia ?',
    a: 'Tout ce qui touche à la vie locale : questions pratiques sur la commune, recommandations d\'artisans et de commerçants, entraide entre voisins, actualités du village, discussions sur l\'étang et la nature, alertes de voisinage, loisirs et événements locaux.',
  },
  {
    q: 'Le forum est-il modéré ?',
    a: 'Oui, le forum est modéré par l\'équipe de Biguglia Connect. Les règles sont simples : bienveillance, respect et utilité pour la communauté locale. Les messages hors-sujet, les contenus illicites ou irrespectueux sont supprimés rapidement.',
  },
  {
    q: 'Peut-on signaler un problème de voisinage sur le forum ?',
    a: 'Oui, la catégorie "Sécurité" et "Vie locale" permettent de signaler des problèmes de voisinage, des incivilités, des tags, des dégradations ou des comportements dangereux. La communauté peut réagir et informer les autorités compétentes si nécessaire.',
  },
  {
    q: 'Comment trouver un artisan recommandé par les habitants de Biguglia ?',
    a: 'Consultez la catégorie "Travaux" du forum pour lire les retours d\'expériences des voisins et les recommandations d\'artisans locaux. Pour trouver des artisans vérifiés avec SIRET et assurance contrôlés, rendez-vous aussi sur la section Artisans de Biguglia Connect.',
  },
  {
    q: 'Peut-on rester anonyme sur le forum de Biguglia ?',
    a: 'Un compte est nécessaire pour poster, mais vous choisissez librement le nom affiché publiquement (pseudonyme autorisé). Votre adresse email et vos données personnelles ne sont jamais visibles par les autres membres.',
  },
  {
    q: 'Y a-t-il des discussions sur l\'étang de Biguglia dans le forum ?',
    a: 'Oui, la catégorie "Nature" est dédiée aux échanges sur l\'étang de Biguglia (réserve naturelle régionale), sa biodiversité (flamants roses, oiseaux migrateurs), la qualité de l\'eau et les initiatives de préservation. Les naturalistes locaux y partagent régulièrement leurs observations.',
  },
];

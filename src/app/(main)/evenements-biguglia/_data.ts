/**
 * src/app/(main)/evenements-biguglia/_data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques de la page hub Événements Biguglia.
 * Sans 'use client' — importable depuis Server Components.
 */

// ─── Catégories d'événements ──────────────────────────────────────────────────

export const EVENT_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  sport:       { label: 'Sport',       emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:     { label: 'Culture',     emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  fete:        { label: 'Fête',        emoji: '🎉', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  nature:      { label: 'Nature',      emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  marche:      { label: 'Marché',      emoji: '🛒', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  atelier:     { label: 'Atelier',     emoji: '🎨', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  association: { label: 'Association', emoji: '🏛️', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// ─── Événements récurrents phares ─────────────────────────────────────────────

export const RECURRING_EVENTS: { emoji: string; title: string; desc: string; href: string }[] = [
  {
    emoji: '⚽',
    title: 'Matchs du SC Biguglia',
    desc: 'Les matchs à domicile du Sporting Club Biguglia (football) sont des moments forts de la vie communale. Toutes les catégories jouent au stade local, de l\'U6 aux seniors. Consultez le calendrier sur Biguglia Connect.',
    href: '/evenements?categorie=sport',
  },
  {
    emoji: '🌿',
    title: 'Sorties nature à l\'étang de Biguglia',
    desc: 'L\'étang de Biguglia, réserve naturelle régionale, accueille régulièrement des sorties guidées pour observer les flamants roses, hérons et autres oiseaux nicheurs. Des naturalistes locaux organisent ces balades gratuites ou à petit prix.',
    href: '/evenements?categorie=nature',
  },
  {
    emoji: '🛒',
    title: 'Marchés de producteurs locaux',
    desc: 'Charcuterie corse, fromages, miel du maquis, vins locaux, poteries artisanales — les marchés de producteurs de Biguglia permettent d\'acheter directement aux agriculteurs et artisans de Haute-Corse.',
    href: '/evenements?categorie=marche',
  },
  {
    emoji: '🎉',
    title: 'Fêtes patronales et festivités corses',
    desc: 'Biguglia célèbre ses fêtes traditionnelles, avec processions, concerts de polyphonie corse, animations et gastronomie locale. Ces événements rassemblent habitants et visiteurs dans une ambiance conviviale typiquement insulaire.',
    href: '/evenements?categorie=fete',
  },
  {
    emoji: '🎨',
    title: 'Ateliers culturels et artistiques',
    desc: 'Cours de langue corse, ateliers poterie, stages musicaux, sorties cinéma — des associations et particuliers proposent des activités créatives pour petits et grands tout au long de l\'année à Biguglia.',
    href: '/evenements?categorie=atelier',
  },
  {
    emoji: '🏘️',
    title: 'Réunions de quartier et voisinage',
    desc: 'Des réunions de concertation entre habitants, des actions de nettoyage collectif et des apéros de voisinage sont régulièrement organisés à Biguglia — une façon simple de s\'impliquer dans la vie du village.',
    href: '/evenements?categorie=association',
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Où trouver les événements à Biguglia ?',
    a: 'L\'agenda complet des événements de Biguglia est disponible en temps réel sur Biguglia Connect. Vous y trouverez les matchs du SC Biguglia, fêtes du village, marchés de producteurs, sorties nature à l\'étang, concerts, ateliers et réunions de quartier.',
  },
  {
    q: 'Comment publier un événement à Biguglia ?',
    a: 'Tout habitant, association ou commerce peut publier un événement gratuitement sur Biguglia Connect. Créez un compte, renseignez les détails (date, lieu, description) et votre événement sera visible par tous les membres et indexé sur Google.',
  },
  {
    q: 'Quels types d\'événements ont lieu régulièrement à Biguglia ?',
    a: 'Les événements récurrents incluent les matchs du SC Biguglia (football toutes catégories), les sorties aux flamants roses de l\'étang (réserve naturelle), les marchés de producteurs corses, les fêtes patronales, les ateliers culturels et les réunions de voisinage.',
  },
  {
    q: 'Le SC Biguglia publie-t-il ses événements en ligne ?',
    a: 'Oui, le SC Biguglia et les autres associations de la commune peuvent publier leurs matchs, tournois et événements directement sur Biguglia Connect. Consultez la catégorie "Sport" de l\'agenda pour suivre l\'actualité sportive de Biguglia.',
  },
  {
    q: 'Y a-t-il des sorties nature à l\'étang de Biguglia ?',
    a: 'Oui, l\'étang de Biguglia (réserve naturelle régionale, plus grand étang naturel de Corse) attire naturalistes et randonneurs. Des associations locales organisent régulièrement des sorties guidées pour observer les flamants roses, aigrettes, hérons et autres espèces protégées. Ces sorties sont publiées dans la catégorie "Nature" de Biguglia Connect.',
  },
  {
    q: 'Comment trouver un marché de producteurs à Biguglia ?',
    a: 'Les marchés de producteurs et artisans locaux (charcuterie, fromages, miel, vins corses, poteries) sont annoncés dans la catégorie "Marché" de l\'agenda de Biguglia Connect. Certains marchés sont saisonniers (été) et d\'autres ont lieu toute l\'année.',
  },
  {
    q: 'Peut-on assister aux événements de Biguglia sans compte ?',
    a: 'Vous pouvez consulter l\'agenda et les détails des événements publics sans créer de compte. Pour publier un événement, recevoir des rappels et interagir avec les organisateurs, un compte gratuit Biguglia Connect est nécessaire.',
  },
  {
    q: 'Où trouver l\'agenda officiel de la commune de Biguglia ?',
    a: 'L\'agenda officiel est disponible sur le site de la mairie de Biguglia. Biguglia Connect complète cet agenda avec les événements publiés par les associations, les habitants et les commerces locaux — pour une vue complète de la vie de Biguglia.',
  },
  {
    q: 'Quels événements ont lieu l\'été à Biguglia ?',
    a: 'L\'été est la saison la plus animée à Biguglia : concerts en plein air, fêtes de village, tournois sportifs (SC Biguglia), marchés nocturnes de producteurs, sorties kayak sur l\'étang et journées nature dans la réserve. De nombreux événements sont gratuits et ouverts à tous.',
  },
];

// ─── Calendrier saisonnier ────────────────────────────────────────────────────

export const SEASONS: { saison: string; emoji: string; events: string[] }[] = [
  {
    saison: 'Printemps (mars–mai)', emoji: '🌻',
    events: [
      'Sorties naturalistes à l\'étang (flamants roses en migration)',
      'Début du championnat de football SC Biguglia',
      'Marchés de producteurs saisonniers',
      'Activités jeunesse et scolaires',
    ],
  },
  {
    saison: 'Été (juin–août)', emoji: '☀️',
    events: [
      'Fêtes patronales et concerts de polyphonie corse',
      'Tournois sportifs (SC Biguglia, pétanque)',
      'Marchés nocturnes de producteurs locaux',
      'Sorties kayak et nature réserve de l\'étang',
    ],
  },
  {
    saison: 'Automne (sept–nov)', emoji: '🍂',
    events: [
      'Brocantes et vide-greniers locaux',
      'Ateliers culturels (langue corse, artisanat)',
      'Repérage des espèces d\'oiseaux migrateurs',
      'Reprise des activités associatives',
    ],
  },
  {
    saison: 'Hiver (déc–fév)', emoji: '❄️',
    events: [
      'Fêtes de fin d\'année et marché de Noël local',
      'Tournois de football en salle',
      'Ateliers cuisine corses et gastronomie',
      'Réunions et AG des associations de Biguglia',
    ],
  },
];

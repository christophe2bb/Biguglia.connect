/**
 * src/app/(main)/associations-biguglia/_data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques de la page hub Associations Biguglia.
 * Sans 'use client' — importable depuis Server Components.
 */

// ─── Catégories d'associations ────────────────────────────────────────────────

export const ASSOC_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  sport:    { label: 'Sport',         emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  culture:  { label: 'Culture',       emoji: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  nature:   { label: 'Environnement', emoji: '🌿', color: 'bg-green-50 text-green-700 border-green-200' },
  social:   { label: 'Social',        emoji: '🤝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  seniors:  { label: 'Seniors',       emoji: '👴', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  jeunesse: { label: 'Jeunesse',      emoji: '🎓', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// ─── Associations phares ──────────────────────────────────────────────────────

export const FEATURED_ASSOCS: { emoji: string; name: string; desc: string; href: string }[] = [
  {
    emoji: '⚽',
    name:  'SC Biguglia — Football',
    desc:  'Le Sporting Club Biguglia est l\'association emblématique de la commune. Club de football toutes catégories (U6 à seniors), il fédère joueurs, bénévoles et supporters depuis des décennies. Ses matchs sont des événements communautaires incontournables.',
    href:  '/associations?categorie=sport',
  },
  {
    emoji: '🌿',
    name:  'Protection de l\'Étang de Biguglia',
    desc:  'L\'étang de Biguglia, plus grand étang naturel de Corse et réserve naturelle régionale, est au cœur de nombreuses initiatives associatives. Des groupes organisent des sorties naturalistes, des actions de nettoyage et de sensibilisation à la biodiversité locale.',
    href:  '/associations?categorie=nature',
  },
  {
    emoji: '🎭',
    name:  'Associations culturelles corses',
    desc:  'Biguglia abrite plusieurs associations qui préservent et transmettent les traditions corses : musique polyphonique, artisanat local, langue corse et gastronomie. Ces associations animent le village lors des fêtes patronales et des événements culturels.',
    href:  '/associations?categorie=culture',
  },
  {
    emoji: '👴',
    name:  'Clubs seniors & retraités',
    desc:  'Les associations de seniors organisent activités sportives douces, sorties, ateliers et rencontres conviviales. Un lien social essentiel pour les habitants les plus âgés de Biguglia, qui peuvent ainsi rester actifs et intégrés dans la communauté.',
    href:  '/associations?categorie=seniors',
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Combien y a-t-il d\'associations à Biguglia ?',
    a: 'Biguglia compte de nombreuses associations actives couvrant le sport (dont le SC Biguglia, football), la culture corse, la protection de l\'étang de Biguglia (réserve naturelle), le bénévolat social, les seniors et la jeunesse. Retrouvez-les toutes sur Biguglia Connect.',
  },
  {
    q: 'Comment rejoindre une association à Biguglia ?',
    a: 'Consultez le profil de l\'association sur Biguglia Connect pour trouver les coordonnées, les créneaux d\'activité et les modalités d\'adhésion. Vous pouvez contacter directement les responsables via la plateforme, sans avoir à vous déplacer.',
  },
  {
    q: 'Comment créer ou référencer une association à Biguglia ?',
    a: 'Créez un compte sur Biguglia Connect et publiez le profil de votre association gratuitement. Vous pourrez partager vos actualités, vos besoins en bénévoles, vos prochains événements et être trouvé par tous les habitants de Biguglia et des communes voisines.',
  },
  {
    q: 'Quels sports sont pratiqués dans les clubs de Biguglia ?',
    a: 'Football (SC Biguglia, toutes catégories d\'âge), sports nautiques sur l\'étang de Biguglia, pétanque, tennis, randonnée sur les sentiers de la plaine orientale, activités aquatiques et sports pour seniors. Consultez l\'annuaire complet pour la liste de toutes les disciplines.',
  },
  {
    q: 'Comment participer à la protection de l\'étang de Biguglia ?',
    a: 'L\'étang de Biguglia est une réserve naturelle régionale d\'importance nationale. Plusieurs associations locales organisent des actions de préservation, des sorties naturalistes et des ateliers de sensibilisation. Rejoignez-les via Biguglia Connect ou participez aux événements nature publiés sur la plateforme.',
  },
  {
    q: 'Y a-t-il des associations de bénévolat à Biguglia ?',
    a: 'Oui, plusieurs associations proposent des missions de bénévolat à Biguglia : aide alimentaire, accompagnement de seniors, soutien scolaire, environnement. Consultez la catégorie "Social" de l\'annuaire pour trouver une mission qui correspond à vos disponibilités et compétences.',
  },
  {
    q: 'Comment créer une association à Biguglia ?',
    a: 'La création d\'une association loi 1901 à Biguglia se fait en déposant les statuts en préfecture de Haute-Corse (Bastia) ou en ligne sur associations.gouv.fr. Il faut au minimum deux membres fondateurs, des statuts rédigés et un procès-verbal constitutif. Une fois créée, référencez gratuitement votre association sur Biguglia Connect pour toucher toute la communauté locale.',
  },
  {
    q: 'Existe-t-il des associations de soutien scolaire à Biguglia ?',
    a: 'Des associations et des particuliers proposent du soutien scolaire à Biguglia et dans les communes voisines. Consultez la catégorie "Jeunesse" de l\'annuaire Biguglia Connect ou publiez une demande sur le forum pour trouver un accompagnement scolaire adapté.',
  },
];

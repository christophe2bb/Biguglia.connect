/**
 * src/app/(main)/emploi-biguglia/_data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques de la page hub Emploi Biguglia.
 * Sans 'use client' — importable depuis Server Components.
 */

// ─── Labels contrats ──────────────────────────────────────────────────────────

export const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', interim: 'Intérim',
  saisonnier: 'Saisonnier', stage: 'Stage', freelance: 'Freelance',
  alternance: 'Alternance', extra: 'Extra',
};

// ─── Secteurs d'emploi ────────────────────────────────────────────────────────

export const JOB_SECTORS: { slug: string; emoji: string; title: string; desc: string; href: string }[] = [
  { slug: 'batiment',     emoji: '🏗️', title: 'BTP & Construction',       desc: 'Maçons, électriciens, plombiers, charpentiers — forte demande liée à la croissance résidentielle.', href: '/emploi/offres?secteur=batiment' },
  { slug: 'restauration', emoji: '🍽️', title: 'Restauration & Tourisme',  desc: 'Cuisiniers, serveurs, agents d\'accueil — emplois saisonniers mai–septembre notamment.', href: '/emploi/offres?secteur=restauration' },
  { slug: 'commerce',     emoji: '🛒', title: 'Commerce & Distribution',  desc: 'Caissiers, logisticiens, managers — zone commerciale de Lucciana/Biguglia très active.', href: '/emploi/offres?secteur=commerce' },
  { slug: 'services',     emoji: '🤝', title: 'Services à la personne',   desc: 'Aides à domicile, auxiliaires de vie, animateurs — demande croissante pour seniors.', href: '/emploi/offres?secteur=services' },
  { slug: 'agriculture',  emoji: '🌾', title: 'Agriculture & Maraîchage', desc: 'Travailleurs saisonniers, agents viticoles — plaine orientale de Haute-Corse.', href: '/emploi/offres?secteur=agriculture' },
  { slug: 'transport',    emoji: '🚚', title: 'Transport & Logistique',   desc: 'Chauffeurs, caristes, préparateurs de commandes — zone industrielle de Biguglia.', href: '/emploi/offres?secteur=transport' },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment trouver un emploi à Biguglia ?',
    a: 'Biguglia Connect centralise toutes les offres d\'emploi locales à Biguglia, Borgo, Furiani, Lucciana et la plaine de Haute-Corse. Parcourez les annonces par secteur ou type de contrat et postulez directement auprès des employeurs locaux, sans intermédiaire.',
  },
  {
    q: 'Quels types de contrats sont proposés à Biguglia ?',
    a: 'CDI, CDD, emploi saisonnier (tourisme, agriculture mai–septembre), extra, stage, alternance et missions ponctuelles. Le tissu économique local comprend le commerce de la zone Lucciana, l\'artisanat du bâtiment, la restauration, les services à la personne et la logistique.',
  },
  {
    q: 'Y a-t-il des emplois saisonniers à Biguglia ?',
    a: 'Oui, la saison touristique génère de nombreux emplois saisonniers entre mai et septembre dans l\'hôtellerie, la restauration, les loisirs nautiques et l\'agriculture (maraîchage, vignes). Consultez les annonces de la catégorie "Saisonnier" sur Biguglia Connect.',
  },
  {
    q: 'Comment publier une offre d\'emploi à Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect et déposez votre offre en 3 minutes. Elle sera visible par tous les habitants de Biguglia et des communes voisines, indexée sur Google et accessible depuis les mobiles.',
  },
  {
    q: 'Les candidats de Biguglia peuvent-ils déposer un CV ?',
    a: 'Oui, les candidats peuvent publier leur profil de recherche d\'emploi (CV) sur Biguglia Connect. Précisez votre secteur, votre disponibilité et votre zone d\'intervention pour être contacté directement par les employeurs locaux.',
  },
  {
    q: 'Biguglia Connect prend-il une commission sur le recrutement ?',
    a: 'Non, Biguglia Connect est entièrement gratuit pour les candidats comme pour les employeurs locaux. Aucune commission, aucun abonnement. L\'objectif est de faciliter le lien direct entre habitants et entreprises du bassin de Biguglia.',
  },
  {
    q: 'Quels secteurs recrutent le plus à Biguglia et en Haute-Corse ?',
    a: 'Les secteurs les plus actifs sont le BTP (bâtiment et travaux publics), les services à la personne (aide à domicile, soins), la restauration et l\'hôtellerie (saisonnière), le commerce et la grande distribution (zone de Lucciana), et la logistique/transport liée à la zone industrielle de Biguglia.',
  },
  {
    q: 'Où s\'inscrire à France Travail depuis Biguglia ?',
    a: 'L\'agence France Travail la plus proche de Biguglia est l\'agence de Bastia (8 km), accessible en bus depuis la commune. Vous pouvez également vous inscrire et gérer votre dossier en ligne sur francetravail.fr. Biguglia Connect complète cette offre avec des annonces locales directement entre habitants et employeurs.',
  },
  {
    q: 'Y a-t-il des formations disponibles pour les demandeurs d\'emploi à Biguglia ?',
    a: 'L\'AFPA et le GRETA de Haute-Corse proposent des formations professionnelles dans la région de Bastia. Des formations en présentiel ou à distance sont accessibles dans les secteurs du BTP, de la restauration, des services à la personne et de la logistique. Renseignez-vous auprès de France Travail Bastia ou de la Chambre des Métiers de Haute-Corse.',
  },
];

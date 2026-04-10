// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Type canonique du feed local unifié
// Toute source de contenu (événements, forum, entraide…) est normalisée
// vers ce type avant d'être affichée sur la page d'accueil.
// ─────────────────────────────────────────────────────────────────────────────

export type HomeFeedItemType =
  | 'help_request'    // Coup de main / entraide
  | 'event'           // Événement local
  | 'forum_topic'     // Sujet de forum
  | 'lost_found'      // Perdu / Trouvé
  | 'listing'         // Petite annonce
  | 'outing'          // Promenade / sortie groupée
  | 'equipment'       // Matériel partagé
  | 'association'     // Actualité association
  | 'job_offer'       // Offre d'emploi local
  | 'job_demand';     // Demande d'emploi local

export type HomeFeedItemStatus =
  | 'open'        // En attente / disponible / actif
  | 'active'      // En cours
  | 'resolved'    // Résolu / terminé
  | 'upcoming'    // À venir (événement futur)
  | 'closed';     // Fermé / expiré

export type HomeFeedItemUrgency = 'high' | 'medium' | 'low';

export interface HomeFeedItemAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface HomeFeedItem {
  // Identité
  id: string;
  type: HomeFeedItemType;
  sourceModule: string;          // Nom de la table/module source (ex: 'help_requests')

  // Contenu
  title: string;
  summary?: string | null;       // Résumé court pour la card

  // Localisation
  sector?: string | null;        // Secteur géographique
  locationLabel?: string | null; // Label affiché (ex: "Biguglia Centre")

  // Auteur
  author?: HomeFeedItemAuthor;

  // Temporalité
  createdAt: string;             // ISO date string
  updatedAt?: string | null;
  eventDate?: string | null;     // Pour les événements / promenades

  // Statut et priorité
  status: HomeFeedItemStatus;
  urgency: HomeFeedItemUrgency;
  isUrgent: boolean;
  isResolved: boolean;

  // Scoring (calculé par scoring.ts)
  freshnessScore: number;        // 0–100 : fraîcheur
  relevanceScore: number;        // 0–100 : pertinence globale
  finalScore: number;            // Score final pour le tri

  // Navigation
  actionUrl: string;             // URL de détail
  actionLabel: string;           // Label du CTA

  // Badges visuels optionnels
  badges?: string[];             // Ex: ['Urgent', 'Nouveau', 'Ce soir']

  // Métadonnées spécifiques au type (flexible)
  metadata?: Record<string, unknown>;
}

// ─── Section de la Maison vivante ────────────────────────────────────────────

export type HomeSectionId =
  | 'now'           // Ce qui se passe maintenant
  | 'needs'         // Besoins près de chez vous
  | 'upcoming'      // À venir cette semaine
  | 'discussions'   // Ça parle ici
  | 'emploi'        // Offres et demandes d'emploi local
  | 'foryou';       // Pour vous (personnalisation future)

export interface HomeSection {
  id: HomeSectionId;
  title: string;
  subtitle?: string;
  icon: string;                  // Emoji ou nom d'icône
  items: HomeFeedItem[];
  ctaLabel?: string;
  ctaUrl?: string;
  isEmpty: boolean;
}

// ─── Résultat du service d'agrégation ────────────────────────────────────────

export interface HomeFeedResult {
  sections: HomeSection[];
  totalItems: number;
  generatedAt: string;           // ISO timestamp de génération
  hasContent: boolean;
}

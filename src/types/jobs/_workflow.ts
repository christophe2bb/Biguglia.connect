/**
 * jobs/_workflow.ts — Types transversaux du cycle de vie du module Emploi Local
 *
 * Cinq familles sans dépendance entre elles :
 *   PublicationReadiness      — quality gate avant publication
 *   StatusTransition          — machine à états offre / demande
 *   JobAnalyticsEvent         — tracking comportemental
 *   Ownership & permissions   — matrice de droits
 *   Home feed items           — intégration fil d'accueil
 *
 * Dépendances : _search (SearchResult) uniquement pour les HomeFeedItems.
 */

import type { JobOfferSearchResult, JobDemandSearchResult } from './_search';

// ============================================================================
// PUBLICATION READINESS — quality gate
// ============================================================================

export interface PublicationReadiness {
  canPublish: boolean;
  completeness_score: number; // 0-100
  blocking_issues: string[];  // Issues qui empêchent la publication
  warnings: string[];         // Points d'amélioration suggérés
  suggestions: string[];      // Conseils pour améliorer la visibilité
}

// ============================================================================
// STATE TRANSITIONS — machine à états offre / demande
// ============================================================================

export type JobOfferStatusTransition =
  | { from: 'draft';     to: 'published' }
  | { from: 'published'; to: 'paused'    }
  | { from: 'paused';    to: 'published' }
  | { from: 'published'; to: 'filled'    }
  | { from: 'published'; to: 'expired'   }
  | { from: 'paused';    to: 'expired'   }
  | { from: 'filled';    to: 'archived'  }
  | { from: 'expired';   to: 'archived'  };

export type JobDemandStatusTransition =
  | { from: 'draft';     to: 'published' }
  | { from: 'published'; to: 'paused'    }
  | { from: 'paused';    to: 'published' }
  | { from: 'published'; to: 'filled'    }
  | { from: 'published'; to: 'expired'   }
  | { from: 'paused';    to: 'expired'   }
  | { from: 'filled';    to: 'archived'  }
  | { from: 'expired';   to: 'archived'  };

// ============================================================================
// ANALYTICS EVENTS — tracking comportemental
// ============================================================================

export interface JobAnalyticsEvent {
  event_type:
    | 'job_offer_created'
    | 'job_offer_published'
    | 'job_offer_viewed'
    | 'job_offer_contacted'
    | 'job_offer_saved'
    | 'job_demand_created'
    | 'job_demand_published'
    | 'job_demand_viewed'
    | 'job_demand_contacted'
    | 'job_demand_saved'
    | 'job_search_performed';
  user_id?: string;
  job_id?: string;
  search_query?: string;
  filters_applied?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// OWNERSHIP & PERMISSION MATRIX
// ============================================================================

export type JobPermission =
  | 'view_own_jobs'
  | 'view_all_jobs'
  | 'create_offer'
  | 'create_demand'
  | 'edit_own_offer'
  | 'edit_own_demand'
  | 'delete_own_offer'
  | 'delete_own_demand'
  | 'contact_offers'
  | 'contact_demands'
  | 'moderate_all'
  | 'view_analytics';

export interface JobOwnership {
  user_id: string;
  can_edit: boolean;
  can_delete: boolean;
  can_moderate: boolean;
  is_author: boolean;
  is_organization_admin: boolean;
}

// ============================================================================
// HOME FEED INTEGRATION
// ============================================================================

export interface JobOfferHomeFeedItem {
  type: 'job_offer';
  data: JobOfferSearchResult;
  priority_score: number; // Pour tri dans le fil Home
  freshness_days: number;
  is_local: boolean;      // Basé sur sector_id de l'utilisateur
}

export interface JobDemandHomeFeedItem {
  type: 'job_demand';
  data: JobDemandSearchResult;
  priority_score: number;
  freshness_days: number;
  is_local: boolean;
}

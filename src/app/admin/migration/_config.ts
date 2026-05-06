/**
 * admin/migration/_config.ts
 * Liste des tables à vérifier pour le diagnostic de migration.
 */

import type { TableCheck } from './_types';

export const TABLES_TO_CHECK: TableCheck[] = [
  { name: 'collection_categories',  label: 'Catégories collections',      theme: '🏆 Collectionneurs' },
  { name: 'collection_items',       label: 'Annonces collections',        theme: '🏆 Collectionneurs' },
  { name: 'collection_item_photos', label: 'Photos collections',          theme: '🏆 Collectionneurs' },
  { name: 'collection_favorites',   label: 'Favoris collections',         theme: '🏆 Collectionneurs' },
  { name: 'collection_offers',      label: 'Offres collections',          theme: '🏆 Collectionneurs' },
  { name: 'collection_views',       label: 'Vues collections',            theme: '🏆 Collectionneurs' },
  { name: 'trust_interactions',     label: 'Interactions (confiance)',    theme: '⭐ Confiance' },
  { name: 'reviews',                label: 'Avis & notes',                theme: '⭐ Confiance' },
  { name: 'trust_profile_stats',    label: 'Stats de confiance',          theme: '⭐ Confiance' },
  { name: 'profile_badges',         label: 'Badges profil',               theme: '⭐ Confiance' },
  { name: 'promenades',             label: 'Promenades',                  theme: '🌿 Promenades' },
  { name: 'group_outings',          label: 'Sorties groupées',            theme: '🌿 Promenades' },
  { name: 'outing_comments',        label: 'Commentaires sorties',        theme: '🌿 Promenades' },
  { name: 'outing_photos',          label: 'Photos sorties',              theme: '🌿 Promenades' },
  { name: 'events',                 label: 'Événements locaux',           theme: '🎉 Événements', aliases: ['local_events'] },
  { name: 'event_participants',     label: 'Participations',              theme: '🎉 Événements', aliases: ['event_participations'] },
  { name: 'event_photos',           label: 'Photos événements',           theme: '🎉 Événements' },
  { name: 'event_comments',         label: 'Commentaires événements',     theme: '🎉 Événements' },
  { name: 'event_status_history',   label: 'Historique statuts events',   theme: '🎉 Événements' },
  { name: 'request_comments',       label: 'Commentaires demandes',       theme: '🔧 Vie pratique' },
  { name: 'associations',           label: 'Associations',                theme: '🏛️ Associations' },
  { name: 'asso_photos',            label: 'Photos associations',         theme: '🏛️ Associations' },
  { name: 'asso_comments',          label: 'Forum associations',          theme: '🏛️ Associations' },
  { name: 'lost_found_items',       label: 'Annonces Perdu/Trouvé',       theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_photos',              label: 'Photos Perdu/Trouvé',         theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_comments',            label: 'Commentaires Perdu/Trouvé',   theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_status_history',      label: 'Historique statuts P/T',      theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_matches',             label: 'Correspondances P/T',         theme: '🔍 Perdu/Trouvé' },
  { name: 'help_requests',          label: 'Coups de main',               theme: '🤝 Coups de main' },
  { name: 'help_photos',            label: 'Photos coups de main',        theme: '🤝 Coups de main' },
  { name: 'help_comments',          label: 'Commentaires coups de main',  theme: '🤝 Coups de main' },
  { name: 'asso_follows',           label: 'Abonnements associations',   theme: '🔔 Notifications' },
  { name: 'notifications',          label: 'Notifications',               theme: '🔔 Notifications' },
  { name: 'moderation_queue',       label: 'File de modération',          theme: '🛡️ Modération' },
  { name: 'item_ratings',           label: 'Notes & Avis (universel)',     theme: '⭐ Notation' },
  { name: 'admin_action_logs',      label: 'Journal des actions admin',   theme: '📋 Traçabilité' },
];

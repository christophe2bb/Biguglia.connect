/**
 * trust/_badges.ts — Configuration visuelle des badges de réputation
 *
 * BADGE_CONFIG fournit label, emoji, description et classes Tailwind
 * pour chaque BadgeCode. Utilisé par TrustScore, dashboard/avis, admin/confiance.
 */

import type { BadgeCode } from './_types';

export const BADGE_CONFIG: Record<BadgeCode, {
  label: string;
  emoji: string;
  description: string;
  color: string;
  bg: string;
}> = {
  new_member:         { label: 'Nouveau membre',       emoji: '🌱', description: 'Vient de rejoindre la communauté',             color: 'text-gray-600',    bg: 'bg-gray-100'    },
  profile_complete:   { label: 'Profil complet',       emoji: '✍️', description: 'A renseigné toutes les infos de profil',       color: 'text-blue-600',    bg: 'bg-blue-50'     },
  email_verified:     { label: 'Email vérifié',        emoji: '📧', description: 'Adresse email confirmée',                      color: 'text-indigo-600',  bg: 'bg-indigo-50'   },
  phone_verified:     { label: 'Tél. vérifié',         emoji: '📞', description: 'Numéro de téléphone renseigné',                color: 'text-teal-600',    bg: 'bg-teal-50'     },
  active_member:      { label: 'Membre actif',         emoji: '⭐', description: '10+ publications ou interactions',             color: 'text-amber-600',   bg: 'bg-amber-50'    },
  fast_responder:     { label: 'Réactif',              emoji: '⚡', description: 'Répond rapidement aux messages',              color: 'text-yellow-600',  bg: 'bg-yellow-50'   },
  reliable_organizer: { label: 'Organisateur fiable',  emoji: '📋', description: 'Organise des événements ou sorties réussis',  color: 'text-purple-600',  bg: 'bg-purple-50'   },
  reliable_vendor:    { label: 'Vendeur fiable',       emoji: '🛍️', description: 'Échanges annonces et collections bien notés', color: 'text-blue-700',    bg: 'bg-blue-50'     },
  reliable_helper:    { label: 'Aidant fiable',        emoji: '🤝', description: 'Aide apportée et bien évaluée',              color: 'text-orange-600',  bg: 'bg-orange-50'   },
  reliable_borrower:  { label: 'Emprunteur sérieux',   emoji: '🔧', description: 'Matériel rendu en bon état',                 color: 'text-teal-600',    bg: 'bg-teal-50'     },
  trusted_member:     { label: 'Membre de confiance',  emoji: '🛡️', description: 'Score de confiance > 70',                   color: 'text-emerald-700', bg: 'bg-emerald-50'  },
  top_rated:          { label: 'Top évalué',           emoji: '🏆', description: 'Moyenne ≥ 4.5 sur 5+ avis',                  color: 'text-yellow-700',  bg: 'bg-yellow-50'   },
  veteran:            { label: 'Vétéran',              emoji: '👴', description: 'Membre depuis plus d\'1 an',                 color: 'text-rose-600',    bg: 'bg-rose-50'     },
  admin_validated:    { label: 'Validé admin',         emoji: '✅', description: 'Identité vérifiée par l\'équipe',            color: 'text-green-700',   bg: 'bg-green-50'    },
};

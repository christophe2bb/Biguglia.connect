/**
 * Shared config for admin logs — labels, colours, helpers.
 * Pure data module, no React, importable from both client components.
 */

export const ACTION_LABELS: Record<string, string> = {
  moderation_decision:     'Décision de modération',
  moderation_trust_update: 'Niveau de confiance',
  user_status_set:         'Statut utilisateur',
  user_role_set:           'Rôle utilisateur',
  user_delete:             'Suppression compte',
  user_password_reset:     'Reset mot de passe',
  artisan_approve:         'Artisan approuvé',
  artisan_reject:          'Artisan refusé',
  content_status_set:      'Statut contenu',
  content_delete:          'Suppression contenu',
  content_close_set:       'Fermeture contenu',
  content_pin_set:         'Épinglage contenu',
  content_available_set:   'Disponibilité contenu',
  review_moderate:         'Modération avis',
  badge_award:             'Attribution badge',
  report_status_set:       'Statut signalement',
  report_ban_user:         'Suspension (signalement)',
};

export const ACTION_COLORS: Record<string, string> = {
  moderation_decision:     'bg-blue-100 text-blue-800',
  moderation_trust_update: 'bg-purple-100 text-purple-800',
  user_status_set:         'bg-orange-100 text-orange-800',
  user_role_set:           'bg-yellow-100 text-yellow-800',
  user_delete:             'bg-red-100 text-red-800',
  user_password_reset:     'bg-gray-100 text-gray-800',
  artisan_approve:         'bg-green-100 text-green-800',
  artisan_reject:          'bg-red-100 text-red-800',
  content_status_set:      'bg-teal-100 text-teal-800',
  content_delete:          'bg-red-100 text-red-800',
  content_close_set:       'bg-slate-100 text-slate-800',
  content_pin_set:         'bg-indigo-100 text-indigo-800',
  content_available_set:   'bg-cyan-100 text-cyan-800',
  review_moderate:         'bg-amber-100 text-amber-800',
  badge_award:             'bg-emerald-100 text-emerald-800',
  report_status_set:       'bg-rose-100 text-rose-800',
  report_ban_user:         'bg-red-100 text-red-800',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

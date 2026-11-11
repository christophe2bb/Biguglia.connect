/** Messages de connexion concis ; ne jamais afficher les pages HTML 5xx de Cloudflare. */
export function formatSignInError(error: { message: string; status?: number }): string {
  if (error.message === 'Invalid login credentials') {
    return 'Adresse email ou mot de passe incorrect';
  }
  if (error.status === 429) {
    return 'Trop de tentatives de connexion. Réessayez un peu plus tard.';
  }
  if (
    (typeof error.status === 'number' && error.status >= 500) ||
    /(?:network|failed to fetch|fetch failed|timeout|timed out|gateway|cloudflare|<!doctype|<html|\b(?:502|503|504|522|524)\b)/i.test(error.message)
  ) {
    return 'Le service de connexion est momentanément indisponible. Réessayez dans quelques instants.';
  }
  return 'Connexion refusée : ' + error.message.trim().slice(0, 140);
}

/**
 * src/lib/admin-fetch.ts
 *
 * Helper fetch pour les appels aux API routes /api/admin/**
 * Ajoute automatiquement le JWT Bearer token dans le header Authorization.
 *
 * Pourquoi ? Les cookies SSR Supabase ne sont pas correctement transmis
 * dans la config Vercel actuelle → les API routes admin retournent 401.
 * En envoyant le token en Bearer, getUserFromRequest() le lit correctement.
 *
 * ── Améliorations défensives ───────────────────────────────────────────────
 *   • Gestion explicite des réponses 429 (rate-limit) avec back-off.
 *   • Vérification du Content-Type avant d'appeler .json() pour éviter
 *     "Unexpected token '<'" quand le proxy renvoie une page HTML d'erreur.
 *   • Timeout de 20 s pour éviter les promesses qui ne se résolvent jamais.
 */

import { createClient } from '@/lib/supabase/client';

// ── Back-off 429 (module-level, partagé entre tous les appels adminFetch) ────
let _adminRateLimitUntil = 0;
let _adminRateLimitCount = 0;
const ADMIN_RATE_LIMIT_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000] as const;

function applyAdminBackoff(retryAfterHeader: string | null): number {
  const serverDelay = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1_000 : 0;
  const expDelay    = ADMIN_RATE_LIMIT_DELAYS_MS[Math.min(_adminRateLimitCount, ADMIN_RATE_LIMIT_DELAYS_MS.length - 1)];
  const delay       = Math.max(serverDelay || 0, expDelay);
  _adminRateLimitUntil   = Date.now() + delay;
  _adminRateLimitCount   = Math.min(_adminRateLimitCount + 1, ADMIN_RATE_LIMIT_DELAYS_MS.length - 1);
  return delay;
}

function resetAdminBackoff(): void {
  _adminRateLimitUntil = 0;
  _adminRateLimitCount = 0;
}

/**
 * Fetch avec Authorization: Bearer <token> automatique.
 * Utilise les mêmes paramètres que fetch() standard.
 *
 * Throws une Error enrichie si :
 *   • La requête est rate-limitée (429)
 *   • La réponse n'est pas du JSON (HTML d'erreur proxy)
 *   • Le timeout de 20 s est dépassé
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // ── Vérification du back-off 429 ─────────────────────────────────────────
  if (_adminRateLimitUntil > Date.now()) {
    const waitSecs = Math.ceil((_adminRateLimitUntil - Date.now()) / 1_000);
    throw new Error(`[adminFetch] Rate-limited — réessayez dans ${waitSecs}s`);
  }

  // ── Timeout de sécurité (20 s) ────────────────────────────────────────────
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 20_000);

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(options.headers ?? {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // ── Gestion 429 ───────────────────────────────────────────────────────
    if (res.status === 429) {
      const delay = applyAdminBackoff(res.headers.get('Retry-After'));
      console.warn(`[adminFetch] 429 rate-limit — back-off ${delay / 1000}s`);
      // On retourne la réponse brute pour que l'appelant puisse afficher un message
      return res;
    }

    // ── Vérification Content-Type (évite JSON.parse sur du HTML) ─────────
    if (!res.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '(illisible)');
        throw new Error(`[adminFetch] Réponse non-JSON HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
    }

    // Succès — réinitialiser le back-off
    if (res.ok) resetAdminBackoff();

    return res;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new Error('[adminFetch] Timeout (20s) dépassé');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

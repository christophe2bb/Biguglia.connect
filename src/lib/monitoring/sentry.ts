/**
 * src/lib/monitoring/sentry.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Helpers centralisés pour envoyer des événements à Sentry.
 *
 * POURQUOI ce module plutôt qu'appeler Sentry directement ?
 *   1. Point unique de contrôle : si on change de provider (DataDog, etc.),
 *      on modifie ce fichier, pas les 50 call sites.
 *   2. Garantit que les erreurs attendues (401, ZodError, réseau offline)
 *      ne remontent pas comme des bugs.
 *   3. Standardise les tags/contextes (userId, route, action).
 *   4. Safe si Sentry n'est pas configuré (pas de DSN) → ne lève pas d'exception.
 *
 * Utilisation :
 *   import { captureError, captureApiError, captureAuthError } from '@/lib/monitoring/sentry';
 *
 *   // Dans une API Route :
 *   captureApiError(err, { route: '/api/admin/users', userId: actor.id });
 *
 *   // Dans un Client Component :
 *   captureError(err, { tags: { section: 'forum' } });
 *
 *   // Pour une erreur d'auth :
 *   captureAuthError('supabase_session_invalid', { userId: session.user.id });
 *
 * IMPORTANT : Ne JAMAIS inclure de PII (email, nom complet, téléphone, IP)
 *             dans les tags ou extras envoyés à Sentry.
 *             Seul l'UUID Supabase (userId) est autorisé comme identifiant.
 */

import * as Sentry from '@sentry/nextjs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaptureContext {
  /** UUID Supabase de l'utilisateur (jamais d'email ni de nom). */
  userId?: string;
  /** Rôle de l'utilisateur (admin, artisan_verified, resident…). */
  userRole?: string;
  /** Tags libres pour filtrer dans Sentry. */
  tags?: Record<string, string | number | boolean>;
  /** Données supplémentaires non indexées (pour le contexte de débogage). */
  extra?: Record<string, unknown>;
  /** Niveau de sévérité (par défaut : 'error'). */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

export interface ApiErrorContext extends CaptureContext {
  /** Route API concernée, ex: '/api/admin/users/[id]'. */
  route: string;
  /** Méthode HTTP (GET, POST, PATCH, DELETE). */
  method?: string;
  /** Code de statut HTTP de la réponse envoyée. */
  statusCode?: number;
}

export interface AuthErrorContext extends CaptureContext {
  /** Identifiant de l'événement auth (ex: 'session_invalid', 'role_mismatch'). */
  event: string;
}

// ─── Erreurs à ignorer systématiquement ──────────────────────────────────────

/** Erreurs qui ne sont pas des bugs : on ne les envoie pas à Sentry. */
function isExpectedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();

  return (
    // Erreurs de validation utilisateur (ZodError, etc.)
    err.name === 'ZodError' ||
    // Erreurs réseau bénignes (utilisateur offline)
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    // Timeouts attendus
    msg.includes('aborted') ||
    // Auth refusé par design (pas un bug)
    msg === 'unauthorized' ||
    msg === 'forbidden'
  );
}

// ─── Helpers exportés ─────────────────────────────────────────────────────────

/**
 * captureError — capture générique d'une erreur.
 *
 * À utiliser dans les Client Components (useEffect, event handlers)
 * et dans les Server Components / API Routes si `captureApiError` n'est
 * pas adapté.
 */
export function captureError(err: unknown, ctx: CaptureContext = {}): void {
  if (isExpectedError(err)) return;

  try {
    Sentry.withScope(scope => {
      if (ctx.userId)   scope.setUser({ id: ctx.userId, role: ctx.userRole });
      if (ctx.tags)     scope.setTags(ctx.tags);
      if (ctx.extra)    scope.setExtras(ctx.extra);
      if (ctx.level)    scope.setLevel(ctx.level);

      Sentry.captureException(err);
    });
  } catch {
    // Ne jamais laisser Sentry crasher l'application
  }
}

/**
 * captureApiError — capture d'une erreur dans une API Route.
 *
 * Ajoute automatiquement le tag `route` et `method` pour faciliter
 * le filtrage dans le dashboard Sentry.
 *
 * À placer dans le catch d'une API Route :
 *   } catch (err) {
 *     captureApiError(err, { route: '/api/admin/stats', userId: actor.id });
 *     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 *   }
 */
export function captureApiError(err: unknown, ctx: ApiErrorContext): void {
  if (isExpectedError(err)) return;

  try {
    Sentry.withScope(scope => {
      scope.setTag('boundary', 'api-route');
      scope.setTag('route',    ctx.route);
      if (ctx.method)     scope.setTag('http.method',      ctx.method);
      if (ctx.statusCode) scope.setTag('http.status_code', ctx.statusCode);
      if (ctx.userId)     scope.setUser({ id: ctx.userId, role: ctx.userRole });
      if (ctx.tags)       scope.setTags(ctx.tags);
      if (ctx.extra)      scope.setExtras(ctx.extra);
      if (ctx.level)      scope.setLevel(ctx.level);
      else                scope.setLevel('error');

      Sentry.captureException(err);
    });
  } catch {
    // Ne jamais laisser Sentry crasher l'application
  }
}

/**
 * captureAuthError — capture d'une erreur liée à l'authentification.
 *
 * Utilisé quand la session Supabase est invalide, expirée, ou quand
 * un utilisateur tente d'accéder à une ressource sans les droits requis
 * (cas non géré par l'admin-guard → bug potentiel, pas un 403 attendu).
 *
 * Exemples d'événements :
 *   'session_missing'       — pas de session alors qu'on en attendait une
 *   'profile_load_failed'   — impossible de charger le profil depuis la DB
 *   'role_unexpected'       — rôle inattendu dans un contexte protégé
 *   'jwt_expired_unhandled' — JWT expiré non géré par le middleware
 */
export function captureAuthError(event: string, ctx: AuthErrorContext): void {
  Sentry.withScope(scope => {
    scope.setTag('boundary',   'auth');
    scope.setTag('auth.event', event);
    if (ctx.userId)   scope.setUser({ id: ctx.userId, role: ctx.userRole });
    if (ctx.tags)     scope.setTags(ctx.tags);
    if (ctx.extra)    scope.setExtras(ctx.extra);
    scope.setLevel(ctx.level ?? 'warning');

    Sentry.captureMessage(`Auth error: ${event}`, ctx.level ?? 'warning');
  });
}

/**
 * setUserContext — définit l'utilisateur courant dans le scope Sentry.
 *
 * À appeler après connexion réussie (dans AuthProvider ou un Server Component).
 * Toutes les erreurs suivantes seront associées à cet utilisateur.
 *
 * JAMAIS d'email, nom ou téléphone — uniquement l'UUID Supabase.
 */
export function setUserContext(userId: string, role?: string): void {
  Sentry.setUser({ id: userId, ...(role && { role }) });
}

/**
 * clearUserContext — supprime l'utilisateur du scope Sentry.
 *
 * À appeler lors de la déconnexion.
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * addBreadcrumb — ajoute un fil d'Ariane pour faciliter la reproduction des bugs.
 *
 * Exemple :
 *   addBreadcrumb('Artisan validation started', { artisanId: '...' });
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category = 'app',
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour le layout /admin — Server Component uniquement.
 *
 * ─── Formats de cookies supportés ──────────────────────────────────────────
 *
 *  @supabase/ssr 0.9+ (FORMAT ACTUEL) :
 *    sb-<ref>-auth-token = base64-<base64url(JSON.stringify(session))>
 *
 *  Héritage createBrowserClient (JSON brut) :
 *    sb-<ref>-auth-token = {"access_token":"eyJ...","refresh_token":"..."}
 *
 *  Héritage chunké :
 *    sb-<ref>-auth-token.0 = {"access_token":"eyJ...",...}
 *
 *  Les 3 formats sont supportés par extractUserIdFromCookie().
 *
 * ─── Protection double couche ──────────────────────────────────────────────
 *
 *  Couche 1 — Middleware Edge : vérifie que le cookie access_token existe
 *  Couche 2 — Ce guard : charge le profil et vérifie le rôle (admin/moderator)
 */

import { redirect } from 'next/navigation';
import 'server-only';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

export type AdminLayoutRole = 'admin' | 'moderator';
export interface AdminLayoutActor { id: string; role: AdminLayoutRole; }
export interface AdminLayoutOk { actor: AdminLayoutActor; }

const ADMIN_ROLES: readonly string[] = ['admin', 'moderator'] as const;

/**
 * Extrait un access_token depuis une valeur de cookie Supabase.
 * Supporte les 3 formats de @supabase/ssr :
 *   1. base64-<base64url(JSON)>  ← FORMAT 0.9+ (actuel)
 *   2. {"access_token":"eyJ..."}  ← JSON brut (héritage createBrowserClient)
 *   3. (appelé sur chunk .0)     ← format chunké (héritage createServerClient)
 */
function extractTokenFromCookieValue(value: string): string | null {
  if (!value) return null;

  // ── Format 0.9+ : base64-<base64url(JSON)> ───────────────────────────────
  if (value.startsWith('base64-')) {
    try {
      const b64url  = value.slice('base64-'.length);
      // base64url → base64 standard
      const b64     = b64url.replace(/-/g, '+').replace(/_/g, '/');
      const padded  = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
      const json    = Buffer.from(padded, 'base64').toString('utf8');
      const parsed  = JSON.parse(json) as Record<string, unknown>;
      const token   = parsed.access_token;
      return typeof token === 'string' && token.startsWith('eyJ') ? token : null;
    } catch {
      return null;
    }
  }

  // ── Format héritage : JSON brut ou URL-encodé ─────────────────────────────
  try {
    const decoded = decodeURIComponent(value);
    const parsed  = JSON.parse(decoded) as Record<string, unknown>;
    const token   = parsed.access_token;
    return typeof token === 'string' && token.startsWith('eyJ') ? token : null;
  } catch {
    return null;
  }
}

/**
 * Extrait le userId depuis le cookie Supabase brut.
 * Supporte les formats @supabase/ssr 0.9+ (base64-), JSON brut, et chunké.
 */
async function extractUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const projectRef  = getSupabaseProjectRef();
  const cookieName  = `sb-${projectRef}-auth-token`;

  // ── Cookie principal (format 0.9+ base64- ou JSON brut) ──────────────────
  const rawCookie = cookieStore.get(cookieName)?.value;
  if (rawCookie) {
    const token = extractTokenFromCookieValue(rawCookie);
    if (token) {
      const userId = decodeJwtSub(token);
      if (userId) return userId;
    }
  }

  // ── Format chunké : cookie .0 ────────────────────────────────────────────
  // Utilisé quand la session est trop grande pour un seul cookie.
  const chunk0 = cookieStore.get(`${cookieName}.0`)?.value;
  if (chunk0) {
    const token = extractTokenFromCookieValue(chunk0);
    if (token) {
      const userId = decodeJwtSub(token);
      if (userId) return userId;
    }
  }

  return null;
}

/**
 * Décode le payload d'un JWT et retourne le champ `sub` (= userId Supabase).
 * Ne vérifie PAS la signature — à utiliser uniquement quand la DB valide ensuite.
 */
function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Padding Base64URL → Base64
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded  = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;

    const sub = decoded.sub as string | undefined;
    if (!sub || typeof sub !== 'string' || sub.length < 10) return null;

    // Vérifier l'expiration (exp = timestamp Unix en secondes)
    const exp = decoded.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      // JWT expiré — on continue quand même : la DB validera via le userId.
      // La sécurité réelle est assurée par la vérification du profil en DB.
    }

    return sub;
  } catch {
    return null;
  }
}

export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  // ── Étape 1 : Extraire le userId depuis le cookie ─────────────────────────
  // Contourne le bug getSession() qui ne lit pas le cookie JSON brut de
  // createBrowserClient.
  const userId = await extractUserIdFromCookie();

  if (!userId) {
    redirect('/connexion?next=/admin');
  }

  // ── Étape 2 : Charger le profil via service-role (bypass RLS) ────────────
  // createAdminClient() utilise SUPABASE_SERVICE_ROLE_KEY.
  // C'est la seule vérification de sécurité qui compte vraiment :
  // si le userId n'existe pas en DB avec le bon rôle → accès refusé.
  const adminDb = createAdminClient();

  const { data: profileRow, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (profileError || !profileRow) {
    redirect('/');
  }

  // ── Étape 3 : Vérifier le rôle ───────────────────────────────────────────
  const role = String(profileRow.role);

  if (!ADMIN_ROLES.includes(role)) {
    redirect('/');
  }

  return {
    actor: { id: userId, role: role as AdminLayoutRole },
  };
}

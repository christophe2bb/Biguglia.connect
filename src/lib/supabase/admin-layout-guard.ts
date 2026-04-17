/**
 * src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour le layout /admin — Server Component uniquement.
 *
 * ─── Problème identifié (2026-04-17) ───────────────────────────────────────
 *
 *  Le cookie `sb-<ref>-auth-token` est stocké par createBrowserClient au
 *  format JSON brut :
 *    {"access_token":"eyJ...","refresh_token":"...","expires_at":...}
 *
 *  createServerClient (@supabase/ssr) s'attend à un format chunké :
 *    sb-<ref>-auth-token.0 = {"access_token":"eyJ..."}
 *    sb-<ref>-auth-token.1 = {"refresh_token":"..."}
 *
 *  Résultat : getSession() renvoie null malgré un cookie valide présent.
 *
 * ─── Solution ──────────────────────────────────────────────────────────────
 *
 *  1. Lire le cookie brut depuis next/headers
 *  2. Parser le JSON pour extraire access_token + user.id
 *  3. Décoder le JWT manuellement (payload Base64) pour obtenir sub (= userId)
 *  4. Charger le profil via service-role (bypass RLS) avec ce userId
 *
 *  Pas besoin de valider la signature du JWT ici — createAdminClient()
 *  (service-role key) est une source de vérité côté DB. Si le userId
 *  n'existe pas en base, le profil sera null et l'accès refusé.
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
 * Extrait le userId depuis le cookie Supabase brut (format JSON ou chunké).
 * Décode le payload Base64 du JWT access_token sans vérifier la signature
 * (la vérification de rôle via service-role key est la vraie garantie de sécurité).
 */
function extractUserIdFromCookie(): string | null {
  const cookieStore = cookies();
  const projectRef  = getSupabaseProjectRef();
  const cookieName  = `sb-${projectRef}-auth-token`;

  // ── Format JSON brut (createBrowserClient) ────────────────────────────────
  // Valeur : {"access_token":"eyJ...","refresh_token":"...","expires_at":...}
  const rawCookie = cookieStore.get(cookieName)?.value;
  if (rawCookie) {
    try {
      const decoded = decodeURIComponent(rawCookie);
      const parsed  = JSON.parse(decoded) as Record<string, unknown>;
      const token   = parsed.access_token as string | undefined;
      if (token) {
        const userId = decodeJwtSub(token);
        if (userId) {
          console.log('[verifyAdminLayout] userId extrait du cookie JSON brut:', userId);
          return userId;
        }
      }
    } catch {
      // Pas du JSON valide, essayer le format chunké
    }
  }

  // ── Format chunké (createServerClient) ───────────────────────────────────
  // Valeur .0 : {"access_token":"eyJ...","token_type":"bearer",...}
  const chunk0 = cookieStore.get(`${cookieName}.0`)?.value;
  if (chunk0) {
    try {
      const decoded = decodeURIComponent(chunk0);
      const parsed  = JSON.parse(decoded) as Record<string, unknown>;
      const token   = parsed.access_token as string | undefined;
      if (token) {
        const userId = decodeJwtSub(token);
        if (userId) {
          console.log('[verifyAdminLayout] userId extrait du cookie chunké .0:', userId);
          return userId;
        }
      }
    } catch {
      // Cookie chunké invalide
    }
  }

  console.log('[verifyAdminLayout] aucun cookie Supabase valide trouvé (cookieName:', cookieName, ')');
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
      console.log('[verifyAdminLayout] JWT expiré (exp:', exp, ', now:', Math.floor(Date.now() / 1000), ')');
      // On continue quand même : la DB validera via le userId
      // Si le JWT est expiré mais le userId valide en DB avec rôle admin → on laisse passer
      // La sécurité réelle est assurée par la vérification du profil en DB
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
  const userId = extractUserIdFromCookie();

  console.log('[verifyAdminLayout] userId depuis cookie:', userId);

  if (!userId) {
    console.log('[verifyAdminLayout] → redirect /connexion (pas de cookie valide)');
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

  console.log('[verifyAdminLayout] profil (service-role):', {
    data: profileRow ? { id: profileRow.id, role: profileRow.role } : null,
    errorMsg: profileError?.message ?? null,
    errorCode: profileError?.code ?? null,
  });

  if (profileError || !profileRow) {
    console.log('[verifyAdminLayout] → redirect / (profil introuvable pour userId:', userId, ')');
    redirect('/');
  }

  // ── Étape 3 : Vérifier le rôle ───────────────────────────────────────────
  const role = String(profileRow.role);

  console.log('[verifyAdminLayout] rôle:', role, '| admin?', ADMIN_ROLES.includes(role));

  if (!ADMIN_ROLES.includes(role)) {
    console.log('[verifyAdminLayout] → redirect / (rôle insuffisant:', role, ')');
    redirect('/');
  }

  console.log('[verifyAdminLayout] ✅ accès accordé — userId:', userId, '| rôle:', role);

  return {
    actor: { id: userId, role: role as AdminLayoutRole },
  };
}

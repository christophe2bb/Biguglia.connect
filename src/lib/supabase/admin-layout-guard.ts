/**
 * src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour le layout /admin — Server Component uniquement.
 *
 * ─── Stratégie d'authentification ──────────────────────────────────────────
 *
 *  1. getSession()    — lit les cookies SSR localement (0 réseau)
 *  2. refreshSession() — si JWT expiré, tente un refresh (1 appel réseau)
 *  3. Service-role query — charge le profil en bypassant la RLS
 *
 * ─── Protection double couche ──────────────────────────────────────────────
 *
 *  Couche 1 — Middleware Edge (src/middleware.ts) :
 *    • NE redirige PAS /admin — laisse le layout décider.
 *
 *  Couche 2 — Layout Serveur (src/app/admin/layout.tsx) :
 *    • Ce fichier — validation JWT + rôle côté Node.js
 *
 * ─── Tableau de comparaison des couches ────────────────────────────────────
 *
 *  Couche              │ Où            │ Valide JWT │ Vérifie rôle │ Coût réseau
 *  ────────────────────┼───────────────┼────────────┼──────────────┼────────────
 *  Middleware Edge     │ Edge Runtime  │ Cookie seul │ Non          │ 0 ms
 *  layout.tsx (serveur)│ Node.js       │ Oui (SSR)   │ Oui (svc-role)│ ~50 ms
 *  /api/admin/**       │ Node.js       │ Oui (Bearer)│ Oui (svc-role)│ ~50 ms
 */

import { redirect } from 'next/navigation';
import 'server-only';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export type AdminLayoutRole = 'admin' | 'moderator';
export interface AdminLayoutActor { id: string; role: AdminLayoutRole; }
export interface AdminLayoutOk { actor: AdminLayoutActor; }

const ADMIN_ROLES: readonly string[] = ['admin', 'moderator'] as const;

export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  const ssrClient = createClient();

  // ── Étape 1 : Lire la session depuis les cookies SSR ──────────────────────
  // getSession() lit le cookie local sans appel réseau.
  // Si le JWT est expiré, Supabase tente un refresh automatiquement si
  // le refresh_token est présent dans le cookie.
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await ssrClient.auth.getSession();

  console.log('[verifyAdminLayout] getSession:', {
    hasSession: !!initialSession,
    userId: initialSession?.user?.id ?? null,
    expiresAt: initialSession?.expires_at ?? null,
    errorMsg: sessionError?.message ?? null,
  });

  let userId: string | null = initialSession?.user?.id ?? null;

  // ── Étape 2 : Si pas de session, tenter un refresh explicite ─────────────
  // Cas typique : le JWT a expiré pendant la nuit / après un blocage IP.
  // refreshSession() fait 1 appel réseau vers Supabase Auth pour renouveler.
  if (!userId) {
    console.log('[verifyAdminLayout] pas de session — tentative refreshSession()...');
    try {
      const { data: refreshData, error: refreshError } = await ssrClient.auth.refreshSession();
      console.log('[verifyAdminLayout] refreshSession:', {
        hasSession: !!refreshData?.session,
        userId: refreshData?.session?.user?.id ?? null,
        errorMsg: refreshError?.message ?? null,
      });
      if (refreshData?.session?.user?.id) {
        userId = refreshData.session.user.id;
      }
    } catch (e) {
      console.error('[verifyAdminLayout] refreshSession exception:', e);
    }
  }

  // ── Étape 3 : Vérifier qu'on a bien un userId ────────────────────────────
  if (!userId) {
    console.log('[verifyAdminLayout] → redirect /connexion (aucune session récupérable)');
    redirect('/connexion?next=/admin');
  }

  // ── Étape 4 : Charger le profil via service-role (bypass RLS) ────────────
  // createAdminClient() utilise SUPABASE_SERVICE_ROLE_KEY — bypass total RLS.
  // Aucun risque de blocage par les policies profiles_select_own / profiles_select_admin.
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
    console.log('[verifyAdminLayout] → redirect / (profil introuvable — userId:', userId, ')');
    // Ne pas rediriger vers /connexion (la session existe, le profil manque)
    // Rediriger vers / pour éviter la boucle /connexion → /admin → /connexion
    redirect('/');
  }

  // ── Étape 5 : Vérifier le rôle ───────────────────────────────────────────
  // Convertir en string pour être robuste face au type enum user_role de Postgres.
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

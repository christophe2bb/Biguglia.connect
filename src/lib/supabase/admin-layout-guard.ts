/**
 * src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour le layout /admin — Server Component uniquement.
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
  const {
    data: { session },
    error: sessionError,
  } = await ssrClient.auth.getSession();

  console.log('[verifyAdminLayout] session:', {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    error: sessionError?.message ?? null,
  });

  if (!session?.user?.id) {
    console.log('[verifyAdminLayout] → redirect /connexion (pas de session)');
    redirect('/connexion?next=/admin');
  }

  const userId = session.user.id;
  const adminDb = createAdminClient();

  const { data: profileRow, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  console.log('[verifyAdminLayout] profile:', {
    data: profileRow,
    error: profileError?.message ?? null,
  });

  if (profileError || !profileRow) {
    console.log('[verifyAdminLayout] → redirect / (profil introuvable)');
    redirect('/');
  }

  const role = String(profileRow.role);

  console.log('[verifyAdminLayout] role:', role, '| admin?', ADMIN_ROLES.includes(role));

  if (!ADMIN_ROLES.includes(role)) {
    console.log('[verifyAdminLayout] → redirect / (rôle insuffisant:', role, ')');
    redirect('/');
  }

  console.log('[verifyAdminLayout] ✅ accès accordé userId:', userId, 'role:', role);

  return {
    actor: { id: userId, role: role as AdminLayoutRole },
  };
}

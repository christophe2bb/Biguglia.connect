/**
 * Protection serveur des pages /admin.
 *
 * La présence d'un JWT dans un cookie ne suffit JAMAIS à prouver l'identité :
 * Supabase Auth doit d'abord vérifier la session avant toute lecture privilégiée.
 */
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export type AdminLayoutRole = 'admin' | 'moderator';
export interface AdminLayoutActor { id: string; role: AdminLayoutRole }
export interface AdminLayoutOk { actor: AdminLayoutActor }

const ADMIN_ROLES = new Set(['admin', 'moderator']);

export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    redirect('/connexion?next=/admin');
  }

  // La vérification des privilèges ne dépend jamais de user_metadata.
  const adminDb = createAdminClient();
  const { data: profile, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role, status, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (
    profileError || !profile ||
    profile.id !== user.id ||
    !ADMIN_ROLES.has(String(profile.role)) ||
    profile.status !== 'active' ||
    profile.is_active !== true
  ) {
    redirect('/');
  }

  return { actor: { id: user.id, role: profile.role as AdminLayoutRole } };
}

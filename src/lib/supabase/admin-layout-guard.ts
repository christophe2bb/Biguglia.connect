import 'server-only';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { withAuthTimeout } from './with-timeout';

export type AdminLayoutRole = 'admin' | 'moderator';
export interface AdminLayoutActor { id: string; role: AdminLayoutRole; }
export interface AdminLayoutOk { actor: AdminLayoutActor; }

const ADMIN_ROLES: readonly string[] = ['admin', 'moderator'];

/** Verify the session through Supabase before using the service-role database client. */
export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    // The SDK assembles every session-cookie chunk and verifies the JWT.
    // Decoding a cookie's sub alone does not prove the user's identity.
    const { data: { user }, error } = await withAuthTimeout(() => supabase.auth.getUser());
    if (!error && user) userId = user.id;
  } catch {
    // An unavailable auth service must never grant administrative access.
  }

  if (!userId) redirect('/connexion?next=/admin');

  const adminDb = createAdminClient();
  const { data: profileRow, error: profileError } = await withAuthTimeout(() =>
    adminDb.from('profiles').select('id, role').eq('id', userId).single()
  );
  if (profileError || !profileRow) redirect('/');

  const role = String(profileRow.role);
  if (!ADMIN_ROLES.includes(role)) redirect('/');

  return { actor: { id: userId, role: role as AdminLayoutRole } };
}

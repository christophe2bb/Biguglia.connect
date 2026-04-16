/**
 * communaute/[theme]/membre/[userId]/queries.ts — Server-side data access
 *
 * Called only from the Server Component (page.tsx).
 * Uses the public Supabase client (anon key, no cookies needed for public reads).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Lightweight public client — no session, no cookies. */
function getPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type MemberSEO = {
  id: string;
  full_name: string;
  bio?: string | null;
  city?: string | null;
};

/**
 * Fetch minimal data for generateMetadata + first paint shell.
 * Returns null when the member does not exist.
 */
export async function fetchMemberSEO(userId: string): Promise<MemberSEO | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, bio, city')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MemberSEO;
}

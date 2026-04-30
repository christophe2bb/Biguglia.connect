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
  bio?: string | null;  // colonne absente de profiles → remplie via theme_profiles
  city?: string | null; // colonne absente de profiles → non disponible directement
};

/**
 * Fetch minimal data for generateMetadata + first paint shell.
 * Returns null when the member does not exist.
 * Note: profiles n'a pas de colonnes bio/city → on enrichit depuis theme_profiles si dispo.
 */
export async function fetchMemberSEO(userId: string): Promise<MemberSEO | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;

  // Enrichissement optionnel via theme_profiles (bio disponible ici)
  const { data: themeProfile } = await supabase
    .from('theme_profiles')
    .select('bio, location_zone')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    id:        data.id,
    full_name: data.full_name,
    bio:       (themeProfile as { bio?: string | null } | null)?.bio ?? null,
    city:      (themeProfile as { location_zone?: string | null } | null)?.location_zone ?? null,
  };
}

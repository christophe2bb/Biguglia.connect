/**
 * coups-de-main/[id]/queries.ts — Server-side data access
 *
 * Called only from the Server Component (page.tsx).
 * Uses the public Supabase client (anon key, no cookies needed for public reads).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { HelpRequest } from './_types';

/** Lightweight public client — no session, no cookies. */
function getPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Fetch the minimal data needed for generateMetadata + first paint shell.
 * Returns null when the item does not exist or is private.
 */
export async function fetchHelpRequestSEO(
  id: string,
): Promise<Pick<HelpRequest, 'id' | 'title' | 'description' | 'category' | 'location_city' | 'location_area' | 'help_type' | 'status'> | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('help_requests')
    .select('id, title, description, category, location_city, location_area, help_type, status')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Pick<HelpRequest, 'id' | 'title' | 'description' | 'category' | 'location_city' | 'location_area' | 'help_type' | 'status'>;
}

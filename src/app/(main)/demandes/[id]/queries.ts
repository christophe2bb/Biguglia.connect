/**
 * demandes/[id]/queries.ts — Server-side data access
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

type DemandeSEO = {
  id: string;
  title: string;
  description: string;
  urgency: string;
  address: string;
  status: string;
};

/**
 * Fetch minimal data for generateMetadata + first paint shell.
 * Returns null when the item does not exist.
 */
export async function fetchDemandeSEO(id: string): Promise<DemandeSEO | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('id, title, description, urgency, address, status')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as DemandeSEO;
}

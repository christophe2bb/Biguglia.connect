/**
 * API Route — /api/emploi/ownership
 * GET ?type=offer|demand&slug=xxx
 * Retourne { isOwner: boolean } pour l'utilisateur connecté.
 *
 * Validation : type doit être 'offer' ou 'demand', slug validé par regex.
 * Ne jamais exposer userId, method, ou autres détails internes.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-helper';

/** Shape minimale retournée par .select('user_id') sur job_offers / job_demands */
interface OwnershipRow {
  user_id: string;
}

// ── Validation des query params ───────────────────────────────────────────────
const QuerySchema = z.object({
  type: z.enum(['offer', 'demand']),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/, 'Slug invalide'),
});

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type'),
    slug: searchParams.get('slug'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, slug } = parsed.data;
  const table = type === 'offer' ? 'job_offers' : 'job_demands';

  const authUser = await getUserFromRequest(req);
  if (!authUser?.id) {
    return NextResponse.json({ isOwner: false });
  }

  // Lire user_id via admin (bypass RLS — ownership check uniquement)
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .select('user_id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ isOwner: false });
  }

  const isOwner = (data as OwnershipRow).user_id === authUser.id;
  // Ne jamais exposer userId, method, ou autres détails dans la réponse publique
  return NextResponse.json({ isOwner });
}

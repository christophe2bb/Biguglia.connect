import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PendingListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Identifiant stable : deux clics simultanés ne créent pas deux tickets. */
function stableQueueId(listing: PendingListing): string {
  const hash = createHash('sha256')
    .update('biguglia-moderation-listing:' + listing.id + ':' + (listing.updated_at || ''))
    .digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), '5' + hash.slice(13, 16),
    '8' + hash.slice(17, 20), hash.slice(20, 32)].join('-');
}

/**
 * Rapprocher les annonces en attente et la file de modération existante.
 * Ne publie ni ne modifie les annonces, ne modifie aucun compte.
 * Uniquement sur action explicite d'un administrateur connecté.
 */
export async function POST(req: NextRequest) {
  const csrf = assertCsrfSafe(req);
  if (csrf) return csrf;
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;
  if (guard.actor.role !== 'admin') {
    return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });
  }

  const { adminClient } = guard;
  const { data: pending, error: pendingError } = await adminClient
    .from('listings')
    .select('id, user_id, title, description, created_at, updated_at')
    .eq('moderation_status', 'en_attente_validation')
    .order('created_at', { ascending: true })
    .limit(50);
  if (pendingError) {
    console.error('[moderation/reconcile] annonces indisponibles:', pendingError.code);
    return NextResponse.json({ error: 'Impossible de lire les annonces.' }, { status: 503 });
  }

  const listings = (pending ?? []) as PendingListing[];
  if (!listings.length) {
    return NextResponse.json({ created: 0, skipped: 0, failed: 0, moreToCheck: false });
  }

  const { data: current, error: currentError } = await adminClient
    .from('moderation_queue').select('content_id')
    .eq('content_type', 'listing')
    .eq('status', 'en_attente_validation')
    .in('content_id', listings.map(l => l.id));
  if (currentError) {
    return NextResponse.json({ error: 'Impossible de vérifier la file.' }, { status: 503 });
  }

  const known = new Set((current ?? []).map(row => String(row.content_id)));
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const listing of listings) {
    if (known.has(listing.id)) {
      skipped++;
      continue;
    }
    const { error } = await adminClient.from('moderation_queue').insert({
      id: stableQueueId(listing),
      content_type: 'listing',
      content_id: listing.id,
      author_id: listing.user_id,
      content_title: listing.title || '(Annonce sans titre)',
      content_excerpt: listing.description?.slice(0, 500) || null,
      content_photos: [],
      status: 'en_attente_validation',
      submitted_at: listing.updated_at || listing.created_at || new Date().toISOString(),
      author_trust: 'nouveau',
      risk_score: 0,
      risk_level: 'low',
      completeness: 100,
      validation_errors: [],
    });
    if (!error) {
      created++;
    } else if (error.code === '23505') {
      skipped++; // seconde requête concurrente, UUID déterministe
    } else {
      failed++;
      console.error('[moderation/reconcile] insertion refusée:', error.code);
    }
  }

  return NextResponse.json({
    created, skipped, failed,
    moreToCheck: listings.length === 50,
  });
}

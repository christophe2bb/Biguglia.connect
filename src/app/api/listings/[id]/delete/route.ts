/**
 * Suppression d'annonce et nettoyage de ses photos dans une seule opération
 * serveur. Vérifie la propriété AVANT tout effacement. Si DELETE échoue,
 * aucune photo Storage n'est supprimée.
 */
import { NextRequest, NextResponse } from 'next/server';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { safeStoragePath, safeRelativePath } from '@/lib/upload-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });

  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });

  const admin = createAdminClient();
  const { data: listing, error: listingError } = await admin
    .from('listings').select('id, user_id, cover_url').eq('id', id).maybeSingle();
  if (listingError) return NextResponse.json({ error: 'Annonce momentanément indisponible' }, { status: 503 });
  if (!listing) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
  if (listing.user_id !== userId) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  const { data: photos, error: photoError } = await admin
    .from('listing_photos').select('url').eq('listing_id', id);
  if (photoError) return NextResponse.json({ error: 'Photos momentanément indisponibles' }, { status: 503 });

  // Une URL de photo manipulée en base ne doit jamais permettre
  // de supprimer les fichiers d'un autre utilisateur ou d'une autre annonce.
  const prefix = `listings/${id}/`;
  const candidates = [listing.cover_url, ...(photos || []).map(p => p.url)];
  const paths = [...new Set(candidates.flatMap((url: string | null) => {
    if (!url) return [];
    const relative = safeStoragePath(url, 'photos');
    const valid = relative && safeRelativePath(relative);
    return valid && valid.startsWith(prefix) && /^[a-zA-Z0-9_./-]+$/.test(valid) ? [valid] : [];
  }))];

  // listing_photos est supprimé par ON DELETE CASCADE.
  // Ne JAMAIS effacer Storage avant de savoir si cette opération a réussi.
  const { data: deleted, error: deleteError } = await admin
    .from('listings').delete().eq('id', id).eq('user_id', userId)
    .select('id').maybeSingle();
  if (deleteError || !deleted) {
    console.warn('[delete-listing] suppression DB refusée', deleteError?.code);
    return NextResponse.json({ error: 'Suppression non enregistrée' }, { status: 503 });
  }

  let cleanupWarning = false;
  if (paths.length) {
    const { error: storageError } = await admin.storage.from('photos').remove(paths);
    if (storageError) {
      cleanupWarning = true;
      console.warn('[delete-listing] nettoyage Storage à reprendre', storageError.message);
    }
  }
  const { error: favoritesError } = await admin
    .from('user_favorites').delete().eq('target_type', 'listing').eq('target_id', id);
  if (favoritesError) {
    cleanupWarning = true;
    console.warn('[delete-listing] nettoyage favoris à reprendre', favoritesError.code);
  }

  return NextResponse.json({ ok: true, cleanupWarning });
}

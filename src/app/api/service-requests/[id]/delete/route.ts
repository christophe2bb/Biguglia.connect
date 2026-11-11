import { NextRequest, NextResponse } from 'next/server';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { safeRelativePath, safeStoragePath } from '@/lib/upload-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supprimer une demande et nettoyer uniquement ses photos après DELETE SQL. */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrfSafe(req);
  if (csrf) return csrf;
  const userId = await getUserIdBearerFirst(req);
  if (!userId) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Demande invalide' }, { status: 400 });

  const admin = createAdminClient();
  const { data: request, error: requestError } = await admin.from('service_requests')
    .select('id,resident_id').eq('id', id).maybeSingle();
  if (requestError) return NextResponse.json({ error: 'Demande momentanément indisponible' }, { status: 503 });
  if (!request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  if (request.resident_id !== userId) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  const { data: photos, error: photoError } = await admin.from('service_request_photos')
    .select('url').eq('request_id', id);
  if (photoError) return NextResponse.json({ error: 'Photos momentanément indisponibles' }, { status: 503 });

  const prefix = 'requests/' + id + '/';
  const paths = [...new Set((photos ?? []).flatMap(p => {
    const extracted = safeStoragePath(p.url, 'photos');
    const safe = extracted && safeRelativePath(extracted);
    return safe && safe.startsWith(prefix) && /^[a-zA-Z0-9_./-]+$/.test(safe) ? [safe] : [];
  }))];
  const invalidCount = (photos ?? []).length - paths.length;

  // L'ensemble des vérifications de propriété et des lectures a réussi.
  // Les relations request_comments et service_request_photos sont ON DELETE CASCADE.
  const { data: deleted, error: deleteError } = await admin.from('service_requests')
    .delete().eq('id', id).eq('resident_id', userId).select('id').maybeSingle();
  if (deleteError || !deleted) {
    console.warn('[request-delete] suppression refusée', deleteError?.code);
    return NextResponse.json({ error: 'Suppression non confirmée' }, { status: 503 });
  }

  let cleanupWarning = invalidCount > 0;
  if (paths.length) {
    const { error: cleanupError } = await admin.storage.from('photos').remove(paths);
    if (cleanupError) {
      cleanupWarning = true;
      console.warn('[request-delete] nettoyage stockage à reprendre', cleanupError.message);
    }
  }
  return NextResponse.json({ ok: true, cleanupWarning });
}

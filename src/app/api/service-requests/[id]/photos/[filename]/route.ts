import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { quotePhotoUrl, QUOTE_PHOTO_BUCKET } from '@/lib/service-request-photos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,180}\.(jpg|jpeg|png|webp|gif)$/i;

/**
 * Seul le résident, l'artisan destinataire ou un modérateur peut lire
 * les fichiers d'un devis privé. Aucun lien signé ou public n'est exposé.
 */
export async function GET(req: NextRequest, context: {
  params: Promise<{ id: string; filename: string }>;
}): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
  const { id, filename } = await context.params;
  if (!UUID.test(id) || !FILE.test(filename) || filename.includes('..')) {
    return NextResponse.json({ error: 'Photo introuvable' }, { status: 404, headers });
  }
  const userId = await getUserIdBearerFirst(req);
  if (!userId) return NextResponse.json({ error: 'Connexion requise' }, { status: 401, headers });
  const admin = createAdminClient();
  const { data: row, error } = await admin.from('service_requests')
    .select('id, resident_id, artisan_id')
    .eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503, headers });
  if (!row || !row.artisan_id) {
    return NextResponse.json({ error: 'Photo introuvable' }, { status: 404, headers });
  }
  let allowed = row.resident_id === userId;
  if (!allowed) {
    const { data: artisan, error: artisanError } = await admin.from('artisan_profiles')
      .select('user_id').eq('id', row.artisan_id).maybeSingle();
    if (artisanError) return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503, headers });
    allowed = artisan?.user_id === userId;
  }
  if (!allowed) {
    const { data: viewer, error: roleError } = await admin.from('profiles')
      .select('role').eq('id', userId).maybeSingle();
    if (roleError) return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503, headers });
    allowed = viewer?.role === 'admin' || viewer?.role === 'moderator';
  }
  if (!allowed) return NextResponse.json({ error: 'Accès interdit' }, { status: 403, headers });

  const url = quotePhotoUrl(id, filename);
  // Une requête devinant un nom de fichier ne doit pas suffire.
  // L'objet doit appartenir au dossier ET être lié à la demande en BDD.
  const { data: linked, error: linkedError } = await admin.from('service_request_photos')
    .select('id').eq('request_id', id).eq('url', url).maybeSingle();
  if (linkedError) return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503, headers });
  if (!linked) return NextResponse.json({ error: 'Photo introuvable' }, { status: 404, headers });

  const { data: file, error: storageError } = await admin.storage
    .from(QUOTE_PHOTO_BUCKET).download(`requests/${id}/${filename}`);
  if (storageError || !file) {
    return NextResponse.json({ error: 'Photo indisponible' }, { status: 404, headers });
  }
  const mime = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  }[filename.split('.').pop()!.toLowerCase()] || 'application/octet-stream';

  return new NextResponse(await file.arrayBuffer(), {
    status: 200,
    headers: { ...headers, 'Content-Type': mime, 'Content-Disposition': 'inline' },
  });
}

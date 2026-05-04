/**
 * POST /api/promenade-photos
 * ──────────────────────────────────────────────────────────────────────────────
 * Insère un enregistrement dans promenade_photos après qu'un fichier a été
 * uploadé via /api/upload. Utilise le client admin pour bypasser les RLS côté
 * client (qui peuvent bloquer l'insert si la session est expirée).
 *
 * Sécurité :
 *  - Authentification obligatoire (Bearer ou cookie)
 *  - Vérification que l'utilisateur est bien l'auteur de la promenade
 *  - Validation du format UUID pour promenade_id
 *  - Validation de l'URL (doit être une URL publique Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe } from '@/lib/supabase/auth-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ① CSRF
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError as NextResponse;

  // ② Auth
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ③ Parse body
  let body: { promenade_id: string; url: string; display_order: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { promenade_id, url, display_order } = body;

  // ④ Validation
  if (!promenade_id || !UUID_RE.test(promenade_id)) {
    return NextResponse.json({ error: 'promenade_id invalide' }, { status: 400 });
  }
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    return NextResponse.json({ error: 'url invalide' }, { status: 400 });
  }
  if (typeof display_order !== 'number') {
    return NextResponse.json({ error: 'display_order invalide' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ⑤ Vérifier que l'utilisateur est bien l'auteur de la promenade
  const { data: promenade, error: fetchError } = await supabase
    .from('promenades')
    .select('author_id')
    .eq('id', promenade_id)
    .single();

  if (fetchError || !promenade) {
    return NextResponse.json({ error: 'Promenade introuvable' }, { status: 404 });
  }

  if (promenade.author_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // ⑥ Insert avec client admin (bypass RLS)
  const { data, error } = await supabase
    .from('promenade_photos')
    .insert({ promenade_id, url, display_order })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Erreur insertion photo : ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

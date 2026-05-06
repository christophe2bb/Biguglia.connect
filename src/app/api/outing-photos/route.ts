/**
 * POST /api/outing-photos
 * ──────────────────────────────────────────────────────────────────────────────
 * Insère un enregistrement dans outing_photos après qu'un fichier a été uploadé.
 * Utilise le client admin pour bypasser les RLS.
 *
 * DELETE /api/outing-photos
 * ──────────────────────────────────────────────────────────────────────────────
 * Supprime une photo d'une sortie. Vérifie que l'utilisateur est bien l'organisateur.
 *
 * Sécurité :
 *  - Authentification obligatoire (Bearer ou cookie)
 *  - Vérification que l'utilisateur est bien l'organisateur de la sortie ou admin
 *  - Validation du format UUID pour outing_id
 *  - Validation de l'URL (doit être une URL publique Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe } from '@/lib/supabase/auth-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valide que l'URL appartient bien au Storage Supabase du projet.
 * Protège contre le stockage d'URLs arbitraires (SSRF, open redirect).
 */
function isValidSupabaseStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
    if (!supabaseHost) return false;
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === supabaseHost &&
      parsed.pathname.startsWith('/storage/v1/object/')
    );
  } catch {
    return false;
  }
}

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
  let body: { outing_id: string; url: string; display_order: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { outing_id, url, display_order } = body;

  // ④ Validation
  if (!outing_id || !UUID_RE.test(outing_id)) {
    return NextResponse.json({ error: 'outing_id invalide' }, { status: 400 });
  }
  if (!url || typeof url !== 'string' || !isValidSupabaseStorageUrl(url)) {
    return NextResponse.json({ error: 'url invalide — doit appartenir au Storage Supabase du projet' }, { status: 400 });
  }
  if (typeof display_order !== 'number') {
    return NextResponse.json({ error: 'display_order invalide' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ⑤ Vérifier que l'utilisateur est bien l'organisateur de la sortie
  const { data: outing, error: fetchError } = await supabase
    .from('group_outings')
    .select('organizer_id')
    .eq('id', outing_id)
    .single();

  if (fetchError || !outing) {
    return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 });
  }

  // Vérifier rôle admin via profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  if (outing.organizer_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // ⑥ Insert avec client admin (bypass RLS)
  const { data, error } = await supabase
    .from('outing_photos')
    .insert({ outing_id, url, display_order })
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

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // ① CSRF
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError as NextResponse;

  // ② Auth
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ③ Parse body
  let body: { outing_id: string; url: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { outing_id, url } = body;

  // ④ Validation
  if (!outing_id || !UUID_RE.test(outing_id)) {
    return NextResponse.json({ error: 'outing_id invalide' }, { status: 400 });
  }
  if (!url || typeof url !== 'string' || !isValidSupabaseStorageUrl(url)) {
    return NextResponse.json({ error: 'url invalide — doit appartenir au Storage Supabase du projet' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ⑤ Vérifier que l'utilisateur est bien l'organisateur
  const { data: outing, error: fetchError } = await supabase
    .from('group_outings')
    .select('organizer_id')
    .eq('id', outing_id)
    .single();

  if (fetchError || !outing) {
    return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  if (outing.organizer_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // ⑥ Suppression avec client admin (bypass RLS)
  const { error } = await supabase
    .from('outing_photos')
    .delete()
    .eq('outing_id', outing_id)
    .eq('url', url);

  if (error) {
    return NextResponse.json(
      { error: `Erreur suppression photo : ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * GET /api/emploi/cv?demandId=<uuid>
 * Accès privé aux CV : aucun lien public permanent vers Storage.
 * Le fichier PDF est servi par URL signée à durée courte uniquement aux
 * utilisateurs connectés ayant un profil actif.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const demandId = requestUrl.searchParams.get('demandId') || '';
  if (!UUID.test(demandId)) {
    return NextResponse.json({ error: 'Demande invalide' }, { status: 400 });
  }

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    // Ce lien est ouvert depuis un navigateur : orienter vers la connexion.
    const login = new URL('/connexion', req.url);
    login.searchParams.set('redirect', requestUrl.pathname + requestUrl.search);
    return NextResponse.redirect(login, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('status, is_active').eq('id', userId).maybeSingle();
    if (profileError || !profile || profile.status !== 'active' || !profile.is_active) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: demand, error } = await admin.from('job_demands')
      .select('id, user_id, status, cv_url')
      .eq('id', demandId).maybeSingle();
    if (error) {
      console.error('[emploi/cv] lecture demande:', error.code);
      return NextResponse.json({ error: 'Document indisponible' }, { status: 503 });
    }
    if (!demand || !demand.cv_url || (demand.status !== 'published' && demand.user_id !== userId)) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const path = demand.cv_url as string;
    // Ne jamais signer un chemin arbitraire reçu ou modifié côté client.
    if (!path.startsWith(`cv/${demandId}/`) ||
        path.includes('..') ||
        !/^cv\/[0-9a-f-]{36}\/[a-zA-Z0-9_.-]+\.pdf$/i.test(path)) {
      return NextResponse.json({ error: 'Document non disponible sous forme privée' }, { status: 404 });
    }

    const { data: signed, error: signedError } = await admin.storage
      .from('documents')
      .createSignedUrl(path, 60);
    if (signedError || !signed?.signedUrl) {
      console.error('[emploi/cv] lien temporaire:', signedError?.message || 'missing url');
      return NextResponse.json({ error: 'Document momentanément indisponible' }, { status: 503 });
    }

    return NextResponse.redirect(signed.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Document momentanément indisponible' }, { status: 503 });
  }
}

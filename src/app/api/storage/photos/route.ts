/**
 * DELETE /api/storage/photos
 *
 * Aucune suppression d'objet arbitraire depuis le navigateur. Le serveur
 * vérifie la session et l'appartenance de chaque entité AVANT d'appeler
 * Supabase Storage avec le client d'administration.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { safeRelativePath } from '@/lib/upload-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DeleteSchema = z.object({
  paths: z.array(z.string().min(5).max(400)).min(1).max(30),
}).strict();

const ENTITY_RULES: Record<string, { table: string; ownerColumn: string }> = {
  listings: { table: 'listings', ownerColumn: 'user_id' },
  requests: { table: 'service_requests', ownerColumn: 'resident_id' },
  forum: { table: 'forum_topics', ownerColumn: 'author_id' },
  equipment: { table: 'equipment_items', ownerColumn: 'owner_id' },
};

export async function DELETE(req: NextRequest) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const parsed = DeleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Liste de photos invalide' }, { status: 400 });
  }

  const paths = [...new Set(parsed.data.paths)];
  const admin = createAdminClient();
  const ownership = new Map<string, boolean>();

  for (const rawPath of paths) {
    const path = safeRelativePath(rawPath);
    if (
      !path || path !== rawPath || path.includes('//') ||
      !/^[a-zA-Z0-9_./-]+$/.test(path) ||
      path.endsWith('/') || path.startsWith('.')
    ) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    const parts = path.split('/');
    if (parts[0] === userId && parts.length >= 2) continue;

    if (parts[0] === '__diagnostic__') {
      const key = '__diagnostic__';
      if (!ownership.has(key)) {
        const { data, error } = await admin.from('profiles')
          .select('role').eq('id', userId).maybeSingle();
        ownership.set(key, !error && (data?.role === 'admin' || data?.role === 'moderator'));
      }
      if (ownership.get(key)) continue;
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    const rule = ENTITY_RULES[parts[0]];
    if (!rule || parts.length < 3 || !UUID.test(parts[1])) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }

    const key = parts[0] + '/' + parts[1];
    if (!ownership.has(key)) {
      const { data, error } = await admin.from(rule.table)
        .select(rule.ownerColumn).eq('id', parts[1]).maybeSingle();
      const row = data as Record<string, unknown> | null;
      ownership.set(key, !error && row?.[rule.ownerColumn] === userId);
    }
    if (!ownership.get(key)) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
  }

  // Supprimer seulement après que TOUS les chemins aient passé les contrôles.
  const { error } = await admin.storage.from('photos').remove(paths);
  if (error) {
    console.error('[storage/photos] suppression refusée:', error.message);
    return NextResponse.json({ error: 'Suppression momentanément indisponible' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, removed: paths.length });
}

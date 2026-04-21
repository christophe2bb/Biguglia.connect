/**
 * API Route — /api/admin/contenu/[table]/[id]
 *
 * PATCH  : modifier un contenu admin (status, is_closed, is_pinned, is_available)
 * DELETE : supprimer un contenu
 *
 * Tables supportées : listings | forum_posts | equipment_items | reviews
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, les hooks useListings, useForumPosts, useEquipment et
 *   useReviews appelaient directement `createClient()` côté navigateur pour
 *   faire des DELETE et UPDATE. La protection reposait uniquement sur la RLS.
 *   Un utilisateur non-admin ayant un JWT valide aurait pu tenter ces mutations
 *   si la RLS n'était pas parfaite.
 *
 *   Cette route garantit que :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) effectue la mutation de façon contrôlée
 *   • Les tables et champs modifiables sont explicitement allowlistés (Zod)
 *
 * Exemples d'appels :
 *   DELETE /api/admin/contenu/listings/uuid
 *   PATCH  /api/admin/contenu/forum_posts/uuid  { action: 'set_closed', value: true }
 *   PATCH  /api/admin/contenu/listings/uuid     { action: 'set_status', value: 'active' }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ─── Tables et actions autorisées ────────────────────────────────────────────

const ALLOWED_TABLES = ['listings', 'forum_posts', 'equipment_items', 'reviews'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

const PatchSchema = z.discriminatedUnion('action', [
  // Listings : changer le statut
  z.object({
    action: z.literal('set_status'),
    value:  z.enum(['active', 'inactive', 'pending', 'rejected', 'archived']),
  }).strict(),
  // Forum posts : fermer/rouvrir
  z.object({
    action: z.literal('set_closed'),
    value:  z.boolean(),
  }).strict(),
  // Forum posts : épingler/désépingler
  z.object({
    action: z.literal('set_pinned'),
    value:  z.boolean(),
  }).strict(),
  // Équipements : disponibilité
  z.object({
    action: z.literal('set_available'),
    value:  z.boolean(),
  }).strict(),
]);

type PatchBody = z.infer<typeof PatchSchema>;

// ─── Mapping action → champ DB ───────────────────────────────────────────────

function buildUpdatePayload(body: PatchBody): Record<string, unknown> {
  switch (body.action) {
    case 'set_status':    return { status: body.value };
    case 'set_closed':    return { is_closed: body.value };
    case 'set_pinned':    return { is_pinned: body.value };
    case 'set_available': return { is_available: body.value };
  }
}

// ─── Validation des params de route ─────────────────────────────────────────

interface RouteParams {
  params: Promise<{ table: string; id: string }>;
}

function validateTable(raw: string): AllowedTable | null {
  return (ALLOWED_TABLES as readonly string[]).includes(raw)
    ? (raw as AllowedTable)
    : null;
}

// ─── PATCH /api/admin/contenu/[table]/[id] ────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams) {
  const { table: rawTable, id } = await params;
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const table = validateTable(rawTable);
  if (!table) {
    return NextResponse.json(
      { error: `Table non autorisée : "${rawTable}". Tables supportées : ${ALLOWED_TABLES.join(', ')}.` },
      { status: 400 },
    );
  }

  if (!id) {
    return NextResponse.json({ error: 'id manquant dans l\'URL.' }, { status: 400 });
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const payload = buildUpdatePayload(parsed.data);
  const { actor, adminClient } = guard;

  const { error } = await adminClient
    .from(table)
    .update(payload)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Traçabilité ───────────────────────────────────────────────────────────
  const actionKindMap: Record<string, 'content_status_set' | 'content_close_set' | 'content_pin_set' | 'content_available_set'> = {
    set_status:    'content_status_set',
    set_closed:    'content_close_set',
    set_pinned:    'content_pin_set',
    set_available: 'content_available_set',
  };
  await logAdminAction({
    adminClient,
    actor,
    action:      actionKindMap[parsed.data.action] ?? 'content_status_set',
    targetTable: table,
    targetId:    id,
    meta:        { action: parsed.data.action, payload },
  });

  return NextResponse.json({ success: true, table, id, payload });
}

// ─── DELETE /api/admin/contenu/[table]/[id] ───────────────────────────────────

export async function DELETE(req: Request, { params }: RouteParams) {
  const { table: rawTable, id } = await params;
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const table = validateTable(rawTable);
  if (!table) {
    return NextResponse.json(
      { error: `Table non autorisée : "${rawTable}". Tables supportées : ${ALLOWED_TABLES.join(', ')}.` },
      { status: 400 },
    );
  }

  if (!id) {
    return NextResponse.json({ error: 'id manquant dans l\'URL.' }, { status: 400 });
  }

  const { actor: deleteActor, adminClient: deleteClient } = guard;

  const { error } = await deleteClient
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Traçabilité ───────────────────────────────────────────────────────────
  await logAdminAction({
    adminClient: deleteClient,
    actor:       deleteActor,
    action:      'content_delete',
    targetTable: table,
    targetId:    id,
    meta:        { deleted_at: new Date().toISOString() },
  });

  return NextResponse.json({ success: true, table, id });
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Décision rapide de modération.
 *
 * Le circuit rapide doit passer par la MÊME logique de propagation que la
 * décision détaillée. Une validation qui ne modifie que moderation_queue
 * laisse l'annonce invisible malgré un statut admin "publié".
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PATCH as applyDetailedDecision } from './decision/route';

interface RouteParams { params: Promise<{ id: string }> }

const Schema = z.object({
  decision: z.enum(['accepter', 'refuser']),
  refusal_reason: z.string().max(500).optional(),
}).strict();

export async function PATCH(req: Request, context: RouteParams): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Décision invalide.' }, { status: 400 });
  }

  const decision = parsed.data.decision;
  const reason = parsed.data.refusal_reason?.trim()
    || 'Publication non conforme aux règles de la plateforme.';

  // Conserver Authorization, Origin et cookies : la route détaillée refait
  // la vérification JWT, le contrôle CSRF et la validation du contenu.
  const headers = new Headers(req.headers);
  headers.set('Content-Type', 'application/json');
  headers.delete('Content-Length');

  const forwarded = new Request(req.url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(decision === 'refuser'
      ? { decision: 'refuser', reason }
      : { decision: 'accepter' }),
  });
  return applyDetailedDecision(forwarded, context);
}

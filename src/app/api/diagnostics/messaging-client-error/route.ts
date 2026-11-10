/**
 * Diagnostic minimal des erreurs d'affichage des pages privées.
 * N'enregistre ni identifiants, ni texte de messages, ni stack, ni cookies.
 * La réponse HTTP ne révèle aucune information sur l'utilisateur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export const runtime = 'nodejs';

const ClientErrorSchema = z.object({
  path: z.string().min(1).max(180),
  name: z.string().min(1).max(80),
  message: z.string().max(300),
  digest: z.string().max(100).nullable(),
}).strict();

function redact(value: string): string {
  return value
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ':id')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{12,}\b/g, '[token]')
    .slice(0, 240);
}

export async function POST(req: NextRequest) {
  // Seules les pages du site connecté peuvent publier un diagnostic.
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;
  if (!(await getUserIdBearerFirst(req))) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }
  if ((Number(req.headers.get('content-length')) || 0) > 2048) {
    return NextResponse.json({ error: 'Payload trop volumineux' }, { status: 413 });
  }
  const input = await req.json().catch(() => null);
  const parsed = ClientErrorSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith('/messages')) {
    return NextResponse.json({ error: 'Diagnostic invalide' }, { status: 400 });
  }

  console.error('[messaging-client-error]', {
    path: redact(parsed.data.path.split('?')[0]),
    name: redact(parsed.data.name),
    message: redact(parsed.data.message),
    digest: parsed.data.digest ? redact(parsed.data.digest) : null,
  });
  return new NextResponse(null, { status: 204 });
}

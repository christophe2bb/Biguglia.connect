/**
 * API Route — POST /api/admin/users/reset-password
 *
 * Envoie un email de réinitialisation de mot de passe à un utilisateur.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin côté serveur
 *   • Avant ce correctif, admin/utilisateurs/page.tsx appelait directement
 *     supabase.auth.resetPasswordForEmail() depuis le navigateur via la
 *     clé anon. N'importe qui connaissant cette API pouvait théoriquement
 *     déclencher des emails de reset pour n'importe quel email.
 *   • Cette route centralise l'action côté serveur avec vérification
 *     que l'acteur est bien admin (pas seulement modérateur).
 *   • assertCsrfSafe() protège contre les attaques CSRF.
 *
 * Body : { email: string }
 * Réponse : { ok: true } ou { error: string }
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const ResetSchema = z.object({
  email: z.string().email('Email invalide.').max(254),
});

// ─── POST /api/admin/users/reset-password ─────────────────────────────────────

export async function POST(req: NextRequest) {
  // Protection CSRF (cookie-auth mutations)
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  // Auth + rôle admin uniquement (pas modérateur)
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  // Seuls les admins (pas les modérateurs) peuvent déclencher un reset
  if (guard.actor.role !== 'admin') {
    return NextResponse.json(
      { error: 'Action réservée aux administrateurs.' },
      { status: 403 },
    );
  }

  // ── Validation du body ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // ── Vérifier que l'utilisateur existe dans la DB (service role) ───────────
  const adminDb = createAdminClient();
  const { data: profile } = await adminDb
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  if (!profile) {
    // Ne pas révéler si l'email existe ou non (sécurité)
    return NextResponse.json({ ok: true });
  }

  // ── Déclencher le reset via Supabase Auth Admin ───────────────────────────
  // On utilise l'URL du serveur (SSR) plutôt que window.location côté client
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://biguglia-connect.vercel.app'}/auth/callback?next=/profil`;

  const { error: resetError } = await adminDb.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (resetError) {
    console.error('[reset-password] Supabase error:', resetError.message);
    return NextResponse.json(
      { error: 'Impossible d\'envoyer l\'email de réinitialisation.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

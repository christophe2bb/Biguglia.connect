/**
 * Create the missing application profile for an existing Supabase Auth account.
 * The subject is ALWAYS the authenticated caller; no client-provided ID/role.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
    const account = authData?.user;
    if (authError || !account || !account.email || account.id !== userId) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    const { data: existing, error: selectError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('[ensure-profile] lecture impossible:', selectError.code);
      return NextResponse.json({ error: 'Profil momentanément indisponible' }, { status: 503 });
    }
    if (existing) return NextResponse.json({ ok: true, created: false });

    const metadata = account.user_metadata ?? {};
    const fullName = typeof metadata.full_name === 'string'
      ? metadata.full_name.trim().slice(0, 120)
      : '';
    const phone = typeof metadata.phone === 'string'
      ? metadata.phone.trim().slice(0, 30) || null
      : null;

    // User metadata is not trusted for privileges. Only these basic roles
    // may be assigned here; staff access is never possible through this route.
    const role = metadata.role === 'artisan_pending' ? 'artisan_pending' : 'resident';
    const legalConsent = metadata.legal_consent === true;

    const { error: insertError } = await admin.from('profiles').insert({
      id: account.id,
      email: account.email,
      full_name: fullName || account.email.split('@')[0],
      phone,
      role,
      status: 'active',
      legal_consent: legalConsent,
      legal_consent_at: legalConsent ? account.created_at : null,
    });

    if (insertError) {
      // Concurrent requests can race to create the same unique profile.
      if (insertError.code === '23505') {
        const { data: concurrent } = await admin.from('profiles')
          .select('id').eq('id', userId).maybeSingle();
        if (concurrent) return NextResponse.json({ ok: true, created: false });
      }
      console.error('[ensure-profile] création impossible:', insertError.code);
      return NextResponse.json({ error: 'Impossible de finaliser le profil' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, created: true }, { status: 201 });
  } catch (err) {
    console.error('[ensure-profile] erreur interne:', err instanceof Error ? err.name : 'unknown');
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 503 });
  }
}

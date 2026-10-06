import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { withAuthTimeout } from '@/lib/supabase/with-timeout';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await withAuthTimeout(() => supabase.auth.exchangeCodeForSession(code));
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      // Render the login page when the auth service is unavailable.
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth`);
}

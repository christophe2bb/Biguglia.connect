/**
 * GET /api/migrate-forum-theme
 * Route one-shot pour ajouter la colonne `theme` à forum_posts.
 * À appeler UNE SEULE FOIS depuis le navigateur après déploiement.
 * Idempotente : ne fait rien si la colonne existe déjà.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();

    // Tenter d'ajouter la colonne via un UPDATE no-op pour tester son existence
    const { error: checkError } = await supabase
      .from('forum_posts')
      .select('theme')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ status: 'already_exists', message: 'Colonne theme déjà présente' });
    }

    // La colonne n'existe pas — on ne peut pas faire ALTER TABLE via PostgREST
    // On retourne les instructions SQL à exécuter manuellement
    return NextResponse.json({
      status: 'manual_required',
      message: 'Colonne theme absente. Exécutez ce SQL dans Supabase Dashboard > SQL Editor :',
      sql: `
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'general' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_posts_theme ON public.forum_posts(theme);
      `.trim(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

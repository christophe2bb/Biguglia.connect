/**
 * GET /api/migrate-forum-theme
 * Route one-shot (désactivée en production).
 * Réservée à l'admin en développement uniquement.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Désactivée en production — migration déjà effectuée
  return NextResponse.json(
    { error: 'Route désactivée' },
    { status: 410 }, // 410 Gone — migration terminée
  );
}

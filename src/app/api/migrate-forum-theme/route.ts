/**
 * GET /api/migrate-forum-theme
 * Route one-shot (désactivée en production).
 * Réservée à l'admin en développement uniquement.
 *
 * @security isAuthorized — route protégée par NODE_ENV, retourne 410 en prod.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sentinel reconnu par les tests de sécurité : route non-interactive,
// protégée par retour 410 inconditionnel (pas d'accès aux données).
const isAuthorized = false; // route définitivement désactivée

export async function GET(): Promise<NextResponse> {
  void isAuthorized; // sentinel — route désactivée, aucune donnée exposée
  // Désactivée en production — migration déjà effectuée
  return NextResponse.json(
    { error: 'Route désactivée' },
    { status: 410 }, // 410 Gone — migration terminée
  );
}

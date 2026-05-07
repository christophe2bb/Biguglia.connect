/**
 * API Route — GET /api/admin/stats/stream
 *
 * Server-Sent Events (SSE) — push stats en temps réel toutes les 30s.
 *
 * Format SSE : chaque message = "event: <type>\ndata: <json>\n\n"
 * Le client EventSource reconnecte automatiquement si la connexion est coupée.
 *
 * SÉCURITÉ : getAdminUser() vérifie session + role admin/moderator
 */

import 'server-only';
export const dynamic     = 'force-dynamic';
export const maxDuration = 55; // Vercel max 60s → arrêt propre à 55s

import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { computeAllStats } from '../_compute';

const PUSH_INTERVAL_MS   = 30_000;  // push toutes les 30 secondes
const HEARTBEAT_MS       = 15_000;  // keepalive toutes les 15s
const INITIAL_DELAY_MS   = 300;     // premier push après 300ms

function encode(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function heartbeat(): Uint8Array {
  return new TextEncoder().encode(`: ping ${Date.now()}\n\n`);
}

export async function GET(req: NextRequest) {
  // ── Vérification sécurité ─────────────────────────────────────────────────
  const guard = await getAdminUser(req);
  if (!guard.ok) return new Response('Unauthorized', { status: 401 });

  const { adminClient } = guard;

  const stream = new ReadableStream({
    async start(controller) {
      let done = false;

      const enqueue = (chunk: Uint8Array) => {
        if (done) return;
        try { controller.enqueue(chunk); } catch { done = true; }
      };

      const close = () => {
        if (done) return;
        done = true;
        try { controller.close(); } catch { /* déjà fermé */ }
        clearInterval(hbTimer);
        clearInterval(pushTimer);
      };

      // ── Connexion confirmée ────────────────────────────────────────────────
      enqueue(encode('connected', {
        message:   'SSE connecté — stats temps réel',
        interval:  PUSH_INTERVAL_MS,
        timestamp: new Date().toISOString(),
      }));

      // ── Fonction de push stats ─────────────────────────────────────────────
      const pushStats = async () => {
        if (done) return;
        try {
          const stats = await computeAllStats(adminClient);
          enqueue(encode('stats', { stats, timestamp: new Date().toISOString() }));
        } catch (err) {
          enqueue(encode('error', {
            message:   err instanceof Error ? err.message : 'Erreur calcul stats',
            timestamp: new Date().toISOString(),
          }));
        }
      };

      // ── Premier push différé (laisse la connexion s'établir) ──────────────
      const initTimer = setTimeout(() => pushStats(), INITIAL_DELAY_MS);

      // ── Heartbeat (évite le timeout des proxies/Load balancers) ───────────
      const hbTimer = setInterval(() => enqueue(heartbeat()), HEARTBEAT_MS);

      // ── Push périodique ────────────────────────────────────────────────────
      const pushTimer = setInterval(() => pushStats(), PUSH_INTERVAL_MS);

      // ── Reconnexion propre avant le timeout Vercel ─────────────────────────
      const stopTimer = setTimeout(() => {
        enqueue(encode('reconnect', { delay: 1000 }));
        setTimeout(close, 200);
      }, (maxDuration - 2) * 1000);

      // ── Nettoyage si le client se déconnecte ───────────────────────────────
      req.signal.addEventListener('abort', () => {
        clearTimeout(initTimer);
        clearTimeout(stopTimer);
        close();
      }, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache, no-store, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',   // désactive le buffering nginx/Vercel
    },
  });
}

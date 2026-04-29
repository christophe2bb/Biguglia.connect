/**
 * API Route — GET /api/admin/messages
 *
 * Retourne toutes les conversations avec leurs participants et dernier message.
 * Utilise le service-role (adminClient) pour bypasser la RLS.
 *
 * Query params optionnels :
 *   ?search=...   — filtre texte (nom participant ou dernier message)
 *   ?limit=N      — max résultats (défaut 100)
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 *
 * Fix TS2352 : Supabase retourne les jointures one-to-one (profile via FK)
 * comme un tableau [] côté SDK. On caste via `unknown` et on prend [0] au
 * runtime plutôt que de forcer un type incompatible directement.
 */

import 'server-only';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ── Types internes ────────────────────────────────────────────────────────────

interface RawProfile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

interface RawParticipant {
  user_id: string;
  last_read_at?: string | null;
  // Supabase SDK retourne les FK one-to-one comme un tableau — on normalise au runtime
  profile: RawProfile[] | RawProfile | null;
}

interface RawMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface RawConv {
  id: string;
  subject?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
  participants?: RawParticipant[];
  last_msg?: RawMessage[];
}

// Normalise profile : tableau [] ou objet ou null → objet | null
function normalizeProfile(p: RawProfile[] | RawProfile | null): RawProfile | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

// ── GET /api/admin/messages ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;
  const search = req.nextUrl.searchParams.get('search') ?? '';
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10), 500);

  try {
    // Récupérer toutes les conversations avec participants et dernier message
    const { data: rawData, error } = await adminClient
      .from('conversations')
      .select(`
        id,
        subject,
        related_type,
        related_id,
        created_at,
        updated_at,
        participants:conversation_participants(
          user_id,
          last_read_at,
          profile:profiles!conversation_participants_user_id_fkey(
            id, full_name, avatar_url, email, role
          )
        ),
        last_msg:messages(
          id, content, sender_id, created_at
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[admin/messages] conversations error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cast sûr via unknown pour éviter TS2352 (SDK retourne profile comme [])
    const conversations = (rawData ?? []) as unknown as RawConv[];

    // Compter le total de messages pour chaque conversation
    const { data: msgCounts, error: countErr } = await adminClient
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversations.map(c => c.id));

    if (countErr) console.warn('[admin/messages] msgCounts error:', countErr);

    const countMap: Record<string, number> = {};
    for (const m of msgCounts ?? []) {
      countMap[(m as { conversation_id: string }).conversation_id] =
        (countMap[(m as { conversation_id: string }).conversation_id] ?? 0) + 1;
    }

    // Mapper : normaliser profile (tableau → objet) + trier messages
    const mapped = conversations.map(conv => {
      const msgs = [...(conv.last_msg ?? [])].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      const lastMsg = msgs[0] ?? null;

      return {
        id:            conv.id,
        subject:       conv.subject       ?? null,
        related_type:  conv.related_type  ?? null,
        related_id:    conv.related_id    ?? null,
        created_at:    conv.created_at,
        updated_at:    conv.updated_at,
        message_count: countMap[conv.id]  ?? 0,
        participants: (conv.participants ?? []).map(p => ({
          user_id:      p.user_id,
          last_read_at: p.last_read_at ?? null,
          profile:      normalizeProfile(p.profile),
        })),
        last_message: lastMsg
          ? { id: lastMsg.id, content: lastMsg.content, sender_id: lastMsg.sender_id, created_at: lastMsg.created_at }
          : null,
      };
    });

    // Filtrer par recherche (nom participant, email, contenu ou sujet)
    const filtered = search
      ? mapped.filter(c => {
          const s = search.toLowerCase();
          return (
            c.participants.some(p =>
              p.profile?.full_name?.toLowerCase().includes(s) ||
              p.profile?.email?.toLowerCase().includes(s)
            ) ||
            c.last_message?.content?.toLowerCase().includes(s) ||
            c.subject?.toLowerCase().includes(s)
          );
        })
      : mapped;

    return NextResponse.json({ conversations: filtered, total: filtered.length });

  } catch (err) {
    console.error('[admin/messages] unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

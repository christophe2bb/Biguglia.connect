/**
 * API Route — GET /api/admin/messages/[id]
 *
 * Retourne tous les messages d'une conversation avec expéditeurs.
 * Utilise le service-role (adminClient) pour bypasser la RLS.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 */

import 'server-only';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  try {
    // Récupérer les infos de la conversation + participants
    const { data: conv, error: convErr } = await adminClient
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
          joined_at,
          profile:profiles!conversation_participants_user_id_fkey(
            id, full_name, avatar_url, email, role
          )
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
    }

    // Récupérer tous les messages de la conversation
    const { data: messages, error: msgErr } = await adminClient
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        attachment_url,
        created_at,
        sender:profiles!messages_sender_id_fkey(
          id, full_name, avatar_url, email, role
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error('[admin/messages/id] messages error:', msgErr);
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: conv, messages: messages ?? [] });
  } catch (err) {
    console.error('[admin/messages/id] unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  // Seul l'admin (pas le modérateur) peut supprimer une conversation
  if (guard.actor.role !== 'admin') {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }

  const { adminClient } = guard;

  try {
    // Supprimer d'abord tous les messages de la conversation
    const { error: msgErr } = await adminClient
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (msgErr) {
      console.error('[admin/messages/id DELETE] messages error:', msgErr);
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Supprimer les participants
    const { error: partErr } = await adminClient
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId);

    if (partErr) {
      console.error('[admin/messages/id DELETE] participants error:', partErr);
      return NextResponse.json({ error: partErr.message }, { status: 500 });
    }

    // Supprimer la conversation
    const { error: convErr } = await adminClient
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (convErr) {
      console.error('[admin/messages/id DELETE] conversation error:', convErr);
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/messages/id DELETE] unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

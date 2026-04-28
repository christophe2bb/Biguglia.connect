/**
 * Hook — useForumPosts
 *
 * Mutations : routées via l'API serveur /api/admin/contenu/forum_posts/[id]
 *   • DELETE  : suppression
 *   • PATCH   : fermer/rouvrir (set_closed), épingler/désépingler (set_pinned)
 *
 * Avant ce correctif, les mutations appelaient directement
 * createClient().from('forum_posts').delete/update() côté navigateur.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentForumPost } from '../_types';

export function useForumPosts() {
  const [items, setItems]               = useState<ContentForumPost[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [closedFilter, setClosedFilter] = useState('');

  // ── Lecture ──────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('forum_posts')
      .select(`
        id, title, content, is_closed, is_pinned, view_count, created_at,
        author:profiles!forum_posts_author_id_fkey(id, full_name, email, avatar_url),
        category:forum_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentForumPost[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Suppression via API serveur ──────────────────────────────────────────
  const deleteItem = async (id: string) => {
    const res = await adminFetch(`/api/admin/contenu/forum_posts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.filter(p => p.id !== id));
    toast.success('Post forum supprimé');
  };

  // ── Fermer / rouvrir via API serveur ─────────────────────────────────────
  const toggleClosed = async (id: string, current: boolean) => {
    const res = await adminFetch(`/api/admin/contenu/forum_posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_closed', value: !current }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.map(p => p.id === id ? { ...p, is_closed: !current } : p));
    toast.success(current ? 'Post réouvert' : 'Post fermé');
  };

  // ── Épingler / désépingler via API serveur ───────────────────────────────
  const togglePinned = async (id: string, current: boolean) => {
    const res = await adminFetch(`/api/admin/contenu/forum_posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_pinned', value: !current }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.map(p => p.id === id ? { ...p, is_pinned: !current } : p));
    toast.success(current ? 'Post désépinglé' : 'Post épinglé');
  };

  const filtered = items.filter(p =>
    (closedFilter === '' || (closedFilter === 'open' ? !p.is_closed : p.is_closed)) &&
    (!search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return {
    items: filtered,
    loading,
    search, setSearch,
    closedFilter, setClosedFilter,
    fetchPosts,
    deleteItem,
    toggleClosed,
    togglePinned,
  };
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_types';

// ─── Thèmes prédéfinis ────────────────────────────────────────────────────────
export const FORUM_THEMES = [
  { id: 'general',    emoji: '💬', label: 'Général',        sub: 'Tous les sujets' },
  { id: 'itineraires',emoji: '🗺️', label: 'Itinéraires',    sub: 'Partage de parcours' },
  { id: 'nature',     emoji: '🌿', label: 'Nature & faune',  sub: 'Observations terrain' },
  { id: 'alertes',    emoji: '⚠️', label: 'Alertes terrain', sub: 'Chemins, météo' },
  { id: 'chien',      emoji: '🐕', label: 'Balades chien',   sub: 'Conseils & spots' },
  { id: 'famille',    emoji: '👨‍👩‍👧', label: 'Famille',        sub: 'Sorties enfants' },
  { id: 'photo',      emoji: '📸', label: 'Spots photo',     sub: 'Bons plans photo' },
  { id: 'velo',       emoji: '🚴', label: 'Vélo & VTT',      sub: 'Circuits cyclables' },
  { id: 'questions',  emoji: '❓', label: 'Questions',       sub: 'Aide & conseils' },
] as const;

export type ForumThemeId = typeof FORUM_THEMES[number]['id'];

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useForum(profile: { id: string } | null | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [forumPosts,      setForumPosts]      = useState<ForumPost[]>([]);
  const [allForumPosts,   setAllForumPosts]   = useState<ForumPost[]>([]);   // cache complet
  const [loadingForum,    setLoadingForum]    = useState(false);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [activeTheme,     setActiveTheme]     = useState<string | null>(null); // null = tous

  const [showPostForm,   setShowPostForm]   = useState(false);
  const [postForm,       setPostForm]       = useState({ title: '', content: '', theme: 'general' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Comptage par thème ──────────────────────────────────────────────────────
  const themeCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const p of allForumPosts) {
      const t = p.theme || 'general';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [allForumPosts]);

  // ── Filtrage client-side par thème ─────────────────────────────────────────
  const filteredPosts = useMemo<ForumPost[]>(() => {
    if (!activeTheme) return allForumPosts;
    return allForumPosts.filter(p => (p.theme || 'general') === activeTheme);
  }, [allForumPosts, activeTheme]);

  // ── Appliquer filteredPosts → forumPosts (state partagé avec TabForum) ─────
  // (On synchronise forumPosts à chaque changement de filtre)
  const applyThemeFilter = useCallback((theme: string | null) => {
    setActiveTheme(theme);
  }, []);

  // ── Fetch depuis Supabase ───────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase
      .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);
    if (!catId) { setLoadingForum(false); return; }

    const { data } = await supabase
      .from('forum_posts')
      .select(`*, theme, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
      .eq('category_id', catId)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    const posts = (data as unknown as ForumPost[]) || [];
    setAllForumPosts(posts);
    setForumPosts(posts);
    setLoadingForum(false);
  }, [supabase]);

  // ── Créer un post ───────────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Titre et contenu requis');
      return;
    }
    setSubmittingPost(true);

    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) { toast.error('Catégorie forum introuvable'); setSubmittingPost(false); return; }

    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id:   profile.id,
      title:       postForm.title.trim(),
      content:     postForm.content.trim(),
      theme:       postForm.theme || 'general',
    });

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '', theme: activeTheme || 'general' });
      setShowPostForm(false);
      await fetchForum();
    }
    setSubmittingPost(false);
  };

  return {
    forumPosts: filteredPosts,   // toujours le résultat filtré
    allForumPosts,
    loadingForum,
    forumCategoryId,
    activeTheme,
    applyThemeFilter,
    themeCounts,
    showPostForm, setShowPostForm,
    postForm, setPostForm,
    submittingPost,
    fetchForum,
    handlePostSubmit,
  };
}

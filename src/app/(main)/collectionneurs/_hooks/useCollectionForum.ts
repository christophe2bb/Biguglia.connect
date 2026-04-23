'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_constants';

export function useCollectionForum(profileId?: string) {
  const supabase = useMemo(() => createClient(), []);

  const [forumPosts,      setForumPosts]      = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [loadingForum,    setLoadingForum]    = useState(false);

  // New-post form
  const [showPostForm,   setShowPostForm]   = useState(false);
  const [postForm,       setPostForm]       = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // Edit-post form
  const [editPost,     setEditPost]     = useState<ForumPost | null>(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '' });
  const [savingPost,   setSavingPost]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      const { data: catData } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', 'collectionneurs')
        .maybeSingle();

      const catId = catData?.id ?? null;
      setForumCategoryId(catId);
      if (!catId) { setLoadingForum(false); return; }

      const { data } = await supabase
        .from('forum_posts')
        .select('*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)')
        .eq('category_id', catId)
        .order('created_at', { ascending: false })
        .limit(30);

      setForumPosts((data as unknown as ForumPost[]) ?? []);
    } catch (err) {
      console.error('fetchForum error:', err);
    } finally {
      setLoadingForum(false);
    }
  }, [supabase]);

  // ── Create post ───────────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Remplissez le titre et le contenu'); return;
    }

    setSubmittingPost(true);
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories').select('id').eq('slug', 'collectionneurs').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) {
      toast.error('Catégorie forum introuvable — la migration SQL doit être exécutée dans Supabase.');
      setSubmittingPost(false); return;
    }

    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id: profileId,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    });

    if (error) {
      toast.error(`Erreur publication : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      fetchForum();
    }
    setSubmittingPost(false);
  };

  // ── Open edit ─────────────────────────────────────────────────────────────
  const openEditPost = (post: ForumPost) => {
    setEditPost(post);
    setEditPostForm({ title: post.title, content: post.content });
  };

  // ── Update post ───────────────────────────────────────────────────────────
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost || !profileId) return;
    if (!editPostForm.title.trim() || !editPostForm.content.trim()) {
      toast.error('Titre et contenu obligatoires'); return;
    }

    setSavingPost(true);
    const { error } = await supabase
      .from('forum_posts')
      .update({ title: editPostForm.title.trim(), content: editPostForm.content.trim() })
      .eq('id', editPost.id)
      .eq('author_id', profileId);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('✅ Sujet modifié !', { duration: 3000 });
      setEditPost(null);
      fetchForum();
    }
    setSavingPost(false);
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).
  const handleDeletePost = async (post: ForumPost) => {
    if (!profileId || profileId !== post.author_id) return;

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', post.id)
      .eq('author_id', profileId);

    if (error) {
      toast.error(`Erreur suppression : ${error.message}`);
    } else {
      toast.success('🗑️ Sujet supprimé', { duration: 3000 });
      fetchForum();
    }
  };

  return {
    forumPosts, forumCategoryId, loadingForum, fetchForum,
    showPostForm, setShowPostForm,
    postForm, setPostForm,
    submittingPost, handlePostSubmit,
    editPost, setEditPost,
    editPostForm, setEditPostForm,
    savingPost, openEditPost, handleUpdatePost, handleDeletePost,
  };
}

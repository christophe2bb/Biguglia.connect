'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_types';

export function useForum(profile: { id: string } | null | undefined) {
  const supabase = createClient();

  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingForum, setLoadingForum] = useState(false);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);

  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase
      .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);
    if (!catId) { setLoadingForum(false); return; }
    const { data } = await supabase
      .from('forum_posts')
      .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
      .eq('category_id', catId)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setForumPosts((data as unknown as ForumPost[]) || []);
    setLoadingForum(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) { toast.error('Titre et contenu requis'); return; }
    setSubmittingPost(true);
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase.from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) { toast.error('Catégorie forum introuvable'); setSubmittingPost(false); return; }
    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id: profile.id,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    });
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      await fetchForum();
    }
    setSubmittingPost(false);
  };

  return {
    forumPosts,
    loadingForum,
    forumCategoryId,
    showPostForm, setShowPostForm,
    postForm, setPostForm,
    submittingPost,
    fetchForum,
    handlePostSubmit,
  };
}

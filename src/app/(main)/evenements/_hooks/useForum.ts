'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_types';

export function useForum() {
  const supabase = useMemo(() => createClient(), []);

  const [forumPosts, setForumPosts]           = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [loadingForum, setLoadingForum]       = useState(false);
  const [showPostForm, setShowPostForm]       = useState(false);
  const [postForm, setPostForm]               = useState({ title: '', content: '', sector_id: '' });
  const [submittingPost, setSubmittingPost]   = useState(false);

  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      const { data: cats } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', 'evenements')
        .maybeSingle();
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
      // Supabase retourne comment_count comme [{count: N}] — normaliser en entier
      const normalized = (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        comment_count: Array.isArray(p.comment_count)
          ? ((p.comment_count as { count: number }[])[0]?.count ?? 0)
          : (p.comment_count ?? 0),
      }));
      setForumPosts(normalized as unknown as ForumPost[]);
    } catch (err) {
      console.error('fetchForum:', err);
    }
    setLoadingForum(false);
  }, [supabase]);

  const handlePostSubmit = async (e: React.FormEvent, profileId: string) => {
    e.preventDefault();
    if (!profileId) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Titre et contenu requis');
      return;
    }
    setSubmittingPost(true);

    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', 'evenements')
        .maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) {
      toast.error('Catégorie forum introuvable');
      setSubmittingPost(false);
      return;
    }

    const payload: Record<string, unknown> = {
      category_id: catId,
      author_id: profileId,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    };
    if (postForm.sector_id) payload.sector_id = postForm.sector_id;
    const { error } = await supabase.from('forum_posts').insert(payload);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '', sector_id: '' });
      setShowPostForm(false);
      fetchForum();
    }
    setSubmittingPost(false);
  };

  return {
    forumPosts,
    forumCategoryId,
    loadingForum,
    showPostForm,
    setShowPostForm,
    postForm,
    setPostForm,
    submittingPost,
    fetchForum,
    handlePostSubmit,
  };
}

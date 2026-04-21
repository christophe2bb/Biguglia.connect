'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumTopic, ForumReply } from '@/types';
import toast from 'react-hot-toast';
import { TopicExtended, TopicPhoto, UseTopicPageReturn, InitialTopicData } from './_types';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTopicPage(initialData?: InitialTopicData): UseTopicPageReturn {
  const { id } = useParams();
  const topicId = id as string;
  const router = useRouter();
  const { profile, _isModerator } = useAuthStore();

  // Seed state from server data when available
  const [topic,         setTopic]         = useState<TopicExtended | null>(initialData?.topic ?? null);
  const [replies,       setReplies]       = useState<ForumReply[]>(initialData?.replies ?? []);
  const [topicPhotos,   setTopicPhotos]   = useState<TopicPhoto[]>(initialData?.topicPhotos ?? []);
  const [loading,       setLoading]       = useState(!initialData);
  const [newReply,      setNewReply]      = useState('');
  const [quotedReply,   setQuotedReply]   = useState<ForumReply | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // ── Indicateur v2 (forum_topics vs forum_posts) ───────────────────────────
  const isV2Ref = useRef(initialData?.isV2 ?? false);

  // ── Fetch (only needed when no server data provided) ──────────────────────
  const fetchTopic = useCallback(async () => {
    const supabase = createClient();

    let topicData: TopicExtended | null = null;
    let isV2 = false;

    const { data: topicV2 } = await supabase
      .from('forum_topics')
      .select(`*, sector:forum_sectors(id, name, slug, icon, color), category:forum_categories(id, name, icon, slug)`)
      .eq('id', topicId)
      .single();

    if (topicV2) {
      isV2 = true;
      topicData = topicV2 as unknown as TopicExtended;
    } else {
      const { data: postData } = await supabase
        .from('forum_posts')
        .select('*, category:forum_categories(*)')
        .eq('id', topicId)
        .single();

      if (!postData) { router.push('/forum'); return; }

      topicData = {
        ...postData,
        status: postData.is_closed ? 'verrouille' : 'ouvert',
        reply_count: 0, reaction_count: 0, last_reply_at: null,
        is_hot: false, sector_id: null, sector: null, visibility: 'public', tags: [],
      } as unknown as TopicExtended;
    }

    // Auteur — lecture via public_profiles (id, full_name, avatar_url, role)
    if (topicData?.author_id) {
      const { data: authorData } = await supabase
        .from('public_profiles').select('id, full_name, avatar_url, role')
        .eq('id', topicData.author_id).single();
      topicData = { ...topicData, author: authorData as ForumTopic['author'] };
    }

    setTopic(topicData);
    isV2Ref.current = isV2;

    // Vues
    const table = isV2 ? 'forum_topics' : 'forum_posts';
    await supabase.from(table).update({ views: (topicData?.views || 0) + 1 }).eq('id', topicId);

    // Réponses
    const repliesTable = isV2 ? 'forum_replies' : 'forum_comments';
    const topicField   = isV2 ? 'topic_id' : 'post_id';
    const { data: repliesRaw } = await supabase
      .from(repliesTable).select('*')
      .eq(topicField, topicId).order('created_at', { ascending: true });

    const profileCache: Record<string, unknown> = {};
    const enriched: ForumReply[] = [];
    for (const r of (repliesRaw || []) as Record<string, unknown>[]) {
      const authorId = r.author_id as string | undefined;
      if (authorId && !profileCache[authorId]) {
        const { data: cp } = await supabase
          .from('public_profiles').select('id, full_name, avatar_url, role').eq('id', authorId).single();
        if (cp) profileCache[authorId] = cp;
      }
      let quotedReplyData = null;
      const quoteReplyId = r.quote_reply_id as string | undefined;
      if (isV2 && quoteReplyId) {
        const { data: qr } = await supabase
          .from('forum_replies').select('id, content, author_id').eq('id', quoteReplyId).single();
        if (qr) {
          const qAuthorId = (qr as { author_id?: string }).author_id;
          const qAuthor = qAuthorId ? profileCache[qAuthorId] || null : null;
          quotedReplyData = { ...qr, author: qAuthor };
        }
      }
      enriched.push({
        ...r,
        author: authorId ? profileCache[authorId] : undefined,
        quoted_reply: quotedReplyData,
        topic_id: (r.post_id || r.topic_id) as string,
        is_solution: (r.is_solution as boolean) || false,
        reaction_count: (r.reaction_count as number) || 0,
        quote_reply_id: quoteReplyId || null,
      } as ForumReply);
    }
    setReplies(enriched);

    // Photos
    try {
      const { data: photoData } = await supabase
        .from('forum_topic_photos').select('url, display_order')
        .eq('topic_id', topicId).order('display_order');
      setTopicPhotos(photoData || []);
    } catch { /* Table optionnelle */ }

    setLoading(false);
  }, [topicId, router]);

  // Only fetch on client if no server data was provided
  useEffect(() => {
    if (!initialData && topicId) fetchTopic();
  }, [fetchTopic, topicId, initialData]);

  // ── Load follow status for authenticated users ──────────────────────────
  useEffect(() => {
    if (!profile?.id || !isV2Ref.current) return;
    (async () => {
      const supabase = createClient();
      const { data: followData } = await supabase
        .from('forum_follows').select('id')
        .eq('topic_id', topicId).eq('user_id', profile.id).single();
      setIsFollowing(!!followData);
    })();
  }, [profile?.id, topicId]);

  // ── Increment view count when initial data was server-provided ──────────
  useEffect(() => {
    if (!initialData || !topicId) return;
    (async () => {
      const supabase = createClient();
      const table = initialData.isV2 ? 'forum_topics' : 'forum_posts';
      await supabase.from(table).update({ views: (initialData.topic.views || 0) + 1 }).eq('id', topicId);
    })();
  }, [initialData, topicId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newReply.trim()) return;
    setSubmitting(true);
    const supabase = createClient();

    const { data: replyData, error } = await supabase
      .from('forum_replies')
      .insert({ topic_id: topicId, author_id: profile.id, content: newReply.trim(), quote_reply_id: quotedReply?.id || null })
      .select('*').single();

    if (error) {
      const { data: commentData, error: err2 } = await supabase
        .from('forum_comments')
        .insert({ post_id: topicId, author_id: profile.id, content: newReply.trim() })
        .select('*').single();
      if (err2) { toast.error('Erreur lors de la réponse'); setSubmitting(false); return; }
      setReplies(prev => [...prev, {
        ...commentData,
        topic_id: commentData.post_id, is_solution: false, reaction_count: 0, quote_reply_id: null,
        author: { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role },
        quoted_reply: null,
      }]);
    } else {
      setReplies(prev => [...prev, {
        ...replyData,
        author: { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role },
        quoted_reply: quotedReply || null,
      }]);
      await supabase.from('forum_topics').update({
        reply_count: (topic?.reply_count || 0) + 1, last_reply_at: new Date().toISOString(),
      }).eq('id', topicId);
    }

    setNewReply(''); setQuotedReply(null);
    toast.success('Réponse publiée !');
    setSubmitting(false);
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm('Supprimer cette réponse ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('forum_replies').delete().eq('id', replyId);
    if (error) {
      const { error: err2 } = await supabase.from('forum_comments').delete().eq('id', replyId);
      if (err2) { toast.error('Erreur lors de la suppression'); return; }
    }
    setReplies(prev => prev.filter(r => r.id !== replyId));
    toast.success('Réponse supprimée');
  };

  const deleteTopic = async () => {
    if (!confirm('Supprimer définitivement ce sujet ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('forum_topics').delete().eq('id', topicId);
    if (error) {
      const { error: err2 } = await supabase.from('forum_posts').delete().eq('id', topicId);
      if (err2) { toast.error(`Erreur : ${err2.message}`); return; }
    }
    toast.success('Sujet supprimé');
    router.push('/forum');
  };

  const moderateAction = async (action: 'verrouiller' | 'deverrouiller' | 'epingler' | 'archiver') => {
    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (action === 'verrouiller')   updates.status = 'verrouille';
    if (action === 'deverrouiller') updates.status = 'ouvert';
    if (action === 'archiver')      updates.status = 'archive';
    if (action === 'epingler')      updates.is_pinned = !topic?.is_pinned;

    await supabase.from('forum_topics').update(updates).eq('id', topicId);
    if (action === 'verrouiller')   await supabase.from('forum_posts').update({ is_closed: true }).eq('id', topicId);
    if (action === 'deverrouiller') await supabase.from('forum_posts').update({ is_closed: false }).eq('id', topicId);
    if (action === 'epingler')      await supabase.from('forum_posts').update({ is_pinned: !topic?.is_pinned }).eq('id', topicId);

    setTopic(prev => prev ? {
      ...prev,
      status: (updates.status as ForumTopic['status']) || prev.status,
      is_pinned: updates.is_pinned !== undefined ? (updates.is_pinned as boolean) : prev.is_pinned,
    } : prev);

    try {
      await supabase.from('forum_moderation_logs').insert({
        moderator_id: profile?.id, topic_id: topicId, action, reason: `Action: ${action}`,
      });
    } catch { /* Table optionnelle */ }
    toast.success(`Sujet ${action} avec succès`);
  };

  const markSolution = async (replyId: string, val: boolean) => {
    const supabase = createClient();
    await supabase.from('forum_replies').update({ is_solution: false }).eq('topic_id', topicId);
    if (val) await supabase.from('forum_replies').update({ is_solution: true }).eq('id', replyId);
    setReplies(prev => prev.map(r => ({ ...r, is_solution: val ? r.id === replyId : false })));
    toast.success(val ? '✅ Solution retenue' : 'Solution retirée');
  };

  const quoteReply = (reply: ForumReply) => {
    setQuotedReply(reply);
    setTimeout(() => replyRef.current?.focus(), 100);
  };

  const cancelQuote = () => setQuotedReply(null);

  const toggleFollow = async () => {
    if (!profile) { toast.error('Connectez-vous pour suivre'); return; }
    const supabase = createClient();
    if (isFollowing) {
      await supabase.from('forum_follows').delete().eq('topic_id', topicId).eq('user_id', profile.id);
      setIsFollowing(false);
      toast.success('Sujet non suivi');
    } else {
      try {
        await supabase.from('forum_follows').insert({ topic_id: topicId, user_id: profile.id, notify_replies: true });
      } catch { /* Table optionnelle */ }
      setIsFollowing(true);
      toast.success('Sujet suivi — vous serez notifié des réponses');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié !');
    });
  };

  const toggleResolved = async () => {
    const supabase = createClient();
    const newVal = !topic?.is_resolved;
    await supabase.from('forum_topics').update({ is_resolved: newVal }).eq('id', topicId);
    setTopic(prev => prev ? { ...prev, is_resolved: newVal } : prev);
    toast.success(newVal ? '✅ Sujet marqué comme résolu !' : 'Statut résolu retiré');
  };

  return {
    topic, replies, topicPhotos, loading,
    newReply, quotedReply, submitting, isFollowing, copied, lightboxIndex,
    setNewReply, setLightboxIndex,
    submitReply, deleteReply, deleteTopic, moderateAction,
    markSolution, quoteReply, cancelQuote, toggleFollow, copyLink, toggleResolved,
    replyRef,
  };
}

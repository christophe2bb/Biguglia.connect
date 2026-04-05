'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, MessageCircle, Flag, Trash2, Pencil, Lock, Unlock,
  Archive, Pin, Share2, Bell, BellOff, Copy, Check, MoreHorizontal,
  ThumbsUp, Heart, Laugh, Frown, Flame, Quote, AlertTriangle,
  Eye, Calendar, MapPin, Tag, CheckCircle2, Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumTopic, ForumReply, ForumSector, ForumCategory } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import ContactButton from '@/components/ui/ContactButton';

// ─── Secteurs couleurs ────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
  amber:   'bg-amber-100 text-amber-700',
  green:   'bg-green-100 text-green-700',
  violet:  'bg-violet-100 text-violet-700',
  orange:  'bg-orange-100 text-orange-700',
  gray:    'bg-gray-100 text-gray-700',
};

// ─── Emojis de réaction disponibles ──────────────────────────────────────────
const REACTION_EMOJIS = [
  { emoji: '👍', label: 'J\'aime',      icon: ThumbsUp  },
  { emoji: '❤️', label: 'Adore',        icon: Heart     },
  { emoji: '😂', label: 'Drôle',        icon: Laugh     },
  { emoji: '😢', label: 'Triste',       icon: Frown     },
  { emoji: '🔥', label: 'Chaud',        icon: Flame     },
  { emoji: '👏', label: 'Bravo',        icon: CheckCircle2 },
];

// ─── Badge statut ─────────────────────────────────────────────────────────────
function TopicStatusBadge({ status }: { status: string }) {
  if (status === 'verrouille') return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
      <Lock className="w-3 h-3" /> Verrouillé
    </span>
  );
  if (status === 'archive') return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
      <Archive className="w-3 h-3" /> Archivé
    </span>
  );
  if (status === 'ouvert') return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3" /> Ouvert
    </span>
  );
  return null;
}

// ─── Panneau réactions ────────────────────────────────────────────────────────
function ReactionPanel({
  targetId,
  targetType,
  currentUserId,
}: {
  targetId: string;
  targetType: 'topic' | 'reply';
  currentUserId?: string;
}) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReactions = async () => {
      const supabase = createClient();
      const field = targetType === 'topic' ? 'topic_id' : 'reply_id';
      const { data } = await supabase
        .from('forum_reactions')
        .select('emoji, user_id')
        .eq(field, targetId);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((r: { emoji: string; user_id: string }) => {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (currentUserId && r.user_id === currentUserId) setMyReaction(r.emoji);
        });
        setReactions(counts);
      }
    };
    fetchReactions();
  }, [targetId, targetType, currentUserId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleReaction = async (emoji: string) => {
    if (!currentUserId) { toast.error('Connectez-vous pour réagir'); return; }
    const supabase = createClient();
    const field = targetType === 'topic' ? 'topic_id' : 'reply_id';

    if (myReaction === emoji) {
      await supabase.from('forum_reactions').delete()
        .eq(field, targetId).eq('user_id', currentUserId).eq('emoji', emoji);
      setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 1) - 1) }));
      setMyReaction(null);
    } else {
      if (myReaction) {
        await supabase.from('forum_reactions').delete()
          .eq(field, targetId).eq('user_id', currentUserId).eq('emoji', myReaction);
        setReactions(prev => ({ ...prev, [myReaction]: Math.max(0, (prev[myReaction] || 1) - 1) }));
      }
      await supabase.from('forum_reactions').insert({
        [field]: targetId, user_id: currentUserId, emoji,
      });
      setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
      setMyReaction(emoji);
    }
    setShowPanel(false);
  };

  const topReactions = Object.entries(reactions)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-1 flex-wrap">
        {topReactions.map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
              myReaction === emoji
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        ))}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <span>😊</span>
          <span>+</span>
        </button>
      </div>
      {showPanel && (
        <div className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 flex gap-1 z-20">
          {REACTION_EMOJIS.map(r => (
            <button
              key={r.emoji}
              onClick={() => toggleReaction(r.emoji)}
              title={r.label}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-gray-100 transition-colors ${
                myReaction === r.emoji ? 'bg-brand-100 ring-2 ring-brand-300' : ''
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Carte d'une réponse ──────────────────────────────────────────────────────
function ReplyCard({
  reply,
  topicAuthorId,
  currentUserId,
  isMod,
  onDelete,
  onQuote,
  onMarkSolution,
}: {
  reply: ForumReply;
  topicAuthorId: string;
  currentUserId?: string;
  isMod: boolean;
  onDelete: (id: string) => void;
  onQuote: (reply: ForumReply) => void;
  onMarkSolution: (id: string, val: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isAuthor = currentUserId === reply.author_id;
  const isTopicAuthor = currentUserId === topicAuthorId;

  return (
    <div
      id={`reply-${reply.id}`}
      className={`bg-white rounded-2xl border p-5 transition-all ${
        reply.is_solution ? 'border-green-300 bg-green-50' : 'border-gray-100'
      }`}
    >
      {reply.is_solution && (
        <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4" /> Solution retenue
        </div>
      )}

      {/* Citation */}
      {reply.quoted_reply && (
        <div className="bg-gray-50 border-l-3 border-gray-300 rounded-lg p-3 mb-3 text-sm">
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Quote className="w-3 h-3" />
            <span className="font-medium">{(reply.quoted_reply.author as { full_name?: string })?.full_name}</span>
          </div>
          <p className="text-gray-600 line-clamp-3">{reply.quoted_reply.content}</p>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={(reply.author as { avatar_url?: string })?.avatar_url}
          name={(reply.author as { full_name?: string })?.full_name || '?'}
          size="sm"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 text-sm">{(reply.author as { full_name?: string })?.full_name}</span>
            {(reply.author as { role?: string })?.role === 'artisan_verified' && <Badge variant="success">Artisan</Badge>}
            {(reply.author as { role?: string })?.role === 'admin' && <Badge variant="warning">Admin</Badge>}
            {(reply.author as { role?: string })?.role === 'moderator' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">Mod</span>
            )}
          </div>
          <div className="text-xs text-gray-400">{formatRelative(reply.created_at)}</div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 w-44">
              <button
                onClick={() => { onQuote(reply); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Quote className="w-3.5 h-3.5" /> Citer
              </button>
              {(isTopicAuthor) && !reply.is_solution && (
                <button
                  onClick={() => { onMarkSolution(reply.id, true); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marquer solution
                </button>
              )}
              {(isTopicAuthor) && reply.is_solution && (
                <button
                  onClick={() => { onMarkSolution(reply.id, false); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Retirer solution
                </button>
              )}
              {currentUserId && currentUserId !== reply.author_id && (
                <ReportButton targetType="post" targetId={reply.id} targetTitle="Réponse" variant="icon" />
              )}
              {(isAuthor || isMod) && (
                <button
                  onClick={() => { onDelete(reply.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed mb-3">{reply.content}</p>

      {/* Actions bas */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReactionPanel targetId={reply.id} targetType="reply" currentUserId={currentUserId} />
        <button
          onClick={() => onQuote(reply)}
          className="text-xs text-gray-400 hover:text-brand-600 transition-colors flex items-center gap-1 ml-auto"
        >
          <Quote className="w-3 h-3" /> Citer
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ForumTopicPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, isModerator, loading: authLoading } = useAuthStore();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [topicPhotos, setTopicPhotos] = useState<{ url: string; display_order: number }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [quotedReply, setQuotedReply] = useState<ForumReply | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // ── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTopic = async () => {
      const supabase = createClient();

      // Essayer d'abord forum_topics (v2)
      let topicData: ForumTopic | null = null;
      let isV2 = false;

      const { data: topicV2 } = await supabase
        .from('forum_topics')
        .select(`
          *,
          sector:forum_sectors(id, name, slug, icon, color),
          category:forum_categories(id, name, icon, slug)
        `)
        .eq('id', id as string)
        .single();

      if (topicV2) {
        isV2 = true;
        topicData = topicV2 as unknown as ForumTopic;
      } else {
        // Fallback forum_posts
        const { data: postData } = await supabase
          .from('forum_posts')
          .select('*, category:forum_categories(*)')
          .eq('id', id as string)
          .single();

        if (!postData) { router.push('/forum'); return; }

        topicData = {
          ...postData,
          status: postData.is_closed ? 'verrouille' : 'ouvert',
          reply_count: 0,
          reaction_count: 0,
          last_reply_at: null,
          is_hot: false,
          sector_id: null,
          sector: null,
          visibility: 'public',
          tags: [],
        } as unknown as ForumTopic;
      }

      // Auteur
      if (topicData?.author_id) {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .eq('id', topicData.author_id)
          .single();
        topicData = { ...topicData, author: authorData as ForumTopic['author'] };
      }

      setTopic(topicData);

      // Vues
      if (isV2) {
        await supabase.from('forum_topics').update({ views: (topicData?.views || 0) + 1 }).eq('id', id as string);
      } else {
        await supabase.from('forum_posts').update({ views: (topicData?.views || 0) + 1 }).eq('id', id as string);
      }

      // Réponses (v2 ou v1)
      const repliesTable = isV2 ? 'forum_replies' : 'forum_comments';
      const topicField = isV2 ? 'topic_id' : 'post_id';

      const { data: repliesRaw } = await supabase
        .from(repliesTable)
        .select('*')
        .eq(topicField, id as string)
        .order('created_at', { ascending: true });

      // Enrichir avec profils
      const profileCache: Record<string, unknown> = {};
      const enriched: ForumReply[] = [];
      for (const r of (repliesRaw || []) as Record<string, unknown>[]) {
        const authorId = r.author_id as string | undefined;
        if (authorId && !profileCache[authorId]) {
          const { data: cp } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', authorId)
            .single();
          if (cp && authorId) profileCache[authorId] = cp;
        }
        // Charger la réponse citée si v2
        let quotedReplyData = null;
        const quoteReplyId = r.quote_reply_id as string | undefined;
        if (isV2 && quoteReplyId) {
          const { data: qr } = await supabase
            .from('forum_replies')
            .select('id, content, author_id')
            .eq('id', quoteReplyId)
            .single();
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
          // Compat v1
          topic_id: (r.post_id || r.topic_id) as string,
          is_solution: (r.is_solution as boolean) || false,
          reaction_count: (r.reaction_count as number) || 0,
          quote_reply_id: quoteReplyId || null,
        } as ForumReply);
      }
      setReplies(enriched);

      // Suivi (v2)
      if (profile?.id && isV2) {
        const { data: followData } = await supabase
          .from('forum_follows')
          .select('id')
          .eq('topic_id', id as string)
          .eq('user_id', profile.id)
          .single();
        setIsFollowing(!!followData);
      }

      // Photos du sujet
      try {
        const { data: photoData } = await supabase
          .from('forum_topic_photos')
          .select('url, display_order')
          .eq('topic_id', id as string)
          .order('display_order');
        setTopicPhotos(photoData || []);
      } catch { /* Table optionnelle */ }

      setLoading(false);
    };

    if (id) fetchTopic();
  }, [id, router, profile?.id]);

  // ── Envoyer une réponse ────────────────────────────────────────────────────
  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newReply.trim()) return;
    setSubmitting(true);
    const supabase = createClient();

    // Essayer forum_replies (v2) sinon forum_comments (v1)
    const { data: replyData, error } = await supabase
      .from('forum_replies')
      .insert({
        topic_id: id as string,
        author_id: profile.id,
        content: newReply.trim(),
        quote_reply_id: quotedReply?.id || null,
      })
      .select('*')
      .single();

    if (error) {
      // Fallback v1
      const { data: commentData, error: err2 } = await supabase
        .from('forum_comments')
        .insert({ post_id: id as string, author_id: profile.id, content: newReply.trim() })
        .select('*')
        .single();
      if (err2) { toast.error('Erreur lors de la réponse'); setSubmitting(false); return; }
      const newR: ForumReply = {
        ...commentData,
        topic_id: commentData.post_id,
        is_solution: false,
        reaction_count: 0,
        quote_reply_id: null,
        author: { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role },
        quoted_reply: null,
      };
      setReplies(prev => [...prev, newR]);
    } else {
      const newR: ForumReply = {
        ...replyData,
        author: { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role },
        quoted_reply: quotedReply || null,
      };
      setReplies(prev => [...prev, newR]);
      // Mise à jour compteur
      await supabase.from('forum_topics').update({
        reply_count: (topic?.reply_count || 0) + 1,
        last_reply_at: new Date().toISOString(),
      }).eq('id', id as string);
    }

    setNewReply('');
    setQuotedReply(null);
    toast.success('Réponse publiée !');
    setSubmitting(false);
  };

  // ── Supprimer une réponse ─────────────────────────────────────────────────
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

  // ── Supprimer le sujet ────────────────────────────────────────────────────
  const deleteTopic = async () => {
    if (!confirm('Supprimer définitivement ce sujet ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('forum_topics').delete().eq('id', id as string);
    if (error) {
      const { error: err2 } = await supabase.from('forum_posts').delete().eq('id', id as string);
      if (err2) { toast.error(`Erreur : ${err2.message}`); return; }
    }
    toast.success('Sujet supprimé');
    router.push('/forum');
  };

  // ── Action modération ─────────────────────────────────────────────────────
  const moderateAction = async (action: 'verrouiller' | 'deverrouiller' | 'epingler' | 'archiver') => {
    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (action === 'verrouiller')   updates.status = 'verrouille';
    if (action === 'deverrouiller') updates.status = 'ouvert';
    if (action === 'archiver')      updates.status = 'archive';
    if (action === 'epingler')      updates.is_pinned = !topic?.is_pinned;

    await supabase.from('forum_topics').update(updates).eq('id', id as string);
    // Fallback v1
    if (action === 'verrouiller')   await supabase.from('forum_posts').update({ is_closed: true }).eq('id', id as string);
    if (action === 'deverrouiller') await supabase.from('forum_posts').update({ is_closed: false }).eq('id', id as string);
    if (action === 'epingler')      await supabase.from('forum_posts').update({ is_pinned: !topic?.is_pinned }).eq('id', id as string);

    setTopic(prev => prev ? {
      ...prev,
      status: updates.status as ForumTopic['status'] || prev.status,
      is_pinned: updates.is_pinned !== undefined ? (updates.is_pinned as boolean) : prev.is_pinned,
    } : prev);

    // Log modération
    try {
      await supabase.from('forum_moderation_logs').insert({
        moderator_id: profile?.id,
        topic_id: id as string,
        action,
        reason: `Action: ${action}`,
      });
    } catch {
      // Table optionnelle
    }

    toast.success(`Sujet ${action} avec succès`);
  };

  // ── Marquer solution ──────────────────────────────────────────────────────
  const markSolution = async (replyId: string, val: boolean) => {
    const supabase = createClient();
    // Retirer l'ancien
    await supabase.from('forum_replies').update({ is_solution: false }).eq('topic_id', id as string);
    // Marquer le nouveau
    if (val) await supabase.from('forum_replies').update({ is_solution: true }).eq('id', replyId);
    setReplies(prev => prev.map(r => ({ ...r, is_solution: val ? r.id === replyId : false })));
    toast.success(val ? '✅ Solution retenue' : 'Solution retirée');
  };

  // ── Citer une réponse ─────────────────────────────────────────────────────
  const quoteReply = (reply: ForumReply) => {
    setQuotedReply(reply);
    setTimeout(() => replyRef.current?.focus(), 100);
  };

  // ── Suivi ─────────────────────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!profile) { toast.error('Connectez-vous pour suivre'); return; }
    const supabase = createClient();
    if (isFollowing) {
      await supabase.from('forum_follows').delete()
        .eq('topic_id', id as string).eq('user_id', profile.id);
      setIsFollowing(false);
      toast.success('Sujet non suivi');
    } else {
      try {
        await supabase.from('forum_follows').insert({
          topic_id: id as string,
          user_id: profile.id,
          notify_replies: true,
        });
      } catch { /* Table optionnelle */ }
      setIsFollowing(true);
      toast.success('Sujet suivi — vous serez notifié des réponses');
    }
  };

  // ── Partager ──────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié !');
    });
  };

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-100 rounded mb-2" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
    </div>
  );
  if (!topic) return null;

  const canDelete = !authLoading && profile && (profile.id === topic.author_id || isModerator());
  const canEdit   = !authLoading && profile && profile.id === topic.author_id;
  const isMod     = !authLoading && isModerator();
  const isLocked  = topic.status === 'verrouille' || topic.status === 'archive';
  const sector    = topic.sector as ForumSector | null;
  const sectorColors = SECTOR_COLORS[(sector as { color?: string })?.color || 'gray'];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Retour */}
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Forum
      </Link>

      {/* ── Sujet principal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {topic.is_pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
              <Pin className="w-3 h-3" /> Épinglé
            </span>
          )}
          {topic.is_hot && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3" /> Chaud
            </span>
          )}
          {sector && (
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sectorColors}`}>
              {(sector as ForumSector & { icon?: string }).icon} {sector.name}
            </span>
          )}
          {topic.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {(topic.category as ForumCategory & { icon?: string }).icon} {(topic.category as ForumCategory).name}
            </span>
          )}
          <TopicStatusBadge status={topic.status} />
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{topic.title}</h1>

        {/* Tags */}
        {topic.tags && (topic.tags as string[]).length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            {(topic.tags as string[]).map((tag: string) => (
              <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md">#{tag}</span>
            ))}
          </div>
        )}

        {/* Auteur + méta */}
        <div className="flex items-center gap-3 mb-5">
          <Avatar
            src={(topic.author as { avatar_url?: string })?.avatar_url}
            name={(topic.author as { full_name?: string })?.full_name || '?'}
            size="md"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800">{(topic.author as { full_name?: string })?.full_name}</span>
              {(topic.author as { role?: string })?.role === 'artisan_verified' && <Badge variant="success">Artisan</Badge>}
              {(topic.author as { role?: string })?.role === 'admin' && <Badge variant="warning">Admin</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatRelative(topic.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{topic.views} vues</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{replies.length} réponse{replies.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions auteur/modération */}
          <div className="flex items-center gap-1">
            {canEdit && (
              <Link
                href={`/forum/${id}/modifier`}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {isMod && (
              <>
                {topic.status === 'ouvert' ? (
                  <button
                    onClick={() => moderateAction('verrouiller')}
                    className="p-2 rounded-xl text-amber-400 hover:bg-amber-50 transition-colors"
                    title="Verrouiller"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                ) : topic.status === 'verrouille' ? (
                  <button
                    onClick={() => moderateAction('deverrouiller')}
                    className="p-2 rounded-xl text-green-400 hover:bg-green-50 transition-colors"
                    title="Déverrouiller"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  onClick={() => moderateAction('epingler')}
                  className={`p-2 rounded-xl transition-colors ${topic.is_pinned ? 'text-brand-500 bg-brand-50' : 'text-gray-400 hover:bg-gray-50'}`}
                  title={topic.is_pinned ? 'Désépingler' : 'Épingler'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moderateAction('archiver')}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-colors"
                  title="Archiver"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={deleteTopic}
                className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-5">{topic.content}</div>

        {/* Photos du sujet */}
        {topicPhotos.length > 0 && (
          <div className="mb-5">
            {topicPhotos.length === 1 ? (
              <button onClick={() => setLightboxIndex(0)} className="block w-full rounded-xl overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={topicPhotos[0].url} alt="Photo" className="w-full max-h-96 object-cover hover:opacity-95 transition-opacity" />
              </button>
            ) : (
              <div className={`grid gap-2 ${topicPhotos.length === 2 ? 'grid-cols-2' : topicPhotos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {topicPhotos.slice(0, topicPhotos.length <= 4 ? topicPhotos.length : 4).map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`relative overflow-hidden rounded-xl border border-gray-100 ${i === 0 && topicPhotos.length >= 3 ? 'col-span-2 row-span-1' : ''}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                    />
                    {i === 3 && topicPhotos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                        +{topicPhotos.length - 4}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && topicPhotos[lightboxIndex] && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topicPhotos[lightboxIndex].url}
                alt="Photo"
                className="max-h-[80vh] w-full object-contain rounded-xl"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                {topicPhotos.length > 1 && (
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {lightboxIndex + 1} / {topicPhotos.length}
                  </span>
                )}
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
              {topicPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex(i => i !== null ? (i - 1 + topicPhotos.length) % topicPhotos.length : 0)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/80"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setLightboxIndex(i => i !== null ? (i + 1) % topicPhotos.length : 0)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/80"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Réactions + actions */}
        <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-gray-50">
          <ReactionPanel targetId={topic.id} targetType="topic" currentUserId={profile?.id} />
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                isFollowing
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {isFollowing ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {isFollowing ? 'Suivi' : 'Suivre'}
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié !' : 'Partager'}
            </button>
            {profile && profile.id !== topic.author_id && (
              <>
                <ContactButton
                  sourceType="general"
                  sourceId={topic.id}
                  sourceTitle={topic.title}
                  ownerId={topic.author_id}
                  userId={profile.id}
                  ctaLabel="Message privé"
                  prefillMsg={`Bonjour, je vous contacte suite à votre sujet « ${topic.title} ».`}
                  size="sm"
                  variant="ghost"
                />
                <ReportButton targetType="post" targetId={topic.id} targetTitle={topic.title} variant="icon" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Réponses ── */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-400" />
          {replies.length} réponse{replies.length !== 1 ? 's' : ''}
        </h2>

        {replies.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Pas encore de réponse"
            description="Soyez le premier à contribuer à ce sujet !"
          />
        ) : (
          <div className="space-y-3">
            {replies.map(reply => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                topicAuthorId={topic.author_id}
                currentUserId={profile?.id}
                isMod={isMod}
                onDelete={deleteReply}
                onQuote={quoteReply}
                onMarkSolution={markSolution}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Formulaire réponse ── */}
      {profile && !isLocked ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-medium text-gray-800 mb-3">Votre réponse</h3>

          {/* Citation en cours */}
          {quotedReply && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-600 text-xs">{(quotedReply.author as { full_name?: string })?.full_name}</span>
                <p className="text-gray-500 line-clamp-2 text-xs mt-0.5">{quotedReply.content}</p>
              </div>
              <button onClick={() => setQuotedReply(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
          )}

          <form onSubmit={submitReply} className="space-y-3">
            <Textarea
              ref={replyRef}
              value={newReply}
              onChange={e => setNewReply(e.target.value)}
              placeholder="Rédigez votre réponse..."
              required
              className="min-h-[120px]"
            />
            <div className="flex gap-2">
              <Button type="submit" loading={submitting}>
                Publier la réponse
              </Button>
              {quotedReply && (
                <Button type="button" variant="outline" onClick={() => setQuotedReply(null)}>
                  Annuler citation
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : !profile ? (
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">Connectez-vous pour participer à ce sujet</p>
          <Link href="/connexion">
            <Button size="sm">Se connecter</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-center">
          <Lock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-700 text-sm font-medium">
            {topic.status === 'archive' ? 'Ce sujet est archivé.' : 'Ce sujet est verrouillé — aucune nouvelle réponse.'}
          </p>
          {isMod && topic.status === 'verrouille' && (
            <button
              onClick={() => moderateAction('deverrouiller')}
              className="mt-2 text-xs text-amber-700 underline hover:no-underline"
            >
              Déverrouiller ce sujet (modérateur)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

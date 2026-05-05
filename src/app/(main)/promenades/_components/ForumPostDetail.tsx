'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Loader2, MessageSquare, Trash2, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_types';

type ForumComment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string | null } | null;
};

interface Props {
  post: ForumPost;
  profileId?: string;
  profileName?: string;
  profileAvatar?: string | null;
  onBack: () => void;
  onDeleted: () => void;
}

export default function ForumPostDetail({ post, profileId, profileName, profileAvatar, onBack, onDeleted }: Props) {
  const [comments, setComments]     = useState<ForumComment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeletePost, setShowDeletePost] = useState(false);
  const [deletingPost, setDeletingPost]     = useState(false);

  const isAuthor = !!profileId && profileId === post.author_id;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('forum_comments')
      .select('*, author:profiles!forum_comments_author_id_fkey(full_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments((data || []) as ForumComment[]);
    setLoading(false);
  }, [post.id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSend = async () => {
    if (!text.trim() || !profileId || sending) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('forum_comments').insert({
      post_id: post.id,
      author_id: profileId,
      content: text.trim(),
    });
    if (error) {
      toast.error('Erreur lors de l\'envoi');
    } else {
      setText('');
      await fetchComments();
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    const supabase = createClient();
    const { error } = await supabase.from('forum_comments').delete().eq('id', commentId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Réponse supprimée');
    }
    setDeletingId(null);
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    const supabase = createClient();
    const { error } = await supabase.from('forum_posts').delete().eq('id', post.id);
    if (error) {
      toast.error('Erreur lors de la suppression');
      setDeletingPost(false);
    } else {
      toast.success('Sujet supprimé');
      onDeleted();
    }
  };

  const commentCount = (post.comment_count as unknown as { count: number }[])?.[0]?.count ?? comments.length;

  return (
    <div className="space-y-4">

      {/* ── Bouton retour ── */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux échanges
      </button>

      {/* ── Post principal ── */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        {/* Header coloré */}
        <div className="bg-gradient-to-r from-sky-50 to-teal-50 border-b border-sky-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-black text-gray-900 text-lg leading-tight flex-1">{post.title}</h2>
            {/* Supprimer le post — auteur seulement */}
            {isAuthor && (
              <button
                onClick={() => setShowDeletePost(true)}
                className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Supprimer ce sujet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Avatar src={post.author?.avatar_url} name={post.author?.full_name || 'Membre'} size="xs" />
            <span className="text-xs text-gray-500 font-medium">
              {post.author?.full_name || 'Membre'} · {formatRelative(post.created_at)}
            </span>
            <span className="ml-auto text-xs text-sky-500 font-semibold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {typeof commentCount === 'number' ? commentCount : 0} réponse{commentCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-5 py-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>

      {/* ── Réponses ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            {loading ? 'Chargement…' : `${comments.length} réponse${comments.length !== 1 ? 's' : ''}`}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune réponse — soyez le premier !</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map(c => {
              const isOwn = !!profileId && profileId === c.author_id;
              return (
                <div key={c.id} className="flex items-start gap-3 px-5 py-4 group hover:bg-gray-50/50 transition-colors">
                  <Avatar src={c.author?.avatar_url} name={c.author?.full_name || 'Membre'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-800">{c.author?.full_name || 'Membre'}</span>
                      <span className="text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={deletingId === c.id}
                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                          title="Supprimer ma réponse"
                        >
                          {deletingId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Zone de saisie */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30">
          {profileId ? (
            <div className="flex items-start gap-3">
              <Avatar src={profileAvatar} name={profileName || 'Moi'} size="sm" />
              <div className="flex-1 flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Votre réponse… (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 text-sm rounded-xl border border-sky-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="p-2.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 transition-colors flex-shrink-0 shadow-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-sky-600 font-semibold py-2">
              <a href="/connexion" className="hover:underline">Connectez-vous pour répondre →</a>
            </p>
          )}
        </div>
      </div>

      {/* ── Modal suppression post ── */}
      {showDeletePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-red-100 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <button onClick={() => setShowDeletePost(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">Supprimer ce sujet ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Le sujet <strong>&quot;{post.title}&quot;</strong> et toutes ses réponses seront définitivement supprimés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeletePost(false)}
                disabled={deletingPost}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deletingPost}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deletingPost ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</> : <><Trash2 className="w-4 h-4" /> Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

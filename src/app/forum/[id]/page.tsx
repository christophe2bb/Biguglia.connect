'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle, Flag, Trash2, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumPost, ForumComment } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';

export default function ForumPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, isModerator } = useAuthStore();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      const supabase = createClient();

      // Récupérer le post sans JOIN cassé
      const { data } = await supabase
        .from('forum_posts')
        .select('*, category:forum_categories(*)')
        .eq('id', id as string)
        .single();

      if (!data) { router.push('/forum'); return; }

      // Profil auteur séparément
      let authorData = null;
      if (data.author_id) {
        const { data: ap } = await supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', data.author_id).single();
        authorData = ap;
      }
      setPost({ ...data, author: authorData } as ForumPost);

      // Incrémenter les vues
      await supabase.from('forum_posts').update({ views: (data.views || 0) + 1 }).eq('id', id as string);

      // Commentaires sans JOIN cassé
      const { data: comms } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('post_id', id as string)
        .order('created_at', { ascending: true });

      // Enrichir avec les profils des auteurs
      const enrichedComments: ForumComment[] = [];
      const profileCache: Record<string, unknown> = {};
      for (const comm of comms || []) {
        if (comm.author_id && !profileCache[comm.author_id]) {
          const { data: cp } = await supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', comm.author_id).single();
          if (cp) profileCache[comm.author_id] = cp;
        }
        enrichedComments.push({ ...comm, author: profileCache[comm.author_id] } as ForumComment);
      }
      setComments(enrichedComments);
      setLoading(false);
    };
    if (id) fetchPost();
  }, [id, router]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim()) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({ post_id: id as string, author_id: profile.id, content: newComment.trim() })
      .select('*')
      .single();

    if (error) { toast.error('Erreur lors du commentaire'); }
    else {
      // Ajouter le profil courant au commentaire
      const newCommentWithAuthor = { ...comment, author: { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role } } as ForumComment;
      setComments(prev => [...prev, newCommentWithAuthor]);
      setNewComment('');
      toast.success('Commentaire publié !');
    }
    setSubmitting(false);
  };

  const deletePost = async () => {
    if (!confirm('Supprimer ce sujet ?')) return;
    const supabase = createClient();
    await supabase.from('forum_posts').delete().eq('id', id as string);
    toast.success('Sujet supprimé');
    router.push('/forum');
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const supabase = createClient();
    await supabase.from('forum_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    toast.success('Commentaire supprimé');
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-100 rounded mb-2" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
    </div>
  );
  if (!post) return null;

  const canDelete = profile && (profile.id === post.author_id || isModerator());
  const canEdit = profile && profile.id === post.author_id;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au forum
      </Link>

      {/* Post principal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {post.category?.icon} {post.category?.name}
          </span>
          {post.author?.role === 'artisan_verified' && <Badge variant="success">Artisan vérifié</Badge>}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-6">
          <Avatar src={post.author?.avatar_url} name={post.author?.full_name || '?'} size="md" />
          <div>
            <div className="font-medium text-gray-800">{post.author?.full_name}</div>
            <div className="text-sm text-gray-400">{formatRelative(post.created_at)}</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {canEdit && (
              <Link href={`/forum/${id}/modifier`} className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors" title="Modifier">
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {canDelete && (
              <button onClick={deletePost} className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Commentaires */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {comments.length} réponse{comments.length !== 1 ? 's' : ''}
        </h2>

        {comments.length === 0 ? (
          <EmptyState icon="💬" title="Pas encore de réponse" description="Soyez le premier à répondre à ce sujet !" />
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name || '?'} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{comment.author?.full_name}</span>
                      {comment.author?.role === 'artisan_verified' && <Badge variant="success">Artisan</Badge>}
                    </div>
                    <div className="text-xs text-gray-400">{formatRelative(comment.created_at)}</div>
                  </div>
                  {(profile?.id === comment.author_id || isModerator()) && (
                    <button onClick={() => deleteComment(comment.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire commentaire */}
      {profile && !post.is_closed ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Votre réponse</h3>
          <form onSubmit={submitComment} className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Rédigez votre réponse..."
              required
              className="min-h-[100px]"
            />
            <Button type="submit" loading={submitting}>Publier la réponse</Button>
          </form>
        </div>
      ) : !profile ? (
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-gray-500 mb-4">Connectez-vous pour répondre à ce sujet</p>
          <Link href="/connexion" className="inline-flex items-center justify-center bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors">
            Se connecter
          </Link>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-4 text-center text-sm text-gray-500">
          Ce sujet est fermé aux nouvelles réponses.
        </div>
      )}
    </div>
  );
}

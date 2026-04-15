'use client';

import Link from 'next/link';
import { Plus, X, Loader2, MessageSquare, ChevronRight } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ForumPost } from '../_types';

interface Props {
  forumPosts: ForumPost[];
  loadingForum: boolean;
  forumCategoryId: string | null;
  showPostForm: boolean;
  setShowPostForm: (v: boolean) => void;
  postForm: { title: string; content: string };
  setPostForm: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>;
  submittingPost: boolean;
  handlePostSubmit: (e: React.FormEvent) => void;
  profileId?: string;
}

export default function TabForum({
  forumPosts, loadingForum, forumCategoryId,
  showPostForm, setShowPostForm, postForm, setPostForm, submittingPost, handlePostSubmit,
  profileId,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">Échanges &amp; conseils nature</h2>
          <p className="text-sm text-gray-400 mt-0.5">Partagez vos expériences, posez des questions, donnez des tuyaux</p>
        </div>
        {profileId && (
          <button onClick={() => setShowPostForm(!showPostForm)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Nouveau sujet
          </button>
        )}
      </div>

      {showPostForm && profileId && (
        <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" /> Nouveau sujet
            </h3>
            <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input type="text" placeholder="Titre du sujet *" required
            value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          <textarea placeholder="Votre message, question ou conseil de randonneur local…" rows={4}
            value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" required />
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submittingPost}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm">
              {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : 'Publier'}
            </button>
            <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
          </div>
        </form>
      )}

      {loadingForum ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
      ) : !forumCategoryId ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MessageSquare className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="font-bold text-emerald-800 mb-1 text-lg">Forum en cours d&apos;activation</p>
          <p className="text-emerald-700 text-sm mb-5">
            Exécutez <code className="bg-emerald-100 px-1 rounded font-mono text-xs">migration_themes.sql</code> dans Supabase pour activer ce forum.
          </p>
          {profileId && (
            <Link href="/forum/nouveau" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
              <Plus className="w-4 h-4" /> Poster dans le forum général
            </Link>
          )}
        </div>
      ) : forumPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-bold mb-1">Aucun échange pour l&apos;instant</p>
          <p className="text-gray-400 text-sm mb-5">Posez une question ou partagez votre expérience de randonneur !</p>
          {profileId && (
            <button onClick={() => setShowPostForm(true)} className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
              <Plus className="w-4 h-4" /> Premier message
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {forumPosts.map(post => {
            const comments = (post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
            const isHot = comments >= 5;
            return (
              <Link key={post.id} href={`/forum/${post.id}`}
                className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all group">
                <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm', isHot ? 'bg-amber-100' : 'bg-emerald-50')}>
                  <MessageSquare className={cn('w-5 h-5', isHot ? 'text-amber-500' : 'text-emerald-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 flex-1">{post.title}</h3>
                    {isHot && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black flex-shrink-0">🔥 Actif</span>}
                  </div>
                  <p className="text-gray-500 text-sm mb-2 line-clamp-1">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      {post.author && <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />}
                      {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <MessageSquare className="w-3 h-3" />
                      {comments} réponse{comments > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 flex-shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      {!profileId && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <p className="text-emerald-800 font-bold mb-1">Rejoignez la communauté</p>
          <p className="text-emerald-700 text-sm mb-4">Connectez-vous pour participer aux échanges et partager votre expérience.</p>
          <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
            Se connecter
          </Link>
        </div>
      )}
    </div>
  );
}

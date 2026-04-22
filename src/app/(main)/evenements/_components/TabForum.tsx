'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, AlertCircle, ChevronRight, Plus, Loader2, X } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import type { ForumPost } from '../_types';

interface Props {
  loading: boolean;
  forumPosts: ForumPost[];
  forumCategoryId: string | null;
  showPostForm: boolean;
  setShowPostForm: (v: boolean) => void;
  postForm: { title: string; content: string };
  setPostForm: (fn: (f: { title: string; content: string }) => { title: string; content: string }) => void;
  submittingPost: boolean;
  profile: { id: string } | null;
  onSubmit: (e: React.FormEvent, profileId: string) => void;
}

export default function TabForum({
  loading, forumPosts, forumCategoryId, showPostForm, setShowPostForm,
  postForm, setPostForm, submittingPost, profile, onSubmit,
}: Props) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900">Forum événements</h2>
          <p className="text-sm text-gray-400 mt-0.5">Questions, suggestions et retours sur les événements de Biguglia</p>
        </div>
        {profile && (
          <button onClick={() => setShowPostForm(!showPostForm)}
            className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Nouveau sujet
          </button>
        )}
      </div>

      {showPostForm && profile && (
        <form onSubmit={e => onSubmit(e, profile.id)} className="bg-white rounded-2xl border border-purple-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Nouveau sujet</h3>
            <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input type="text" placeholder="Titre (ex: Qui organise la fête de la musique ?)" required
            value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" />
          <textarea placeholder="Votre message, question ou proposition…" required rows={4}
            value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" />
          <div className="flex gap-2">
            <button type="submit" disabled={submittingPost}
              className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : 'Publier'}
            </button>
            <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
        </div>
      ) : !forumCategoryId ? (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-purple-300 mx-auto mb-3" />
          <p className="font-bold text-purple-800 mb-1">Forum temporairement indisponible</p>
          <p className="text-purple-700 text-sm">La catégorie forum n&apos;existe pas encore. Exécutez la migration SQL.</p>
        </div>
      ) : forumPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">Pas encore de sujets</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Lancez la discussion !</p>
          {profile && (
            <button onClick={() => setShowPostForm(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Créer un sujet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {forumPosts.map(post => (
            <Link key={post.id} href={`/forum/${post.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 hover:shadow-sm transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors line-clamp-1">{post.title}</h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{post.author?.full_name ?? 'Anonyme'} · {formatRelative(post.created_at)}</span>
                    {(post.comment_count ?? 0) > 0 && (
                      <span className="text-xs bg-purple-50 text-purple-600 font-semibold px-2 py-0.5 rounded-full">
                        {post.comment_count} réponse{(post.comment_count ?? 0) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

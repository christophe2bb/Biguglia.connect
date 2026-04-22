'use client';

import Link from 'next/link';
import { Plus, X, Loader2, AlertCircle, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import type { ForumPost } from '../_constants';
import type { useCollectionForum } from '../_hooks/useCollectionForum';

type ForumHook = ReturnType<typeof useCollectionForum>;

interface Props extends ForumHook {
  isLoggedIn: boolean;
}

export default function CollectionForum({
  isLoggedIn,
  forumPosts, forumCategoryId, loadingForum,
  showPostForm, setShowPostForm,
  postForm, setPostForm,
  submittingPost, handlePostSubmit,
  editPost, setEditPost,
  editPostForm, setEditPostForm,
  savingPost, openEditPost, handleUpdatePost, handleDeletePost,
}: Props) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Forum des collectionneurs</h2>
          {isLoggedIn && (
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Nouveau sujet
            </button>
          )}
        </div>

        {/* New-post form */}
        {showPostForm && isLoggedIn && (
          <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-amber-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Nouveau sujet</h3>
              <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text" placeholder="Titre du sujet..." required
              value={postForm.title}
              onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <textarea
              placeholder="Votre question, conseil, ou annonce de bourse..." required
              rows={4} value={postForm.content}
              onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <div className="flex gap-2">
              <button
                type="submit" disabled={submittingPost}
                className="flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
              </button>
              <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Edit-post form */}
        {editPost && isLoggedIn && (
          <form onSubmit={handleUpdatePost} className="bg-white rounded-2xl border border-blue-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Modifier le sujet</h3>
              <button type="button" onClick={() => setEditPost(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text" placeholder="Titre du sujet..." required
              value={editPostForm.title}
              onChange={e => setEditPostForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <textarea
              placeholder="Contenu..." required rows={4}
              value={editPostForm.content}
              onChange={e => setEditPostForm(f => ({ ...f, content: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <button
                type="submit" disabled={savingPost}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde...</> : 'Sauvegarder'}
              </button>
              <button type="button" onClick={() => setEditPost(null)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Content */}
        {loadingForum ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          </div>
        ) : !forumCategoryId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-bold text-amber-800 mb-1">Forum temporairement indisponible</p>
            <p className="text-amber-700 text-sm mb-4">
              La catégorie forum &quot;Collectionneurs&quot; n&apos;existe pas encore.<br />
              Exécutez <code className="bg-amber-100 px-1 rounded font-mono text-xs">migration_themes.sql</code> dans Supabase.
            </p>
            {isLoggedIn && (
              <Link
                href="/forum/nouveau"
                className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Poster dans le forum général
              </Link>
            )}
          </div>
        ) : forumPosts.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun sujet pour l&apos;instant</p>
            {isLoggedIn && (
              <button onClick={() => setShowPostForm(true)} className="mt-4 text-amber-600 font-semibold text-sm hover:underline">
                Soyez le premier à poster !
              </button>
            )}
          </div>
        ) : (
          <PostList
            posts={forumPosts}
            currentUserId={undefined}
            isLoggedIn={isLoggedIn}
            onEdit={openEditPost}
            onDelete={handleDeletePost}
          />
        )}

        {/* Unauthenticated CTA */}
        {!isLoggedIn && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-amber-700 font-medium mb-3">Connectez-vous pour participer aux discussions</p>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Post list ─────────────────────────────────────────────────────────────────
function PostList({
  posts, isLoggedIn, onEdit, onDelete,
}: {
  posts: ForumPost[];
  currentUserId?: string;
  isLoggedIn: boolean;
  onEdit: (post: ForumPost) => void;
  onDelete: (post: ForumPost) => void;
}) {
  return (
    <div className="space-y-3">
      {posts.map(post => (
        <PostRow
          key={post.id}
          post={post}
          isLoggedIn={isLoggedIn}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function PostRow({
  post, isLoggedIn, onEdit, onDelete,
}: {
  post: ForumPost;
  isLoggedIn: boolean;
  onEdit: (post: ForumPost) => void;
  onDelete: (post: ForumPost) => void;
}) {
  // Note: we pass `isLoggedIn` here as a proxy; actual ownership checked in the hook
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-sm transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link href={`/forum/${post.id}`} className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm hover:text-amber-700 transition-colors leading-snug">
            {post.title}
          </h3>
        </Link>
        {isLoggedIn && (
          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(post)} title="Modifier"
              className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-600" />
            </button>
            <button
              onClick={() => onDelete(post)} title="Supprimer"
              className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        )}
      </div>
      <Link href={`/forum/${post.id}`} className="block">
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{post.content}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-2">
            {post.author && <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />}
            {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {(post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0} réponses
          </span>
        </div>
      </Link>
    </div>
  );
}

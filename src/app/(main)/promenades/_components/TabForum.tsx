'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Loader2, MessageSquare, Tag, Search, TrendingUp, Clock, ArrowUpDown } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ForumPost } from '../_types';
import type { ForumTheme } from '../_hooks/useForum';
import { SYSTEM_THEMES } from '../_hooks/useForum';
import ForumPostDetail from './ForumPostDetail';

interface Props {
  forumPosts: ForumPost[];
  loadingForum: boolean;
  forumCategoryId: string | null;
  showPostForm: boolean;
  setShowPostForm: (v: boolean) => void;
  postForm: { title: string; content: string; theme: string };
  setPostForm: React.Dispatch<React.SetStateAction<{ title: string; content: string; theme: string }>>;
  submittingPost: boolean;
  handlePostSubmit: (e: React.FormEvent) => void;
  profileId?: string;
  profileName?: string;
  profileAvatar?: string | null;
  onPostDeleted?: () => void;
  /** Filtre thème actif (null = tous) */
  activeTheme?: string | null;
  /** Liste complète des thèmes (système + custom) */
  allThemes?: ForumTheme[];
}

type SortMode = 'recent' | 'active';

export default function TabForum({
  forumPosts, loadingForum, forumCategoryId,
  showPostForm, setShowPostForm, postForm, setPostForm, submittingPost, handlePostSubmit,
  profileId, profileName, profileAvatar, onPostDeleted,
  activeTheme, allThemes,
}: Props) {

  // ── Vue détail inline ────────────────────────────────────────────────────
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  // ── Sort & Search ────────────────────────────────────────────────────────
  const [sortMode,   setSortMode]   = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch,  setShowSearch]  = useState(false);

  // Thèmes disponibles : custom injectés depuis le parent, sinon thèmes système
  const themes: ForumTheme[] = allThemes ?? [...SYSTEM_THEMES];
  const activeThemeConfig = themes.find(t => t.id === activeTheme);

  // ── Filtered + sorted posts ───────────────────────────────────────────────
  const displayPosts = useMemo(() => {
    let list = [...forumPosts];

    // Filtre recherche textuelle
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.author?.full_name?.toLowerCase().includes(q))
      );
    }

    // Tri
    if (sortMode === 'active') {
      list = list.sort((a, b) => {
        const ca = (a.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
        const cb = (b.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
        return cb - ca;
      });
    }
    // 'recent' = déjà triés par created_at desc depuis le hook

    return list;
  }, [forumPosts, sortMode, searchQuery]);

  if (selectedPost) {
    return (
      <ForumPostDetail
        post={selectedPost}
        profileId={profileId}
        profileName={profileName}
        profileAvatar={profileAvatar}
        onBack={() => setSelectedPost(null)}
        onDeleted={() => {
          setSelectedPost(null);
          onPostDeleted?.();
        }}
      />
    );
  }

  // ── Liste des posts ──────────────────────────────────────────────────────
  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            {activeThemeConfig
              ? <><span>{activeThemeConfig.emoji}</span> {activeThemeConfig.label}</>
              : 'Échanges & conseils nature'}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeThemeConfig
              ? activeThemeConfig.sub
              : 'Partagez vos expériences, posez des questions, donnez des tuyaux'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bouton recherche */}
          <button
            onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery(''); }}
            className={cn(
              'p-2 rounded-xl border transition-colors',
              showSearch
                ? 'bg-sky-50 border-sky-200 text-sky-600'
                : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
            )}
            title="Rechercher"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Tri */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSortMode('recent')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors',
                sortMode === 'recent'
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <Clock className="w-3 h-3" /> Récents
            </button>
            <button
              onClick={() => setSortMode('active')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors',
                sortMode === 'active'
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <TrendingUp className="w-3 h-3" /> Actifs
            </button>
          </div>

          {profileId && (
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-600 text-white font-bold px-4 py-2 rounded-xl hover:from-sky-600 hover:to-teal-700 transition-colors text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau sujet</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Barre de recherche ── */}
      {showSearch && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Chercher dans les échanges…"
            className="w-full border border-sky-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-sky-50/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Formulaire nouveau sujet ── */}
      {showPostForm && profileId && (
        <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-sky-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-500" /> Nouveau sujet
            </h3>
            <button
              type="button"
              onClick={() => setShowPostForm(false)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sélecteur de thème */}
          <div className="mb-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
              <Tag className="w-3.5 h-3.5" /> Thème du sujet
            </label>
            <div className="flex flex-wrap gap-1.5">
              {themes.filter(t => t.id !== 'general').map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPostForm(f => ({ ...f, theme: t.id }))}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
                    postForm.theme === t.id
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700'
                  )}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Titre du sujet *"
            required
            value={postForm.title}
            onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <textarea
            placeholder="Votre message, question ou conseil de randonneur local…"
            rows={4}
            value={postForm.content}
            onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
            required
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submittingPost}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:from-sky-600 hover:to-teal-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submittingPost
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</>
                : 'Publier'}
            </button>
            <button
              type="button"
              onClick={() => setShowPostForm(false)}
              className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* ── États : chargement / pas de catégorie / vide / liste ── */}
      {loadingForum ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        </div>

      ) : !forumCategoryId ? (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MessageSquare className="w-7 h-7 text-sky-400" />
          </div>
          <p className="font-bold text-sky-800 mb-1 text-lg">Forum en cours d&apos;activation</p>
          <p className="text-sky-700 text-sm">
            Exécutez{' '}
            <code className="bg-sky-100 px-1 rounded font-mono text-xs">migration_themes.sql</code>{' '}
            dans Supabase pour activer ce forum.
          </p>
        </div>

      ) : displayPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-bold mb-1">
            {searchQuery
              ? `Aucun résultat pour « ${searchQuery} »`
              : activeTheme
                ? `Aucun échange dans « ${activeThemeConfig?.label ?? activeTheme} »`
                : 'Aucun échange pour l\'instant'}
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {searchQuery
              ? 'Essayez des mots-clés différents.'
              : activeTheme
                ? 'Soyez le premier à lancer une discussion sur ce thème !'
                : 'Posez une question ou partagez votre expérience !'}
          </p>
          {!searchQuery && profileId && (
            <button
              onClick={() => setShowPostForm(true)}
              className="inline-flex items-center gap-2 bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-sky-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Premier message
            </button>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 text-sky-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-sky-50 border border-sky-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Effacer la recherche
            </button>
          )}
        </div>

      ) : (
        <>
          {/* Indicateur résultats si recherche active */}
          {searchQuery && (
            <div className="flex items-center gap-2 mb-3 text-xs text-sky-600 font-semibold">
              <Search className="w-3.5 h-3.5" />
              {displayPosts.length} résultat{displayPosts.length !== 1 ? 's' : ''} pour «&nbsp;{searchQuery}&nbsp;»
              <button onClick={() => setSearchQuery('')} className="ml-auto text-gray-400 hover:text-red-500 flex items-center gap-1">
                <X className="w-3 h-3" /> Effacer
              </button>
            </div>
          )}

          {/* Indicateur tri actif */}
          {sortMode === 'active' && !searchQuery && (
            <div className="flex items-center gap-2 mb-3 text-xs text-teal-600 font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Triés par activité (le plus commenté en premier)
            </div>
          )}

          <div className="space-y-3">
            {displayPosts.map(post => {
              const comments = (post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
              const isHot    = comments >= 5;
              const theme    = themes.find(t => t.id === (post.theme || 'general'));

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-sky-200 hover:shadow-sm transition-all group"
                >
                  {/* Icône thème ou flamme */}
                  <div className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm text-xl',
                    isHot ? 'bg-amber-100' : (theme?.custom ? 'bg-violet-50' : 'bg-sky-50')
                  )}>
                    {isHot ? '🔥' : (theme?.emoji ?? '💬')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 group-hover:text-sky-700 transition-colors line-clamp-1 flex-1">
                        {post.title}
                      </h3>
                      {/* Badge thème */}
                      {theme && theme.id !== 'general' && (
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 hidden sm:inline-flex items-center gap-0.5 border',
                          theme.custom
                            ? 'bg-violet-50 text-violet-600 border-violet-200'
                            : 'bg-sky-50 text-sky-600 border-sky-100'
                        )}>
                          {theme.emoji} {theme.label}
                        </span>
                      )}
                      {isHot && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black flex-shrink-0">
                          🔥 Actif
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-2 line-clamp-2 text-left">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        {post.author && (
                          <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />
                        )}
                        {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
                      </span>
                      {/* Compteur de réponses — pill colorée si actif */}
                      <span className={cn(
                        'flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full',
                        comments > 0
                          ? isHot
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-sky-50 text-sky-600'
                          : 'text-gray-300'
                      )}>
                        <MessageSquare className="w-3 h-3" />
                        {comments > 0 ? `${comments} réponse${comments > 1 ? 's' : ''}` : 'Aucune réponse'}
                      </span>
                    </div>
                  </div>

                  {/* Flèche */}
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-sky-400 flex-shrink-0 mt-1 transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Invite connexion ── */}
      {!profileId && (
        <div className="mt-6 bg-sky-50 border border-sky-200 rounded-2xl p-6 text-center">
          <p className="text-sky-800 font-bold mb-1">Rejoignez la communauté</p>
          <p className="text-sky-700 text-sm mb-4">Connectez-vous pour participer aux échanges.</p>
          <a
            href="/connexion"
            className="inline-flex items-center gap-2 bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-sky-600 transition-colors"
          >
            Se connecter
          </a>
        </div>
      )}
    </div>
  );
}

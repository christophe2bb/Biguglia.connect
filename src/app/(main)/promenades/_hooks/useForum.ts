'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumPost } from '../_types';

// ─── Thèmes système (fixes) ───────────────────────────────────────────────────
export const SYSTEM_THEMES = [
  { id: 'itineraires', emoji: '🗺️', label: 'Itinéraires',    sub: 'Partage de parcours'   },
  { id: 'nature',      emoji: '🌿', label: 'Nature & faune',  sub: 'Observations terrain'  },
  { id: 'alertes',     emoji: '⚠️', label: 'Alertes terrain', sub: 'Chemins, météo'        },
  { id: 'chien',       emoji: '🐕', label: 'Balades chien',   sub: 'Conseils & spots'      },
  { id: 'famille',     emoji: '👨‍👩‍👧', label: 'Famille',        sub: 'Sorties enfants'       },
  { id: 'photo',       emoji: '📸', label: 'Spots photo',     sub: 'Bons plans photo'      },
  { id: 'velo',        emoji: '🚴', label: 'Vélo & VTT',      sub: 'Circuits cyclables'    },
  { id: 'questions',   emoji: '❓', label: 'Questions',       sub: 'Aide & conseils'       },
] as const;

export type SystemThemeId = typeof SYSTEM_THEMES[number]['id'];

// Thème générique partagé entre système et custom
export type ForumTheme = {
  id:            string;
  emoji:         string;
  label:         string;
  sub:           string;
  custom?:       boolean;   // true = créé par l'utilisateur
  lastActivity?: string;    // ISO date du dernier post sur ce thème
};

// Liste plate utilisable dans les widgets (système + custom)
export const FORUM_THEMES: ForumTheme[] = [...SYSTEM_THEMES];

// Types de tri disponibles dans le forum
export type ForumSort = 'recent' | 'hot';

// ─── Fallback intelligent pour les slugs inconnus ─────────────────────────────
/** Tente de déduire un emoji et un label lisible depuis un slug. */
function slugToThemeMeta(slug: string): { emoji: string; label: string; sub: string } {
  const map: Record<string, { emoji: string; label: string; sub: string }> = {
    ornithologie: { emoji: '🦅', label: 'Ornithologie',    sub: 'Oiseaux & faune ailée' },
    jogging:      { emoji: '🏃', label: 'Jogging',         sub: 'Course à pied' },
    vtt:          { emoji: '🚵', label: 'VTT',             sub: 'Vélo tout-terrain' },
    yoga:         { emoji: '🧘', label: 'Yoga nature',     sub: 'Pleine conscience' },
    paddle:       { emoji: '🏄', label: 'Paddle',          sub: 'Sur l\'eau' },
    peche:        { emoji: '🎣', label: 'Pêche',           sub: 'Bons coins & conseils' },
    escalade:     { emoji: '🧗', label: 'Escalade',        sub: 'Sites & niveaux' },
    champignons:  { emoji: '🍄', label: 'Champignons',     sub: 'Cueillette & identification' },
    flore:        { emoji: '🌸', label: 'Flore locale',    sub: 'Plantes & espèces' },
    nocturne:     { emoji: '🌙', label: 'Sorties nocturnes', sub: 'Balades de nuit' },
    aquatique:    { emoji: '🌊', label: 'Aquatique',       sub: 'Rivières, étangs' },
    meditation:   { emoji: '🌿', label: 'Méditation',      sub: 'Nature & bien-être' },
  };
  if (map[slug]) return map[slug];
  // Heuristique : met en majuscule le premier char, remplace les tirets par des espaces
  const label = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { emoji: '💬', label, sub: 'Thème personnalisé' };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useForum(profile: { id: string } | null | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [forumPosts,      setForumPosts]      = useState<ForumPost[]>([]);
  const [allForumPosts,   setAllForumPosts]   = useState<ForumPost[]>([]);
  const [loadingForum,    setLoadingForum]    = useState(false);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [activeTheme,     setActiveTheme]     = useState<string | null>(null);
  const [forumSort,       setForumSort]       = useState<ForumSort>('recent');

  // ── Thèmes personnalisés créés par l'utilisateur (session courante) ─────────
  const [customThemes, setCustomThemes] = useState<ForumTheme[]>([]);

  const [showPostForm,   setShowPostForm]   = useState(false);
  const [postForm,       setPostForm]       = useState({ title: '', content: '', theme: 'general' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Liste complète des thèmes = système + custom + découverts ───────────────
  const allThemes = useMemo<ForumTheme[]>(() => {
    const knownIds = new Set([
      ...SYSTEM_THEMES.map(t => t.id),
      ...customThemes.map(t => t.id),
      'general',
    ]);

    // Dernière activité par thème
    const lastActivityMap: Record<string, string> = {};
    for (const p of allForumPosts) {
      const t = p.theme || 'general';
      if (!lastActivityMap[t] || p.created_at > lastActivityMap[t]) {
        lastActivityMap[t] = p.created_at;
      }
    }

    const discoveredThemes: ForumTheme[] = [];
    for (const p of allForumPosts) {
      const t = p.theme;
      if (t && !knownIds.has(t)) {
        knownIds.add(t);
        // ① Cherche d'abord les métadonnées stockées sur le post lui-même
        if (p.theme_label) {
          discoveredThemes.push({
            id:    t,
            emoji: p.theme_emoji || '💬',
            label: p.theme_label,
            sub:   p.theme_sub  || 'Thème personnalisé',
            custom: true,
            lastActivity: lastActivityMap[t],
          });
        } else {
          // ② Fallback intelligent depuis le slug
          const meta = slugToThemeMeta(t);
          discoveredThemes.push({ id: t, ...meta, custom: true, lastActivity: lastActivityMap[t] });
        }
      }
    }

    // Injecter lastActivity aussi dans les thèmes système et custom connus
    const withActivity = (t: ForumTheme): ForumTheme => ({
      ...t,
      lastActivity: lastActivityMap[t.id],
    });

    return [
      ...SYSTEM_THEMES.map(withActivity),
      ...customThemes.map(withActivity),
      ...discoveredThemes,
    ];
  }, [customThemes, allForumPosts]);

  // ── Ajouter un thème custom (appelé depuis le modal) ─────────────────────────
  const addCustomTheme = useCallback((theme: ForumTheme) => {
    setCustomThemes(prev => {
      if (prev.some(t => t.id === theme.id)) return prev;
      return [...prev, { ...theme, custom: true }];
    });
    setPostForm(f => ({ ...f, theme: theme.id }));
    setActiveTheme(theme.id);
  }, []);

  // ── Comptage par thème ──────────────────────────────────────────────────────
  const themeCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const p of allForumPosts) {
      const t = p.theme || 'general';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [allForumPosts]);

  // ── Filtrage + tri client-side ───────────────────────────────────────────────
  const filteredPosts = useMemo<ForumPost[]>(() => {
    let posts = activeTheme
      ? allForumPosts.filter(p => (p.theme || 'general') === activeTheme)
      : allForumPosts;

    if (forumSort === 'hot') {
      posts = [...posts].sort((a, b) => {
        const ca = (a.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
        const cb = (b.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
        return cb - ca;
      });
    }
    // 'recent' conserve l'ordre Supabase (created_at DESC)
    return posts;
  }, [allForumPosts, activeTheme, forumSort]);

  const applyThemeFilter = useCallback((theme: string | null) => {
    setActiveTheme(theme);
  }, []);

  // ── Fetch depuis Supabase ───────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase
      .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);
    if (!catId) { setLoadingForum(false); return; }

    const { data } = await supabase
      .from('forum_posts')
      .select(`*, theme, theme_label, theme_emoji, theme_sub,
               author:profiles!forum_posts_author_id_fkey(full_name, avatar_url),
               comment_count:forum_comments(count)`)
      .eq('category_id', catId)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    const posts = (data as unknown as ForumPost[]) || [];
    setAllForumPosts(posts);
    setForumPosts(posts);
    setLoadingForum(false);
  }, [supabase]);

  // ── Créer un post ───────────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Titre et contenu requis');
      return;
    }
    setSubmittingPost(true);

    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) { toast.error('Catégorie forum introuvable'); setSubmittingPost(false); return; }

    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id:   profile.id,
      title:       postForm.title.trim(),
      content:     postForm.content.trim(),
      theme:       postForm.theme || 'general',
    });

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '', theme: activeTheme || 'general' });
      setShowPostForm(false);
      await fetchForum();
    }
    setSubmittingPost(false);
  };

  return {
    forumPosts: filteredPosts,
    allForumPosts,
    allThemes,
    customThemes,
    addCustomTheme,
    loadingForum,
    forumCategoryId,
    activeTheme,
    applyThemeFilter,
    themeCounts,
    forumSort,
    setForumSort,
    showPostForm, setShowPostForm,
    postForm, setPostForm,
    submittingPost,
    fetchForum,
    handlePostSubmit,
  };
}

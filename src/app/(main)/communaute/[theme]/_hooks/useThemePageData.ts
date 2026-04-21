'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import type { ThemeMember } from '@/components/ui/MemberCard';
import type { Discussion, ThemeTab } from '../_types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useThemePageData(themeSlug: string) {
  const { profile } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ThemeTab>('membres');

  // ── Members state ─────────────────────────────────────────────────────────
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<ThemeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMember, setIsMember] = useState(false);

  // ── Discussions state ─────────────────────────────────────────────────────
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discLoading, setDiscLoading] = useState(false);
  const [discError, setDiscError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const discussEndRef    = useRef<HTMLDivElement>(null);
  const rafDiscussRef    = useRef<number | null>(null);

  // ── Filtered members (derived) ────────────────────────────────────────────
  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        const name = (m.profile?.full_name ?? '').toLowerCase();
        const tags = (m.theme_profile?.tags ?? []).join(' ').toLowerCase();
        const level = (m.theme_profile?.level ?? '').toLowerCase();
        const matchSearch =
          !search ||
          name.includes(search.toLowerCase()) ||
          tags.includes(search.toLowerCase());
        const matchLevel = !filterLevel || level.includes(filterLevel.toLowerCase());
        return matchSearch && matchLevel;
      }),
    [members, search, filterLevel]
  );

  // ── Load members ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!themeSlug) return;
    setLoading(true);
    setLoadError(null);

    const run = async () => {
      // 1. Active memberships
      const { data: memberships, error: errM } = await supabase
        .from('theme_memberships')
        .select('id, user_id, joined_at')
        .eq('theme_slug', themeSlug)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (errM) {
        if (errM.code === '42P01' || errM.message?.includes('does not exist')) {
          setLoadError('sql_missing');
        } else {
          console.error('Erreur theme_memberships:', errM);
          setLoadError('generic');
        }
        setLoading(false);
        return;
      }

      const list = memberships ?? [];
      setMemberCount(list.length);

      if (profile?.id) {
        setIsMember(list.some((m) => m.user_id === profile.id));
      }

      if (list.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = list.map((m) => m.user_id);

      // 2. User profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // 3. Theme mini-profiles (optional table)
      let themeProfiles: Array<{
        user_id: string;
        bio?: string;
        tags?: string[];
        level?: string;
        looking_for?: string;
        offering?: string;
        location_zone?: string;
      }> = [];
      try {
        const { data: tp } = await supabase
          .from('theme_profiles')
          .select('user_id, bio, tags, level, looking_for, offering, location_zone')
          .eq('theme_slug', themeSlug)
          .in('user_id', userIds);
        themeProfiles = tp ?? [];
      } catch {
        // table absent → continue without theme profiles
      }

      // 4. Assemble
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      const tpMap = Object.fromEntries(themeProfiles.map((tp) => [tp.user_id, tp]));

      const assembled: ThemeMember[] = list.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        profile: profileMap[m.user_id] ?? null,
        theme_profile: tpMap[m.user_id] ?? null,
      }));

      setMembers(assembled);
      setLoading(false);
    };

    run();
  }, [themeSlug, refreshKey, supabase, profile?.id]);

  // ── Load discussions ──────────────────────────────────────────────────────
  const loadDiscussions = useCallback(async () => {
    setDiscLoading(true);
    setDiscError(null);
    try {
      const { data, error } = await supabase
        .from('theme_discussions')
        .select('id, author_id, content, created_at, is_pinned, likes_count')
        .eq('theme_slug', themeSlug)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setDiscError('sql_missing');
        } else {
          setDiscError('generic');
        }
        setDiscLoading(false);
        return;
      }

      const items = data ?? [];
      if (items.length === 0) {
        setDiscussions([]);
        setDiscLoading(false);
        return;
      }

      // Load authors
      const authorIds = Array.from(new Set(items.map((d) => d.author_id)));
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a]));

      // My likes (if connected)
      let myLikes: string[] = [];
      if (profile?.id) {
        const { data: likes } = await supabase
          .from('theme_discussion_likes')
          .select('discussion_id')
          .eq('user_id', profile.id)
          .in('discussion_id', items.map((d) => d.id));
        myLikes = (likes ?? []).map((l) => l.discussion_id);
      }

      setDiscussions(
        items.map((d) => ({
          ...d,
          author: authorMap[d.author_id] ?? null,
          my_like: myLikes.includes(d.id),
        }))
      );
    } catch {
      setDiscError('generic');
    } finally {
      setDiscLoading(false);
    }
  }, [themeSlug, supabase, profile?.id]);

  useEffect(() => {
    if (activeTab !== 'discussions' || !themeSlug) return;
    loadDiscussions();
  }, [activeTab, themeSlug, loadDiscussions]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!profile || !newMessage.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const { data, error } = await supabase
        .from('theme_discussions')
        .insert({
          theme_slug: themeSlug,
          author_id: profile.id,
          content: newMessage.trim(),
        })
        .select('id, author_id, content, created_at, is_pinned, likes_count')
        .single();

      if (error) throw error;

      setDiscussions((prev) => [
        ...prev,
        {
          ...data,
          author: {
            full_name: profile.full_name ?? 'Moi',
            avatar_url: profile.avatar_url,
          },
          my_like: false,
        },
      ]);
      setNewMessage('');
      if (rafDiscussRef.current !== null) cancelAnimationFrame(rafDiscussRef.current);
      rafDiscussRef.current = requestAnimationFrame(() => {
        rafDiscussRef.current = null;
        discussEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch {
      // ignore silently
    } finally {
      setSendingMsg(false);
    }
  }, [profile, newMessage, sendingMsg, supabase, themeSlug]);

  // ── Toggle like ───────────────────────────────────────────────────────────
  const handleLike = useCallback(
    async (disc: Discussion) => {
      if (!profile) return;
      if (disc.my_like) {
        await supabase
          .from('theme_discussion_likes')
          .delete()
          .eq('discussion_id', disc.id)
          .eq('user_id', profile.id);
        setDiscussions((prev) =>
          prev.map((d) =>
            d.id === disc.id
              ? { ...d, likes_count: Math.max(0, d.likes_count - 1), my_like: false }
              : d
          )
        );
      } else {
        await supabase.from('theme_discussion_likes').upsert(
          { discussion_id: disc.id, user_id: profile.id },
          { onConflict: 'discussion_id,user_id', ignoreDuplicates: true }
        );
        setDiscussions((prev) =>
          prev.map((d) =>
            d.id === disc.id ? { ...d, likes_count: d.likes_count + 1, my_like: true } : d
          )
        );
      }
    },
    [profile, supabase]
  );

  // ── Membership callbacks ───────────────────────────────────────────────────
  const handleJoined = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsMember(true);
  }, []);

  const handleLeft = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsMember(false);
  }, []);

  const handleLeftFromProfile = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsMember(false);
    setActiveTab('membres');
  }, []);

  return {
    // auth
    profile,
    // tab
    activeTab,
    setActiveTab,
    // members
    memberCount,
    members,
    filteredMembers,
    loading,
    loadError,
    search,
    setSearch,
    filterLevel,
    setFilterLevel,
    refreshKey,
    setRefreshKey,
    isMember,
    // discussions
    discussions,
    discLoading,
    discError,
    newMessage,
    setNewMessage,
    sendingMsg,
    discussEndRef,
    loadDiscussions,
    handleSendMessage,
    handleLike,
    // membership callbacks
    handleJoined,
    handleLeft,
    handleLeftFromProfile,
  };
}

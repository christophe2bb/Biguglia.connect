'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Search, Filter, UserCheck, Settings, ChevronRight,
  Loader2, RefreshCw, Info, MessageSquare, Plus,
  Gem, Footprints, PartyPopper, HandHeart, Package,
  ShoppingBag, MapPin, Wrench, AlertTriangle,
  Send, Pin, ThumbsUp, Clock,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import MemberCard, { ThemeMember } from '@/components/ui/MemberCard';
import ThemeProfileForm from '@/components/ui/ThemeProfileForm';

// ─── Config des thèmes ────────────────────────────────────────────────────────
const THEME_CONFIG: Record<string, {
  label: string;
  emoji: string;
  bgGradient: string;
  headerBg: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
  href: string;
  description: string;
  icon: React.ElementType;
}> = {
  collectionneurs: {
    label: 'Collectionneurs',
    emoji: '🏆',
    bgGradient: 'from-amber-50 to-yellow-50',
    headerBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    accentBg: 'bg-amber-50',
    href: '/collectionneurs',
    description: 'Vendez, échangez, donnez ou recherchez des objets de collection.',
    icon: Gem,
  },
  promenades: {
    label: 'Promenades',
    emoji: '🥾',
    bgGradient: 'from-green-50 to-emerald-50',
    headerBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    accentBg: 'bg-green-50',
    href: '/promenades',
    description: 'Partagez des balades, découvrez les sentiers autour de Biguglia.',
    icon: Footprints,
  },
  evenements: {
    label: 'Événements',
    emoji: '🎉',
    bgGradient: 'from-pink-50 to-rose-50',
    headerBg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    accentBg: 'bg-pink-50',
    href: '/evenements',
    description: 'Participez aux événements locaux et rencontrez les habitants.',
    icon: PartyPopper,
  },
  associations: {
    label: 'Associations',
    emoji: '🤝',
    bgGradient: 'from-blue-50 to-sky-50',
    headerBg: 'bg-gradient-to-r from-blue-500 to-sky-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    accentBg: 'bg-blue-50',
    href: '/associations',
    description: 'Rejoignez des associations locales, devenez bénévole.',
    icon: HandHeart,
  },
  'coups-de-main': {
    label: 'Coups de main',
    emoji: '🙌',
    bgGradient: 'from-orange-50 to-amber-50',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    accentBg: 'bg-orange-50',
    href: '/coups-de-main',
    description: 'Entraidez-vous : proposez ou demandez un coup de main.',
    icon: HandHeart,
  },
  materiel: {
    label: 'Matériel',
    emoji: '🔧',
    bgGradient: 'from-teal-50 to-cyan-50',
    headerBg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    accentBg: 'bg-teal-50',
    href: '/materiel',
    description: 'Prêtez ou empruntez du matériel entre voisins.',
    icon: Package,
  },
  annonces: {
    label: 'Annonces',
    emoji: '📢',
    bgGradient: 'from-violet-50 to-purple-50',
    headerBg: 'bg-gradient-to-r from-violet-500 to-purple-500',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    accentBg: 'bg-violet-50',
    href: '/annonces',
    description: 'Achetez, vendez ou donnez des objets localement.',
    icon: ShoppingBag,
  },
  'perdu-trouve': {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    bgGradient: 'from-red-50 to-rose-50',
    headerBg: 'bg-gradient-to-r from-red-500 to-rose-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    accentBg: 'bg-red-50',
    href: '/perdu-trouve',
    description: 'Signalez un objet perdu ou trouvé à Biguglia.',
    icon: MapPin,
  },
  forum: {
    label: 'Forum',
    emoji: '💬',
    bgGradient: 'from-indigo-50 to-blue-50',
    headerBg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    accentBg: 'bg-indigo-50',
    href: '/forum',
    description: 'Discussions libres entre habitants de Biguglia.',
    icon: MessageSquare,
  },
  artisans: {
    label: 'Artisans',
    emoji: '🔨',
    bgGradient: 'from-orange-50 to-amber-50',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    accentBg: 'bg-orange-50',
    href: '/artisans',
    description: 'Artisans vérifiés de Biguglia — SIRET, assurance, avis.',
    icon: Wrench,
  },
};

const DEFAULT_THEME = {
  label: 'Communauté',
  emoji: '🏘️',
  bgGradient: 'from-gray-50 to-slate-50',
  headerBg: 'bg-gradient-to-r from-gray-500 to-slate-500',
  textColor: 'text-gray-700',
  borderColor: 'border-gray-200',
  accentBg: 'bg-gray-50',
  href: '/',
  description: 'Communauté locale de Biguglia.',
  icon: Users,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Discussion {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  likes_count: number;
  author?: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
  my_like?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommunauteThemePage() {
  const rawParams = useParams();
  const themeSlug = (Array.isArray(rawParams?.theme) ? rawParams.theme[0] : rawParams?.theme) ?? '';
  const { profile } = useAuthStore();
  const supabase = createClient();
  const themeConfig = THEME_CONFIG[themeSlug] ?? DEFAULT_THEME;

  const [activeTab, setActiveTab] = useState<'membres' | 'discussions' | 'monprofil'>('membres');
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<ThemeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Discussions state ──────────────────────────────────────────────────────
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discLoading, setDiscLoading] = useState(false);
  const [discError, setDiscError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const discussEndRef = useRef<HTMLDivElement>(null);

  // ── Charger les membres en requêtes séparées ──────────────────────────────
  useEffect(() => {
    if (!themeSlug) return;
    setLoading(true);
    setLoadError(null);

    const run = async () => {
      // 1. Adhésions actives
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

      // Vérifier si l'utilisateur est membre
      if (profile?.id) {
        setIsMember(list.some((m) => m.user_id === profile.id));
      }

      if (list.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = list.map((m) => m.user_id);

      // 2. Profils utilisateurs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // 3. Mini-profils thématiques (optionnel)
      let themeProfiles: any[] = [];
      try {
        const { data: tp } = await supabase
          .from('theme_profiles')
          .select('user_id, bio, tags, level, looking_for, offering, location_zone')
          .eq('theme_slug', themeSlug)
          .in('user_id', userIds);
        themeProfiles = tp ?? [];
      } catch {
        // table absente → continuer
      }

      // 4. Assembler
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug, refreshKey]);

  // ── Charger les discussions ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'discussions' || !themeSlug) return;
    loadDiscussions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, themeSlug]);

  const loadDiscussions = async () => {
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

      // Charger les auteurs
      const authorIdsSet = new Set(items.map((d) => d.author_id));
      const authorIds = Array.from(authorIdsSet);
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a]));

      // Mes likes (si connecté)
      let myLikes: string[] = [];
      if (profile?.id) {
        const { data: likes } = await supabase
          .from('theme_discussion_likes')
          .select('discussion_id')
          .eq('user_id', profile.id)
          .in('discussion_id', items.map((d) => d.id));
        myLikes = (likes ?? []).map((l) => l.discussion_id);
      }

      setDiscussions(items.map((d) => ({
        ...d,
        author: authorMap[d.author_id] ?? null,
        my_like: myLikes.includes(d.id),
      })));
    } catch {
      setDiscError('generic');
    } finally {
      setDiscLoading(false);
    }
  };

  const handleSendMessage = async () => {
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
      setTimeout(() => discussEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      // ignore silently
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLike = async (disc: Discussion) => {
    if (!profile) return;
    if (disc.my_like) {
      // unlike
      await supabase.from('theme_discussion_likes').delete()
        .eq('discussion_id', disc.id).eq('user_id', profile.id);
      setDiscussions((prev) => prev.map((d) =>
        d.id === disc.id ? { ...d, likes_count: Math.max(0, d.likes_count - 1), my_like: false } : d
      ));
    } else {
      // like
      await supabase.from('theme_discussion_likes').upsert(
        { discussion_id: disc.id, user_id: profile.id },
        { onConflict: 'discussion_id,user_id', ignoreDuplicates: true }
      );
      setDiscussions((prev) => prev.map((d) =>
        d.id === disc.id ? { ...d, likes_count: d.likes_count + 1, my_like: true } : d
      ));
    }
  };

  // ── Filtrage membres ──────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const name = (m.profile?.full_name ?? '').toLowerCase();
    const tags = (m.theme_profile?.tags ?? []).join(' ').toLowerCase();
    const level = (m.theme_profile?.level ?? '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || tags.includes(search.toLowerCase());
    const matchLevel = !filterLevel || level.includes(filterLevel.toLowerCase());
    return matchSearch && matchLevel;
  });

  const IconComp = themeConfig.icon;

  // ── Formatage date ────────────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // ── SQL manquant ──────────────────────────────────────────────────────────
  if (loadError === 'sql_missing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-amber-200 shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Tables communautés manquantes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Les tables <code className="bg-gray-100 px-1 rounded">theme_memberships</code> et{' '}
            <code className="bg-gray-100 px-1 rounded">theme_profiles</code> n&apos;existent pas encore dans Supabase.
          </p>
          <p className="text-sm text-gray-500 mb-5">
            Allez dans <strong>Admin → Migration DB</strong> et cliquez sur{' '}
            <strong>« Copier SQL Communautés »</strong>, puis collez-le dans Supabase → SQL Editor → Run.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/admin/migration"
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
            >
              Aller à la Migration DB
            </Link>
            <Link
              href={themeConfig.href}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
            >
              Retour au thème
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className={`${themeConfig.headerBg} text-white`}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Fil d'ariane */}
          <nav className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Link href="/" className="hover:text-white transition">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={themeConfig.href} className="hover:text-white transition">{themeConfig.label}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-medium">Communauté</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                {themeConfig.emoji}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Communauté {themeConfig.label}</h1>
                <p className="text-white/80 text-sm mt-0.5">{themeConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{loading ? '…' : memberCount}</span>
                <span className="text-white/80">membre{memberCount !== 1 ? 's' : ''}</span>
              </div>
              <CommunityJoinButton
                themeSlug={themeSlug}
                userId={profile?.id}
                size="md"
                onJoined={() => { setRefreshKey((k) => k + 1); setIsMember(true); }}
                onLeft={() => { setRefreshKey((k) => k + 1); setIsMember(false); }}
                className="bg-white text-gray-800 hover:bg-gray-50 border-white/0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sous-navigation ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <Link
              href={themeConfig.href}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300 transition"
            >
              <IconComp className="w-4 h-4" />
              {themeConfig.label}
            </Link>
            <button
              onClick={() => setActiveTab('membres')}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
                activeTab === 'membres'
                  ? 'text-brand-700 border-brand-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Membres
              {!loading && (
                <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {memberCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
                activeTab === 'discussions'
                  ? 'text-brand-700 border-brand-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Discussions
              {discussions.length > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {discussions.length}
                </span>
              )}
            </button>
            {profile && (
              <button
                onClick={() => setActiveTab('monprofil')}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
                  activeTab === 'monprofil'
                    ? 'text-brand-700 border-brand-500 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Mon profil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu principal ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Onglet MEMBRES ─────────────────────────────────────────────── */}
        {activeTab === 'membres' && (
          <div className="space-y-5">

            {/* Barre recherche + filtre */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un membre, un tag..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="">Tous les niveaux</option>
                  <option value="débutant">Débutant</option>
                  <option value="intermédiaire">Intermédiaire</option>
                  <option value="avancé">Avancé</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition flex-shrink-0"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bannière si non connecté */}
            {!profile && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Rejoignez la communauté</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    <Link href="/connexion" className="underline font-semibold">Connectez-vous</Link>{' '}
                    pour rejoindre ce thème et apparaître dans la liste des membres.
                  </p>
                </div>
              </div>
            )}

            {/* Grille membres */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2 text-sm">Chargement des membres…</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {search || filterLevel
                    ? 'Aucun membre ne correspond à votre recherche.'
                    : "Aucun membre dans cette communauté pour l'instant."}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {profile
                    ? 'Soyez le premier ! Cliquez sur « Rejoindre » ci-dessus.'
                    : <><Link href="/connexion" className="text-brand-600 underline">Se connecter</Link> et rejoindre ce thème.</>
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserId={profile?.id}
                    themeSlug={themeSlug}
                    themeLabel={themeConfig.label}
                  />
                ))}
              </div>
            )}

            {/* CTA compléter profil */}
            {profile && !loading && memberCount > 0 && (
              <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
                <div>
                  <p className={`font-semibold ${themeConfig.textColor}`}>
                    Complétez votre mini-profil {themeConfig.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Ajoutez votre bio, vos centres d&apos;intérêt et ce que vous proposez pour être plus visible.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('monprofil')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} bg-white hover:shadow-sm transition whitespace-nowrap flex-shrink-0`}
                >
                  <Settings className="w-4 h-4" />
                  Mon profil
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet DISCUSSIONS ─────────────────────────────────────────── */}
        {activeTab === 'discussions' && (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Info non-membre */}
            {!profile && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  <Link href="/connexion" className="font-semibold underline">Connectez-vous</Link>{' '}
                  et rejoignez la communauté pour participer aux discussions.
                </p>
              </div>
            )}

            {profile && !isMember && (
              <div className={`${themeConfig.accentBg} border ${themeConfig.borderColor} rounded-2xl p-4 flex items-center justify-between gap-3`}>
                <p className={`text-sm ${themeConfig.textColor} font-medium`}>
                  Rejoignez la communauté pour participer aux discussions publiques.
                </p>
                <CommunityJoinButton
                  themeSlug={themeSlug}
                  userId={profile.id}
                  size="sm"
                  onJoined={() => { setRefreshKey((k) => k + 1); setIsMember(true); }}
                  onLeft={() => { setIsMember(false); }}
                />
              </div>
            )}

            {/* SQL manquant pour les discussions */}
            {discError === 'sql_missing' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm text-amber-800 font-medium mb-1">Table discussions manquante</p>
                <p className="text-xs text-amber-600 mb-3">
                  Exécutez le SQL « Discussions communautaires » dans Admin → Migration DB.
                </p>
                <Link href="/admin/migration" className="text-xs font-bold text-amber-700 underline">
                  Admin → Migration DB →
                </Link>
              </div>
            )}

            {/* Liste des discussions */}
            {discLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Chargement des discussions…</span>
              </div>
            ) : discError !== 'sql_missing' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    Discussions publiques
                  </h2>
                  <button
                    onClick={loadDiscussions}
                    className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg"
                    title="Actualiser"
                  >
                    <RefreshCw className={`w-4 h-4 ${discLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Messages */}
                <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                  {discussions.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Aucune discussion pour l&apos;instant</p>
                      <p className="text-xs mt-1">Soyez le premier à lancer la conversation !</p>
                    </div>
                  ) : (
                    discussions.map((disc) => (
                      <div
                        key={disc.id}
                        className={`px-5 py-4 flex gap-3 hover:bg-gray-50/50 transition ${
                          disc.is_pinned ? 'bg-amber-50/50 border-l-4 border-l-amber-300' : ''
                        }`}
                      >
                        <Avatar
                          src={disc.author?.avatar_url}
                          name={disc.author?.full_name ?? '?'}
                          size="sm"
                          className="flex-shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {disc.author?.full_name ?? 'Membre'}
                            </span>
                            {disc.is_pinned && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                <Pin className="w-2.5 h-2.5" /> Épinglé
                              </span>
                            )}
                            {disc.author_id === profile?.id && (
                              <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">
                                Vous
                              </span>
                            )}
                            <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-auto flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatTime(disc.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                            {disc.content}
                          </p>
                          {/* Actions */}
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => profile && handleLike(disc)}
                              disabled={!profile}
                              className={`flex items-center gap-1 text-xs transition ${
                                disc.my_like
                                  ? 'text-brand-600 font-semibold'
                                  : 'text-gray-400 hover:text-brand-500'
                              } disabled:cursor-default`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              {disc.likes_count > 0 && <span>{disc.likes_count}</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={discussEndRef} />
                </div>

                {/* Zone de saisie */}
                {profile && isMember && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex gap-2">
                      <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 flex gap-2">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Partagez avec la communauté… (Entrée pour envoyer)"
                          rows={2}
                          maxLength={500}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMsg}
                          className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
                        >
                          {sendingMsg ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 ml-9">
                      {newMessage.length}/500 · Shift+Entrée pour sauter une ligne
                    </p>
                  </div>
                )}

                {/* CTA rejoindre si connecté mais pas membre */}
                {profile && !isMember && discError !== 'sql_missing' && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-3">Rejoignez la communauté pour participer</p>
                    <CommunityJoinButton
                      themeSlug={themeSlug}
                      userId={profile.id}
                      size="sm"
                      onJoined={() => { setRefreshKey((k) => k + 1); setIsMember(true); }}
                      onLeft={() => setIsMember(false)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CTA Ajouter depuis la page thème */}
            <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-4 flex items-center justify-between gap-3`}>
              <div>
                <p className={`text-sm font-semibold ${themeConfig.textColor}`}>
                  Envie de publier du contenu ?
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Publiez une annonce, une sortie ou un événement sur la page {themeConfig.label}.
                </p>
              </div>
              <Link
                href={themeConfig.href}
                className={`flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} hover:shadow-sm transition whitespace-nowrap flex-shrink-0`}
              >
                <Plus className="w-4 h-4" />
                Publier
              </Link>
            </div>
          </div>
        )}

        {/* ── Onglet MON PROFIL ──────────────────────────────────────────── */}
        {activeTab === 'monprofil' && profile && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`${themeConfig.headerBg} p-5 flex items-center gap-4 text-white`}>
                <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                <div>
                  <p className="font-bold text-lg">{profile.full_name}</p>
                  <p className="text-white/80 text-sm">Mon mini-profil · {themeConfig.label}</p>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Statut d&apos;adhésion</span>
                </div>
                <CommunityJoinButton
                  themeSlug={themeSlug}
                  userId={profile.id}
                  size="sm"
                  onJoined={() => { setRefreshKey((k) => k + 1); setIsMember(true); }}
                  onLeft={() => {
                    setRefreshKey((k) => k + 1);
                    setIsMember(false);
                    setActiveTab('membres');
                  }}
                />
              </div>

              <div className="p-5">
                <ThemeProfileForm
                  userId={profile.id}
                  themeSlug={themeSlug}
                  onSaved={() => {
                    setRefreshKey((k) => k + 1);
                    setActiveTab('membres');
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Non connecté → onglet profil */}
        {activeTab === 'monprofil' && !profile && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-2">Connexion requise</p>
            <p className="text-sm text-gray-500 mb-4">
              Connectez-vous pour gérer votre profil dans cette communauté.
            </p>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition"
            >
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

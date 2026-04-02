'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Search, Filter, UserCheck, Settings, ChevronRight,
  Loader2, RefreshCw, MessageSquare, Trophy, Star, Info,
  Gem, Footprints, PartyPopper, HandHeart, Package,
  ShoppingBag, MapPin, BookOpen, Wrench, AlertTriangle,
} from 'lucide-react';
// Avatar unused directly — kept via MemberCard
import Avatar from '@/components/ui/Avatar';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import MemberCard, { ThemeMember } from '@/components/ui/MemberCard';
import ThemeProfileForm from '@/components/ui/ThemeProfileForm';
import toast from 'react-hot-toast';

// ─── Config des thèmes ────────────────────────────────────────────────────────
const THEME_CONFIG: Record<string, {
  label: string;
  emoji: string;
  color: string;
  bgGradient: string;
  headerBg: string;
  textColor: string;
  borderColor: string;
  href: string;
  description: string;
  icon: React.ElementType;
}> = {
  collectionneurs: {
    label: 'Collectionneurs',
    emoji: '🏆',
    color: 'amber',
    bgGradient: 'from-amber-50 to-yellow-50',
    headerBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    href: '/collectionneurs',
    description: 'Vendez, échangez, donnez ou recherchez des objets de collection.',
    icon: Gem,
  },
  promenades: {
    label: 'Promenades',
    emoji: '🥾',
    color: 'green',
    bgGradient: 'from-green-50 to-emerald-50',
    headerBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    href: '/promenades',
    description: 'Partagez des balades, découvrez les sentiers autour de Biguglia.',
    icon: Footprints,
  },
  evenements: {
    label: 'Événements',
    emoji: '🎉',
    color: 'pink',
    bgGradient: 'from-pink-50 to-rose-50',
    headerBg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    href: '/evenements',
    description: 'Participez aux événements locaux et rencontrez les habitants.',
    icon: PartyPopper,
  },
  associations: {
    label: 'Associations',
    emoji: '🤝',
    color: 'blue',
    bgGradient: 'from-blue-50 to-sky-50',
    headerBg: 'bg-gradient-to-r from-blue-500 to-sky-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    href: '/associations',
    description: 'Rejoignez des associations locales, devenez bénévole.',
    icon: HandHeart,
  },
  'coups-de-main': {
    label: 'Coups de main',
    emoji: '🙌',
    color: 'orange',
    bgGradient: 'from-orange-50 to-amber-50',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    href: '/coups-de-main',
    description: 'Entraidez-vous : proposez ou demandez un coup de main.',
    icon: HandHeart,
  },
  materiel: {
    label: 'Matériel',
    emoji: '🔧',
    color: 'teal',
    bgGradient: 'from-teal-50 to-cyan-50',
    headerBg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    href: '/materiel',
    description: 'Prêtez ou empruntez du matériel entre voisins.',
    icon: Package,
  },
  annonces: {
    label: 'Annonces',
    emoji: '📢',
    color: 'violet',
    bgGradient: 'from-violet-50 to-purple-50',
    headerBg: 'bg-gradient-to-r from-violet-500 to-purple-500',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    href: '/annonces',
    description: 'Achetez, vendez ou donnez des objets localement.',
    icon: ShoppingBag,
  },
  'perdu-trouve': {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    color: 'red',
    bgGradient: 'from-red-50 to-rose-50',
    headerBg: 'bg-gradient-to-r from-red-500 to-rose-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    href: '/perdu-trouve',
    description: 'Signalez un objet perdu ou trouvé à Biguglia.',
    icon: MapPin,
  },
  forum: {
    label: 'Forum',
    emoji: '💬',
    color: 'indigo',
    bgGradient: 'from-indigo-50 to-blue-50',
    headerBg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    href: '/forum',
    description: 'Discussions libres entre habitants de Biguglia.',
    icon: MessageSquare,
  },
  artisans: {
    label: 'Artisans',
    emoji: '🔨',
    color: 'brand',
    bgGradient: 'from-brand-50 to-orange-50',
    headerBg: 'bg-gradient-to-r from-brand-500 to-orange-500',
    textColor: 'text-brand-700',
    borderColor: 'border-brand-200',
    href: '/artisans',
    description: 'Artisans vérifiés de Biguglia — SIRET, assurance, avis.',
    icon: Wrench,
  },
};

const DEFAULT_THEME = {
  label: 'Communauté',
  emoji: '🏘️',
  color: 'gray',
  bgGradient: 'from-gray-50 to-slate-50',
  headerBg: 'bg-gradient-to-r from-gray-500 to-slate-500',
  textColor: 'text-gray-700',
  borderColor: 'border-gray-200',
  href: '/',
  description: 'Communauté locale de Biguglia.',
  icon: Users,
};

// ─── Badges ───────────────────────────────────────────────────────────────────
const BADGES_BY_THEME: Record<string, { icon: string; label: string; color: string }[]> = {
  collectionneurs: [
    { icon: '🏅', label: 'Collectionneur confirmé', color: 'bg-amber-100 text-amber-700' },
    { icon: '🤝', label: 'Échangeur actif', color: 'bg-blue-100 text-blue-700' },
    { icon: '🎁', label: 'Donateur', color: 'bg-green-100 text-green-700' },
  ],
  promenades: [
    { icon: '👣', label: 'Marcheur régulier', color: 'bg-green-100 text-green-700' },
    { icon: '🗺️', label: 'Guide local', color: 'bg-teal-100 text-teal-700' },
  ],
  evenements: [
    { icon: '🎪', label: 'Participant régulier', color: 'bg-pink-100 text-pink-700' },
    { icon: '🎭', label: 'Organisateur', color: 'bg-purple-100 text-purple-700' },
  ],
  associations: [
    { icon: '💚', label: 'Bénévole actif', color: 'bg-green-100 text-green-700' },
    { icon: '🌟', label: 'Référent', color: 'bg-yellow-100 text-yellow-700' },
  ],
  'coups-de-main': [
    { icon: '🙌', label: 'Voisin solidaire', color: 'bg-orange-100 text-orange-700' },
    { icon: '⭐', label: 'Helper confirmé', color: 'bg-amber-100 text-amber-700' },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommunauteThemePage() {
  const rawParams = useParams();
  const themeSlug = (Array.isArray(rawParams?.theme) ? rawParams.theme[0] : rawParams?.theme) ?? '';
  const { profile } = useAuthStore();
  const supabase = createClient();
  const themeConfig = THEME_CONFIG[themeSlug] ?? DEFAULT_THEME;

  // Onglets
  const [activeTab, setActiveTab] = useState<'membres' | 'monprofil'>('membres');
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<ThemeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Charger les membres
  useEffect(() => {
    setLoading(true);
    supabase
      .from('theme_memberships')
      .select(`
        id,
        user_id,
        joined_at,
        profile:profiles(full_name, avatar_url),
        theme_profile:theme_profiles(bio, tags, level, looking_for, offering, location_zone)
      `)
      .eq('theme_slug', themeSlug)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur chargement membres:', error);
        } else {
          // Normalise les relations Supabase (array → objet unique)
          const normalized = (data ?? []).map((m: any) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
            theme_profile: Array.isArray(m.theme_profile) ? m.theme_profile[0] : m.theme_profile,
          }));
          setMembers(normalized);
          setMemberCount(normalized.length);
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug, refreshKey]);

  // Filtrage local
  const filteredMembers = members.filter((m) => {
    const name = m.profile?.full_name?.toLowerCase() ?? '';
    const tags = (m.theme_profile?.tags ?? []).join(' ').toLowerCase();
    const level = (m.theme_profile?.level ?? '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || tags.includes(search.toLowerCase());
    const matchLevel = !filterLevel || level === filterLevel.toLowerCase();
    return matchSearch && matchLevel;
  });

  const badges = BADGES_BY_THEME[themeSlug] ?? [];
  const IconComp = themeConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
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
              {/* Compteur membres */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{memberCount}</span>
                <span className="text-white/80">membre{memberCount > 1 ? 's' : ''}</span>
              </div>

              {/* Bouton rejoindre */}
              <CommunityJoinButton
                themeSlug={themeSlug}
                userId={profile?.id}
                size="md"
                onJoined={() => setRefreshKey((k) => k + 1)}
                onLeft={() => setRefreshKey((k) => k + 1)}
                className="bg-white text-gray-800 hover:bg-gray-50 border-white/0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation thème ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <Link
              href={themeConfig.href}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300 transition"
            >
              <IconComp className="w-4 h-4" />
              Annonces
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
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {memberCount}
              </span>
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

      {/* ── Contenu principal ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Onglet MEMBRES ───────────────────────────────────────────────── */}
        {activeTab === 'membres' && (
          <div className="space-y-5">
            {/* Badges disponibles */}
            {badges.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Badges de la communauté
                </p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span key={b.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${b.color}`}>
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Barre de recherche + filtres */}
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
                <Filter className="w-4 h-4 text-gray-400" />
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
                  className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info: si pas connecté */}
            {!profile && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Rejoignez la communauté</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    <Link href="/connexion" className="underline">Connectez-vous</Link> pour rejoindre ce thème et apparaître dans la liste des membres.
                  </p>
                </div>
              </div>
            )}

            {/* Grille membres */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {search || filterLevel
                    ? 'Aucun membre ne correspond à votre recherche.'
                    : 'Aucun membre dans cette communauté pour l\'instant.'}
                </p>
                {!profile && (
                  <p className="text-sm text-gray-400 mt-1">
                    Soyez le premier à rejoindre !{' '}
                    <Link href="/connexion" className="text-brand-600 underline">Se connecter</Link>
                  </p>
                )}
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

            {/* Call-to-action rejoindre */}
            {profile && !loading && (
              <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
                <div>
                  <p className={`font-semibold ${themeConfig.textColor}`}>
                    Votre mini-profil {themeConfig.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Complétez votre profil pour apparaître dans la liste et être contacté.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('monprofil')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} bg-white hover:shadow-sm transition whitespace-nowrap`}
                >
                  <Settings className="w-4 h-4" />
                  Compléter mon profil
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet MON PROFIL ────────────────────────────────────────────── */}
        {activeTab === 'monprofil' && profile && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header profil */}
              <div className={`${themeConfig.headerBg} p-5 flex items-center gap-4 text-white`}>
                <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                <div>
                  <p className="font-bold text-lg">{profile.full_name}</p>
                  <p className="text-white/80 text-sm">Mon mini-profil · {themeConfig.label}</p>
                </div>
              </div>

              {/* Statut adhésion */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Statut d&apos;adhésion</span>
                </div>
                <CommunityJoinButton
                  themeSlug={themeSlug}
                  userId={profile.id}
                  size="sm"
                  onJoined={() => setRefreshKey((k) => k + 1)}
                  onLeft={() => {
                    setRefreshKey((k) => k + 1);
                    setActiveTab('membres');
                  }}
                />
              </div>

              {/* Formulaire */}
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

        {/* Profil non connecté */}
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

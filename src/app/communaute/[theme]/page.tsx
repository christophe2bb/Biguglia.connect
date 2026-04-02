'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Search, Filter, UserCheck, Settings, ChevronRight,
  Loader2, RefreshCw, Info,
  Gem, Footprints, PartyPopper, HandHeart, Package,
  ShoppingBag, MapPin, MessageSquare, Wrench, AlertTriangle,
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
  href: '/',
  description: 'Communauté locale de Biguglia.',
  icon: Users,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommunauteThemePage() {
  const rawParams = useParams();
  const themeSlug = (Array.isArray(rawParams?.theme) ? rawParams.theme[0] : rawParams?.theme) ?? '';
  const { profile } = useAuthStore();
  const supabase = createClient();
  const themeConfig = THEME_CONFIG[themeSlug] ?? DEFAULT_THEME;

  const [activeTab, setActiveTab] = useState<'membres' | 'monprofil'>('membres');
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<ThemeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Charger les membres en 2 requêtes séparées (évite les joins qui échouent si table absente) ──
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
        // Table absente → message clair
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

      // 3. Mini-profils thématiques (optionnel — table peut ne pas exister)
      let themeProfiles: any[] = [];
      try {
        const { data: tp } = await supabase
          .from('theme_profiles')
          .select('user_id, bio, tags, level, looking_for, offering, location_zone')
          .eq('theme_slug', themeSlug)
          .in('user_id', userIds);
        themeProfiles = tp ?? [];
      } catch {
        // Si table absente on continue sans mini-profils
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

  // ── Filtrage local ────────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const name = (m.profile?.full_name ?? '').toLowerCase();
    const tags = (m.theme_profile?.tags ?? []).join(' ').toLowerCase();
    const level = (m.theme_profile?.level ?? '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || tags.includes(search.toLowerCase());
    const matchLevel = !filterLevel || level.includes(filterLevel.toLowerCase());
    return matchSearch && matchLevel;
  });

  const IconComp = themeConfig.icon;

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
                <span className="text-white/80">membre{memberCount > 1 ? 's' : ''}</span>
              </div>
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

            {/* Grille */}
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
                    : 'Aucun membre dans cette communauté pour l\'instant.'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {profile
                    ? 'Soyez le premier ! Cliquez sur « Rejoindre » ci-dessus.'
                    : <>Soyez le premier !{' '}<Link href="/connexion" className="text-brand-600 underline">Se connecter</Link></>
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
                  onJoined={() => setRefreshKey((k) => k + 1)}
                  onLeft={() => {
                    setRefreshKey((k) => k + 1);
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

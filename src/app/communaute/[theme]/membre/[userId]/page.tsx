'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronRight, MapPin, Calendar, Star, Tag,
  Loader2, AlertTriangle, Users,
  Gem, Footprints, PartyPopper, HandHeart, Package,
  ShoppingBag, Wrench, MessageSquare,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';

// ─── Config des thèmes ────────────────────────────────────────────────────────
const THEME_CONFIG: Record<string, {
  label: string;
  emoji: string;
  headerBg: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
  href: string;
  icon: React.ElementType;
}> = {
  collectionneurs: {
    label: 'Collectionneurs',
    emoji: '🏆',
    headerBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    accentBg: 'bg-amber-50',
    href: '/collectionneurs',
    icon: Gem,
  },
  promenades: {
    label: 'Promenades',
    emoji: '🥾',
    headerBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    accentBg: 'bg-green-50',
    href: '/promenades',
    icon: Footprints,
  },
  evenements: {
    label: 'Événements',
    emoji: '🎉',
    headerBg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    accentBg: 'bg-pink-50',
    href: '/evenements',
    icon: PartyPopper,
  },
  associations: {
    label: 'Associations',
    emoji: '🤝',
    headerBg: 'bg-gradient-to-r from-blue-500 to-sky-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    accentBg: 'bg-blue-50',
    href: '/associations',
    icon: HandHeart,
  },
  'coups-de-main': {
    label: 'Coups de main',
    emoji: '🙌',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    accentBg: 'bg-orange-50',
    href: '/coups-de-main',
    icon: HandHeart,
  },
  materiel: {
    label: 'Matériel',
    emoji: '🔧',
    headerBg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    accentBg: 'bg-teal-50',
    href: '/materiel',
    icon: Package,
  },
  annonces: {
    label: 'Annonces',
    emoji: '📢',
    headerBg: 'bg-gradient-to-r from-violet-500 to-purple-500',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    accentBg: 'bg-violet-50',
    href: '/annonces',
    icon: ShoppingBag,
  },
  'perdu-trouve': {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    headerBg: 'bg-gradient-to-r from-red-500 to-rose-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    accentBg: 'bg-red-50',
    href: '/perdu-trouve',
    icon: MapPin,
  },
  forum: {
    label: 'Forum',
    emoji: '💬',
    headerBg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    accentBg: 'bg-indigo-50',
    href: '/forum',
    icon: MessageSquare,
  },
  artisans: {
    label: 'Artisans',
    emoji: '🔨',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    accentBg: 'bg-orange-50',
    href: '/artisans',
    icon: Wrench,
  },
};

const DEFAULT_THEME = {
  label: 'Communauté',
  emoji: '🏘️',
  headerBg: 'bg-gradient-to-r from-gray-500 to-slate-500',
  textColor: 'text-gray-700',
  borderColor: 'border-gray-200',
  accentBg: 'bg-gray-50',
  href: '/',
  icon: Users,
};

interface MemberProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
}

interface ThemeProfile {
  bio?: string | null;
  level?: string | null;
  offering?: string | null;
  looking_for?: string | null;
  availability?: string | null;
  location_zone?: string | null;
  tags?: string[] | null;
}

interface MembershipInfo {
  joined_at: string;
  status: string;
}

export default function MemberProfilePage() {
  const rawParams = useParams();
  const themeSlug = (Array.isArray(rawParams?.theme) ? rawParams.theme[0] : rawParams?.theme) ?? '';
  const userId = (Array.isArray(rawParams?.userId) ? rawParams.userId[0] : rawParams?.userId) ?? '';

  const { profile: currentUser } = useAuthStore();
  const supabase = createClient();
  const themeConfig = THEME_CONFIG[themeSlug] ?? DEFAULT_THEME;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [themeProfile, setThemeProfile] = useState<ThemeProfile | null>(null);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);

  useEffect(() => {
    if (!userId || !themeSlug) return;

    const load = async () => {
      setLoading(true);

      // 1. Profil de base
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, city')
        .eq('id', userId)
        .maybeSingle();

      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setMemberProfile(p);

      // 2. Adhésion thème
      const { data: m } = await supabase
        .from('theme_memberships')
        .select('joined_at, status')
        .eq('user_id', userId)
        .eq('theme_slug', themeSlug)
        .eq('status', 'active')
        .maybeSingle();

      if (!m) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setMembership(m);

      // 3. Mini-profil thématique (optionnel)
      try {
        const { data: tp } = await supabase
          .from('theme_profiles')
          .select('bio, level, offering, looking_for, availability, location_zone, tags')
          .eq('user_id', userId)
          .eq('theme_slug', themeSlug)
          .maybeSingle();
        setThemeProfile(tp ?? null);
      } catch {
        // table absente
      }

      setLoading(false);
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, themeSlug]);

  const isMe = currentUser?.id === userId;

  const formatJoinDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (notFound || !memberProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-10 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Membre introuvable</h2>
          <p className="text-sm text-gray-500 mb-5">
            Ce membre n&apos;existe pas ou n&apos;a pas rejoint la communauté {themeConfig.label}.
          </p>
          <Link
            href={`/communaute/${themeSlug}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
          >
            <Users className="w-4 h-4" />
            Voir les membres
          </Link>
        </div>
      </div>
    );
  }

  const IconComp = themeConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className={`${themeConfig.headerBg} text-white`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Fil d'ariane */}
          <nav className="flex items-center gap-2 text-white/70 text-sm mb-6">
            <Link href="/" className="hover:text-white transition">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={themeConfig.href} className="hover:text-white transition">{themeConfig.label}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/communaute/${themeSlug}`} className="hover:text-white transition">Communauté</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-medium">{memberProfile.full_name}</span>
          </nav>

          <div className="flex items-center gap-5">
            <Avatar
              src={memberProfile.avatar_url}
              name={memberProfile.full_name}
              size="xl"
              className="ring-4 ring-white/30"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{memberProfile.full_name}</h1>
                {isMe && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    Votre profil
                  </span>
                )}
              </div>
              {themeProfile?.level && (
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  {themeProfile.level}
                </p>
              )}
              {membership && (
                <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Membre depuis {formatJoinDate(membership.joined_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Badge thème */}
        <div className={`inline-flex items-center gap-2 ${themeConfig.accentBg} ${themeConfig.textColor} ${themeConfig.borderColor} border px-3 py-1.5 rounded-xl text-sm font-semibold`}>
          <IconComp className="w-4 h-4" />
          {themeConfig.emoji} Communauté {themeConfig.label}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-4">

            {/* Bio thématique */}
            {themeProfile?.bio && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">À propos</h2>
                <p className="text-gray-700 leading-relaxed italic">&ldquo;{themeProfile.bio}&rdquo;</p>
              </div>
            )}

            {/* Bio globale si pas de bio thématique */}
            {!themeProfile?.bio && memberProfile.bio && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">À propos</h2>
                <p className="text-gray-700 leading-relaxed italic">&ldquo;{memberProfile.bio}&rdquo;</p>
              </div>
            )}

            {/* Offre / Cherche */}
            {(themeProfile?.offering || themeProfile?.looking_for) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Échanges</h2>
                <div className="space-y-3">
                  {themeProfile.offering && (
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">💚</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-700 mb-0.5">Propose / Offre</p>
                        <p className="text-sm text-gray-700">{themeProfile.offering}</p>
                      </div>
                    </div>
                  )}
                  {themeProfile.looking_for && (
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">🔍</span>
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-0.5">Recherche</p>
                        <p className="text-sm text-gray-700">{themeProfile.looking_for}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {themeProfile?.tags && themeProfile.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Centres d&apos;intérêt
                </h2>
                <div className="flex flex-wrap gap-2">
                  {themeProfile.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 ${themeConfig.accentBg} ${themeConfig.textColor} border ${themeConfig.borderColor} px-3 py-1 rounded-full text-sm font-medium`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne latérale */}
          <div className="space-y-4">
            {/* Infos pratiques */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Infos</h2>

              {(themeProfile?.location_zone || memberProfile.city) && (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{themeProfile?.location_zone || memberProfile.city}</span>
                </div>
              )}

              {themeProfile?.availability && (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{themeProfile.availability}</span>
                </div>
              )}

              {themeProfile?.level && (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{themeProfile.level}</span>
                </div>
              )}

              {membership && (
                <div className="flex items-start gap-2.5 text-sm text-gray-500">
                  <Users className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <span>Membre depuis {formatJoinDate(membership.joined_at)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isMe && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Contact</h2>
                <ContactButton
                  sourceType="community"
                  sourceId={themeSlug}
                  sourceTitle={`Communauté ${themeConfig.label}`}
                  ownerId={userId}
                  userId={currentUser?.id}
                  ctaLabel="Envoyer un message"
                  prefillMsg={`👋 Bonjour ! Je vous contacte depuis la communauté ${themeConfig.label}.`}
                  size="md"
                  className="w-full justify-center"
                />
                <p className="text-xs text-gray-400 text-center">
                  Conversation privée isolée par thème
                </p>
              </div>
            )}

            {/* Si c'est moi → modifier le profil */}
            {isMe && (
              <div className={`${themeConfig.accentBg} border ${themeConfig.borderColor} rounded-2xl p-4 text-center`}>
                <p className={`text-sm font-semibold ${themeConfig.textColor} mb-2`}>C&apos;est votre profil</p>
                <Link
                  href={`/communaute/${themeSlug}`}
                  className={`inline-flex items-center gap-2 text-sm font-bold ${themeConfig.textColor} hover:opacity-80 transition`}
                  onClick={() => {
                    // Will be handled client-side via URL + tab param
                  }}
                >
                  ✏️ Modifier mon profil →
                </Link>
              </div>
            )}

            {/* Lien vers la communauté */}
            <Link
              href={`/communaute/${themeSlug}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <Users className="w-4 h-4" />
              ← Retour aux membres
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

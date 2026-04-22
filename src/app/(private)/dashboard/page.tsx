'use client';

import { useState, useCallback, memo } from 'react';
import {
  MessageSquare, Package, Activity, Star, Clock,
  LayoutGrid, CheckCircle, Wrench, RefreshCw, Shield, User, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTrustData } from '@/components/ui/TrustScore';
import { cn } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';

// ── Tab widgets — lazy loaded pour réduire le JS initial ─────────────────────
// Seul l'onglet actif est chargé. Les autres sont téléchargés à la demande
// (dynamic import = code splitting automatique par Next.js).
import dynamic from 'next/dynamic';

const OverviewTab     = dynamic(() => import('./_widgets/OverviewTab'),     { ssr: false });
const ContenusTab     = dynamic(() => import('./_widgets/ContenusTab'),     { ssr: false });
const InteractionsTab = dynamic(() => import('./_widgets/InteractionsTab'), { ssr: false });
const MessagesTab     = dynamic(() => import('./_widgets/MessagesTab'),     { ssr: false });
const AvisTab         = dynamic(() => import('./_widgets/AvisTab'),         { ssr: false });
const HistoriqueTab   = dynamic(() => import('./_widgets/HistoriqueTab'),   { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────
import type { DashTab } from './_constants';

// ─── Barre d'onglets mémoïsée ─────────────────────────────────────────────────
// Évite de re-rendre les boutons à chaque frappe / changement de données.
interface TabBarProps {
  tabs: { id: DashTab; label: string; icon: React.ElementType; badge?: number }[];
  activeTab: DashTab;
  onTabChange: (tab: DashTab) => void;
}

const TabBar = memo(function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1 mb-6 overflow-x-auto scrollbar-hide">
      {tabs.map(tab => {
        const TabIcon = tab.icon;
        const isActive = activeTab === tab.id;
        const badge = tab.badge;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 relative',
              isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
            )}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {tab.label}
            {badge !== undefined && badge > 0 && (
              <span className={cn(
                'ml-1 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1',
                isActive ? 'bg-brand-500 text-white' : 'bg-red-500 text-white',
              )}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

// ─── Main content ──────────────────────────────────────────────────────────────

function DashboardContent() {
  const { profile, isAdmin } = useAuthStore();
  const unread   = useUnreadCounts();
  const dashData = useDashboardData(profile?.id);
  const { stats, loading, refresh, fetchForTab } = dashData;
  const { stats: trustStats, badges: trustBadges } = useTrustData(profile?.id ?? null);

  const [activeTab, setActiveTab] = useState<DashTab>('overview');

  // Déclencher le fetch différé + changer d'onglet en une seule action
  const handleTabChange = useCallback((tab: DashTab) => {
    setActiveTab(tab);
    fetchForTab(tab);
  }, [fetchForTab]);

  // Déclencher le fetch de l'onglet overview au montage initial
  // (useEffect inside handleTabChange wouldn't fire at mount — call once here)
  // fetchForTab is called for 'overview' via the useEffect below
  useState(() => { fetchForTab('overview'); });

  if (!profile) return null;

  const isPending   = profile.role === 'artisan_pending';
  const isArtisan   = profile.role === 'artisan_verified';
  const isAdminRole = isAdmin();
  const firstName   = profile.full_name?.split(' ')[0] || 'vous';

  // ── Tab definitions ──────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview'     as const, label: "Vue d'ensemble", icon: LayoutGrid                                                        },
    { id: 'contenus'     as const, label: 'Mes contenus',   icon: Package,       badge: stats.totalListings + stats.activeEquipment  },
    { id: 'interactions' as const, label: 'Mes échanges',   icon: Activity,      badge: stats.pendingInteractions                    },
    { id: 'messages'     as const, label: 'Messages',       icon: MessageSquare, badge: unread.messages                              },
    { id: 'avis'         as const, label: 'Mes avis',       icon: Star,          badge: stats.reviewsToGive                         },
    { id: 'historique'   as const, label: 'Historique',     icon: Clock                                                             },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══ HEADER COCKPIT ══════════════════════════════════════════════════ */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900">Bonjour, {firstName} 👋</h1>
              {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
              <button onClick={refresh} title="Actualiser"
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {isPending   && <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-bold"><Clock className="w-3 h-3" />En attente validation</span>}
              {isArtisan   && <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 font-bold"><CheckCircle className="w-3 h-3" />Artisan vérifié</span>}
              {isAdminRole && <span className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1 font-bold">👑 Admin</span>}
              {!isPending && !isArtisan && !isAdminRole && <span className="text-sm text-gray-500">Habitant · Biguglia Connect</span>}
            </div>
            {stats.totalReviewsReceived > 0 && stats.averageRating && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(stats.averageRating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                ))}
                <span className="text-xs font-semibold text-gray-700">{stats.averageRating}/5</span>
                <span className="text-xs text-gray-400">({stats.totalReviewsReceived} avis)</span>
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {isAdminRole && (
              <Link href="/admin" className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-colors">
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            {isArtisan && (
              <Link href="/dashboard/artisan" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                <Wrench className="w-3.5 h-3.5" /> Espace artisan
              </Link>
            )}
            <Link href="/profil" className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors">
              <User className="w-3.5 h-3.5" /> Mon profil
            </Link>
          </div>
        </div>

        {/* ══ CONTEXTUAL BANNER — artisan pending ═════════════════════════════ */}
        {isPending && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Dossier artisan en cours de validation</h3>
              <p className="text-sm text-amber-700 mb-3">Notre équipe examine votre dossier. Vous pouvez le compléter en attendant.</p>
              <Link href="/inscription/artisan-profil" className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                <Wrench className="w-4 h-4" /> Compléter mon dossier <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ══ NAVIGATION TABS — mémoïsée ══════════════════════════════════════ */}
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ══ TAB CONTENT ═════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <OverviewTab
            profileId={profile.id}
            profileRole={profile.role}
            profileAvatarUrl={profile.avatar_url ?? undefined}
            profileCreatedAt={profile.created_at}
            profilePhone={(profile as unknown as { phone?: string }).phone}
            unread={unread}
            dashData={dashData}
            trustStats={trustStats}
            trustBadges={trustBadges}
          />
        )}
        {activeTab === 'contenus'     && <ContenusTab     dashData={dashData} />}
        {activeTab === 'interactions' && <InteractionsTab dashData={dashData} />}
        {activeTab === 'messages'     && <MessagesTab     unread={unread} dashData={dashData} />}
        {activeTab === 'avis'         && <AvisTab         dashData={dashData} />}
        {activeTab === 'historique'   && <HistoriqueTab   dashData={dashData} />}

        {/* Scroll-to-top affordance for mobile */}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return <ProtectedPage><DashboardContent /></ProtectedPage>;
}

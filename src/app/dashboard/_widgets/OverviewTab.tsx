'use client';

import Link from 'next/link';
import {
  MessageSquare, Bell, Activity, Star, Package, Eye, Heart, Wrench,
  Users, Repeat2, Trophy, HelpCircle, Zap, User, Edit3, ChevronRight,
  TrendingUp, Clock, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrustScoreCard } from '@/components/ui/TrustScore';
import type { useDashboardData } from '@/hooks/useDashboardData';
import type { useTrustData }    from '@/components/ui/TrustScore';
import type { useUnreadCounts } from '@/hooks/useUnreadCounts';
import {
  StatCard, TodoCard, InteractionRow, SkeletonRows, ProfileScoreRing,
} from '../_components/DashWidgets';
import { QUICK_ACTIONS } from '../_constants';
import CommunitiesSection from './CommunitiesSection';
import dynamic from 'next/dynamic';

// PersonalizedSuggestions : lazy — accède localStorage, non critique au premier rendu
const PersonalizedSuggestions = dynamic(() => import('./PersonalizedSuggestions'), { ssr: false });
// RecognitionBanner : lazy — utilise auth store, non critique au premier rendu
const RecognitionBanner = dynamic(() => import('./RecognitionBanner'), { ssr: false });

type DashData  = ReturnType<typeof useDashboardData>;
type TrustData = ReturnType<typeof useTrustData>;
type Unread    = ReturnType<typeof useUnreadCounts>;

interface Props {
  profileId: string;
  profileRole?: string;
  profileAvatarUrl?: string;
  profileCreatedAt: string;
  profilePhone?: string;
  unread: Unread;
  dashData: DashData;
  trustStats: TrustData['stats'];
  trustBadges: TrustData['badges'];
}


export default function OverviewTab({
  profileId, profileRole, profileAvatarUrl, profileCreatedAt, profilePhone,
  unread, dashData, trustStats, trustBadges,
}: Props) {
  const { stats, todos, activeInteractions, recentActivity, loading } = dashData;

  return (
    <div className="space-y-6">

      {/* ── Stats row 1: communication ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Résumé de votre activité</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={MessageSquare} label="Messages non lus"   value={unread.messages}       href="/messages"
            color="text-emerald-600" bg="bg-emerald-50" badge={unread.messages} />
          <StatCard icon={Bell}          label="Notifications"       value={unread.notifications}  href="/notifications"
            color="text-blue-600" bg="bg-blue-50" badge={unread.notifications} />
          <StatCard icon={Activity}      label="Échanges actifs"     value={stats.activeInteractions + stats.pendingInteractions}
            href="/mes-echanges"   color="text-indigo-600" bg="bg-indigo-50"
            badge={stats.pendingInteractions} accent={stats.pendingInteractions > 0} />
          <StatCard icon={Star}          label="Avis à laisser"      value={stats.reviewsToGive}
            href="/mes-echanges?filter=to_review" color="text-amber-600" bg="bg-amber-50" badge={stats.reviewsToGive} />
        </div>
      </div>

      {/* ── Stats row 2: content ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Annonces actives"    value={stats.activeListings}   href="/annonces"             color="text-brand-600"  bg="bg-brand-50" />
        <StatCard icon={Eye}     label="Vues totales"        value={stats.totalViews}        href="/dashboard/contenus"   color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Heart}   label="Aides ouvertes"      value={stats.openHelps}         href="/coups-de-main"        color="text-rose-600"   bg="bg-rose-50" />
        <StatCard icon={Wrench}  label="Matériel disponible" value={stats.activeEquipment}   href="/materiel"             color="text-sky-600"    bg="bg-sky-50" />
      </div>

      {/* ── Stats row 3: participations / collections / lf ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}      label="Participations" value={stats.eventParticipations + stats.outingParticipations}
          href="/mes-echanges" color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Repeat2}    label="Prêts actifs"   value={stats.activeLends + stats.activeBorrows}
          href="/materiel" color="text-sky-700" bg="bg-sky-50" />
        <StatCard icon={Trophy}     label="Collections"    value={stats.activeCollections}   href="/dashboard/collectionneurs" color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={HelpCircle} label="Perdu/Trouvé"   value={stats.activeLostFound}     href="/perdu-trouve"              color="text-red-600"   bg="bg-red-50" />
      </div>

      {/* ── Todo list ─── */}
      {todos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> À faire
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {todos.length}
              </span>
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {todos.map(todo => <TodoCard key={todo.id} item={todo} />)}
          </div>
        </div>
      )}

      {/* ── Active exchanges + recent activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Échanges en cours
              {stats.pendingInteractions > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                  {stats.pendingInteractions}
                </span>
              )}
            </h3>
            <Link href="/mes-echanges" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {loading ? <SkeletonRows n={3} h="h-14" /> :
             activeInteractions.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun échange en cours</p>
                <p className="text-xs mt-1">Commencez par contacter une annonce ou demander du matériel</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeInteractions.slice(0, 4).map(item => (
                  <InteractionRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" /> Activité récente
            </h3>
          </div>
          <div className="p-3">
            {loading ? <SkeletonRows n={3} h="h-12" /> :
             recentActivity.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.map(act => (
                  <Link key={act.id} href={act.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                        {act.type === 'help' ? '🤝' : act.type === 'event' ? '🎉' : act.type === 'outing' ? '🥾' : act.type === 'lost_found' ? '🔍' : '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{act.title}</p>
                        <p className="text-xs text-gray-500">{act.subtitle}</p>
                      </div>
                      {act.badge && (
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0', act.badgeColor ?? 'bg-gray-100 text-gray-600')}>
                          {act.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reconnaissance & impact personnel ─── */}
      <RecognitionBanner
        dashData={dashData}
        trustStats={trustStats}
        trustBadges={trustBadges}
      />

      {/* ── Suggestions personnalisées "Pour vous" ─── */}
      <PersonalizedSuggestions />

      {/* ── Quick actions ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actions rapides</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href}>
              <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all text-center group">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform', a.grad)}>
                  <a.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-gray-600 leading-tight">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Communities ─── */}
      <CommunitiesSection userId={profileId} />

      {/* ── Profile + Trust ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profile score */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" /> Mon profil
          </h3>
          <div className="flex items-center gap-4">
            <ProfileScoreRing score={stats.profileScore} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">
                {stats.profileScore >= 80 ? '✅ Profil complet' : stats.profileScore >= 50 ? '⚠️ Profil partiel' : '❌ Profil incomplet'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                {stats.profileScore >= 80 ? 'Votre profil inspire confiance' : 'Complétez pour gagner en crédibilité'}
              </p>
              <Link href="/profil" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                <Edit3 className="w-3 h-3" /> Modifier mon profil
              </Link>
            </div>
          </div>
        </div>

        {/* Trust score */}
        <div className="space-y-3">
          <TrustScoreCard
            profile={{ id: profileId, created_at: profileCreatedAt, role: profileRole ?? '', avatar_url: profileAvatarUrl, phone: profilePhone }}
            stats={trustStats}
            badges={trustBadges}
          />
          {stats.reviewsToGive > 0 && (
            <Link href="/dashboard/avis?tab=pending"
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 hover:bg-amber-100 transition-colors">
              <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800">{stats.reviewsToGive} avis à laisser</p>
                <p className="text-xs text-amber-600">Échanges terminés en attente d&apos;évaluation</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
            </Link>
          )}
          <Link href="/dashboard/avis" className="text-xs font-semibold text-amber-600 hover:text-amber-700 block text-right">
            Voir mes avis &amp; score →
          </Link>
        </div>
      </div>

    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Bell, Package, Eye, PenLine, Star,
  Calendar, Activity, CheckCircle, Clock, Plus,
  Wrench, Heart, Footprints, BookOpen, Handshake, LayoutGrid,
  RefreshCw, ChevronRight, Zap, Shield, User, TrendingUp,
  BarChart3, Inbox, Send, Award, Edit3,
  FileText, MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FR: Record<string, string> = {
  active: 'Actif', available: 'Disponible', unavailable: 'Indisponible',
  reserved: 'Réservé', sold: 'Vendu', archived: 'Archivé', expired: 'Expiré',
  requested: 'Demandé', pending: 'En attente', accepted: 'Accepté',
  in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé',
  open: 'Ouvert', resolved: 'Résolu', paused: 'En pause',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  available: 'bg-emerald-100 text-emerald-700',
  open: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  requested: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  accepted: 'bg-sky-100 text-sky-700',
  sold: 'bg-gray-100 text-gray-500',
  archived: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-teal-100 text-teal-700',
  resolved: 'bg-teal-100 text-teal-700',
  unavailable: 'bg-gray-100 text-gray-500',
  paused: 'bg-orange-100 text-orange-700',
};

const INTERACTION_SOURCE_LABEL: Record<string, string> = {
  listing: 'Annonce', equipment: 'Matériel', help_request: 'Entraide',
  association: 'Association', outing: 'Promenade', event: 'Événement',
  collection_item: 'Collection', service_request: 'Demande artisan',
  lost_found: 'Perdu/Trouvé',
};

// ─── Mini composants ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, href, color, bg, badge, accent }: {
  icon: React.ElementType; label: string; value: number | string;
  href: string; color: string; bg: string; badge?: number; accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={cn(
        'bg-white rounded-2xl border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer',
        accent ? 'border-brand-200 ring-1 ring-brand-100' : 'border-gray-100 hover:border-gray-200',
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2.5 rounded-xl', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
      </div>
    </Link>
  );
}

function TodoCard({ item }: { item: { id: string; priority: string; icon: string; title: string; subtitle?: string; href: string } }) {
  const borderColor = item.priority === 'urgent' ? 'border-l-red-400' : item.priority === 'normal' ? 'border-l-amber-400' : 'border-l-gray-300';
  const bg = item.priority === 'urgent' ? 'bg-red-50 hover:bg-red-100' : item.priority === 'normal' ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50 hover:bg-gray-100';
  return (
    <Link href={item.href}>
      <div className={cn('flex items-center gap-3 p-3 rounded-xl border-l-4 transition-colors', borderColor, bg)}>
        <span className="text-xl flex-shrink-0">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </Link>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, href, linkLabel, color }: {
  icon: React.ElementType; title: string; subtitle?: string; href?: string; linkLabel?: string; color: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('p-2 rounded-xl', color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100'))}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {href && linkLabel && (
        <Link href={href} className={cn('flex items-center gap-1 text-xs font-semibold hover:gap-2 transition-all', color)}>
          {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function ContentRow({ item }: { item: {
  id: string; type: string; title: string; status: string; views?: number; href: string; editHref?: string; createdAt: string; isClosed?: boolean;
}}) {
  const TYPE_ICONS: Record<string, React.ElementType> = {
    listing: Package, equipment: Wrench, help: Heart,
    event: Calendar, outing: Footprints, forum: BookOpen, association: Handshake,
  };
  const TypeIcon = TYPE_ICONS[item.type] || FileText;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group',
      item.isClosed && 'opacity-60',
    )}>
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <TypeIcon className="w-4 h-4 text-gray-500" />
      </div>
      <Link href={item.href} className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-700 transition-colors">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-600')}>
            {STATUS_FR[item.status] || item.status}
          </span>
          {item.views !== undefined && item.views > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Eye className="w-3 h-3" />{item.views}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatRelative(item.createdAt)}</span>
        </div>
      </Link>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {item.editHref && (
          <Link href={item.editHref} title="Modifier"
            className="p-1.5 rounded-lg hover:bg-brand-50 hover:text-brand-600 text-gray-400 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </Link>
        )}
        <Link href={item.href} title="Voir"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <Eye className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function InteractionRow({ item, currentUserId }: {
  item: {
    id: string; sourceType: string; status: string; role: string;
    otherPartyName: string; otherPartyAvatar?: string; updatedAt: string;
    reviewUnlocked?: boolean; conversationId?: string;
  };
  currentUserId: string;
}) {
  const isReceiver = item.role === 'receiver';
  const needsAction = isReceiver && ['requested', 'pending'].includes(item.status);
  const toReview = item.reviewUnlocked && item.status === 'completed';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors',
      needsAction ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200' : 'hover:bg-gray-50',
    )}>
      <Avatar src={item.otherPartyAvatar} name={item.otherPartyName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.otherPartyName}</p>
          {needsAction && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">Action requise</span>
          )}
          {toReview && (
            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">Avis à laisser</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{INTERACTION_SOURCE_LABEL[item.sourceType] || item.sourceType}</span>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-600')}>
            {STATUS_FR[item.status] || item.status}
          </span>
          <span className="text-xs text-gray-400">{formatRelative(item.updatedAt)}</span>
        </div>
      </div>
      <Link href={`/mes-echanges`}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn('w-4 h-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{count} avis</span>
    </div>
  );
}

function ProfileScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">{score}%</span>
    </div>
  );
}

// ─── Actions rapides ──────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: PenLine,   label: 'Nouvelle demande',  href: '/artisans/demande',  grad: 'from-brand-500 to-orange-500' },
  { icon: Package,   label: 'Publier annonce',    href: '/annonces/nouvelle', grad: 'from-blue-500 to-indigo-500' },
  { icon: Wrench,    label: 'Prêter matériel',    href: '/materiel/nouveau',  grad: 'from-emerald-500 to-teal-500' },
  { icon: Heart,     label: 'Coup de main',       href: '/coups-de-main',     grad: 'from-rose-500 to-pink-500' },
  { icon: Calendar,  label: 'Créer événement',    href: '/evenements',        grad: 'from-purple-500 to-violet-500' },
  { icon: BookOpen,  label: 'Sujet forum',        href: '/forum/nouveau',     grad: 'from-violet-500 to-purple-500' },
  { icon: Footprints,label: 'Organiser sortie',   href: '/promenades',        grad: 'from-green-500 to-emerald-500' },
  { icon: Handshake, label: 'Mon association',    href: '/associations',      grad: 'from-teal-500 to-cyan-500' },
];

// ─── Contenu principal ────────────────────────────────────────────────────────

function DashboardContent() {
  const { profile, isAdmin } = useAuthStore();
  const unread = useUnreadCounts();
  const [activeTab, setActiveTab] = useState<'overview' | 'contenus' | 'interactions' | 'messages' | 'avis' | 'historique'>('overview');

  const dashData = useDashboardData(profile?.id);
  const { stats, todos, recentContents, activeInteractions, recentActivity, recentReviews, loading, refresh } = dashData;

  if (!profile) return null;

  const isPending  = profile.role === 'artisan_pending';
  const isArtisan  = profile.role === 'artisan_verified';
  const isAdminRole = isAdmin();
  const firstName  = profile.full_name?.split(' ')[0] || 'vous';

  // ── TABS ────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',      label: 'Vue d\'ensemble', icon: LayoutGrid },
    { id: 'contenus',      label: 'Mes contenus',    icon: Package,      badge: stats.totalListings + stats.activeEquipment },
    { id: 'interactions',  label: 'Mes échanges',    icon: Activity,     badge: stats.pendingInteractions },
    { id: 'messages',      label: 'Messages',        icon: MessageSquare, badge: unread.messages },
    { id: 'avis',          label: 'Mes avis',        icon: Star,         badge: stats.reviewsToGive },
    { id: 'historique',    label: 'Historique',      icon: Clock },
  ] as const;

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
                {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(stats.averageRating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />)}
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

        {/* ══ BANNIERES CONTEXTUELLES ══════════════════════════════════════════ */}
        {isPending && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Dossier artisan en cours de validation</h3>
              <p className="text-sm text-amber-700 mb-3">Notre équipe examine votre dossier. Vous pouvez le compléter en attendant.</p>
              <Link href="/inscription/artisan-profil" className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                <Wrench className="w-4 h-4" /> Compléter mon dossier
              </Link>
            </div>
          </div>
        )}

        {/* ══ NAVIGATION TABS ════════════════════════════════════════════════ */}
        <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 relative',
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {'badge' in tab && tab.badge > 0 && (
                  <span className={cn(
                    'ml-1 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1',
                    isActive ? 'bg-brand-500 text-white' : 'bg-red-500 text-white'
                  )}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : VUE D'ENSEMBLE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* ── BLOC 1 : Résumé stats ─── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Résumé de votre activité</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={MessageSquare} label="Messages non lus" value={unread.messages} href="/messages"
                  color="text-emerald-600" bg="bg-emerald-50" badge={unread.messages} />
                <StatCard icon={Bell} label="Notifications" value={unread.notifications} href="/notifications"
                  color="text-blue-600" bg="bg-blue-50" badge={unread.notifications} />
                <StatCard icon={Activity} label="Échanges actifs" value={stats.activeInteractions + stats.pendingInteractions}
                  href="/mes-echanges" color="text-indigo-600" bg="bg-indigo-50"
                  badge={stats.pendingInteractions} accent={stats.pendingInteractions > 0} />
                <StatCard icon={Star} label="Avis à laisser" value={stats.reviewsToGive} href="/mes-echanges?filter=to_review"
                  color="text-amber-600" bg="bg-amber-50" badge={stats.reviewsToGive} />
              </div>
            </div>

            {/* ── BLOC 1b : Stats contenus ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Package} label="Annonces actives" value={stats.activeListings} href="/annonces"
                color="text-brand-600" bg="bg-brand-50" />
              <StatCard icon={Eye} label="Vues totales" value={stats.totalViews} href="/dashboard/contenus"
                color="text-purple-600" bg="bg-purple-50" />
              <StatCard icon={Heart} label="Aides ouvertes" value={stats.openHelps} href="/coups-de-main"
                color="text-rose-600" bg="bg-rose-50" />
              <StatCard icon={Wrench} label="Matériel disponible" value={stats.activeEquipment} href="/materiel"
                color="text-sky-600" bg="bg-sky-50" />
            </div>

            {/* ── BLOC 2 : Todo list prioritaire ─── */}
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

            {/* ── BLOC 2 : Activité en cours ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Mes échanges actifs */}
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
                  {loading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                  ) : activeInteractions.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun échange en cours</p>
                      <p className="text-xs mt-1">Commencez par contacter une annonce ou demander du matériel</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeInteractions.slice(0, 4).map(item => (
                        <InteractionRow key={item.id} item={item} currentUserId={profile.id} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Activité récente */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" /> Activité récente
                  </h3>
                </div>
                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                  ) : recentActivity.length === 0 ? (
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
                              {act.type === 'help' ? '🤝' : act.type === 'event' ? '🎉' : act.type === 'outing' ? '🥾' : '📌'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{act.title}</p>
                              <p className="text-xs text-gray-500">{act.subtitle}</p>
                            </div>
                            {act.badge && (
                              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0', act.badgeColor || 'bg-gray-100 text-gray-600')}>
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

            {/* ── BLOC 3 : Actions rapides ─── */}
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
                        <a.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 leading-tight">{a.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── BLOC 4 : Confiance & Profil ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Profil score */}
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
                      {stats.profileScore >= 80
                        ? 'Votre profil inspire confiance'
                        : 'Complétez pour gagner en crédibilité'}
                    </p>
                    <Link href="/profil" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                      <Edit3 className="w-3 h-3" /> Modifier mon profil
                    </Link>
                  </div>
                </div>
              </div>

              {/* Note & avis */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Ma réputation
                </h3>
                {stats.totalReviewsReceived === 0 ? (
                  <div className="text-center py-2">
                    <Star className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-500">Pas encore d'avis reçus</p>
                    <p className="text-xs text-gray-400 mt-1">Complétez vos premiers échanges pour recevoir des avis</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-gray-900">{stats.averageRating}</span>
                      <span className="text-gray-400 text-sm mb-1">/5</span>
                    </div>
                    <StarRow rating={Math.round(stats.averageRating || 0)} count={stats.totalReviewsReceived} />
                    {recentReviews.slice(0, 2).map(r => (
                      <div key={r.id} className="mt-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar src={r.authorAvatar} name={r.authorName} size="xs" />
                          <span className="text-xs font-semibold text-gray-700">{r.authorName}</span>
                          <div className="flex ml-auto">
                            {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />)}
                          </div>
                        </div>
                        {r.comment && <p className="text-xs text-gray-600 line-clamp-2">{r.comment}</p>}
                      </div>
                    ))}
                    <Link href="/dashboard/avis" className="text-xs font-semibold text-amber-600 hover:text-amber-700 mt-2 block">
                      Voir tous mes avis →
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : MES CONTENUS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contenus' && (
          <div className="space-y-5">
            <SectionHeader icon={Package} title="Mes contenus" subtitle="Tous vos publications et créations" color="text-brand-600"
              href="/dashboard/contenus" linkLabel="Vue détaillée" />

            {/* Annonces */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-blue-50/50">
                <span className="text-sm font-bold text-blue-700 flex items-center gap-2"><Package className="w-4 h-4" /> Annonces ({stats.totalListings})</span>
                <Link href="/annonces/nouvelle" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                  <Plus className="w-3 h-3" /> Nouvelle
                </Link>
              </div>
              <div className="p-3">
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : recentContents.filter(c => c.type === 'listing').length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune annonce publiée
                    <Link href="/annonces/nouvelle" className="block mt-2 text-xs font-semibold text-brand-600 hover:underline">Publier ma première annonce →</Link>
                  </div>
                ) : (
                  <div>
                    {recentContents.filter(c => c.type === 'listing' && !c.isClosed).map(item => (
                      <ContentRow key={item.id} item={item} />
                    ))}
                    {recentContents.filter(c => c.type === 'listing' && c.isClosed).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 pl-3 py-1">
                          {recentContents.filter(c => c.type === 'listing' && c.isClosed).length} annonce(s) archivée(s) / expirée(s)
                        </summary>
                        {recentContents.filter(c => c.type === 'listing' && c.isClosed).map(item => (
                          <ContentRow key={item.id} item={item} />
                        ))}
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Matériel */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-sky-50/50">
                <span className="text-sm font-bold text-sky-700 flex items-center gap-2"><Wrench className="w-4 h-4" /> Matériel ({stats.activeEquipment})</span>
                <Link href="/materiel/nouveau" className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700">
                  <Plus className="w-3 h-3" /> Ajouter
                </Link>
              </div>
              <div className="p-3">
                {loading ? (
                  <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : recentContents.filter(c => c.type === 'equipment').length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun matériel à prêter
                    <Link href="/materiel/nouveau" className="block mt-2 text-xs font-semibold text-sky-600 hover:underline">Ajouter du matériel →</Link>
                  </div>
                ) : (
                  recentContents.filter(c => c.type === 'equipment').map(item => (
                    <ContentRow key={item.id} item={item} />
                  ))
                )}
              </div>
            </div>

            {/* Liens rapides vers autres contenus */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Heart, label: `${stats.openHelps} coup(s) de main`, href: '/coups-de-main', color: 'text-rose-600', bg: 'bg-rose-50' },
                { icon: Calendar, label: `${stats.upcomingEvents} événement(s)`, href: '/evenements', color: 'text-purple-600', bg: 'bg-purple-50' },
                { icon: Footprints, label: `${stats.upcomingOutings} sortie(s)`, href: '/promenades', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: BookOpen, label: `${stats.forumPosts} sujet(s) forum`, href: '/forum', color: 'text-violet-600', bg: 'bg-violet-50' },
                { icon: Handshake, label: `${stats.associations} association(s)`, href: '/associations', color: 'text-teal-600', bg: 'bg-teal-50' },
                { icon: MapPin, label: 'Perdu / Trouvé', href: '/perdu-trouve', color: 'text-orange-600', bg: 'bg-orange-50' },
              ].map(item => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                      <item.icon className={cn('w-4 h-4', item.color)} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : MES ÉCHANGES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'interactions' && (
          <div className="space-y-5">
            <SectionHeader icon={Activity} title="Mes échanges" subtitle="Interactions actives, demandes, participations" color="text-indigo-600"
              href="/dashboard/interactions" linkLabel="Vue détaillée" />

            {/* Stats rapides */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-amber-700">{stats.pendingInteractions}</div>
                <div className="text-xs text-amber-600 font-semibold mt-0.5">En attente</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-blue-700">{stats.activeInteractions}</div>
                <div className="text-xs text-blue-600 font-semibold mt-0.5">En cours</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-amber-600">{stats.toReviewInteractions}</div>
                <div className="text-xs text-amber-600 font-semibold mt-0.5">À évaluer</div>
              </div>
            </div>

            {/* Liste échanges */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-indigo-500" /> Échanges actifs
                </h3>
                <div className="flex gap-2">
                  <Link href="/mes-echanges?filter=received" className="flex items-center gap-1 text-xs font-semibold text-gray-600 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <Inbox className="w-3 h-3" /> Reçus
                  </Link>
                  <Link href="/mes-echanges?filter=sent" className="flex items-center gap-1 text-xs font-semibold text-gray-600 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <Send className="w-3 h-3" /> Envoyés
                  </Link>
                </div>
              </div>
              <div className="p-3">
                {loading ? (
                  <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : activeInteractions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Aucun échange en cours</p>
                    <p className="text-xs mt-1">Contactez une annonce, demandez du matériel ou proposez de l'aide</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeInteractions.map(item => (
                      <InteractionRow key={item.id} item={item} currentUserId={profile.id} />
                    ))}
                    <Link href="/mes-echanges" className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-3 py-2">
                      Voir tous mes échanges →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : MESSAGES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div className="space-y-5">
            <SectionHeader icon={MessageSquare} title="Messages" subtitle="Conversations récentes et messages non lus" color="text-emerald-600"
              href="/messages" linkLabel="Ouvrir la messagerie" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn('rounded-2xl p-4 text-center border-2', unread.messages > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100')}>
                <div className={cn('text-3xl font-black', unread.messages > 0 ? 'text-red-600' : 'text-gray-700')}>
                  {unread.messages}
                </div>
                <div className={cn('text-xs font-semibold mt-0.5', unread.messages > 0 ? 'text-red-500' : 'text-gray-500')}>
                  {unread.messages > 0 ? 'Message(s) non lu(s)' : 'Aucun message non lu'}
                </div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-blue-700">{unread.notifications}</div>
                <div className="text-xs font-semibold text-blue-500 mt-0.5">Notification(s)</div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Link href="/messages" className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">Messagerie</p>
                  <p className="text-xs text-gray-500">Toutes vos conversations avec les membres</p>
                </div>
                {unread.messages > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-6 flex items-center justify-center px-1.5 animate-pulse flex-shrink-0">
                    {unread.messages}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>

              <Link href="/notifications" className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Alertes, réponses, actions à faire</p>
                </div>
                {unread.notifications > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[22px] h-6 flex items-center justify-center px-1.5 flex-shrink-0">
                    {unread.notifications}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>

              <Link href="/mes-echanges" className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">Centre d'échanges</p>
                  <p className="text-xs text-gray-500">Demandes reçues/envoyées, participations, prêts</p>
                </div>
                {stats.pendingInteractions > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-6 flex items-center justify-center px-1.5 animate-pulse flex-shrink-0">
                    {stats.pendingInteractions}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : MES AVIS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'avis' && (
          <div className="space-y-5">
            <SectionHeader icon={Star} title="Mes avis" subtitle="Réputation, avis reçus et donnés" color="text-amber-600"
              href="/dashboard/avis" linkLabel="Voir tout" />

            {/* Note globale */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
              {stats.totalReviewsReceived === 0 ? (
                <div className="text-center">
                  <Star className="w-12 h-12 mx-auto mb-3 text-amber-200" />
                  <p className="font-bold text-amber-800">Pas encore d'avis</p>
                  <p className="text-sm text-amber-600 mt-1">Complétez vos premiers échanges pour recevoir des évaluations</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="text-center flex-shrink-0">
                    <div className="text-5xl font-black text-amber-700">{stats.averageRating}</div>
                    <div className="text-sm text-amber-600 mt-0.5">/ 5</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1 mb-2">
                      {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-5 h-5', s <= Math.round(stats.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />)}
                    </div>
                    <p className="text-sm text-amber-700 font-semibold">{stats.totalReviewsReceived} avis reçus</p>
                    {stats.reviewsToGive > 0 && (
                      <Link href="/mes-echanges?filter=to_review" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                        <Star className="w-3 h-3" /> {stats.reviewsToGive} avis à laisser
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avis reçus */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Avis reçus
                </h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : recentReviews.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun avis pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentReviews.map(r => (
                      <div key={r.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Avatar src={r.authorAvatar} name={r.authorName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-gray-900">{r.authorName}</span>
                              <div className="flex gap-0.5 flex-shrink-0">
                                {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />)}
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-gray-700 mt-1 leading-relaxed">{r.comment}</p>}
                            <p className="text-xs text-gray-400 mt-1">{formatRelative(r.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link href="/dashboard/avis" className="block text-center text-xs font-semibold text-amber-600 hover:text-amber-700 py-2">
                      Voir tous les avis →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB : HISTORIQUE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'historique' && (
          <div className="space-y-5">
            <SectionHeader icon={Clock} title="Historique" subtitle="Contenus terminés, anciens échanges, archives" color="text-gray-600" />

            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-700 mb-1">Historique complet</p>
              <p className="text-sm text-gray-500 mb-4">Retrouvez vos contenus archivés, échanges terminés et annonces expirées dans les sections dédiées.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/mes-echanges?filter=completed" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Échanges terminés
                </Link>
                <Link href="/dashboard/contenus" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  <Package className="w-4 h-4 text-blue-500" /> Contenus archivés
                </Link>
              </div>
            </div>

            {/* Statistiques générales */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-500" /> Mes statistiques globales
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Annonces totales', value: stats.totalListings, icon: Package, color: 'text-blue-600' },
                  { label: 'Vues générées', value: stats.totalViews, icon: Eye, color: 'text-purple-600' },
                  { label: 'Avis reçus', value: stats.totalReviewsReceived, icon: Star, color: 'text-amber-600' },
                  { label: 'Sujets forum', value: stats.forumPosts, icon: BookOpen, color: 'text-violet-600' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <s.icon className={cn('w-6 h-6 mx-auto mb-1', s.color)} />
                    <div className="text-xl font-black text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return <ProtectedPage><DashboardContent /></ProtectedPage>;
}

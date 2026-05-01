/**
 * AdminStatsGrid — grille de KPI du tableau de bord admin.
 * Refonte : groupage par thème, couleurs cohérentes, indicateurs d'alerte clairs.
 */

import Link from 'next/link';
import {
  Users, CheckCircle, AlertTriangle, MessageSquare,
  Package, Wrench, Flag, TrendingUp, Shield,
} from 'lucide-react';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

interface AdminStatsGridProps {
  stats: AdminDashboardStats | null;
  loading: boolean;
}

interface StatCard {
  icon:      React.ElementType;
  label:     string;
  value:     number;
  color:     string;
  bg:        string;
  href:      string;
  alert?:    boolean;   // rouge si > 0
  warning?:  boolean;   // orange si > 0
}

export default function AdminStatsGrid({ stats, loading }: AdminStatsGridProps) {
  const val = (v: number | undefined) => (loading ? undefined : (v ?? 0));

  // ── Groupe 1 : Membres ─────────────────────────────────────────────────────
  const membersCards: StatCard[] = [
    {
      icon: Users, label: 'Utilisateurs', href: '/admin/utilisateurs',
      value: stats?.total_users ?? 0,
      color: 'text-blue-700', bg: 'bg-blue-50',
    },
    {
      icon: Wrench, label: 'Artisans vérifiés', href: '/admin/artisans',
      value: stats?.verified_artisans ?? 0,
      color: 'text-emerald-700', bg: 'bg-emerald-50',
    },
    {
      icon: AlertTriangle, label: 'Artisans en attente', href: '/admin/artisans',
      value: stats?.pending_artisans ?? 0,
      color: 'text-orange-700', bg: 'bg-orange-50',
      warning: (stats?.pending_artisans ?? 0) > 0,
    },
  ];

  // ── Groupe 2 : Contenu ─────────────────────────────────────────────────────
  const contentCards: StatCard[] = [
    {
      icon: Package, label: 'Annonces actives', href: '/admin/contenu',
      value: stats?.total_listings ?? 0,
      color: 'text-purple-700', bg: 'bg-purple-50',
    },
    {
      icon: TrendingUp, label: 'Posts forum', href: '/admin/contenu',
      value: stats?.total_forum_posts ?? 0,
      color: 'text-teal-700', bg: 'bg-teal-50',
    },
    {
      icon: CheckCircle, label: 'Matériel disponible', href: '/admin/contenu',
      value: stats?.total_equipment ?? 0,
      color: 'text-indigo-700', bg: 'bg-indigo-50',
    },
  ];

  // ── Groupe 3 : Activité & Modération ───────────────────────────────────────
  const moderationCards: StatCard[] = [
    {
      icon: MessageSquare, label: 'Messages', href: '/admin/messages',
      value: stats?.total_messages ?? 0,
      color: 'text-brand-700', bg: 'bg-brand-50',
    },
    {
      icon: Shield, label: 'En modération', href: '/admin/moderation',
      value: stats?.pending_moderation ?? 0,
      color: 'text-amber-700', bg: 'bg-amber-50',
      warning: (stats?.pending_moderation ?? 0) > 0,
    },
    {
      icon: Flag, label: 'Signalements', href: '/admin/signalements',
      value: stats?.pending_reports ?? 0,
      color: 'text-red-700', bg: 'bg-red-50',
      alert: (stats?.pending_reports ?? 0) > 0,
    },
  ];

  function KpiCard({ icon: Icon, label, value, color, bg, href, alert, warning }: StatCard) {
    const isAlert   = alert   && value > 0;
    const isWarning = warning && value > 0 && !isAlert;
    const borderCls = isAlert
      ? 'border-red-300 bg-red-50/40 shadow-sm'
      : isWarning
        ? 'border-orange-300 bg-orange-50/30 shadow-sm'
        : 'border-gray-100 hover:border-gray-200';

    return (
      <Link href={href} className="block group">
        <div className={`relative bg-white rounded-2xl border p-4 h-full hover:shadow-md transition-all cursor-pointer ${borderCls}`}>
          {/* Badge alerte */}
          {(isAlert || isWarning) && (
            <span className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-white ${isAlert ? 'bg-red-500 animate-pulse' : 'bg-orange-400 animate-pulse'}`} />
          )}
          {/* Icône */}
          <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3 group-hover:scale-105 transition-transform`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {/* Valeur */}
          <div className={`text-2xl font-black mb-0.5 ${isAlert ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-gray-900'}`}>
            {val(value) === undefined ? <span className="text-gray-300 animate-pulse">—</span> : value}
          </div>
          {/* Label */}
          <div className={`text-xs leading-tight font-medium ${isAlert ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-500'}`}>
            {label}
          </div>
        </div>
      </Link>
    );
  }

  function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
        {children}
      </p>
    );
  }

  return (
    <div className="space-y-5 mb-8">
      {/* Membres */}
      <div>
        <GroupLabel>👥 Membres</GroupLabel>
        <div className="grid grid-cols-3 gap-3">
          {membersCards.map(c => <KpiCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Contenu */}
      <div>
        <GroupLabel>📋 Contenu</GroupLabel>
        <div className="grid grid-cols-3 gap-3">
          {contentCards.map(c => <KpiCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Activité & Modération */}
      <div>
        <GroupLabel>🛡️ Activité & Modération</GroupLabel>
        <div className="grid grid-cols-3 gap-3">
          {moderationCards.map(c => <KpiCard key={c.label} {...c} />)}
        </div>
      </div>
    </div>
  );
}

/**
 * AdminStatsGrid — grille de KPI du tableau de bord admin.
 * Composant purement présentatif : reçoit les stats en props, pas de hook.
 *
 * IMPORTANT : 9 cartes → grille 3×3 (grid-cols-3) pour éviter qu'une
 * carte orpheline en bas chevauche l'AdminNavGrid et bloque les clics.
 */

import Link from 'next/link';
import { Users, CheckCircle, AlertTriangle, MessageSquare, Package, Wrench, Flag, TrendingUp, Shield } from 'lucide-react';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

interface AdminStatsGridProps {
  stats: AdminDashboardStats | null;
  loading: boolean;
}

export default function AdminStatsGrid({ stats, loading }: AdminStatsGridProps) {
  const cards = [
    { icon: Users,         label: 'Utilisateurs',      value: stats?.total_users        ?? 0, color: 'text-blue-600',   bg: 'bg-blue-50',    href: '/admin/utilisateurs' },
    { icon: Wrench,        label: 'Artisans vérifiés',  value: stats?.verified_artisans  ?? 0, color: 'text-green-600',  bg: 'bg-green-50',   href: '/admin/artisans' },
    { icon: AlertTriangle, label: 'En attente',         value: stats?.pending_artisans   ?? 0, color: 'text-orange-600', bg: 'bg-orange-50',  href: '/admin/artisans',       highlight: (stats?.pending_artisans ?? 0) > 0 },
    { icon: Package,       label: 'Annonces actives',   value: stats?.total_listings     ?? 0, color: 'text-purple-600', bg: 'bg-purple-50',  href: '/admin/contenu' },
    { icon: MessageSquare, label: 'Messages',           value: stats?.total_messages     ?? 0, color: 'text-brand-600',  bg: 'bg-brand-50',   href: '/admin/stats#messages' },
    { icon: Flag,          label: 'Signalements',       value: stats?.pending_reports    ?? 0, color: 'text-red-600',    bg: 'bg-red-50',     href: '/admin/signalements',   highlight: (stats?.pending_reports ?? 0) > 0 },
    { icon: Shield,        label: 'En modération',      value: stats?.pending_moderation ?? 0, color: 'text-amber-600',  bg: 'bg-amber-50',   href: '/admin/moderation',     highlight: (stats?.pending_moderation ?? 0) > 0 },
    { icon: TrendingUp,    label: 'Posts forum',        value: stats?.total_forum_posts  ?? 0, color: 'text-teal-600',   bg: 'bg-teal-50',    href: '/admin/contenu' },
    { icon: CheckCircle,   label: 'Matériel dispo',     value: stats?.total_equipment    ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50',  href: '/admin/contenu' },
  ];

  return (
    // 9 cartes → 3 colonnes × 3 rangées : grille parfaitement remplie, pas de débordement
    <div className="grid grid-cols-3 gap-3 mb-10">
      {cards.map(({ icon: Icon, label, value, color, bg, highlight, href }) => (
        <Link key={label} href={href} className="block">
          <div
            className={`bg-white rounded-2xl border p-4 h-full hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer ${
              highlight ? 'border-orange-300 shadow-sm' : 'border-gray-100'
            }`}
          >
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-xl font-bold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-xs text-gray-500 leading-tight">{label}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

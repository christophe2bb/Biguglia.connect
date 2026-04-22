

import Link from 'next/link';
import { MessageSquare, Bell, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useUnreadCounts } from '@/hooks/useUnreadCounts';
import type { useDashboardData } from '@/hooks/useDashboardData';
import { SectionHeader } from '../_components/DashWidgets';

type Unread   = ReturnType<typeof useUnreadCounts>;
type DashData = ReturnType<typeof useDashboardData>;
interface Props { unread: Unread; dashData: DashData }

export default function MessagesTab({ unread, dashData }: Props) {
  const { stats } = dashData;

  return (
    <div className="space-y-5">
      <SectionHeader icon={MessageSquare} title="Messages"
        subtitle="Conversations récentes et messages non lus"
        color="text-emerald-600" href="/messages" linkLabel="Ouvrir la messagerie" />

      {/* ── Unread counts ─── */}
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

      {/* ── Navigation links ─── */}
      <div className="space-y-3">
        <InboxLink
          href="/messages"
          icon={<MessageSquare className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          title="Messagerie"
          subtitle="Toutes vos conversations avec les membres"
          badge={unread.messages}
          badgeColor="bg-red-500"
          pulse
        />
        <InboxLink
          href="/notifications"
          icon={<Bell className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          title="Notifications"
          subtitle="Alertes, réponses, actions à faire"
          badge={unread.notifications}
          badgeColor="bg-blue-500"
        />
        <InboxLink
          href="/mes-echanges"
          icon={<Activity className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-100"
          title="Centre d'échanges"
          subtitle="Demandes reçues/envoyées, participations, prêts"
          badge={stats.pendingInteractions}
          badgeColor="bg-red-500"
          pulse
        />
      </div>
    </div>
  );
}

function InboxLink({ href, icon, iconBg, title, subtitle, badge, badgeColor, pulse }: {
  href: string; icon: React.ReactNode; iconBg: string;
  title: string; subtitle: string;
  badge?: number; badgeColor?: string; pulse?: boolean;
}) {
  return (
    <Link href={href}
      className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-colors group">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'text-white text-xs font-bold rounded-full min-w-[22px] h-6 flex items-center justify-center px-1.5 flex-shrink-0',
          badgeColor ?? 'bg-gray-500', pulse && 'animate-pulse'
        )}>
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

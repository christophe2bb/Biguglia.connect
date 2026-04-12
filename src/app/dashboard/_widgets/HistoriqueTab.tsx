'use client';

import Link from 'next/link';
import {
  Clock, Package, CheckCircle, BarChart3,
  Eye, Star, BookOpen, Users, Repeat2, Trophy, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useDashboardData } from '@/hooks/useDashboardData';
import { SectionHeader } from '../_components/DashWidgets';

type DashData = ReturnType<typeof useDashboardData>;
interface Props { dashData: DashData }

export default function HistoriqueTab({ dashData }: Props) {
  const { stats } = dashData;

  const globalStats = [
    { label: 'Annonces totales',  value: stats.totalListings,                                  icon: Package,    color: 'text-blue-600'   },
    { label: 'Vues générées',     value: stats.totalViews,                                     icon: Eye,        color: 'text-purple-600' },
    { label: 'Avis reçus',        value: stats.totalReviewsReceived,                           icon: Star,       color: 'text-amber-600'  },
    { label: 'Sujets forum',      value: stats.forumPosts,                                     icon: BookOpen,   color: 'text-violet-600' },
    { label: 'Participations',    value: stats.eventParticipations + stats.outingParticipations, icon: Users,    color: 'text-emerald-600'},
    { label: 'Prêts actifs',      value: stats.activeLends,                                    icon: Repeat2,    color: 'text-sky-600'    },
    { label: 'Collections',       value: stats.activeCollections,                              icon: Trophy,     color: 'text-amber-600'  },
    { label: 'Perdu/Trouvé',      value: stats.activeLostFound,                               icon: HelpCircle, color: 'text-red-600'    },
  ] as const;

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Clock}
        title="Historique"
        subtitle="Contenus terminés, anciens échanges, archives"
        color="text-gray-600"
      />

      {/* ── Navigation shortcuts ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="font-bold text-gray-700 mb-1">Historique complet</p>
        <p className="text-sm text-gray-500 mb-4">
          Retrouvez vos contenus archivés, échanges terminés et annonces expirées dans les sections dédiées.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/mes-echanges?filter=completed"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Échanges terminés
          </Link>
          <Link
            href="/dashboard/contenus"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Package className="w-4 h-4 text-blue-500" /> Contenus archivés
          </Link>
        </div>
      </div>

      {/* ── Global stats grid ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" /> Mes statistiques globales
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {globalStats.map(s => (
            <div key={s.label} className="text-center">
              <s.icon className={cn('w-6 h-6 mx-auto mb-1', s.color)} />
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

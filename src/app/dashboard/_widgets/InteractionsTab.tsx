'use client';

import Link from 'next/link';
import { Activity, Users, Inbox, Send, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useDashboardData } from '@/hooks/useDashboardData';
import { SectionHeader, InteractionRow, SkeletonRows } from '../_components/DashWidgets';

type DashData = ReturnType<typeof useDashboardData>;
interface Props { dashData: DashData }

export default function InteractionsTab({ dashData }: Props) {
  const { stats, activeInteractions, participations, loading } = dashData;

  return (
    <div className="space-y-5">
      <SectionHeader icon={Activity} title="Mes échanges"
        subtitle="Interactions actives, demandes, participations"
        color="text-indigo-600" href="/dashboard/interactions" linkLabel="Vue détaillée" />

      {/* ── Quick stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini value={stats.pendingInteractions}   label="En attente"    bg="bg-amber-50"   border="border-amber-200"   text="text-amber-700"   />
        <StatMini value={stats.activeInteractions}    label="En cours"      bg="bg-blue-50"    border="border-blue-200"    text="text-blue-700"    />
        <StatMini value={stats.eventParticipations + stats.outingParticipations} label="Participations" bg="bg-emerald-50" border="border-emerald-200" text="text-emerald-700" />
        <StatMini value={stats.toReviewInteractions}  label="À évaluer"     bg="bg-violet-50"  border="border-violet-200"  text="text-violet-600"  />
      </div>

      {/* ── Participations ─── */}
      {participations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Mes participations
            </h3>
            <Link href="/mes-echanges" className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {participations.slice(0, 5).map(p => (
              <Link key={p.id} href={p.href}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: p.type === 'event' ? '#f3e8ff' : '#d1fae5' }}>
                    {p.type === 'event' ? '🎉' : '🥾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                    {p.date && (
                      <p className="text-xs text-gray-400">
                        {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                    p.type === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    {p.type === 'event' ? 'Événement' : 'Promenade'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Active exchanges list ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-500" /> Échanges actifs
          </h3>
          <div className="flex gap-2">
            <Link href="/mes-echanges?filter=received"
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <Inbox className="w-3 h-3" /> Reçus
            </Link>
            <Link href="/mes-echanges?filter=sent"
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <Send className="w-3 h-3" /> Envoyés
            </Link>
          </div>
        </div>
        <div className="p-3">
          {loading ? <SkeletonRows n={4} h="h-14" /> :
           activeInteractions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun échange en cours</p>
              <p className="text-xs mt-1">Contactez une annonce, demandez du matériel ou proposez de l&apos;aide</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activeInteractions.map(item => (
                <InteractionRow key={item.id} item={item} />
              ))}
              <Link href="/mes-echanges" className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-3 py-2">
                Voir tous mes échanges →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMini({ value, label, bg, border, text }: {
  value: number; label: string; bg: string; border: string; text: string;
}) {
  return (
    <div className={cn('rounded-2xl p-4 text-center border-2', bg, border)}>
      <div className={cn('text-2xl font-black', text)}>{value}</div>
      <div className={cn('text-xs font-semibold mt-0.5', text.replace('-700', '-600').replace('-600', '-500'))}>{label}</div>
    </div>
  );
}

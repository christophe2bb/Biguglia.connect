'use client';

import Link from 'next/link';
import {
  Calendar, MapPin, Users, Eye, Trash2,
  Play, CheckCircle2, XCircle, Archive, StopCircle,
} from 'lucide-react';
import {
  OUTING_STATUS_CONFIG, OUTING_TRANSITIONS,
  legacyToFrenchStatus, computeDisplayStatus,
  type OutingStatus,
} from '@/lib/outings';

export type OutingWithStats = {
  id: string;
  title: string;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  status: string;
  is_registration_open: boolean;
  location_city: string | null;
  location_area: string | null;
  meeting_point: string | null;
  created_at: string;
  participants_count?: number;
  inscrit_count?: number;
  confirme_count?: number;
  fill_percent?: number;
};

interface Props {
  outing: OutingWithStats;
  onStatusChange: (outing: OutingWithStats, newStatus: OutingStatus, reason?: string) => void;
  onDelete: (outing: OutingWithStats) => void;
}

export default function OutingCard({ outing, onStatusChange, onDelete }: Props) {
  const fr = legacyToFrenchStatus(outing.status);
  const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
  const cfg = OUTING_STATUS_CONFIG[displayed];
  const availTrans = OUTING_TRANSITIONS.filter(t => t.from === displayed);
  const fillPct = outing.fill_percent ?? Math.round(((outing.participants_count || 0) / outing.max_participants) * 100);
  const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
  const isPast = new Date(outing.outing_date + 'T23:59:59') < new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                {cfg.icon} {cfg.label}
              </span>
              {isPast && displayed === 'ouverte' && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                  ⚠️ Date passée — à clore
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 truncate">{outing.title}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateLabel} à {outing.outing_time}</span>
              {(outing.location_city || outing.meeting_point) && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {outing.location_city || outing.meeting_point}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span className={fillPct >= 100 ? 'text-red-600 font-bold' : ''}>
                  {outing.participants_count || 0} / {outing.max_participants}
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-1.5 flex-shrink-0">
            <Link href={`/promenades/sorties/${outing.id}`}
              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-gray-200"
              title="Voir">
              <Eye className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => onDelete(outing)}
              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-200"
              title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fill bar */}
        {['ouverte', 'complete'].includes(displayed) && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-400' : fillPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(fillPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Status transitions */}
        {availTrans.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
            {availTrans.map(t => {
              const toCfg = OUTING_STATUS_CONFIG[t.to];
              const handleClick = () => {
                if (t.requiresReason) {
                  const reason = window.prompt(`${t.label} — Raison (obligatoire) :`);
                  if (!reason) return;
                  onStatusChange(outing, t.to, reason);
                } else if (window.confirm(`${toCfg.icon} ${t.label} ?`)) {
                  onStatusChange(outing, t.to);
                }
              };
              return (
                <button key={`${t.from}-${t.to}`} onClick={handleClick}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${toCfg.bg} ${toCfg.color} ${toCfg.border} hover:opacity-80`}>
                  {t.to === 'ouverte' ? <Play className="w-3 h-3" /> :
                   t.to === 'complete' ? <Users className="w-3 h-3" /> :
                   t.to === 'terminee' ? <CheckCircle2 className="w-3 h-3" /> :
                   t.to === 'annulee' ? <XCircle className="w-3 h-3" /> :
                   <Archive className="w-3 h-3" />}
                  {t.label}
                </button>
              );
            })}
            {isPast && ['ouverte', 'complete'].includes(displayed) && (
              <button
                onClick={() => {
                  if (window.confirm('Marquer cette sortie comme terminée ?')) {
                    onStatusChange(outing, 'terminee');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-all">
                <StopCircle className="w-3 h-3" /> Clore la sortie
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

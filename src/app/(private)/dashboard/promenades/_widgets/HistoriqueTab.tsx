

import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';
import {
  OUTING_STATUS_CONFIG, legacyToFrenchStatus, computeDisplayStatus,
} from '@/lib/outings';
import { type OutingWithStats } from './OutingCard';

interface Props {
  outings: OutingWithStats[];
}

export default function HistoriqueTab({ outings }: Props) {
  const historique = outings.filter(o => {
    const fr = legacyToFrenchStatus(o.status);
    const disp = computeDisplayStatus(fr, o.participants_count || 0, o.max_participants, o.outing_date);
    return ['terminee', 'annulee', 'archivee'].includes(disp);
  });

  if (historique.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-gray-500">Aucune sortie dans l&apos;historique</p>
        <p className="text-xs text-gray-400 mt-1">Les sorties terminées, annulées et archivées apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-800 mb-4">Sorties passées &amp; archivées</h3>
      {historique.map(outing => {
        const fr = legacyToFrenchStatus(outing.status);
        const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
        const cfg = OUTING_STATUS_CONFIG[displayed];
        const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        });

        return (
          <div key={outing.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <span className="text-xl flex-shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{outing.title}</p>
              <p className="text-xs text-gray-500">
                {dateLabel} · {outing.participants_count || 0} participant(s)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                {cfg.label}
              </span>
              <Link href={`/promenades/sorties/${outing.id}`}
                className="p-1.5 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-gray-100">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

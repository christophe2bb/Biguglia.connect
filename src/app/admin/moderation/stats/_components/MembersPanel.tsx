'use client';

/**
 * MembersPanel — Membres surveillés et membres de confiance.
 * Composant pur, reçoit les données du parent.
 */

import { Flag, Star } from 'lucide-react';
import type { ModerationStatsData, MemberStat } from '@/app/api/admin/moderation/stats-data/route';
import Avatar from '@/components/ui/Avatar';

interface Props { stats: ModerationStatsData }

export default function MembersPanel({ stats }: Props) {
  const { problematicMembers, trustedMembers } = stats;

  return (
    <div className="space-y-6">
      {problematicMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Membres surveillés
          </h2>
          <div className="space-y-2.5">
            {problematicMembers.map((m: MemberStat) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.full_name}</p>
                  <p className="text-[10px] text-gray-400">
                    {m.publication_count} pub · {m.reports_received} signalement{m.reports_received > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  ⚠️ Surveillé
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trustedMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-500" />
            Membres de confiance
          </h2>
          <div className="space-y-2.5">
            {trustedMembers.map((m: MemberStat) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.full_name}</p>
                  <p className="text-[10px] text-gray-400">{m.publication_count} publications</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  m.trust_level === 'de_confiance'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {m.trust_level === 'de_confiance' ? '🏆' : '✅'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

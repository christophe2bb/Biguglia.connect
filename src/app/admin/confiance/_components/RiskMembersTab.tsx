

import Link from 'next/link';
import { Shield, Star, AlertTriangle, ChevronRight } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { AdminRiskMember } from '@/app/api/admin/confiance/route';

interface RiskMembersTabProps {
  members: AdminRiskMember[];
}

export default function RiskMembersTab({ members }: RiskMembersTabProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
        <p className="font-bold text-gray-700">Aucun membre à risque détecté</p>
        <p className="text-sm text-gray-500 mt-1">Tous les membres ont un score de confiance acceptable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map(member => (
        <div key={member.profile_id} className="bg-white border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Avatar src={member.profile?.avatar_url} name={member.profile?.full_name || '?'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-gray-900">{member.profile?.full_name || 'Membre'}</span>
                <span
                  className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded',
                    member.trust_score < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700',
                  )}
                >
                  Score: {member.trust_score}/100
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-400" /> {member.avg_rating.toFixed(1)}/5
                </span>
                <span>{member.reviews_received} avis</span>
                {member.interactions_disputed > 0 && (
                  <span className="flex items-center gap-0.5 text-red-600 font-bold">
                    <AlertTriangle className="w-3 h-3" /> {member.interactions_disputed} litige(s)
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/profil/${member.profile_id}`}
              className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Voir <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

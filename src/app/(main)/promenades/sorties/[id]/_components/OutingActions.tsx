'use client';

import Link from 'next/link';
import { Users, X, Loader2, CheckCircle2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import ContactButton from '@/components/ui/ContactButton';
import { OUTING_STATUS_CONFIG } from '@/lib/outings';
import type { OutingStatus } from '@/lib/outings';
import type { Outing, Participant, StatusTransition } from '../_types';

type Props = {
  outing: Outing;
  profile: { id: string } | null;
  canManage: boolean;
  frenchStatus: OutingStatus;
  userParticipation: Participant | null;
  availableTransitions: StatusTransition[];
  registering: boolean;
  onRegister: () => void;
  onOpenTransition: (to: OutingStatus, label: string, requiresReason?: boolean) => void;
};

export default function OutingActions({
  outing,
  profile,
  canManage,
  frenchStatus,
  userParticipation,
  availableTransitions,
  registering,
  onRegister,
  onOpenTransition,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap gap-3 items-center">

        {/* Participant: inscription button */}
        {!canManage && (
          profile ? (
            <button
              onClick={onRegister}
              disabled={registering || (!userParticipation && frenchStatus !== 'ouverte')}
              className={`inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${
                userParticipation
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : frenchStatus === 'ouverte'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {registering
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</>
                : userParticipation
                  ? <><X className="w-4 h-4" /> Annuler mon inscription</>
                  : <><Users className="w-4 h-4" /> Je participe</>
              }
            </button>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
            >
              <Users className="w-4 h-4" /> Se connecter pour participer
            </Link>
          )
        )}

        {/* Contact organizer */}
        {!canManage && profile && (
          <ContactButton
            sourceType="outing"
            sourceId={outing.id}
            sourceTitle={outing.title}
            ownerId={outing.organizer_id}
            userId={profile.id}
            size="sm"
          />
        )}

        {/* Organizer: status transitions */}
        {canManage && availableTransitions.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-500">Changer le statut :</span>
            {availableTransitions.map(t => {
              const toCfg = OUTING_STATUS_CONFIG[t.to];
              return (
                <button
                  key={`${t.from}-${t.to}`}
                  onClick={() => onOpenTransition(t.to, t.label, t.requiresReason)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80 ${toCfg.bg} ${toCfg.color} ${toCfg.border}`}
                >
                  {toCfg.icon} {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Report */}
        {profile && !canManage && (
          <div className="ml-auto">
            <ReportButton
              targetType="outing"
              targetId={outing.id}
              targetTitle={outing.title}
              variant="mini"
            />
          </div>
        )}
      </div>

      {/* User participation status */}
      {userParticipation && (
        <div
          className={`mt-3 text-sm flex items-center gap-2 px-3 py-2 rounded-xl border ${
            userParticipation.status === 'confirme'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            {userParticipation.status === 'confirme'
              ? 'Votre participation est confirmée'
              : 'Vous êtes inscrit(e) à cette sortie'}
            {userParticipation.joined_at && (
              <span className="text-xs opacity-70 ml-1.5">
                — {formatRelative(userParticipation.joined_at)}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

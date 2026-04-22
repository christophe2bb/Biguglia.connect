'use client';

/**
 * EventActions — CTA d'inscription (statut, barre de progression, bouton)
 *               + panneau actions organisateur (modifier, transitions, supprimer).
 */

import Link from 'next/link';
import {
  CheckCircle, XCircle, Loader2, Bell,
  Edit2, Trash2, RefreshCw, Archive, Users, History,
} from 'lucide-react';
import {
  resolveEventStatus,
  canUserRegister,
  getRemainingPlaces,
  getAllowedTransitions,
  formatEventDate,
} from '@/lib/events';
import type { EventStatus } from '@/lib/events';
import type { EventDetail, PendingTransition } from '../_types';
import type { Profile } from '@/types';

interface Props {
  event: EventDetail;
  profile: Profile | null;
  joiningEvent: boolean;
  onJoin: () => Promise<void>;
  onOpenTransition: (t: PendingTransition) => void;
  onOpenDelete: () => void;
}

const TRANSITION_ICON: Partial<Record<EventStatus, React.ReactNode>> = {
  annule:  <XCircle   className="w-3.5 h-3.5" />,
  reporte: <RefreshCw className="w-3.5 h-3.5" />,
  archive: <Archive   className="w-3.5 h-3.5" />,
  complet: <Users     className="w-3.5 h-3.5" />,
  a_venir: <CheckCircle className="w-3.5 h-3.5" />,
  passe:   <History   className="w-3.5 h-3.5" />,
};

const TRANSITION_CLS: Partial<Record<EventStatus, string>> = {
  annule:  'bg-red-50    hover:bg-red-100    text-red-700',
  reporte: 'bg-violet-50 hover:bg-violet-100 text-violet-700',
  archive: 'bg-gray-100  hover:bg-gray-200   text-gray-600',
};

export default function EventActions({
  event, profile, joiningEvent, onJoin, onOpenTransition, onOpenDelete,
}: Props) {
  const isAuthor    = profile?.id === event.author_id;
  const isAdmin     = profile?.role === 'admin' || profile?.role === 'moderator';
  const canManage   = isAuthor || isAdmin;

  const resolvedStatus  = resolveEventStatus(
    event.status, event.event_date,
    event.participants_count ?? 0,
    event.capacity ?? null,
    event.is_unlimited,
  );
  const remaining      = getRemainingPlaces(event.capacity ?? null, event.is_unlimited, event.participants_count ?? 0);
  const registerCheck  = canUserRegister(resolvedStatus, event.registration_open, event.event_date, remaining, event.is_unlimited);
  const allowedTrans   = getAllowedTransitions(resolvedStatus);

  if (resolvedStatus === 'archive') return null;

  // ── Couleur du panneau CTA ────────────────────────────────────────────────
  const ctaBg =
    resolvedStatus === 'a_venir' && registerCheck.allowed ? 'bg-purple-50 border-purple-200' :
    resolvedStatus === 'annule'  ? 'bg-red-50 border-red-200'    :
    resolvedStatus === 'reporte' ? 'bg-violet-50 border-violet-200' :
    'bg-gray-50 border-gray-200';

  return (
    <>
      {/* ── CTA Inscription ── */}
      <div className={`rounded-2xl border p-4 mb-4 flex items-center justify-between gap-4 ${ctaBg}`}>
        {/* Statut texte */}
        <div>
          {resolvedStatus === 'annule' && (
            <p className="font-bold text-red-700 text-sm">
              ❌ Événement annulé{event.cancel_reason ? ` — ${event.cancel_reason}` : ''}
            </p>
          )}
          {resolvedStatus === 'reporte' && (
            <div>
              <p className="font-bold text-violet-700 text-sm">🔵 Événement reporté</p>
              {event.original_event_date && (
                <p className="text-xs text-violet-600">
                  Ancienne date : {formatEventDate(event.original_event_date, false)}
                </p>
              )}
              {event.postpone_reason && (
                <p className="text-xs text-violet-600 mt-0.5">{event.postpone_reason}</p>
              )}
            </div>
          )}
          {resolvedStatus === 'passe' && (
            <p className="font-bold text-gray-600 text-sm">⚪ Cet événement est terminé</p>
          )}
          {resolvedStatus === 'complet' && (
            <p className="font-bold text-amber-700 text-sm">
              🟡 Complet{remaining === 0 ? ' — Liste d\'attente possible' : ''}
            </p>
          )}
          {resolvedStatus === 'a_venir' && (
            <div>
              <p className="font-semibold text-purple-800 text-sm">
                {event.is_unlimited
                  ? 'Inscriptions ouvertes — places illimitées'
                  : remaining !== null
                  ? `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`
                  : 'Inscriptions ouvertes'}
              </p>
              {event.participants_count !== undefined && event.capacity && (
                <div className="mt-1.5 w-48 bg-purple-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-colors"
                    style={{ width: `${Math.min(100, (event.participants_count / event.capacity) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bouton action */}
        {profile && (resolvedStatus === 'a_venir' || resolvedStatus === 'complet') && (
          <div className="flex-shrink-0">
            {event.user_joined ? (
              <button onClick={onJoin} disabled={joiningEvent}
                className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Se désinscrire
              </button>
            ) : resolvedStatus === 'complet' ? (
              <button onClick={onJoin} disabled={joiningEvent}
                className="flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-600 font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Liste d&apos;attente
              </button>
            ) : registerCheck.allowed ? (
              <button onClick={onJoin} disabled={joiningEvent}
                className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                S&apos;inscrire
              </button>
            ) : (
              <span className="text-xs text-gray-500 italic">{registerCheck.reason}</span>
            )}
          </div>
        )}
        {!profile && resolvedStatus === 'a_venir' && registerCheck.allowed && (
          <Link href="/connexion"
            className="flex items-center gap-2 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-700">
            Se connecter pour s&apos;inscrire
          </Link>
        )}
      </div>

      {/* ── Actions organisateur ── */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Actions organisateur
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/evenements/${event.id}/modifier`}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-xl text-sm transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Modifier
            </Link>
            {allowedTrans.map(t => (
              <button key={t.to}
                onClick={() => onOpenTransition(t)}
                className={`flex items-center gap-1.5 font-semibold px-3 py-2 rounded-xl text-sm transition-colors ${
                  TRANSITION_CLS[t.to as EventStatus] ?? 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                }`}
              >
                {TRANSITION_ICON[t.to as EventStatus]}
                {t.label}
              </button>
            ))}
            {(event.participants_count ?? 0) === 0 && (
              <button onClick={onOpenDelete}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-xl text-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { Camera, User, MapPin, Users, MessageSquare, History, Clock,
         ParkingSquare, Baby, Dog, AlertCircle, Send, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import RatingWidget from '@/components/ui/RatingWidget';
import { formatRelative } from '@/lib/utils';
import { OUTING_STATUS_CONFIG, legacyToFrenchStatus } from '@/lib/outings';
import type { OutingStatus } from '@/lib/outings';
import type { Outing, Participant, Comment, StatusHistory, TabId } from '../_types';
import { TABS, PARTICIPANT_STATUS } from '../_config';

type Props = {
  outing: Outing;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  activeParticipants: Participant[];
  comments: Comment[];
  statusHistory: StatusHistory[];
  canManage: boolean;
  frenchStatus: OutingStatus;
  profile: { id: string; avatar_url?: string | null; full_name?: string } | null;
  // Discussion
  commentText: string;
  setCommentText: (v: string) => void;
  sendingComment: boolean;
  onSendComment: () => void;
};

export default function OutingTabs({
  outing,
  activeTab,
  setActiveTab,
  activeParticipants,
  comments,
  statusHistory,
  canManage,
  frenchStatus,
  profile,
  commentText,
  setCommentText,
  sendingComment,
  onSendComment,
}: Props) {
  // Build visible tabs
  const visibleTabs = TABS.filter(t => !t.managerOnly || canManage);

  return (
    <>
      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex-wrap">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-emerald-500 text-white shadow'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label(id === 'participants' ? activeParticipants.length : undefined)}
          </button>
        ))}
      </div>

      {/* ── Tab: Info ────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* Organizer */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" /> Organisateur
            </h3>
            <div className="flex items-center gap-3">
              <Avatar
                src={outing.organizer?.avatar_url}
                name={outing.organizer?.full_name || 'Organisateur'}
                size="md"
              />
              <div>
                <p className="font-semibold text-gray-800">{outing.organizer?.full_name || 'Membre'}</p>
                <p className="text-xs text-gray-400">
                  Organisateur · créé {formatRelative(outing.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {outing.description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">À propos de cette sortie</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{outing.description}</p>
            </div>
          )}

          {/* Location & Logistics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" /> Lieu &amp; Logistique
            </h3>
            <div className="space-y-3">
              {outing.meeting_point && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Point de rendez-vous</p>
                    <p className="text-sm text-gray-700">{outing.meeting_point}</p>
                  </div>
                </div>
              )}
              {(outing.location_city || outing.location_area) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    {[outing.location_area, outing.location_city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
              {outing.duration_estimate && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Durée estimée</p>
                    <p className="text-sm text-gray-700">{outing.duration_estimate}</p>
                  </div>
                </div>
              )}
              {outing.parking_info && (
                <div className="flex items-start gap-2">
                  <ParkingSquare className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Parking</p>
                    <p className="text-sm text-gray-700">{outing.parking_info}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Option badges */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
              {outing.parking_available && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <ParkingSquare className="w-3.5 h-3.5" /> Parking disponible
                </span>
              )}
              {outing.stroller_accessible && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                  <Baby className="w-3.5 h-3.5" /> Accès poussette
                </span>
              )}
              {outing.kids_friendly && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  <Users className="w-3.5 h-3.5" /> Adapté enfants
                </span>
              )}
              {outing.dogs_allowed && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Dog className="w-3.5 h-3.5" /> Chiens acceptés
                </span>
              )}
            </div>
          </div>

          {/* Organizer notes */}
          {outing.notes && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
              <p className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Notes de l&apos;organisateur
              </p>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{outing.notes}</p>
            </div>
          )}

          {/* Photo gallery */}
          {outing.photos && outing.photos.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-500" /> Photos
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {outing.photos.map((photo, i) => (
                  <Image src={photo.url} alt="" key={i} fill className="w-full object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {/* Rating (past outings) */}
          {(frenchStatus === 'terminee' || new Date(outing.outing_date + 'T23:59:59') < new Date()) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <RatingWidget
                targetType="outing"
                targetId={outing.id}
                authorId={outing.organizer_id}
                userId={profile?.id}
                compact={false}
                showPoll
              />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Participants ─────────────────────────────────────────────── */}
      {activeTab === 'participants' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">
            Participants ({activeParticipants.length}&nbsp;/&nbsp;{outing.max_participants})
          </h3>
          {activeParticipants.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">Aucun participant pour l&apos;instant</p>
              {frenchStatus === 'ouverte' && (
                <p className="text-sm text-emerald-600 mt-1">Soyez le premier à vous inscrire !</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeParticipants.map(p => {
                const statusDef = PARTICIPANT_STATUS[p.status] ?? PARTICIPANT_STATUS.inscrit;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar
                      src={p.profile?.avatar_url}
                      name={p.profile?.full_name || 'Membre'}
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {p.profile?.full_name || 'Membre'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Inscrit {formatRelative(p.joined_at || p.created_at)}
                      </p>
                    </div>
                    {canManage && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusDef.classes}`}>
                        {statusDef.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Discussion ───────────────────────────────────────────────── */}
      {activeTab === 'discussion' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Discussion</h3>
          {comments.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">Aucun message — démarrez la discussion !</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar src={c.author?.avatar_url} name={c.author?.full_name || 'Membre'} size="sm" />
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-bold text-gray-700">
                      {c.author?.full_name || 'Membre'}
                      <span className="font-normal text-gray-400 ml-2">{formatRelative(c.created_at)}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {profile ? (
            <div className="flex items-end gap-2 mt-2">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendComment(); }
                }}
                placeholder="Votre message… (Entrée pour envoyer)"
                rows={2}
                className="flex-1 text-sm rounded-xl border border-emerald-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
              />
              <button
                onClick={onSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex-shrink-0"
              >
                {sendingComment
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <Link
              href="/connexion"
              className="block text-center text-emerald-600 font-semibold text-sm py-2 hover:underline"
            >
              Connectez-vous pour participer →
            </Link>
          )}
        </div>
      )}

      {/* ── Tab: Historique ───────────────────────────────────────────────── */}
      {activeTab === 'historique' && canManage && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" /> Historique des statuts
          </h3>
          {statusHistory.length === 0 ? (
            <div className="text-center py-10">
              <History className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">Aucun historique disponible</p>
              <p className="text-xs text-gray-400 mt-1">Les changements de statut apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statusHistory.map(h => {
                const newCfg = OUTING_STATUS_CONFIG[legacyToFrenchStatus(h.new_status)];
                const oldCfg = h.old_status
                  ? OUTING_STATUS_CONFIG[legacyToFrenchStatus(h.old_status)]
                  : null;
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-lg flex-shrink-0">{newCfg?.icon || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {newCfg?.label || h.new_status}
                        {oldCfg && (
                          <span className="text-gray-400 font-normal"> ← {oldCfg.label}</span>
                        )}
                      </p>
                      {h.reason && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{h.reason}&quot;</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatRelative(h.created_at)}
                        {h.changed_by_profile?.full_name && (
                          <span className="ml-1.5">— par {h.changed_by_profile.full_name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

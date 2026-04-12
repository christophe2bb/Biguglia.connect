'use client';

/**
 * EventTabs — Onglets : info, participants, discussion, historique.
 * Reçoit toutes les données via props ; aucun fetch ici.
 */

import Link from 'next/link';
import {
  Trash2, Send, Loader2, UserCheck, UserX, ChevronRight, MessageSquare,
  Users, History,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import ContactButton from '@/components/ui/ContactButton';
import { formatRelative } from '@/lib/utils';
import {
  EVENT_STATUS_CONFIG,
  EVENT_PARTICIPANT_STATUS_CONFIG,
  resolveEventStatus,
  type EventStatus,
  type EventParticipantStatus,
} from '@/lib/events';
import { TABS_CONFIG } from '../_config';
import type { EventDetail, Participant, EventComment, StatusHistoryItem, TabId } from '../_types';
import type { Profile } from '@/types';

// ─── Pills helpers ────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg = EVENT_STATUS_CONFIG[status as EventStatus];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

function ParticipantStatusPill({ status }: { status: string }) {
  const cfg = EVENT_PARTICIPANT_STATUS_CONFIG[status as EventParticipantStatus];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  event: EventDetail;
  profile: Profile | null;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  participants: Participant[];
  comments: EventComment[];
  statusHistory: StatusHistoryItem[];
  commentText: string;
  commenting: boolean;
  onCommentChange: (v: string) => void;
  onCommentSubmit: (e: React.FormEvent) => Promise<void>;
  onDeleteComment: (id: string, authorId: string) => Promise<void>;
  onMarkAttendance: (userId: string, status: 'present' | 'absent') => Promise<void>;
  isAuthor: boolean;
  isAdmin: boolean;
}

export default function EventTabs({
  event, profile, activeTab, onTabChange,
  participants, comments, statusHistory,
  commentText, commenting,
  onCommentChange, onCommentSubmit, onDeleteComment, onMarkAttendance,
  isAuthor, isAdmin,
}: Props) {
  const canManage = isAuthor || isAdmin;

  const resolvedStatus = resolveEventStatus(
    event.status, event.event_date,
    event.participants_count ?? 0,
    event.capacity ?? null,
    event.is_unlimited,
  );

  const allPhotos = event.photos ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {TABS_CONFIG.map(tab => (
          <button key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label(event.participants_count ?? 0)}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── INFO ── */}
        {activeTab === 'info' && (
          <div className="space-y-5">
            {event.description && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Photos gallery */}
            {allPhotos.length > 1 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Photos</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {allPhotos.map((p, i) => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
              <Avatar name={event.author?.full_name ?? 'Organisateur'} src={event.author?.avatar_url} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Organisé par</p>
                <p className="font-bold text-gray-900">
                  {event.organizer_name || event.author?.full_name || 'Organisateur'}
                </p>
                {event.author_id && (
                  <Link href={`/profil/${event.author_id}`} className="text-xs text-purple-600 hover:underline">
                    Voir le profil
                  </Link>
                )}
              </div>
              {profile && profile.id !== event.author_id && event.author_id && (
                <ContactButton
                  sourceType="event"
                  sourceId={event.id}
                  sourceTitle={event.title}
                  ownerId={event.author_id}
                  userId={profile.id}
                  ctaLabel="Contacter l'organisateur"
                  prefillMsg={`Bonjour, j'ai une question concernant votre événement « ${event.title} ».`}
                  size="sm"
                  variant="secondary"
                />
              )}
            </div>

            {/* Additional info */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { show: !!event.target_audience, icon: '🏷️', label: 'Public cible',    value: event.target_audience },
                { show: !!event.accessibility,   icon: '♿',  label: 'Accessibilité',  value: event.accessibility },
                { show: !!event.contact_info,    icon: '📞', label: 'Contact',          value: event.contact_info },
              ].filter(i => i.show).map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <span className="text-base mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-700">{item.value}</p>
                  </div>
                </div>
              ))}
              {event.external_link && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <span className="text-base mt-0.5">🌐</span>
                  <div>
                    <p className="text-xs text-gray-500">Lien externe</p>
                    <a href={event.external_link} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-purple-600 hover:underline line-clamp-1">
                      {event.external_link}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map(t => (
                  <span key={t} className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Report */}
            {profile && !isAuthor && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Créé le {formatRelative(event.created_at)}</p>
                <ReportButton targetType="event" targetId={event.id} targetTitle={event.title} />
              </div>
            )}
          </div>
        )}

        {/* ── PARTICIPANTS ── */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inscrits',       value: participants.filter(p => p.status === 'inscrit').length,       color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Confirmés',      value: participants.filter(p => p.status === 'confirme').length,      color: 'text-blue-700',    bg: 'bg-blue-50' },
                { label: "Liste d'attente",value: participants.filter(p => p.status === 'liste_attente').length, color: 'text-amber-700',   bg: 'bg-amber-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className={`text-xs font-semibold ${s.color} opacity-80`}>{s.label}</p>
                </div>
              ))}
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 font-semibold">Aucun participant pour l&apos;instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.user?.full_name ?? 'Participant'} src={p.user?.avatar_url} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.user?.full_name ?? 'Participant'}</p>
                        <p className="text-xs text-gray-400">Inscrit {formatRelative(p.joined_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ParticipantStatusPill status={p.status} />
                      {canManage && resolvedStatus === 'passe' && p.status !== 'annule' && (
                        <div className="flex gap-1">
                          <button onClick={() => onMarkAttendance(p.user_id, 'present')}
                            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600" title="Présent">
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onMarkAttendance(p.user_id, 'absent')}
                            className="p-1 hover:bg-red-100 rounded-lg text-red-500" title="Absent">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DISCUSSION ── */}
        {activeTab === 'discussion' && (
          <div className="space-y-4">
            {profile && (
              <form onSubmit={onCommentSubmit} className="flex gap-2">
                <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text" value={commentText}
                    onChange={e => onCommentChange(e.target.value)}
                    placeholder="Posez une question, partagez une info..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button type="submit" disabled={commenting || !commentText.trim()}
                    className="bg-purple-600 text-white px-3 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all">
                    {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            )}

            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 font-semibold">Aucun message</p>
                <p className="text-gray-400 text-sm">Soyez le premier à démarrer la discussion !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => {
                  const canDel = !!profile && (
                    profile.id === c.author_id
                    || profile.role === 'admin'
                    || profile.role === 'moderator'
                    || profile.id === event.author_id
                  );
                  return (
                    <div key={c.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                      <Avatar name={c.author?.full_name ?? 'Anonyme'} src={c.author?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{c.author?.full_name ?? 'Anonyme'}</span>
                          <span className="text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                          {canDel && (
                            <button onClick={() => onDeleteComment(c.id, c.author_id)}
                              className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        {activeTab === 'historique' && (
          <div className="space-y-3">
            {statusHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 font-semibold">Aucun changement de statut enregistré</p>
              </div>
            ) : (
              statusHistory.map(h => {
                const cfg = EVENT_STATUS_CONFIG[h.new_status as EventStatus];
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-sm flex-shrink-0 ${cfg?.badgeBg ?? 'bg-gray-100'}`}>
                      {cfg?.icon ?? '•'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.old_status && <StatusPill status={h.old_status} />}
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        <StatusPill status={h.new_status} />
                      </div>
                      {h.reason && (
                        <p className="text-xs text-gray-600 mt-1 italic">{h.reason}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {h.changed_by_profile?.full_name ?? 'Système'} · {formatRelative(h.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin, MessageSquare, Footprints, Users, Eye, Baby, Dog,
  ParkingSquare, BarChart3, Star, Calendar, Loader2, Send, Pencil, Trash2,
} from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { legacyToFrenchStatus, computeDisplayStatus, OUTING_STATUS_CONFIG } from '@/lib/outings';
import type { GroupOuting, OutingComment } from '../_types';
import { DIFF_CONFIG } from '../_constants';

interface Props {
  outing: GroupOuting;
  userId?: string;
  isOrganizer: boolean;
  onJoin: (id: string, joined: boolean) => void;
  onEdit: (o: GroupOuting) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export default function OutingCard({ outing, userId, isOrganizer, onJoin, onEdit, onDelete, onStatusChange }: Props) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fillPct  = Math.round(((outing.participants_count || 0) / outing.max_participants) * 100);
  const isFull   = (outing.participants_count || 0) >= outing.max_participants;
  const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const diffConf  = outing.difficulty ? DIFF_CONFIG[outing.difficulty] : null;
  const daysUntil = Math.ceil((new Date(outing.outing_date + 'T00:00:00').getTime() - Date.now()) / 86400000);

  const [openChat, setOpenChat]     = useState(false);
  const [comments, setComments]     = useState<OutingComment[]>([]);
  const [loadingC, setLoadingC]     = useState(false);
  const [chatText, setChatText]     = useState('');
  const [sending, setSending]       = useState(false);
  const [chatCount, setChatCount]   = useState<number | null>(null);
  const [tableOk, setTableOk]       = useState<boolean | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoItems = outing.cover_photo ? [{ url: outing.cover_photo, isPrimary: true }] : [];
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('outing_comments').select('id', { count: 'exact', head: true }).eq('outing_id', outing.id)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) { setTableOk(false); } else { setTableOk(true); setChatCount(c ?? 0); }
      });
    return () => { cancelled = true; };
  }, [outing.id, supabase]);

  const fetchComments = useCallback(async () => {
    setLoadingC(true);
    const { data } = await supabase.from('outing_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('outing_id', outing.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as OutingComment[]);
    setChatCount((data ?? []).length);
    setLoadingC(false);
  }, [outing.id, supabase]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from('outing_comments')
      .insert({ outing_id: outing.id, author_id: userId, content: chatText.trim() });
    if (!error) { setChatText(''); await fetchComments(); }
    setSending(false);
  };

  // Suppress unused var warning
  void dateLabel;

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* ── Zone photo ── */}
      <div className="relative h-48 overflow-hidden">
        {outing.cover_photo ? (
          <div className="w-full h-full cursor-pointer" onClick={() => setLightboxOpen(true)}>
            <Image
              src={outing.cover_photo}
              alt={outing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center">
            <Footprints className="w-20 h-20 opacity-20 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Countdown badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full shadow-lg',
            daysUntil === 0 ? 'bg-red-500 text-white' :
            daysUntil <= 3  ? 'bg-amber-500 text-white' :
            'bg-emerald-500 text-white'
          )}>
            <Calendar className="w-3 h-3" />
            {daysUntil === 0 ? "Aujourd'hui !" : daysUntil === 1 ? 'Demain !' : `Dans ${daysUntil}j`}
            <span className="opacity-80">· {outing.outing_time}</span>
          </span>
          {diffConf && (
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 shadow border', diffConf.color)}>
              <BarChart3 className="w-3 h-3 inline mr-1" />{diffConf.label}
            </span>
          )}
          <StatusBadge status={outing.status || 'active'} contentType="outing" extra={{ outingDate: outing.outing_date, isFull, fillPct }} size="xs" showIcon className="shadow" />
        </div>

        {isOrganizer && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button type="button" onClick={() => onEdit(outing)} className="p-1.5 bg-white/90 text-gray-600 hover:text-emerald-600 rounded-xl transition-all shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onDelete(outing.id)} className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-xl transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {outing.parking_available && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/90 text-white shadow backdrop-blur-sm"><ParkingSquare className="w-3 h-3 inline mr-1" />Parking</span>}
            {outing.stroller_accessible && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500/90 text-white shadow backdrop-blur-sm"><Baby className="w-3 h-3 inline mr-1" />Poussette</span>}
            {outing.kids_friendly && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/90 text-white shadow backdrop-blur-sm"><Users className="w-3 h-3 inline mr-1" />Enfants</span>}
            {outing.dogs_allowed && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-white shadow backdrop-blur-sm"><Dog className="w-3 h-3 inline mr-1" />Chiens</span>}
          </div>
          <p className="text-white font-black text-sm leading-tight drop-shadow-lg line-clamp-2">{outing.title}</p>
        </div>
      </div>

      {/* ── Barre participants ── */}
      <div className="px-5 pt-3 pb-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className={cn('font-bold flex items-center gap-1', isFull ? 'text-red-500' : fillPct > 70 ? 'text-amber-600' : 'text-emerald-600')}>
            <Users className="w-3.5 h-3.5" />
            {outing.participants_count || 0}/{outing.max_participants} participants
            {isFull && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-black text-[10px]">COMPLET</span>}
          </span>
          <span className="text-gray-400">{fillPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', fillPct > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : fillPct > 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500')}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
      </div>

      <div className="p-5 pt-3">
        {outing.description && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{outing.description}</p>}
        <div className="flex flex-col gap-1 mb-4">
          {outing.meeting_point && (
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span><span className="font-semibold">RDV :</span> {outing.meeting_point}</span>
            </p>
          )}
          {outing.parking_info && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <ParkingSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {outing.parking_info}
            </p>
          )}
          {outing.sector_id && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <SectorBadge sectorId={outing.sector_id} size="xs" />
            </p>
          )}
          <p className="text-xs text-gray-400">Organisé par <span className="font-semibold text-gray-600">{outing.organizer?.full_name ?? 'Membre'}</span></p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {userId ? (
            <button onClick={() => onJoin(outing.id, !!outing.user_joined)}
              disabled={isFull && !outing.user_joined}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm',
                outing.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200')}>
              <Users className="w-4 h-4" />
              {outing.user_joined ? '✓ Inscrit — Annuler' : isFull ? 'Complet' : 'Je participe'}
            </button>
          ) : (
            <Link href="/connexion" className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
              <Users className="w-4 h-4" /> Je participe
            </Link>
          )}

          {isOrganizer ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 italic">✉️ Les membres vous contacteront ici</span>
              {onStatusChange && (() => {
                const fr = legacyToFrenchStatus(outing.status);
                const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
                const actions: { label: string; key: string; cfg: ReturnType<typeof legacyToFrenchStatus> }[] = [];
                if (displayed === 'ouverte') {
                  actions.push({ label: '👥 Marquer complète', key: 'complete', cfg: 'complete' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✅ Terminer', key: 'terminee', cfg: 'terminee' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✖ Annuler', key: 'annulee', cfg: 'annulee' as ReturnType<typeof legacyToFrenchStatus> });
                } else if (displayed === 'complete') {
                  actions.push({ label: '🔓 Rouvrir', key: 'ouverte', cfg: 'ouverte' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✅ Terminer', key: 'terminee', cfg: 'terminee' as ReturnType<typeof legacyToFrenchStatus> });
                } else if (displayed === 'terminee' || displayed === 'annulee') {
                  actions.push({ label: '📦 Archiver', key: 'archivee', cfg: 'archivee' as ReturnType<typeof legacyToFrenchStatus> });
                }
                return actions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {actions.map(a => {
                      const aCfg = OUTING_STATUS_CONFIG[a.cfg];
                      return (
                        <button key={a.key}
                          onClick={() => { if (window.confirm(`${a.label} ?`)) onStatusChange(outing.id, a.key); }}
                          className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors', aCfg.bg, aCfg.color, aCfg.border)}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <ContactButton sourceType="outing" sourceId={outing.id} sourceTitle={outing.title} ownerId={outing.organizer_id} userId={userId} size="sm" />
          )}

          {tableOk !== false && (
            <button onClick={handleOpenChat}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border',
                openChat ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
              <MessageSquare className="w-4 h-4" />
              Discussion
              {chatCount !== null && chatCount > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>
              )}
            </button>
          )}

          <Link href={`/promenades/sorties/${outing.id}`}
            className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100">
            <Eye className="w-4 h-4" /> Voir
          </Link>

          {userId && !isOrganizer && (
            <ReportButton targetType="outing" targetId={outing.id} targetTitle={outing.title} variant="mini" />
          )}
        </div>

        {/* Mini-chat */}
        {openChat && tableOk && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {loadingC ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-xs font-bold text-gray-700">
                        {c.author?.full_name ?? 'Anonyme'}
                        <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {userId ? (
              <div className="flex items-end gap-1.5">
                <textarea ref={inputRef} value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message…" rows={2}
                  className="flex-1 text-xs rounded-lg border border-emerald-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-emerald-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notation si sortie passée */}
      {new Date(outing.outing_date + 'T23:59:59') < new Date() && (
        <div className="px-4 pb-4">
          <RatingWidget targetType="outing" targetId={outing.id} authorId={outing.organizer_id} userId={userId} compact={false} showPoll />
        </div>
      )}

      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={outing.title} />
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  MapPin, Clock, Phone, Mail, MessageSquare, Shield, EyeOff,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Package,
  Send, Loader2, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import dynamic from 'next/dynamic';
import { toPhotoItems } from '@/components/ui/photo-utils';
// PhotoViewer (lightbox 572L) : lazy-load — chargé uniquement au premier clic
const PhotoViewer = dynamic(() => import('@/components/ui/PhotoViewer').then(m => ({ default: m.PhotoViewer })), {
  ssr: false,
});
import ContactButton from '@/components/ui/ContactButton';
import { TrustScoreMini } from '@/components/ui/TrustScore';
import { SectorBadge } from '@/components/ui/SectorFilter';

import type { LFItem, LFComment, LFStatus } from '../_types';
import {
  CATEGORIES, SENSITIVE_CATEGORIES, STATUS_CONFIG,
  ALLOWED_TRANSITIONS, ACTIVE_STATUSES,
} from '../_constants';
import { computeMatchScore } from '../_hooks/useLostFound';
import LFStatusBadge from './LFStatusBadge';

interface Props {
  item: LFItem;
  userId?: string;
  isAuthor: boolean;
  onEdit: (i: LFItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: LFStatus) => void;
  suggestedMatches?: LFItem[];
}

export default function LostFoundCard({
  item, userId, isAuthor, onEdit, onDelete, onStatusChange, suggestedMatches,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [expanded, setExpanded]         = useState(false);
  const [openChat, setOpenChat]         = useState(false);
  const [openShare, setOpenShare]       = useState(false);
  const [showMatches, setShowMatches]   = useState(false);
  const [comments, setComments]         = useState<LFComment[]>([]);
  const [chatText, setChatText]         = useState('');
  const [sending, setSending]           = useState(false);
  const [chatCount, setChatCount]       = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const CatIcon          = CATEGORIES.find(c => c.value === item.category)?.icon ?? Package;
  const _cfg              = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.perdu;
  const isActive         = ACTIVE_STATUSES.includes(item.status);
  const allPhotos        = toPhotoItems(item.photos ?? []);
  const allowedTransitions = ALLOWED_TRANSITIONS[item.status] ?? [];
  const isSensitive      = item.is_sensitive || SENSITIVE_CATEGORIES.includes(item.category);

  // Close share popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Initial comment count
  useEffect(() => {
    supabase.from('lf_comments')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', item.id)
      .then(({ count }) => setChatCount(count ?? 0));
  }, [item.id, supabase]);

  const fetchComments = async () => {
    const { data } = await supabase.from('lf_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data ?? []) as LFComment[]);
    setChatCount((data ?? []).length);
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('lf_comments').insert({
      item_id: item.id, author_id: userId, content: chatText.trim(),
    });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const handleTransition = async (newStatus: LFStatus) => {
    const statusLabel: Record<LFStatus, string> = {
      perdu: 'Perdu', trouve: 'Trouvé', identifie: 'Identifié',
      restitue: 'Restitué', clos: 'Clos', archive: 'Archivé', draft: 'Brouillon',
    };
    if (!window.confirm(`Passer le dossier en "${statusLabel[newStatus]}" ?`)) return;
    setTransitioning(true);
    await onStatusChange(item.id, newStatus);
    setTransitioning(false);
  };

  const dateLabel = new Date(item.lost_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const shareText = encodeURIComponent(
    `${item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'} : ${item.title} — ${item.location_area}\n${typeof window !== 'undefined' ? window.location.origin : ''}/perdu-trouve`
  );

  return (
    <div id={item.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
      !isActive
        ? 'opacity-70 border-gray-200'
        : item.status === 'identifie'
          ? 'border-blue-300 ring-1 ring-blue-200'
          : item.type === 'perdu' ? 'border-orange-200' : 'border-emerald-200'
    }`}>

      {/* ── Photo / header ── */}
      <div className="relative h-44 overflow-hidden">
        {item.photos && item.photos.length > 0 ? (
          <div className="w-full h-full cursor-pointer" role="button" tabIndex={0} onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIdx(0); setLightboxOpen(true); } }}>
            <Image src={item.photos[0].url} alt={item.title} fill className="object-cover" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-10 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                +{allPhotos.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            item.type === 'perdu'
              ? 'bg-gradient-to-br from-orange-50 to-amber-100'
              : 'bg-gradient-to-br from-emerald-50 to-teal-100'
          }`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${item.type === 'perdu' ? 'text-orange-400' : 'text-emerald-400'}`} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <LFStatusBadge status={item.status} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700 shadow">
            <CatIcon className="w-3 h-3" />
            {CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
          </span>
          {isSensitive && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100/90 text-red-700 shadow">
              <Shield className="w-3 h-3" /> Sensible
            </span>
          )}
        </div>

        {/* Actions auteur haut droite */}
        {isAuthor && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button onClick={() => onEdit(item)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-blue-600 rounded-lg shadow" title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-lg shadow" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Correspondances suggérées (bouton en haut à droite si pas auteur) */}
        {!isAuthor && suggestedMatches && suggestedMatches.length > 0 && (
          <div className="absolute top-3 right-3">
            <button onClick={() => setShowMatches(v => !v)}
              className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
              <Zap className="w-3 h-3" /> {suggestedMatches.length} correspondance{suggestedMatches.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Titre en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
          <p className="text-white/75 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />{item.location_area} · {dateLabel}
          </p>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-4">

        {/* Badges secondaires */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.sector_id && <SectorBadge sectorId={item.sector_id} size="xs" />}
          {item.sentimental_value && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
              💝 Valeur sentimentale
            </span>
          )}
          {item.keep_secret && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <EyeOff className="w-3 h-3 inline mr-0.5" />Infos partielles
            </span>
          )}
          {item.declared_authorities && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              🏛️ Déclaré aux autorités
            </span>
          )}
          {item.deposited_at && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              📍 Déposé : {item.deposited_at}
            </span>
          )}
          {item.reward && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              🏆 {item.reward}
            </span>
          )}
        </div>

        {/* Lieu + date */}
        <div className="flex flex-col gap-0.5 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            {item.location_area}{item.location_detail ? ` — ${item.location_detail}` : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            {dateLabel}{item.lost_time ? ` · ${item.lost_time}` : ''}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">{item.description}</p>

        {/* Correspondances suggérées */}
        {showMatches && suggestedMatches && suggestedMatches.length > 0 && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Correspondances probables
            </p>
            {suggestedMatches.map(m => {
              const score = computeMatchScore(
                item.type === 'perdu' ? item : m,
                item.type === 'perdu' ? m   : item
              );
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 border-t border-blue-100 first:border-0">
                  <div className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                    score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    score >= 50 ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                  }`}>
                    {score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.location_area} · {m.lost_date}</p>
                  </div>
                  <ContactButton
                    sourceType="lost_found"
                    sourceId={m.id}
                    sourceTitle={m.title}
                    ownerId={m.author_id}
                    userId={userId}
                    size="sm"
                    ctaLabel="Contacter"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Expand / collapse */}
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 mb-3">
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" />Moins de détails</>
            : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
        </button>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5 border border-gray-100">
            {item.color && <p className="text-gray-600"><span className="font-semibold">Couleur :</span> {item.color}</p>}
            {item.brand && <p className="text-gray-600"><span className="font-semibold">Marque :</span> {item.brand}</p>}
            {item.distinctive_sign && (
              <p className="text-gray-600"><span className="font-semibold">Signe distinctif :</span> {item.distinctive_sign}</p>
            )}
            {item.proof_required && (
              <p className="text-indigo-700 font-semibold">🔒 Preuve de propriété requise pour restitution</p>
            )}
            {!item.keep_secret && (
              <div className="pt-1.5 border-t border-gray-200 space-y-1">
                <p className="font-semibold text-gray-700">Contact : {item.contact_name}</p>
                {item.show_phone && item.contact_phone && (
                  <p className="flex items-center gap-1.5 text-gray-600"><Phone className="w-3 h-3" />{item.contact_phone}</p>
                )}
                {item.contact_email && (
                  <p className="flex items-center gap-1.5 text-gray-600"><Mail className="w-3 h-3" />{item.contact_email}</p>
                )}
              </div>
            )}
            {item.keep_secret && (
              <div className="pt-1.5 border-t border-gray-200">
                <p className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  Certains détails sont gardés confidentiels pour sécuriser la restitution.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Miniatures supplémentaires */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {allPhotos.slice(1).map((p, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }} className="flex-shrink-0">
                <Image src={p.url} alt="" fill className="object-cover rounded-lg border border-gray-100 hover:border-blue-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-2 items-start">
          {isAuthor ? (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 italic mb-1.5">✉️ Les membres vous contacteront via la messagerie</p>
              {allowedTransitions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {allowedTransitions.map(t => {
                    const tCfg = STATUS_CONFIG[t];
                    return (
                      <button key={t} onClick={() => handleTransition(t)} disabled={transitioning}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition-colors disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                        {tCfg.icon} {tCfg.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <ContactButton
              sourceType="lost_found"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={userId}
              size="sm"
              ctaLabel={item.type === 'trouve' ? "C'est le mien" : "J'ai une info"}
              prefillMsg={
                item.type === 'trouve'
                  ? `Bonjour, l'objet "${item.title}" trouvé à ${item.location_area} pourrait m'appartenir. Comment procéder pour la restitution ?`
                  : `Bonjour, j'ai peut-être une information concernant votre "${item.title}" perdu à ${item.location_area}.`
              }
            />
          )}

          {/* Discussion */}
          <button
            onClick={() => {
              const w = !openChat;
              setOpenChat(w);
              if (w) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
            }}
            className={`inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs border transition-all ${
              openChat ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}>
            <MessageSquare className="w-3.5 h-3.5" />
            {chatCount > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
            Discussion
          </button>

          {/* Partager */}
          <div ref={shareRef} className="relative">
            <button onClick={e => { e.stopPropagation(); setOpenShare(v => !v); }}
              className="inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Partager
            </button>
            {openShare && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[150px] overflow-hidden">
                <button onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  💬 Par SMS
                </button>
                <div className="border-t border-gray-100" />
                <button onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  📧 Par Email
                </button>
                <div className="border-t border-gray-100" />
                <button onClick={() => {
                  navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/perdu-trouve#${item.id}`);
                  toast.success('Lien copié !');
                  setOpenShare(false);
                }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  🔗 Copier le lien
                </button>
              </div>
            )}
          </div>

          {!isAuthor && (
            <ReportButton targetType="lost_found" targetId={item.id} targetTitle={item.title} variant="mini" />
          )}
        </div>

        {/* ── Mini-forum ── */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message pour l&apos;instant</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: item.type === 'perdu' ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
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
                <textarea
                  ref={inputRef}
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 text-xs rounded-lg border border-blue-200 px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-blue-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour répondre →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          {item.author && (
            <TrustScoreMini
              profile={{
                id: item.author_id,
                created_at: item.author.created_at ?? item.created_at,
                role: item.author.role ?? 'resident',
                avatar_url: item.author.avatar_url ?? null,
                phone: item.author.phone ?? null,
              }}
            />
          )}
          <span className="flex-1">{item.author?.full_name ?? 'Membre'}</span>
          <span>· {formatRelative(item.created_at)}</span>
          {item.updated_at !== item.created_at && (
            <span className="text-gray-300">· modifié {formatRelative(item.updated_at)}</span>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}

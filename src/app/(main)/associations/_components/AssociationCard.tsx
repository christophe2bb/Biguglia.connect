'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { toPhotoItems } from '@/components/ui/photo-utils';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import StatusBadge from '@/components/ui/StatusBadge';
import ContactButton from '@/components/ui/ContactButton';
import { SectorBadge } from '@/components/ui/SectorFilter';
import {
  Clock, Mail, Globe, Phone, MessageSquare, CheckCircle2,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Loader2,
  Send, Calendar, MapPin, Accessibility, Baby, Dog, ParkingSquare,
  Bookmark, BookmarkCheck, ArrowRight, ChevronRight, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import NeedPicto from './NeedPicto';
import { CAT_CONFIG, PUB_TYPE_CONFIG } from '../_constants';
import type { Association, AssoComment } from '../_types';

interface AssociationCardProps {
  asso: Association;
  userId?: string;
  isAuthor: boolean;
  onEdit: (a: Association) => void;
  onDelete: (id: string) => void;
  saved: boolean;
  onToggleSave: (id: string) => void;
}

export default function AssociationCard({
  asso, userId, isAuthor, onEdit, onDelete, saved, onToggleSave,
}: AssociationCardProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [expanded, setExpanded] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [comments, setComments] = useState<AssoComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const cat = CAT_CONFIG[asso.category];
  const CatIcon = cat.icon;
  const pubConf = PUB_TYPE_CONFIG[asso.pub_type];
  const coverPhoto = asso.photos?.[0]?.url;
  const allPhotos = toPhotoItems(asso.photos ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const lastAct = asso.last_activity_at ?? asso.updated_at;
  const daysSince = Math.floor((Date.now() - new Date(lastAct).getTime()) / 86400000);
  const actLabel = daysSince <= 7 ? '🟢 Active récemment' : daysSince <= 30 ? '🟡 Active ce mois' : '🔵 À suivre';

  useEffect(() => {
    supabase.from('asso_comments').select('id', { count: 'exact', head: true })
      .eq('asso_id', asso.id)
      .then(({ count }) => setChatCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [asso.id, supabase]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('asso_comments')
      .select('id, content, created_at, author_id, author:profiles(full_name)')
      .eq('asso_id', asso.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as AssoComment[]);
    setChatCount((data ?? []).length);
  }, [asso.id, supabase]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('asso_comments')
      .delete()
      .eq('id', commentId);
    if (error) {
      toast.error('Impossible de supprimer ce message');
    } else {
      toast.success('Message supprimé');
      await fetchComments();
    }
  }, [supabase, userId, fetchComments]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('asso_comments').insert({ asso_id: asso.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/associations/${asso.id}`; // nosec — read-only origin, path constructed from DB id (UUID), no user input in URL
  const shareText = encodeURIComponent(`${asso.name} — ${asso.description_short}\n${shareUrl}`);

  return (
    <div id={asso.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-colors overflow-hidden group">

      {/* Cover photo ou header coloré */}
      <div className="relative h-44 overflow-hidden">
        {coverPhoto ? (
          <div className="w-full h-full cursor-pointer" role="button" tabIndex={0} onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIdx(0); setLightboxOpen(true); } }}>
            <Image src={coverPhoto} alt={asso.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                📷 +{allPhotos.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', cat.bg)}>
            <CatIcon className={cn('w-16 h-16 opacity-15', cat.color)} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn('text-xs font-black px-2.5 py-1 rounded-full shadow', pubConf.color)}>{pubConf.emoji} {pubConf.label}</span>
          {asso.urgent_need && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow animate-pulse">🚨 Urgent</span>}
          <StatusBadge status={asso.status || 'active'} contentType="association" size="xs" showIcon showDot={asso.status === 'active'} className="shadow" />
        </div>

        {/* Bouton favori + auteur haut droite */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button type="button" onClick={() => onToggleSave(asso.id)}
            className={cn('p-1.5 rounded-lg backdrop-blur-sm shadow transition-colors',
              saved ? 'bg-yellow-400/90 text-white' : 'bg-white/80 text-gray-500 hover:text-yellow-500')}>
            {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
          {isAuthor && (
            <>
              <button type="button" onClick={() => onEdit(asso)} className="p-1.5 bg-white/80 text-gray-600 hover:text-blue-600 rounded-lg transition-colors backdrop-blur-sm shadow"><Pencil className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onDelete(asso.id)} className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-colors backdrop-blur-sm shadow"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>

        {/* Nom + slogan en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-base leading-tight drop-shadow">{asso.name}</p>
          {asso.slogan && <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{asso.slogan}</p>}
        </div>
      </div>

      <div className="p-5">
        {/* Badges catégorie + secteur + activité */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border', cat.bg, cat.color)}>
            <CatIcon className="w-3 h-3" />{cat.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <MapPin className="w-3 h-3 text-gray-400" />{asso.location}
          </span>
          {asso.sector_id && <SectorBadge sectorId={asso.sector_id} size="xs" />}
          {asso.declared && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />Déclarée
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{actLabel}</span>
        </div>

        {/* Description courte */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{asso.description_short}</p>

        {/* Pictos besoins actifs */}
        <div className="mb-3">
          <NeedPicto
            needs={asso.needs}
            isAcceptingMembers={asso.is_accepting_members}
            isAcceptingVolunteers={asso.is_accepting_volunteers}
            isAcceptingDonations={asso.is_accepting_donations}
            isAcceptingPartners={asso.is_accepting_partners}
            urgent={asso.urgent_need}
          />
        </div>

        {/* Publics concernés */}
        {asso.public_target.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asso.public_target.map(p => (
              <span key={p} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                {p === 'Enfants' ? '🧒' : p === 'Seniors' ? '🧓' : p === 'Familles' ? '👨‍👩‍👧' : p === 'Ados' ? '🧑' : '👤'} {p}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {asso.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asso.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"># {t}</span>
            ))}
          </div>
        )}

        {/* Infos pratiques rapides */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs text-gray-500">
          {asso.schedule && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{asso.schedule}</span>
          )}
          {asso.price_type && (
            <span className="flex items-center gap-1">
              💶 {asso.price_type === 'gratuit' ? 'Gratuit' : asso.price_type === 'cotisation' ? `Cotisation${asso.price_detail ? ` · ${asso.price_detail}` : ''}` : asso.price_detail || 'Voir conditions'}
            </span>
          )}
          {asso.contact_email && (
            <span className="flex items-center gap-1 col-span-2 truncate"><Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />{asso.contact_email}</span>
          )}
        </div>

        {/* Badges accessibilité */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {asso.pmr_accessible && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Accessibility className="w-3 h-3 inline mr-1" />PMR</span>}
          {asso.families_welcome && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200"><Baby className="w-3 h-3 inline mr-1" />Familles</span>}
          {asso.animals_ok && <span className="text-xs px-2 py-0.5 rounded-full bg-lime-50 text-lime-600 border border-lime-200"><Dog className="w-3 h-3 inline mr-1" />Animaux</span>}
          {asso.parking_nearby && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200"><ParkingSquare className="w-3 h-3 inline mr-1" />Parking</span>}
        </div>

        {/* Bouton détails */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-600 hover:text-violet-800 font-semibold flex items-center gap-1 mb-3 transition-colors">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Réduire</> : <><ChevronDown className="w-3.5 h-3.5" />Voir la présentation complète</>}
        </button>

        {expanded && (
          <div className="space-y-4 mb-4">
            {asso.description_full && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Présentation</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{asso.description_full}</p>
              </div>
            )}
            {asso.activities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activités proposées</p>
                <div className="flex flex-wrap gap-1.5">
                  {asso.activities.map(a => <span key={a} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
                {asso.frequency && <p className="text-xs text-gray-500 mt-1.5">⏱ {asso.frequency}</p>}
              </div>
            )}
            {asso.need_detail && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Ce que nous recherchons</p>
                <p className="text-sm text-gray-700">{asso.need_detail}</p>
              </div>
            )}
            {/* Contact complet */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact</p>
              <p className="text-sm font-semibold text-gray-800">{asso.contact_name}{asso.contact_role ? ` · ${asso.contact_role}` : ''}</p>
              {asso.show_phone && asso.contact_phone && (
                <a href={`tel:${asso.contact_phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Phone className="w-3 h-3" />{asso.contact_phone}</a>
              )}
              {asso.contact_email && (
                <a href={`mailto:${asso.contact_email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Mail className="w-3 h-3" />{asso.contact_email}</a>
              )}
              {asso.contact_website && (
                <a href={asso.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Globe className="w-3 h-3" />{asso.contact_website}</a>
              )}
              <div className="flex gap-2 pt-1">
                {asso.contact_facebook && <a href={asso.contact_facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">Facebook →</a>}
                {asso.contact_instagram && <a href={asso.contact_instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline font-semibold">Instagram →</a>}
              </div>
            </div>
            {asso.rna_number && <p className="text-xs text-gray-400">N° RNA : {asso.rna_number}</p>}

            <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
              className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 hover:bg-purple-100 transition-colors group/ev">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-700">Voir les événements de cette association</p>
                <p className="text-xs text-purple-500">Agenda · Biguglia Connect</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400 ml-auto group-hover/ev:translate-x-0.5 transition-transform" />
            </Link>

            <Link href={`/forum?q=${encodeURIComponent(asso.name)}`}
              className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 hover:bg-violet-100 transition-colors group/fr">
              <MessageSquare className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-violet-700">Discussions liées sur le forum</p>
                <p className="text-xs text-violet-500">Forum · Biguglia Connect</p>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-400 ml-auto group-hover/fr:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Galerie photos miniatures */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {allPhotos.slice(1).map((p, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-300">
                <Image src={p.url} alt="" fill sizes="64px" className="object-cover hover:scale-110 transition-transform duration-300" />
              </button>
            ))}
          </div>
        )}

        {/* ── ACTIONS PRINCIPALES ── */}
        <div className="space-y-2">
          {/* Ligne 1 : CTA principal */}
          <div className="flex gap-2 flex-wrap">
            {!isAuthor && (
              <ContactButton
                sourceType="association" sourceId={asso.id} sourceTitle={asso.name}
                ownerId={asso.author_id} userId={userId} size="sm"
                ctaLabel={
                  asso.pub_type === 'benevoles' ? '🙋 Devenir bénévole' :
                  asso.pub_type === 'dons' ? '💝 Faire un don' :
                  asso.pub_type === 'adherents' ? '👥 Adhérer' :
                  asso.pub_type === 'partenaires' ? '🤝 Devenir partenaire' :
                  asso.pub_type === 'materiel' ? '📦 Proposer du matériel' :
                  '✉️ Contacter'
                }
              />
            )}
            {!isAuthor && (asso.is_accepting_members || asso.needs.includes('Nouveaux adhérents')) && (
              <ContactButton sourceType="association" sourceId={asso.id} sourceTitle={asso.name} ownerId={asso.author_id} userId={userId} size="sm" ctaLabel="👥 Rejoindre" />
            )}
            {!isAuthor && (asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')) && asso.pub_type !== 'benevoles' && (
              <ContactButton sourceType="association" sourceId={asso.id} sourceTitle={asso.name} ownerId={asso.author_id} userId={userId} size="sm" ctaLabel="🙋 Je veux aider" />
            )}
          </div>

          {/* Ligne 2 : Discussion + Partager + Signaler */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={handleOpenChat}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-colors border',
                openChat ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
              <MessageSquare className="w-4 h-4" />Forum
              {chatCount > 0 && <span className="bg-violet-100 text-violet-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
            </button>

            <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
              className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-colors border bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200">
              <Calendar className="w-4 h-4" />Événements
            </Link>

            <div ref={shareRef} className="relative">
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenShare(v => !v); }}
                className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm border transition-colors',
                  openShare ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
                <Share2 className="w-4 h-4" />
              </button>
              {openShare && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[150px]">
                  <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">💬 Par SMS</button>
                  <div className="border-t border-gray-100" />
                  <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(asso.name)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">📧 Par Email</button>
                  <div className="border-t border-gray-100" />
                  <button type="button" onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié !'); } setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">🔗 Copier le lien</button>
                </div>
              )}
            </div>

            {!isAuthor && (
              <ReportButton targetType="association" targetId={asso.id} targetTitle={asso.name} variant="icon" />
            )}
          </div>
        </div>

        {/* Mini-forum */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">💬 Forum de l&apos;association</p>
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — soyez le premier !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => {
                  const canDelete = !!userId && (c.author_id === userId || isAuthor);
                  return (
                    <div key={c.id} className="flex items-start gap-2 group/msg">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white btn-gradient-violet">
                        {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 relative">
                        <p className="text-xs font-bold text-gray-700">
                          {c.author?.full_name ?? 'Anonyme'}
                          <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Supprimer ce message"
                            className="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {userId ? (
              <div className="flex items-end gap-1.5">
                <textarea ref={inputRef} value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                  className="flex-1 text-xs rounded-lg border border-violet-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button type="button" onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 transition-colors flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-violet-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            {asso.author?.full_name ?? 'Membre'} · {formatRelative(asso.created_at)}
          </p>
          <Link href={`/associations/${asso.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline transition-colors flex-shrink-0">
            Fiche complète <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50">
          <RatingWidget
            targetType="association" targetId={asso.id} authorId={asso.author_id}
            userId={userId} compact={!expanded} showPoll={expanded}
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={asso.name} />
      )}
    </div>
  );
}

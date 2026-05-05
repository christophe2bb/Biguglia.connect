'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Camera, User, MapPin, Users, MessageSquare, History, Clock,
         ParkingSquare, Baby, Dog, AlertCircle, Send, Loader2,
         X, ChevronLeft, ChevronRight, Trash2, Plus } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import RatingWidget from '@/components/ui/RatingWidget';
import { formatRelative } from '@/lib/utils';
import { OUTING_STATUS_CONFIG, legacyToFrenchStatus } from '@/lib/outings';
import type { OutingStatus } from '@/lib/outings';
import type { Outing, Participant, Comment, StatusHistory, TabId } from '../_types';
import { TABS, PARTICIPANT_STATUS } from '../_config';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

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
  // Callback pour rafraîchir les photos après modification
  onPhotosChanged?: () => void;
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
  onPhotosChanged,
}: Props) {
  // Build visible tabs
  const visibleTabs = TABS.filter(t => !t.managerOnly || canManage);

  // ── Lightbox state ────────────────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = outing.photos || [];
  const openLightbox  = (i: number) => setLightboxIndex(i);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto     = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + photos.length) % photos.length : 0), [photos.length]);
  const nextPhoto     = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % photos.length : 0), [photos.length]);

  // Navigation clavier pour le lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'Escape')     closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, prevPhoto, nextPhoto, closeLightbox]);

  // ── Gestion photos (organisateur) ─────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingUrl,    setDeletingUrl]    = useState<string | null>(null);

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !profile) return;
    setUploadingPhoto(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      const baseOrder = photos.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext  = safeImageExt(file.name);
        const path = `outings/${outing.id}/${Date.now()}_${i}.${ext}`;
        try {
          const publicUrl = await uploadFile(file, 'photos', path, profile.id, accessToken);
          const res = await fetch('/api/outing-photos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ outing_id: outing.id, url: publicUrl, display_order: baseOrder + i }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        } catch (err) {
          toast.error(`Photo ${i + 1} : ${err instanceof Error ? err.message : 'Erreur upload'}`);
        }
      }
      toast.success('✅ Photos ajoutées !');
      onPhotosChanged?.();
    } finally {
      setUploadingPhoto(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!profile) return;
    setDeletingUrl(photoUrl);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      const res = await fetch('/api/outing-photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ outing_id: outing.id, url: photoUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast.success('Photo supprimée');
      onPhotosChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <>
      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex-wrap">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
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

          {/* ── Photo gallery ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-500" />
                Photos
                {photos.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">
                    {photos.length} photo{photos.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              {/* Bouton ajouter photo — organisateur uniquement */}
              {canManage && (
                <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  uploadingPhoto
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}>
                  {uploadingPhoto ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload…</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> Ajouter</>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={handleAddPhotos}
                  />
                </label>
              )}
            </div>

            {/* Galerie */}
            {photos.length === 0 ? (
              <div className="px-4 pb-4">
                <div className="flex flex-col items-center justify-center py-8 text-gray-300 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Camera className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">
                    {canManage ? 'Ajoutez des photos à cette sortie' : 'Aucune photo pour cette sortie'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4">
                {/* Layout magazine identique à PromenadeDetailClient */}
                {photos.length === 1 ? (
                  <div className="rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => openLightbox(0)}
                      className="relative w-full block cursor-zoom-in group"
                    >
                      <div className="relative w-full aspect-video overflow-hidden rounded-2xl">
                        <Image
                          src={photos[0].url}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          sizes="100vw"
                        />
                      </div>
                    </button>
                    {canManage && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photos[0].url)}
                          disabled={deletingUrl === photos[0].url}
                          className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {deletingUrl === photos[0].url
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-0.5 bg-gray-900 rounded-2xl overflow-hidden">
                      {/* Grande photo à gauche */}
                      <div className="col-span-2 relative">
                        <button
                          type="button"
                          onClick={() => openLightbox(0)}
                          className="relative w-full aspect-[4/3] overflow-hidden cursor-zoom-in group block"
                        >
                          <Image
                            src={photos[0].url}
                            alt=""
                            fill
                            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            sizes="66vw"
                          />
                          {canManage && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleDeletePhoto(photos[0].url); }}
                                disabled={deletingUrl === photos[0].url}
                                className="bg-black/60 hover:bg-red-600 text-white rounded-xl p-1.5 shadow-lg transition-colors disabled:opacity-50"
                              >
                                {deletingUrl === photos[0].url
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          )}
                        </button>
                      </div>
                      {/* Thumbnails à droite */}
                      <div className="flex flex-col gap-0.5">
                        {photos.slice(1, 5).map((photo, i) => (
                          <div key={i + 1} className="relative flex-1" style={{ minHeight: 0 }}>
                            <button
                              type="button"
                              onClick={() => openLightbox(i + 1)}
                              className="relative w-full h-full overflow-hidden cursor-zoom-in group block"
                              style={{ minHeight: '60px' }}
                            >
                              <Image
                                src={photo.url}
                                alt=""
                                fill
                                className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
                                sizes="33vw"
                              />
                              {/* Overlay +N sur le dernier thumbnail si > 5 photos */}
                              {i === 3 && photos.length > 5 && (
                                <div className="absolute inset-0 bg-black/60 hover:bg-black/45 transition-colors flex flex-col items-center justify-center gap-0.5">
                                  <span className="text-white font-black text-xl leading-none">+{photos.length - 5}</span>
                                  <span className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">photos</span>
                                </div>
                              )}
                              {canManage && (
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleDeletePhoto(photo.url); }}
                                    disabled={deletingUrl === photo.url}
                                    className="bg-black/60 hover:bg-red-600 text-white rounded-lg p-1 shadow transition-colors disabled:opacity-50"
                                  >
                                    {deletingUrl === photo.url
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Trash2 className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </button>
                          </div>
                        ))}
                        {/* Remplir les slots vides */}
                        {photos.slice(1, 5).length < 4 && Array.from({ length: 4 - photos.slice(1, 5).length }).map((_, i) => (
                          <div key={`empty-${i}`} className="flex-1 bg-gray-800" style={{ minHeight: '60px' }} />
                        ))}
                      </div>
                    </div>
                    {/* Barre de bas : compteur + voir toutes */}
                    <button
                      type="button"
                      onClick={() => openLightbox(0)}
                      className="w-full bg-gray-900 hover:bg-gray-800 transition-colors px-4 py-2.5 flex items-center justify-between rounded-b-2xl"
                    >
                      <div className="flex items-center gap-2 text-gray-300 text-xs font-semibold">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        {photos.length} photo{photos.length > 1 ? 's' : ''}
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
                        Voir toutes →
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

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
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-colors flex-shrink-0"
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

      {/* ══════════════════════════════════════════════════════════════════════
          LIGHTBOX — Rendu en dehors de tout onglet conditionnel
          Utilise <img> standard (pas <Image fill>) pour éviter le bug plein écran
      ══════════════════════════════════════════════════════════════════════ */}
      {lightboxIndex !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Fermer */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Compteur */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white text-sm font-bold px-4 py-1.5 rounded-full">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Flèche gauche */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image principale — <img> standard pour éviter le bug fill */}
          <div
            className="relative w-full h-full max-w-4xl mx-auto px-16 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].url}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] w-auto h-auto mx-auto rounded-xl shadow-2xl object-contain"
              style={{ display: 'block' }}
            />
          </div>

          {/* Flèche droite */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Bande de thumbnails en bas */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2 px-4 overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === lightboxIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, X, Loader2, Users, Camera, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import OutingCard from './OutingCard';
import type { GroupOuting, OutingFormState } from '../_types';

interface Props {
  outings: GroupOuting[];
  loadingOutings: boolean;
  showOutingForm: boolean;
  setShowOutingForm: (v: boolean) => void;
  editingOuting: GroupOuting | null;
  outingForm: OutingFormState;
  setOutingForm: React.Dispatch<React.SetStateAction<OutingFormState>>;
  outingPhotos: File[];
  outingPreviews: string[];
  outingPhotoRef: React.RefObject<HTMLInputElement>;
  submittingOuting: boolean;
  handleOutingSubmit: (e: React.FormEvent) => void;
  handleOutingPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeOutingPhoto: (i: number) => void;
  resetOutingForm: () => void;
  startEditOuting: (o: GroupOuting) => void;
  handleDeleteOuting: (id: string) => void;
  handleOutingStatusChange: (id: string, newStatus: string) => void;
  handleJoinOuting: (id: string, joined: boolean) => void;
  profileId?: string;
}

export default function TabAgenda({
  outings, loadingOutings,
  showOutingForm, setShowOutingForm, editingOuting,
  outingForm, setOutingForm, outingPhotos, outingPreviews, outingPhotoRef,
  submittingOuting, handleOutingSubmit, handleOutingPhotoSelect, removeOutingPhoto, resetOutingForm,
  startEditOuting, handleDeleteOuting, handleOutingStatusChange, handleJoinOuting,
  profileId,
}: Props) {
  return (
    <div>

      {/* ── En-tête distinctif orange ── */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icône calendrier */}
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-200">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-black text-gray-900">Sorties groupées</h2>
                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                  📅 Rendez-vous
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Des <strong className="text-orange-600">dates précises</strong>, un lieu de rendez-vous, des participants — rejoignez ou organisez une sortie avec les habitants.
              </p>
              {/* Différence clé */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" /> Heure de départ fixée</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3 text-orange-400" /> Places limitées</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-400" /> Point de RDV</span>
              </div>
            </div>
          </div>

          {profileId && (
            <button
              onClick={() => { resetOutingForm(); setShowOutingForm(!showOutingForm); }}
              className={cn(
                'inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0',
                showOutingForm
                  ? 'bg-gray-100 text-gray-600 border border-gray-200'
                  : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200'
              )}
            >
              <Plus className="w-4 h-4" />
              {showOutingForm ? 'Annuler' : 'Créer une sortie'}
            </button>
          )}
        </div>

        {/* Explication de la différence avec les itinéraires */}
        <div className="mt-4 pt-4 border-t border-orange-100 grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-xl p-3 border border-orange-100">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">📅 Sortie groupée (ici)</p>
            <p className="text-xs text-gray-600">Balade <strong>dimanche 10 mai à 9h00</strong> — parking du lac, 8 participants max. Inscription requise.</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">🗺️ Itinéraire (onglet vert)</p>
            <p className="text-xs text-gray-600">Sentier de l&apos;étang, 3 km, facile — fiche permanente à consulter quand vous voulez.</p>
          </div>
        </div>
      </div>

      {/* ── Formulaire création sortie ── */}
      {showOutingForm && profileId && (
        <form onSubmit={handleOutingSubmit} className="bg-white rounded-2xl border-2 border-orange-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-base">
                {editingOuting ? '✏️' : '📅'}
              </span>
              {editingOuting ? 'Modifier la sortie' : 'Organiser une sortie groupée'}
            </h3>
            <button type="button" onClick={resetOutingForm} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Titre de la sortie *"
              required
              value={outingForm.title}
              onChange={e => setOutingForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />

            {/* Date + heure — mis en avant car c'est la clé d'une sortie */}
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
              <p className="text-xs font-black text-orange-700 mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date &amp; heure du rendez-vous *
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  value={outingForm.outing_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setOutingForm(f => ({ ...f, outing_date: e.target.value }))}
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                />
                <input
                  type="time"
                  value={outingForm.outing_time}
                  onChange={e => setOutingForm(f => ({ ...f, outing_time: e.target.value }))}
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                />
              </div>
            </div>

            {/* Point de RDV — aussi clé */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
              <input
                type="text"
                placeholder="Point de rendez-vous précis (ex: parking du lac, entrée nord) *"
                value={outingForm.meeting_point}
                onChange={e => setOutingForm(f => ({ ...f, meeting_point: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Difficulté */}
            <div>
              <p className="block text-xs font-bold text-gray-600 mb-1">Niveau de difficulté</p>
              <div className="flex gap-2">
                {(['facile', 'moyen', 'difficile'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setOutingForm(f => ({ ...f, difficulty: d }))}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold border transition-colors',
                      outingForm.difficulty === d
                        ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400 shadow-sm'
                          : 'bg-red-500 text-white border-red-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {d === 'facile' ? '🟢 Facile' : d === 'moyen' ? '🟡 Moyen' : '🔴 Difficile'}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants max */}
            <div>
              <p className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Participants maximum
              </p>
              <input
                type="number"
                min="2"
                max="100"
                value={outingForm.max_participants}
                onChange={e => setOutingForm(f => ({ ...f, max_participants: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Options */}
            <div>
              <p className="block text-xs font-bold text-gray-600 mb-2">Options de la sortie</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'parking_available',   label: '🅿️ Parking',    cls: 'blue' },
                  { key: 'stroller_accessible', label: '🍼 Poussette',   cls: 'pink' },
                  { key: 'kids_friendly',       label: '👶 Enfants OK',  cls: 'sky' },
                  { key: 'dogs_allowed',        label: '🐕 Chiens OK',   cls: 'amber' },
                ].map(({ key, label, cls }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOutingForm(f => ({ ...f, [key]: !(f as Record<string, unknown>)[key] }))}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                      (outingForm as Record<string, unknown>)[key]
                        ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {outingForm.parking_available && (
              <input
                type="text"
                placeholder="Infos parking (ex: route forestière, 500m du départ)"
                value={outingForm.parking_info}
                onChange={e => setOutingForm(f => ({ ...f, parking_info: e.target.value }))}
                className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50/40"
              />
            )}

            <div>
              <p className="block text-xs font-bold text-gray-600 mb-1.5">Secteur géographique</p>
              <SectorFilter value={outingForm.sector_id || null} onChange={v => setOutingForm(f => ({ ...f, sector_id: v || '' }))} showAll compact label="" />
            </div>

            <textarea
              placeholder="Description : itinéraire prévu, points d'intérêt, équipement recommandé, conseils…"
              rows={3}
              value={outingForm.description}
              onChange={e => setOutingForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
            />

            {/* Photos */}
            <div>
              <p className="block text-xs font-bold text-gray-600 mb-2">Photos (max 3)</p>
              <div className="flex gap-2 flex-wrap">
                {outingPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <Image src={src} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeOutingPhoto(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {outingPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => outingPhotoRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center text-orange-400 hover:bg-orange-50 hover:border-orange-400 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs mt-1">Photo</span>
                  </button>
                )}
              </div>
              <input
                ref={outingPhotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                className="hidden"
                onChange={handleOutingPhotoSelect}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={submittingOuting}
              className="flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submittingOuting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {editingOuting ? 'Modification…' : 'Création…'}</>
                : editingOuting ? '✓ Enregistrer' : '📅 Créer le rendez-vous'}
            </button>
            <button type="button" onClick={resetOutingForm} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* ── Liste des sorties ── */}
      {loadingOutings ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
        </div>
      ) : outings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-orange-300" />
          </div>
          <p className="text-gray-700 font-black mb-1 text-lg">Aucune sortie groupée prévue</p>
          <p className="text-gray-400 text-sm mb-2 max-w-sm mx-auto">
            Les sorties groupées sont des <strong className="text-orange-600">rendez-vous à une date précise</strong> — différent des itinéraires permanents.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Organisez la première sortie et invitez les habitants à vous rejoindre !
          </p>
          {profileId ? (
            <button
              onClick={() => setShowOutingForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Organiser une sortie
            </button>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4" /> Se connecter pour créer une sortie
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {outings.map(outing => (
            <OutingCard
              key={outing.id}
              outing={outing}
              userId={profileId}
              isOrganizer={profileId === outing.organizer_id}
              onJoin={handleJoinOuting}
              onEdit={startEditOuting}
              onDelete={handleDeleteOuting}
              onStatusChange={handleOutingStatusChange}
            />
          ))}
        </div>
      )}

      {!profileId && outings.length > 0 && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
          <p className="text-orange-800 font-bold mb-1">Rejoignez la communauté</p>
          <p className="text-orange-700 text-sm mb-4">Connectez-vous pour rejoindre ou créer une sortie groupée.</p>
          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      )}
    </div>
  );
}

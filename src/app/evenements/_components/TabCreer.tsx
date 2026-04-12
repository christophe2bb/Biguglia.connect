'use client';

import React from 'react';
import Link from 'next/link';
import { PartyPopper, Loader2, ArrowRight, ImageIcon, X, Tag } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { EVENT_CATEGORIES } from '../_constants';
import type { NewEventForm } from '../_types';

interface Props {
  profile: { id: string } | null;
  newEvent: NewEventForm;
  setNewEvent: (fn: (f: NewEventForm) => NewEventForm) => void;
  submittingEvent: boolean;
  eventPhotos: File[];
  eventPhotoPreviews: string[];
  photoInputRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoRemove: (idx: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function TabCreer({
  profile, newEvent, setNewEvent, submittingEvent,
  eventPhotos, eventPhotoPreviews, photoInputRef,
  onPhotoSelect, onPhotoRemove, onSubmit, onCancel,
}: Props) {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Proposer un événement</h2>
            <p className="text-gray-400 text-xs mt-0.5">Votre événement sera publié et visible dans l&apos;agenda communautaire</p>
          </div>
        </div>

        {!profile ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
            <PartyPopper className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <p className="text-purple-800 font-bold mb-2">Connectez-vous pour proposer un événement</p>
            <Link href="/connexion"
              className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
              Se connecter <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Titre */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Titre *</label>
              <input type="text" placeholder="Ex: Tournoi de pétanque inter-quartiers" required
                value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>

            {/* Date + heure */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Date *</label>
                <input type="date" required min={new Date().toISOString().split('T')[0]}
                  value={newEvent.event_date} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Heure de début</label>
                <input type="time" value={newEvent.event_time} onChange={e => setNewEvent(f => ({ ...f, event_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            {/* Lieu + catégorie */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Lieu</label>
                <input type="text" placeholder="Ex: Place du village, Salle des fêtes…"
                  value={newEvent.location} onChange={e => setNewEvent(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Catégorie *</label>
                <select value={newEvent.category} onChange={e => setNewEvent(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {EVENT_CATEGORIES.slice(0, 7).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Secteur */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Secteur géographique</label>
              <SectorFilter
                value={newEvent.sector_id || null}
                onChange={v => setNewEvent(f => ({ ...f, sector_id: v || '' }))}
                showAll compact label=""
              />
            </div>

            {/* Organisateur + participants */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Organisateur</label>
                <input type="text" placeholder="Association ou nom de l'organisateur"
                  value={newEvent.organizer_name} onChange={e => setNewEvent(f => ({ ...f, organizer_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Max participants</label>
                <input type="number" placeholder="Illimité si vide" min="1"
                  value={newEvent.max_participants} onChange={e => setNewEvent(f => ({ ...f, max_participants: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            {/* Public cible + inscription */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Public cible</label>
                <select value={newEvent.audience} onChange={e => setNewEvent(f => ({ ...f, audience: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {['Tout public', 'Famille', 'Enfants', 'Ados', 'Adultes', 'Seniors'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input type="checkbox" checked={newEvent.registration_required}
                    onChange={e => setNewEvent(f => ({ ...f, registration_required: e.target.checked }))}
                    className="w-4 h-4 rounded accent-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Inscription requise</span>
                </label>
              </div>
            </div>

            {/* Tarif */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Tarif</label>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: true }))} className="accent-purple-600" />
                  <span className="text-sm">🎟️ Gratuit</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: false }))} className="accent-purple-600" />
                  <span className="text-sm">💶 Payant</span>
                </label>
                {!newEvent.is_free && (
                  <input type="number" placeholder="Prix (€)" min="0" step="0.01"
                    value={newEvent.price} onChange={e => setNewEvent(f => ({ ...f, price: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                <Tag className="w-3.5 h-3.5 inline mr-1" />Tags <span className="font-normal text-gray-400">(séparés par virgules)</span>
              </label>
              <input type="text" placeholder="Ex: famille, plein air, gratuit, musique, vide-grenier…"
                value={newEvent.tags} onChange={e => setNewEvent(f => ({ ...f, tags: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
              <textarea placeholder="Décrivez l'événement : programme, conditions d'accès, infos pratiques, contacts…" rows={4}
                value={newEvent.description} onChange={e => setNewEvent(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Photos <span className="text-gray-400 font-normal">(optionnel · max 5)</span>
              </label>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoSelect} />
              {eventPhotoPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {eventPhotoPreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group/img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => onPhotoRemove(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {eventPhotos.length < 5 && (
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-2 border-2 border-dashed border-purple-200 text-purple-500 hover:border-purple-400 hover:bg-purple-50 rounded-xl px-4 py-3 text-sm font-medium transition-all w-full justify-center">
                  <ImageIcon className="w-4 h-4" />
                  {eventPhotos.length === 0 ? 'Ajouter des photos' : `Ajouter (${eventPhotos.length}/5)`}
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <button type="submit" disabled={submittingEvent}
                className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-purple-200">
                {submittingEvent
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                  : <><PartyPopper className="w-4 h-4" /> Publier l&apos;événement</>}
              </button>
              <button type="button" onClick={onCancel}
                className="px-5 py-3 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200 text-sm">
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

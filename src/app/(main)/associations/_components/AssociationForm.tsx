'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import { CAT_CONFIG, PUB_TYPE_CONFIG, NEEDS_OPTIONS, PUBLIC_OPTIONS, ACTIVITY_OPTIONS, TAG_OPTIONS, FORM_STEPS } from '../_constants';
import type { Association, AssociationFormData, AssoCategory, PubType } from '../_types';

interface AssociationFormProps {
  form: AssociationFormData;
  setForm: React.Dispatch<React.SetStateAction<AssociationFormData>>;
  photos: File[];
  previews: string[];
  submitting: boolean;
  step: number;
  setStep: (n: number) => void;
  editingAsso: Association | null;
  photoRef: React.RefObject<HTMLInputElement | null>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (i: number) => void;
  onToggle: (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => void;
  onCancel: () => void;
  onSubmit: (asDraft?: boolean) => void;
}

export default function AssociationForm({
  form, setForm, photos, previews, submitting, step, setStep,
  editingAsso, photoRef, onPhotoSelect, onRemovePhoto, onToggle,
  onCancel, onSubmit,
}: AssociationFormProps) {
  const catConf = CAT_CONFIG[form.category];

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">{editingAsso ? '✏️ Modifier la fiche' : '🏛️ Référencer une association'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Faites connaître votre association à toute la communauté de Biguglia</p>
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {/* Steps */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {FORM_STEPS.map((s, i) => (
          <button key={i} type="button" onClick={() => setStep(i + 1)}
            className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              step === i + 1 ? 'bg-violet-500 text-white' :
              step > i + 1 ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400')}>
            {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      {/* ── STEP 1 : Type de publication ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Quel est l&apos;objet de cette fiche ?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => {
              const PubIcon = conf.icon;
              return (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, pub_type: key }))}
                  className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all text-center',
                    form.pub_type === key ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                  <span className="text-2xl">{conf.emoji}</span>
                  <PubIcon className="w-4 h-4 opacity-60" />
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2 : Identité ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 2 — Identité de l&apos;association</p>
          <input type="text" placeholder="Nom de l'association *" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            aria-label="Nom de l'association (obligatoire)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input type="text" placeholder='Slogan / phrase courte (ex: "Faire vivre le sport pour tous à Biguglia")'
            value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
            aria-label="Slogan ou phrase courte de l'association"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
                const Icon = conf.icon;
                return (
                  <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}
                    className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all',
                      form.category === key ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                    <span className="text-lg">{conf.emoji}</span>
                    <Icon className={cn('w-4 h-4', form.category === key ? 'text-violet-600' : conf.color)} />
                    <span className="text-center leading-tight">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea placeholder="Description courte * (1-2 phrases visibles immédiatement)" rows={2} required
            aria-label="Description courte (obligatoire) — 1 ou 2 phrases visibles immédiatement"
            value={form.description_short} onChange={e => setForm(f => ({ ...f, description_short: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <textarea placeholder="Présentation complète — histoire, mission, actions, public, valeurs…" rows={5}
            aria-label="Présentation complète de l'association"
            value={form.description_full} onChange={e => setForm(f => ({ ...f, description_full: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Commune / zone</label>
              <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                {['Biguglia', 'Biguglia et alentours', 'Toute la région'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Adresse / lieu principal"
              aria-label="Adresse ou lieu principal"
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Secteur principal <span className="font-normal text-gray-400">(recommandé)</span></label>
            <SectorFilter value={form.sector_id || null} onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))} allowCitywide compact />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Activités & Public ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 3 — Ce que vous proposez</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Public concerné</label>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => onToggle('public_target', p)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.public_target.includes(p) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge minimum</label>
              <input type="number" placeholder="ex: 6" min={0} max={120} value={form.age_min}
                onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge maximum</label>
              <input type="number" placeholder="ex: 18" min={0} max={120} value={form.age_max}
                onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Activités proposées</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => onToggle('activities', a)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.activities.includes(a) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fréquence</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">—</option>
                {['Chaque semaine', 'Chaque mois', 'Ponctuel', 'Selon calendrier'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Jours et horaires (ex: Lundi 18h-20h)"
              aria-label="Jours et horaires (exemple : Lundi 18h-20h)"
              value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adhésion / tarif</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[['gratuit','Gratuit'],['cotisation','Cotisation annuelle'],['libre','Participation libre'],['autre','Autre']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, price_type: v }))}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.price_type === v ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
            {form.price_type !== 'gratuit' && (
              <input type="text" placeholder="Précisez (ex: 30€/an, 5€/séance…)"
                value={form.price_detail} onChange={e => setForm(f => ({ ...f, price_detail: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(t => (
                <button key={t} type="button" onClick={() => onToggle('tags', t)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.tags.includes(t) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  # {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(4)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4 : Besoins & CDC ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 4 — Besoins actuels &amp; engagements (CDC §7.2-7.3)</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">L&apos;association recherche actuellement :</label>
            <div className="flex flex-wrap gap-2">
              {NEEDS_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => onToggle('needs', n)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.needs.includes(n) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <textarea placeholder="Détail du besoin (ex: Nous cherchons 4 bénévoles pour notre tournoi le 15 juin…)" rows={3}
            value={form.need_detail} onChange={e => setForm(f => ({ ...f, need_detail: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs font-bold text-violet-700 mb-3">Acceptations (visible sur la fiche)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'is_accepting_members',    label: '👥 Accepte de nouveaux adhérents', color: 'text-purple-700' },
                { key: 'is_accepting_volunteers', label: '🙋 Accepte des bénévoles',          color: 'text-rose-700' },
                { key: 'is_accepting_donations',  label: '💝 Accepte les dons',               color: 'text-red-700' },
                { key: 'is_accepting_partners',   label: '🤝 Cherche des partenaires',        color: 'text-emerald-700' },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded accent-violet-600" />
                  <span className={cn('text-xs font-semibold', color)}>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.urgent_need} onChange={e => setForm(f => ({ ...f, urgent_need: e.target.checked }))} className="rounded" />
            <span className="text-sm font-semibold text-red-600">🚨 Besoin urgent</span>
          </label>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(5)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 5 : Photos ── */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 5 — Photos (logo, couverture, galerie — max 6)</p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                <Image src={src} alt="" fill className="object-cover" />
                <button type="button" onClick={() => onRemovePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-bold">Couverture</span>}
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-violet-300 flex flex-col items-center justify-center text-violet-400 hover:bg-violet-50 transition-all">
                <Camera className="w-6 h-6" /><span className="text-xs mt-1">Photo</span>
              </button>
            )}
          </div>
          <input ref={photoRef as React.RefObject<HTMLInputElement>} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoSelect} />
          <p className="text-xs text-gray-400">1ère photo = couverture principale · {photos.length}/6</p>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(6)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 6 : Contact + Options ── */}
      {step === 6 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Bloc 6 — Contact</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nom du contact *" value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  aria-label="Nom du contact (obligatoire)"
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <select value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="">Fonction…</option>
                  {['Président(e)', 'Secrétaire', 'Trésorier(e)', 'Bénévole', 'Responsable activité'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Téléphone" value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  aria-label="Téléphone du contact"
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="email" placeholder="Email" value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  aria-label="Adresse email du contact"
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <input type="url" placeholder="Site web (https://…)" value={form.contact_website}
                onChange={e => setForm(f => ({ ...f, contact_website: e.target.value }))}
                aria-label="Site web de l'association"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="url" placeholder="Facebook (https://…)" value={form.contact_facebook}
                  onChange={e => setForm(f => ({ ...f, contact_facebook: e.target.value }))}
                  aria-label="Page Facebook de l'association"
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="url" placeholder="Instagram (https://…)" value={form.contact_instagram}
                  onChange={e => setForm(f => ({ ...f, contact_instagram: e.target.value }))}
                  aria-label="Compte Instagram de l'association"
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Afficher le téléphone publiquement</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Informations complémentaires</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'declared',             label: '🏛️ Association déclarée en préfecture' },
                { key: 'pmr_accessible',        label: '♿ Accessible PMR' },
                { key: 'families_welcome',      label: '👨‍👩‍👧 Accueil familles' },
                { key: 'animals_ok',            label: '🐾 Animaux acceptés' },
                { key: 'parking_nearby',        label: '🅿️ Parking à proximité' },
                { key: 'material_provided',     label: '✅ Matériel fourni' },
                { key: 'registration_required', label: '📝 Inscription obligatoire' },
                { key: 'places_limited',        label: '🔢 Places limitées' },
                { key: 'membership_required',   label: '🎫 Adhésion obligatoire' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded" />
                  <span className="text-xs text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {form.declared && (
              <input type="text" placeholder="N° RNA (optionnel)" value={form.rna_number}
                onChange={e => setForm(f => ({ ...f, rna_number: e.target.value }))}
                aria-label="Numéro RNA de l'association (optionnel)"
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
            {form.places_limited && (
              <input type="number" placeholder="Nombre de places disponibles" min={1} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                aria-label="Nombre de places disponibles"
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => onSubmit(false)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              🏛️ {editingAsso ? 'Enregistrer' : 'Publier la fiche'}
            </button>
            <button type="button" onClick={() => onSubmit(true)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
              💾 Brouillon
            </button>
            <button type="button" onClick={() => setStep(5)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
          </div>
        </div>
      )}
    </div>
  );
}

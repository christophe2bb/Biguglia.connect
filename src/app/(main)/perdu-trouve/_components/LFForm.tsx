'use client';

import Image from 'next/image';
import {
  X, Camera, EyeOff, AlertCircle, Loader2, Shield,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import type { LFFormValues, LFType } from '../_types';
import {
  CATEGORIES, SENSITIVE_CATEGORIES,
  LOCATION_AREAS, DEPOSIT_LOCATIONS,
} from '../_constants';

interface Props {
  form: LFFormValues;
  setForm: React.Dispatch<React.SetStateAction<LFFormValues>>;
  step: number;
  setStep: (s: number) => void;
  editingItem: { id: string } | null;
  photos: File[];
  previews: string[];
  submitting: boolean;
  photoRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (i: number) => void;
  onSubmit: (asDraft: boolean) => void;
  onCancel: () => void;
}

const STEPS = ['Type', 'Objet', 'Lieu & Date', 'Photos', 'Contact', 'Validation'] as const;

export default function LFForm({
  form, setForm, step, setStep,
  editingItem, photos, previews,
  submitting, photoRef,
  onPhotoSelect, onRemovePhoto,
  onSubmit, onCancel,
}: Props) {
  const isPerdu     = form.type === 'perdu';
  const isSensitive = form.is_sensitive || SENSITIVE_CATEGORIES.includes(form.category);
  const accentOn     = isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600';
  const accentBorder = isPerdu
    ? 'border-orange-300 bg-orange-50 text-orange-700'
    : 'border-emerald-300 bg-emerald-50 text-emerald-700';

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 mb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {editingItem ? '✏️ Modifier l\'annonce' : '📢 Publier une annonce Perdu / Trouvé'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Service local · Biguglia Connect</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === i + 1
                ? (isPerdu ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white')
                : step > i + 1 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
            }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              step > i + 1 ? 'bg-green-400 text-white' : step === i + 1 ? 'bg-white/30' : 'bg-gray-300 text-gray-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      {/* ── Step 1 : Type & Secteur ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {(['perdu', 'trouve'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t as LFType }))}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 font-black text-lg transition-all ${
                  form.type === t
                    ? t === 'perdu' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                }`}>
                <span className="text-5xl">{t === 'perdu' ? '🔴' : '🟢'}</span>
                <span className="uppercase tracking-wide">{t === 'perdu' ? "J'ai perdu" : "J'ai trouvé"}</span>
                <span className="text-xs font-normal text-current opacity-70 text-center">
                  {t === 'perdu'
                    ? 'Je cherche à retrouver un objet'
                    : "J'ai trouvé un objet et cherche son propriétaire"}
                </span>
              </button>
            ))}
          </div>

          <div className={`rounded-xl p-3 text-sm border ${accentBorder}`}>
            {isPerdu
              ? "🔐 Décrivez précisément l'objet et l'endroit où vous pensez l'avoir perdu. Gardez un détail secret si vous le souhaitez."
              : '🔐 Indiquez où et quand vous l\'avez trouvé, sans révéler d\'informations sensibles permettant une fausse réclamation.'}
          </div>

          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-2">
              📍 Secteur <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(où avez-vous perdu/trouvé l&apos;objet ?)</span>
            </p>
            <SectorFilter
              value={form.sector_id || null}
              onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))}
              showAll={false}
              compact={true}
              required={true}
              className="w-full"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!form.sector_id}
              className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-opacity ${accentOn} disabled:opacity-40 disabled:cursor-not-allowed`}>
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 : Objet ── */}
      {step === 2 && (
        <div className="space-y-4">
          <input type="text" placeholder="Titre de l'annonce *" required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.value} type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value, is_sensitive: cat.sensitive }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.category === cat.value
                        ? isPerdu ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight">{cat.label}</span>
                    {cat.sensitive && <span className="text-[9px] text-red-400 font-bold">🔒 Sensible</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea placeholder="Description (couleur, marque, état, circonstances…)" rows={3}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Couleur" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input type="text" placeholder="Marque / modèle" value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <input type="text" placeholder="Signe distinctif (gravure, autocollant, rayure…)" value={form.distinctive_sign}
            onChange={e => setForm(f => ({ ...f, distinctive_sign: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {!isPerdu && (
            <label aria-label="Récompense proposée" className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.keep_secret}
                onChange={e => setForm(f => ({ ...f, keep_secret: e.target.checked }))} className="mt-0.5 rounded" />
              <div>
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4" />Garder certains détails confidentiels
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recommandé : vérifier que le réclamant est le vrai propriétaire avant de révéler tous les détails
                </p>
              </div>
            </label>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button onClick={() => setStep(3)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Step 3 : Lieu & Date ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-1">Date *</p>
              <input type="date" required value={form.lost_date}
                onChange={e => setForm(f => ({ ...f, lost_date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-1">Heure approximative</p>
              <input type="time" value={form.lost_time}
                onChange={e => setForm(f => ({ ...f, lost_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1">Lieu principal *</p>
            <select value={form.location_area} onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="">Choisir un lieu…</option>
              {LOCATION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <input type="text" placeholder="Précision sur le lieu (ex: banc côté gauche, entrée principale…)"
            value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button onClick={() => setStep(4)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Step 4 : Photos ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Photos (max 5 — fortement conseillées)</p>

          {isSensitive && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Objet sensible :</strong> Pour un portefeuille ou document d&apos;identité, ne photographiez pas
                les informations personnelles visibles (n° de carte, photo…).
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                <Image src={src} alt="" fill className="object-cover" />
                <button onClick={() => onRemovePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 py-0.5 rounded font-bold">Principal</span>
                )}
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-all">
                <Camera className="w-6 h-6" />
                <span className="text-xs mt-1">Ajouter</span>
              </button>
            )}
          </div>

          <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoSelect} />

          <p className="text-xs text-gray-400">
            {photos.length === 0
              ? "💡 Une photo augmente fortement les chances de retrouver l'objet !"
              : `${photos.length}/5 photo${photos.length > 1 ? 's' : ''}`}
          </p>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button onClick={() => setStep(5)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Step 5 : Contact & compléments ── */}
      {step === 5 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Contact</p>
            <div className="space-y-3">
              <input type="text" placeholder="Nom ou prénom affiché *"
                value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Téléphone (optionnel)"
                  value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input type="email" placeholder="Email (optionnel)"
                  value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[{ v: 'messagerie', l: '💬 Messagerie' }, { v: 'telephone', l: '📞 Téléphone' }, { v: 'email', l: '📧 Email' }].map(m => (
                  <button key={m.v} type="button" onClick={() => setForm(f => ({ ...f, contact_mode: m.v }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.contact_mode === m.v ? accentBorder : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {m.l}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.show_phone}
                  onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Afficher mon téléphone publiquement</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">
              {isPerdu ? '📋 Infos — Objet perdu' : '📋 Infos — Objet trouvé'}
            </p>
            <div className="space-y-3">
              {isPerdu ? (
                <>
                  <input type="text" placeholder="🏆 Récompense proposée (ex: 50€)"
                    value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.sentimental_value}
                      onChange={e => setForm(f => ({ ...f, sentimental_value: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">💝 Objet de grande valeur sentimentale</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.declared_authorities}
                      onChange={e => setForm(f => ({ ...f, declared_authorities: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">🏛️ Déclaration faite en mairie / gendarmerie</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.need_community_help}
                      onChange={e => setForm(f => ({ ...f, need_community_help: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">📢 Besoin d&apos;aide de la communauté</span>
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.deposited}
                      onChange={e => setForm(f => ({ ...f, deposited: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">📍 Objet déposé quelque part</span>
                  </label>
                  {form.deposited && (
                    <div>
                      <p className="block text-xs font-semibold text-gray-600 mb-1">Déposé où ?</p>
                      <div className="flex gap-2 flex-wrap">
                        {DEPOSIT_LOCATIONS.map(d => (
                          <button key={d} type="button" onClick={() => setForm(f => ({ ...f, deposited_at: d }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              form.deposited_at === d ? accentBorder : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.proof_required}
                      onChange={e => setForm(f => ({ ...f, proof_required: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">🔒 Remise uniquement après vérification du propriétaire</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button onClick={() => setStep(6)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Step 6 : Validation ── */}
      {step === 6 && (
        <div className="space-y-5">
          {/* Aperçu */}
          <div className={`rounded-xl border p-4 ${isPerdu ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Aperçu avant publication</p>
            <p className="text-base font-black text-gray-900">{form.title || '(sans titre)'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {form.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'} ·{' '}
              {CATEGORIES.find(c => c.value === form.category)?.label} ·{' '}
              {form.location_area || '—'} · {form.lost_date || '—'}
            </p>
            {form.color  && <p className="text-xs text-gray-500 mt-0.5">Couleur : {form.color}</p>}
            {form.reward && <p className="text-xs text-orange-600 font-bold mt-1">🏆 {form.reward}</p>}
          </div>

          {/* Rappels sécurité */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-blue-700">Rappels de sécurité</p>
            </div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Ne publiez pas de données bancaires, N° de sécu ou mot de passe</li>
              <li>• Pour un portefeuille, ne photographiez pas les infos personnelles</li>
              {!isPerdu && <li>• Gardez un détail secret pour identifier le vrai propriétaire</li>}
              <li>• Privilégiez la messagerie de la plateforme pour les contacts initiaux</li>
              {form.category === 'animal' && (
                <li>• Pour un animal, mentionnez si vous avez contacté un vétérinaire / vérifié la puce</li>
              )}
            </ul>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            {[
              { key: 'confirm_true',         label: 'Je confirme que les informations sont exactes et véridiques' },
              { key: 'confirm_public',        label: "J'accepte que l'annonce soit visible publiquement sur la plateforme" },
              { key: 'confirm_intermediary',  label: 'Je comprends que la plateforme est un intermédiaire, non responsable de la restitution' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={form[key as keyof LFFormValues] as boolean}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="mt-0.5 rounded"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSubmit(false)}
              disabled={submitting || !form.confirm_true || !form.confirm_public || !form.confirm_intermediary}
              className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm disabled:opacity-50 ${accentOn}`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              📢 Publier l&apos;annonce
            </button>
            <button onClick={() => onSubmit(true)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
              💾 Brouillon
            </button>
            <button onClick={() => setStep(5)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
              ← Retour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

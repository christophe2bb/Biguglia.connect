'use client';

import Image from 'next/image';
import { useRef } from 'react';
import {
  X, Loader2, Camera, Shield, Eye, EyeOff,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import {
  TYPE_CONFIG, CATEGORIES, URGENCY_CONFIG, DURATION_OPTIONS,
  COMPENSATION_CONFIG, EQUIPMENT_OPTIONS, CONDITIONS_OPTIONS,
  FOR_WHO_OPTIONS, LOCATION_AREAS,
} from '../_constants';
import type { HelpType, UrgencyLevel, Compensation, Visibility, ContactMode, DisplayName, HelpFormValues } from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  form: HelpFormValues;
  setForm: React.Dispatch<React.SetStateAction<HelpFormValues>>;
  step: number;
  setStep: (s: number) => void;
  submitting: boolean;
  editingItem: boolean;
  previews: string[];
  photosCount: number;
  onPhotoSelect: (files: File[], reset?: () => void) => void;
  onRemovePhoto: (i: number) => void;
  onToggleArr: (key: 'equipment' | 'conditions', val: string) => void;
  onSubmit: (isDraft?: boolean) => void;
  onClose: () => void;
};

// ─── HelpForm ─────────────────────────────────────────────────────────────────
export default function HelpForm({
  form, setForm, step, setStep, submitting, editingItem, previews, photosCount,
  onPhotoSelect, onRemovePhoto, onToggleArr, onSubmit, onClose,
}: Props) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const typeConf = TYPE_CONFIG[form.help_type];
  const isActive = (s: number) => step === s;
  const isDone   = (s: number) => step > s;
  const stepColor =
    form.help_type === 'demande'  ? 'bg-orange-500' :
    form.help_type === 'offre'    ? 'bg-emerald-500' :
                                    'bg-blue-500';

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-md p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {editingItem ? "✏️ Modifier l'annonce" : "🤝 Publier une annonce d'entraide"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Demandez ou proposez un coup de main entre voisins de Biguglia</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {["L'essentiel", 'Organisation', 'Conditions', 'Confiance'].map((s, i) => (
          <button key={i} type="button" onClick={() => setStep(i + 1)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              isActive(i + 1) ? `${stepColor} text-white` :
              isDone(i + 1) ? 'bg-gray-200 text-gray-600' :
              'bg-gray-100 text-gray-400'
            }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              isActive(i + 1) ? 'bg-white/30' :
              isDone(i + 1) ? 'bg-green-400 text-white' :
              'bg-gray-300 text-gray-500'
            }`}>
              {isDone(i + 1) ? '✓' : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      {/* ── ÉTAPE 1 : L'essentiel ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Type */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">1. Type d&apos;annonce *</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(TYPE_CONFIG) as [HelpType, typeof TYPE_CONFIG[HelpType]][]).map(([key, conf]) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, help_type: key }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold text-sm transition-colors ${
                    form.help_type === key
                      ? `${conf.border} ${conf.bg} ${conf.color}`
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}>
                  <span className="text-3xl">{conf.emoji}</span>
                  <span className="text-center leading-tight">{conf.label}</span>
                  <span className="text-xs font-normal opacity-70">{conf.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <p className="block text-sm font-bold text-gray-700 mb-1.5">2. Titre de l&apos;annonce *</p>
            <input type="text"
              placeholder={
                form.help_type === 'demande'
                  ? "Ex : Besoin d'aide pour monter un meuble samedi"
                  : form.help_type === 'offre'
                    ? "Ex : Je peux aider pour courses ou petits déplacements"
                    : "Ex : Disponible pour jardinage si aide déménagement"
              }
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={80}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                form.help_type === 'demande' ? 'border-orange-200 focus:ring-orange-300' :
                form.help_type === 'offre'   ? 'border-emerald-200 focus:ring-emerald-300' :
                                               'border-blue-200 focus:ring-blue-300'
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">{form.title.length}/80</p>
          </div>

          {/* Catégorie */}
          <div>
            <p className="block text-sm font-bold text-gray-700 mb-1.5">3. Catégorie *</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-colors ${
                      form.category === cat.value
                        ? `${typeConf.border} ${typeConf.bg} ${typeConf.color}`
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight text-xs">{cat.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="block text-sm font-bold text-gray-700 mb-1.5">4. Description détaillée *</p>
            <textarea placeholder="Décrivez votre demande ou offre en détail…" rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 ${
                form.help_type === 'demande' ? 'border-orange-200 focus:ring-orange-300' :
                form.help_type === 'offre'   ? 'border-emerald-200 focus:ring-emerald-300' :
                                               'border-blue-200 focus:ring-blue-300'
              }`}
            />
            <div className="mt-2 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">💡 Questions guides :</p>
              <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
                <li>De quoi avez-vous besoin exactement ?</li>
                <li>Combien de temps cela prend-il ?</li>
                <li>Faut-il une compétence particulière ?</li>
                <li>Y a-t-il du matériel à prévoir ?</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)}
              className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : Organisation ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Organisation pratique</p>

          {/* Urgence */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">5. Niveau d&apos;urgence</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(URGENCY_CONFIG) as [UrgencyLevel, typeof URGENCY_CONFIG[UrgencyLevel]][]).map(([key, conf]) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, urgency: key }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors text-left flex items-center gap-2 ${
                    form.urgency === key
                      ? `${conf.bg} ${conf.color} border-current`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${conf.dotColor}`} />
                  {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date / heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-1">6. Date souhaitée</p>
              <input type="date" value={form.help_date} onChange={e => setForm(f => ({ ...f, help_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-1">Heure</p>
              <input type="text" placeholder="Ex : 14h, matin…" value={form.help_time}
                onChange={e => setForm(f => ({ ...f, help_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>

          {/* Secteur */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-2">
              Secteur <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">— dans quel quartier ?</span>
            </p>
            <SectorFilter
              value={form.sector_id || null}
              onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))}
              showAll={false}
              compact
              required={!form.sector_id}
            />
          </div>

          {/* Lieu */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">7. Lieu</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.location_area} onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                {LOCATION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="text" placeholder="Ville" value={form.location_city}
                onChange={e => setForm(f => ({ ...f, location_city: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
            <input type="text" placeholder="Précision facultative (pas d'adresse complète)"
              value={form.location_detail}
              onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))}
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>

          {/* Durée */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">8. Durée estimée</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, duration: d.value }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    form.duration === d.value
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>

          {/* Personnes */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1">9. Nombre de personnes</p>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, persons_needed: Math.max(1, f.persons_needed - 1) }))}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold flex items-center justify-center">−</button>
              <span className="text-lg font-black text-gray-900 w-8 text-center">{form.persons_needed}</span>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, persons_needed: Math.min(20, f.persons_needed + 1) }))}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold flex items-center justify-center">+</button>
              <span className="text-sm text-gray-500">personne{form.persons_needed > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(3)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 : Conditions ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Conditions &amp; photos</p>

          {/* Contrepartie */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">10. Compensation / contrepartie</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(COMPENSATION_CONFIG) as [Compensation, typeof COMPENSATION_CONFIG[Compensation]][]).map(([key, conf]) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, compensation: key }))}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors text-left ${
                    form.compensation === key
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{conf.emoji} {conf.label}</button>
              ))}
            </div>
            <input type="text" placeholder="Précision (optionnel)" value={form.compensation_detail}
              onChange={e => setForm(f => ({ ...f, compensation_detail: e.target.value }))}
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>

          {/* Matériel */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">11. Matériel nécessaire</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => onToggleArr('equipment', e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    form.equipment.includes(e)
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{e}</button>
              ))}
            </div>
          </div>

          {/* Pour qui */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">12. Pour qui ?</p>
            <div className="flex flex-wrap gap-2">
              {FOR_WHO_OPTIONS.map(fw => (
                <button key={fw} type="button" onClick={() => setForm(f => ({ ...f, for_who: fw }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    form.for_who === fw
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{fw}</button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">13. Photos (optionnel, max 5)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group/p">
                  <Image src={src} alt="" fill className="object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">Principal</span>
                  )}
                  <button type="button" onClick={() => onRemovePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover/p:flex">×</button>
                </div>
              ))}
              {photosCount < 5 && (
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Ajouter</span>
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                onPhotoSelect(files, () => { if (photoInputRef.current) photoInputRef.current.value = ''; });
              }}
              className="hidden"
            />
          </div>

          {/* Conditions */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">14. Conditions / précautions</p>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS_OPTIONS.map(c => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.conditions.includes(c)} onChange={() => onToggleArr('conditions', c)} className="rounded" />
                  <span className="text-xs text-gray-700">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(4)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 : Confiance ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Confiance &amp; sécurité</p>

          {/* Visibilité */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">15. Visibilité</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: 'public'   as Visibility, l: '🌍 Visible par toute la communauté', icon: Eye },
                { v: 'membres'  as Visibility, l: '🔒 Membres connectés uniquement',    icon: EyeOff },
              ] as const).map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, visibility: opt.v }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors text-left ${
                    form.visibility === opt.v
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{opt.l}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">16. Mode de contact</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: 'messagerie'       as ContactMode, l: '💬 Messagerie plateforme uniquement' },
                { v: 'telephone_apres'  as ContactMode, l: "📞 Téléphone possible après 1er échange" },
              ] as const).map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, contact_mode: opt.v }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors text-left ${
                    form.contact_mode === opt.v
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{opt.l}</button>
              ))}
            </div>
          </div>

          {/* Nom affiché */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">17. Nom affiché</p>
            <div className="flex gap-2">
              {([
                { v: 'prenom'           as DisplayName, l: 'Prénom seul' },
                { v: 'prenom_initiale'  as DisplayName, l: 'Prénom + initiale (recommandé)' },
                { v: 'complet'          as DisplayName, l: 'Nom complet' },
              ] as const).map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, display_name: opt.v }))}
                  className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold border transition-colors text-center ${
                    form.display_name === opt.v
                      ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}`
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>{opt.l}</button>
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-bold text-gray-700">Engagement — cases obligatoires</p>
            </div>
            <div className="space-y-2">
              {[
                { key: 'check1', label: 'Je publie une demande sincère et réelle' },
                { key: 'check2', label: "Je comprends qu'il s'agit d'entraide entre particuliers" },
                { key: 'check3', label: "Je m'engage à rester respectueux envers les autres" },
                { key: 'check4', label: "Je n'utilise pas cette rubrique pour du travail dissimulé" },
                { key: 'check5', label: "J'accepte les règles de sécurité de la plateforme" },
              ].map(c => (
                <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={form[c.key as keyof HelpFormValues] as boolean}
                    onChange={e => setForm(f => ({ ...f, [c.key]: e.target.checked }))}
                    className="rounded mt-0.5 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => onSubmit(false)} disabled={submitting}
              className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm ${stepColor} hover:opacity-90 disabled:opacity-50`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {form.help_type === 'demande'
                ? '🙋 Publier ma demande'
                : form.help_type === 'offre'
                  ? '🤝 Publier mon offre'
                  : '🔄 Publier mon échange'}
            </button>
            <button type="button" onClick={() => onSubmit(true)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
              💾 Brouillon
            </button>
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
          </div>
        </div>
      )}
    </div>
  );
}

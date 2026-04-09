'use client';

/**
 * Page: Déposer une demande d'emploi
 * Route: /emploi/demandes/publier
 * Connecté à Supabase via publishJobDemand()
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Search, ArrowLeft, ChevronRight, CheckCircle,
  MapPin, Euro, Clock, FileText, Phone, AlertCircle, User,
} from 'lucide-react';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES, JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import { publishJobDemand } from '@/services/jobs/publish-demand';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

interface FormData {
  /* Étape 1 – Le profil */
  title: string;
  job_category: string;
  contract_types: string[];
  description: string;
  /* Étape 2 – Votre situation */
  experience_level: string;
  experience_summary: string;
  has_driving_license: boolean;
  has_vehicle: boolean;
  /* Étape 3 – Disponibilité & Conditions */
  availability_type: string;
  available_from: string;
  location_city: string;
  sector_id: string;
  mobility_radius: string;
  salary_min: string;
  salary_max: string;
  salary_period: string;
  /* Étape 4 – Contact */
  contact_email: string;
  contact_phone: string;
  contact_mode: string;
}

const INITIAL: FormData = {
  title: '', job_category: '', contract_types: [], description: '',
  experience_level: '', experience_summary: '', has_driving_license: false, has_vehicle: false,
  availability_type: 'flexible', available_from: '', location_city: 'Biguglia', sector_id: '',
  mobility_radius: '20', salary_min: '', salary_max: '', salary_period: 'monthly',
  contact_email: '', contact_phone: '', contact_mode: 'email',
};

const STEPS = [
  { id: 1, label: 'Mon profil',   icon: FileText },
  { id: 2, label: 'Expérience',   icon: User     },
  { id: 3, label: 'Disponibilité', icon: Clock   },
  { id: 4, label: 'Contact',      icon: Phone    },
];

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: '🟢 Immédiatement disponible',
  week:      '📅 Dès la semaine prochaine',
  month:     '📅 Dans le mois',
  date:      '📅 À partir d\'une date',
  flexible:  '⚡ Flexible / À discuter',
};

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly: '/ heure', monthly: '/ mois', yearly: '/ an',
};

const SECTORS = [
  { id: '',            label: 'Toute la zone' },
  { id: 'biguglia',    label: 'Biguglia centre' },
  { id: 'lido',        label: 'Zone du Lido' },
  { id: 'marana',      label: 'La Marana' },
  { id: 'furiani',     label: 'Furiani' },
  { id: 'bastia',      label: 'Bastia (proches)' },
];

export default function PublierDemandePage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | boolean | string[]) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleContractType = (type: string) => {
    const cur = form.contract_types;
    const next = cur.includes(type)
      ? cur.filter(c => c !== type)
      : [...cur, type];
    set('contract_types', next);
  };

  const next = () => { setServerError(null); setStep(s => Math.min(s + 1, 4) as Step); };
  const prev = () => { setServerError(null); setStep(s => Math.max(s - 1, 1) as Step); };

  const canNext = (): boolean => {
    if (step === 1) return form.title.length >= 5 && !!form.job_category && form.contract_types.length > 0 && form.description.length >= 20;
    if (step === 2) return true; // tout optionnel
    if (step === 3) return form.location_city.length >= 2;
    if (step === 4) return (
      (form.contact_mode !== 'phone' ? form.contact_email.includes('@') : true) &&
      (form.contact_mode !== 'email' ? form.contact_phone.length >= 8 : true) &&
      (form.contact_mode === 'email' ? form.contact_email.includes('@') : true)
    );
    return false;
  };

  /* ── Soumission Supabase ──────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);

    const result = await publishJobDemand({
      title:              form.title,
      job_category:       form.job_category,
      contract_types:     form.contract_types,
      description:        form.description,
      experience_summary: form.experience_summary || undefined,
      location_city:      form.location_city,
      sector_id:          form.sector_id || undefined,
      mobility_radius:    form.mobility_radius ? parseInt(form.mobility_radius) : undefined,
      availability_type:  form.availability_type,
      available_from:     form.available_from || undefined,
      experience_level:   form.experience_level || undefined,
      salary_min:         form.salary_min ? parseFloat(form.salary_min) : undefined,
      salary_max:         form.salary_max ? parseFloat(form.salary_max) : undefined,
      has_driving_license: form.has_driving_license,
      contact_email:      form.contact_email || undefined,
      contact_phone:      form.contact_phone || undefined,
      contact_mode:       form.contact_mode,
    });

    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error ?? 'Une erreur est survenue.');
      return;
    }

    setPublishedSlug(result.slug ?? null);
    setDone(true);
  };

  /* ── Page succès ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Demande publiée !</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Votre profil est maintenant visible. Les employeurs de Biguglia peuvent vous contacter.
          </p>
          <div className="flex flex-col gap-3">
            {publishedSlug && (
              <Link
                href={`/emploi/demandes/${publishedSlug}`}
                className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
              >
                Voir mon profil →
              </Link>
            )}
            <Link
              href="/emploi/demandes"
              className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              Retour aux demandes
            </Link>
            <button
              onClick={() => { setForm(INITIAL); setStep(1); setDone(false); setPublishedSlug(null); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              Déposer une autre demande
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/emploi/demandes" className="inline-flex items-center gap-2 text-purple-100 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux demandes
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Déposer ma demande d&apos;emploi</h1>
              <p className="text-purple-100 text-sm">Gratuit · Visible immédiatement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">

        {/* ── Stepper ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const completed = step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                      completed ? 'bg-green-500 text-white' :
                      active    ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' :
                                  'bg-gray-100 text-gray-400'
                    }`}>
                      {completed ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${
                      active ? 'text-purple-600' : completed ? 'text-green-600' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${completed ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Formulaire ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {/* Erreur serveur */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* ÉTAPE 1 – Mon profil */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" /> Décrivez votre recherche
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Titre de votre recherche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Serveur(se), Aide-soignant(e), Maçon qualifié…"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/100 caractères (min. 5)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Catégorie de métier <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.job_category}
                  onChange={e => set('job_category', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
                >
                  <option value="">Choisir une catégorie…</option>
                  {JOB_CATEGORIES.map(c => (
                    <option key={c} value={c}>{JOB_CATEGORY_LABELS[c as keyof typeof JOB_CATEGORY_LABELS]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Types de contrat recherchés <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(plusieurs choix possibles)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACT_TYPES.map(type => {
                    const checked = form.contract_types.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                          checked
                            ? 'border-purple-500 bg-purple-50 text-purple-800 font-semibold'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleContractType(type)}
                          className="sr-only"
                        />
                        <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          checked ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`}>
                          {checked && <span className="text-white text-xs">✓</span>}
                        </span>
                        {CONTRACT_TYPE_LABELS[type as keyof typeof CONTRACT_TYPE_LABELS]}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Présentation / Motivations <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder="Présentez-vous, vos motivations, le type de poste que vous recherchez…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères (min. 20)</p>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 – Expérience */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" /> Votre expérience
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Niveau d&apos;expérience
                </label>
                <select
                  value={form.experience_level}
                  onChange={e => set('experience_level', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
                >
                  <option value="">Non spécifié</option>
                  <option value="debutant">Débutant / Premier emploi</option>
                  <option value="junior">Junior (0–2 ans)</option>
                  <option value="confirme">Confirmé (2–5 ans)</option>
                  <option value="senior">Senior (5+ ans)</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Résumé de votre expérience (optionnel)
                </label>
                <textarea
                  rows={4}
                  placeholder="Listez vos expériences passées, formations, compétences clés…"
                  value={form.experience_summary}
                  onChange={e => set('experience_summary', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_driving_license}
                    onChange={e => set('has_driving_license', e.target.checked)}
                    className="w-5 h-5 text-blue-500 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-bold text-blue-800">🪪 Permis de conduire</span>
                    <p className="text-xs text-blue-600">Badge visible sur votre profil</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_vehicle}
                    onChange={e => set('has_vehicle', e.target.checked)}
                    className="w-5 h-5 text-green-500 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-bold text-green-800">🚗 Véhicule personnel</span>
                    <p className="text-xs text-green-600">Badge visible sur votre profil</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 – Disponibilité */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" /> Disponibilité & Localisation
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Disponibilité <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                        form.availability_type === value
                          ? 'border-purple-500 bg-purple-50 text-purple-800 font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="availability"
                        value={value}
                        checked={form.availability_type === value}
                        onChange={e => set('availability_type', e.target.value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {form.availability_type === 'date' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Date de disponibilité
                  </label>
                  <input
                    type="date"
                    value={form.available_from}
                    onChange={e => set('available_from', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Ville <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Biguglia, Bastia…"
                      value={form.location_city}
                      onChange={e => set('location_city', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secteur préféré</label>
                  <select
                    value={form.sector_id}
                    onChange={e => set('sector_id', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
                  >
                    {SECTORS.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Rayon de mobilité : <span className="text-purple-600 font-bold">{form.mobility_radius} km</span>
                </label>
                <input
                  type="range"
                  min={5} max={100} step={5}
                  value={form.mobility_radius}
                  onChange={e => set('mobility_radius', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 km</span><span>100 km</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prétentions salariales (optionnel)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-0">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" placeholder="Min"
                      value={form.salary_min}
                      onChange={e => set('salary_min', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <span className="text-gray-400 font-bold">–</span>
                  <div className="relative flex-1 min-w-0">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" placeholder="Max"
                      value={form.salary_max}
                      onChange={e => set('salary_max', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <select
                    value={form.salary_period}
                    onChange={e => set('salary_period', e.target.value)}
                    className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
                  >
                    {Object.entries(SALARY_PERIOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 – Contact */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-purple-500" /> Comment vous contacter
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mode de contact préféré <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'email', label: '📧 Email' },
                    { value: 'phone', label: '📞 Téléphone' },
                    { value: 'mixed', label: '🔀 Les deux' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
                      form.contact_mode === opt.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="mode" value={opt.value} checked={form.contact_mode === opt.value}
                        onChange={e => set('contact_mode', e.target.value)} className="sr-only" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(form.contact_mode === 'email' || form.contact_mode === 'mixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email de contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" placeholder="votre@email.fr"
                    value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {(form.contact_mode === 'phone' || form.contact_mode === 'mixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel" placeholder="06 XX XX XX XX"
                    value={form.contact_phone}
                    onChange={e => set('contact_phone', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {/* Récap */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
                <p className="font-bold text-gray-900 mb-3">✅ Récapitulatif de votre demande</p>
                {[
                  ['Métier recherché', form.title || '–'],
                  ['Catégorie',        form.job_category ? JOB_CATEGORY_LABELS[form.job_category as keyof typeof JOB_CATEGORY_LABELS] : '–'],
                  ['Contrats',         form.contract_types.map(c => CONTRACT_TYPE_LABELS[c as keyof typeof CONTRACT_TYPE_LABELS]).join(', ') || '–'],
                  ['Ville',            form.location_city || '–'],
                  ['Disponibilité',    AVAILABILITY_LABELS[form.availability_type] || '–'],
                  ['Salaire souhaité', form.salary_min ? `${form.salary_min}€${form.salary_max ? ` – ${form.salary_max}€` : ''}` : 'Non renseigné'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-gray-600">
                    <span>{k}</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{v}</span>
                  </div>
                ))}
                {form.has_driving_license && <p className="text-blue-600 font-semibold text-xs mt-2">🪪 Permis de conduire</p>}
                {form.has_vehicle && <p className="text-green-600 font-semibold text-xs">🚗 Véhicule personnel</p>}
              </div>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prev}
              disabled={step === 1}
              className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Précédent
            </button>

            {step < 4 ? (
              <button
                onClick={next}
                disabled={!canNext()}
                className="px-6 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="px-8 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Publication…</>
                ) : (
                  <><CheckCircle className="w-5 h-5" />Déposer ma demande</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

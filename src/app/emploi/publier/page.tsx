'use client';

/**
 * Page: Publier une offre d'emploi
 * Route: /emploi/publier
 * Connecté à Supabase via publishJobOffer()
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Briefcase, ArrowLeft, ChevronRight, CheckCircle,
  Building2, MapPin, Euro, Clock, FileText, Phone, AlertCircle,
} from 'lucide-react';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES, JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import { publishJobOffer } from '@/services/jobs/publish-offer';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

interface FormData {
  title: string;
  job_category: string;
  contract_type: string;
  description: string;
  employer_name: string;
  location_city: string;
  location_address: string;
  sector_id: string;
  salary_min: string;
  salary_max: string;
  salary_period: string;
  start_date: string;
  experience_level: string;
  provides_housing: boolean;
  is_urgent: boolean;
  contact_email: string;
  contact_phone: string;
  application_mode: string;
}

const INITIAL: FormData = {
  title: '', job_category: '', contract_type: '', description: '',
  employer_name: '', location_city: 'Biguglia', location_address: '', sector_id: '',
  salary_min: '', salary_max: '', salary_period: 'monthly',
  start_date: '', experience_level: '',
  provides_housing: false, is_urgent: false,
  contact_email: '', contact_phone: '', application_mode: 'email',
};

const STEPS = [
  { id: 1, label: "L'offre",    icon: FileText   },
  { id: 2, label: 'Employeur',  icon: Building2  },
  { id: 3, label: 'Conditions', icon: Euro       },
  { id: 4, label: 'Contact',    icon: Phone      },
];

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly: '/ heure', daily: '/ jour', monthly: '/ mois', yearly: '/ an',
};

export default function PublierOffrePage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const next = () => { setServerError(null); setStep(s => Math.min(s + 1, 4) as Step); };
  const prev = () => { setServerError(null); setStep(s => Math.max(s - 1, 1) as Step); };

  /* ── Validation par étape ─────────────────────────────────────────────── */
  const canNext = (): boolean => {
    if (step === 1) return form.title.length >= 5 && !!form.job_category && !!form.contract_type && form.description.length >= 20;
    if (step === 2) return form.employer_name.length >= 2 && form.location_city.length >= 2;
    if (step === 3) return true;
    if (step === 4) return (form.application_mode !== 'phone' ? form.contact_email.includes('@') : true)
                       && (form.application_mode !== 'email' ? form.contact_phone.length >= 8 : true)
                       && (form.application_mode === 'email' ? form.contact_email.includes('@') : true);
    return false;
  };

  /* ── Soumission réelle Supabase ───────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);

    const result = await publishJobOffer({
      title:            form.title,
      job_category:     form.job_category,
      contract_type:    form.contract_type,
      description:      form.description,
      employer_name:    form.employer_name,
      location_city:    form.location_city,
      location_address: form.location_address || undefined,
      sector_id:        form.sector_id || undefined,
      salary_min:       form.salary_min ? parseFloat(form.salary_min) : undefined,
      salary_max:       form.salary_max ? parseFloat(form.salary_max) : undefined,
      salary_period:    form.salary_period || undefined,
      start_date:       form.start_date || undefined,
      experience_level: form.experience_level || undefined,
      provides_housing: form.provides_housing,
      is_urgent:        form.is_urgent,
      contact_email:    form.contact_email || undefined,
      contact_phone:    form.contact_phone || undefined,
      application_mode: form.application_mode,
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
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Offre publiée !</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Votre offre est maintenant visible sur Biguglia Connect.
          </p>
          <div className="flex flex-col gap-3">
            {publishedSlug && (
              <Link
                href={`/emploi/offres/${publishedSlug}`}
                className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors"
              >
                Voir mon offre →
              </Link>
            )}
            <Link
              href="/emploi/offres"
              className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              Retour aux offres
            </Link>
            <button
              onClick={() => { setForm(INITIAL); setStep(1); setDone(false); setPublishedSlug(null); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              Publier une autre offre
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/emploi/offres" className="inline-flex items-center gap-2 text-brand-100 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux offres
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Publier une offre d&apos;emploi</h1>
              <p className="text-brand-100 text-sm">Gratuit · Publié immédiatement</p>
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
                      active    ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' :
                                  'bg-gray-100 text-gray-400'
                    }`}>
                      {completed ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${
                      active ? 'text-brand-600' : completed ? 'text-green-600' : 'text-gray-400'
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

          {/* ÉTAPE 1 – L'offre */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" /> Décrivez le poste
              </h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Intitulé du poste <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Serveur(se), Maçon, Aide à domicile…"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/100 caractères (min. 5)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.job_category}
                    onChange={e => set('job_category', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white"
                  >
                    <option value="">Choisir…</option>
                    {JOB_CATEGORIES.map(c => (
                      <option key={c} value={c}>{JOB_CATEGORY_LABELS[c as keyof typeof JOB_CATEGORY_LABELS]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Type de contrat <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.contract_type}
                    onChange={e => set('contract_type', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white"
                  >
                    <option value="">Choisir…</option>
                    {CONTRACT_TYPES.map(c => (
                      <option key={c} value={c}>{CONTRACT_TYPE_LABELS[c as keyof typeof CONTRACT_TYPE_LABELS]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description du poste <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Missions, horaires, profil recherché, avantages…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères (min. 20)</p>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 – Employeur */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" /> L&apos;employeur
              </h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nom de l&apos;entreprise / employeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Restaurant Le Maquis, SARL BTP Corse…"
                  value={form.employer_name}
                  onChange={e => set('employer_name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                />
              </div>

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
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Zone Lido, route nationale…"
                    value={form.location_address}
                    onChange={e => set('location_address', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_urgent}
                  onChange={e => set('is_urgent', e.target.checked)}
                  className="w-5 h-5 text-red-500 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-bold text-red-800">🔥 Recrutement urgent</span>
                  <p className="text-xs text-red-600">Badge &quot;Urgent&quot; visible sur votre offre</p>
                </div>
              </label>
            </div>
          )}

          {/* ÉTAPE 3 – Conditions */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Euro className="w-5 h-5 text-brand-500" /> Conditions du poste
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Salaire proposé (optionnel)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-0">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" placeholder="Min"
                      value={form.salary_min}
                      onChange={e => set('salary_min', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <span className="text-gray-400 font-bold">–</span>
                  <div className="relative flex-1 min-w-0">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" placeholder="Max"
                      value={form.salary_max}
                      onChange={e => set('salary_max', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <select
                    value={form.salary_period}
                    onChange={e => set('salary_period', e.target.value)}
                    className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white"
                  >
                    {Object.entries(SALARY_PERIOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  💡 Les offres avec salaire visible reçoivent 3x plus de candidatures.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Clock className="inline w-4 h-4 mr-1 text-gray-400" />Date de début
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => set('start_date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expérience requise</label>
                  <select
                    value={form.experience_level}
                    onChange={e => set('experience_level', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white"
                  >
                    <option value="">Non spécifié</option>
                    <option value="debutant">Débutant accepté</option>
                    <option value="junior">Junior (0–2 ans)</option>
                    <option value="confirme">Confirmé (2–5 ans)</option>
                    <option value="senior">Senior (5+ ans)</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.provides_housing}
                  onChange={e => set('provides_housing', e.target.checked)}
                  className="w-5 h-5 text-blue-500 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-bold text-blue-800">🏠 Logement fourni</span>
                  <p className="text-xs text-blue-600">Badge visible sur votre offre</p>
                </div>
              </label>
            </div>
          )}

          {/* ÉTAPE 4 – Contact */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-brand-500" /> Coordonnées de contact
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mode de candidature <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'email', label: '📧 Email' },
                    { value: 'phone', label: '📞 Téléphone' },
                    { value: 'mixed', label: '🔀 Les deux' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
                      form.application_mode === opt.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="mode" value={opt.value} checked={form.application_mode === opt.value}
                        onChange={e => set('application_mode', e.target.value)} className="sr-only" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(form.application_mode === 'email' || form.application_mode === 'mixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email de contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" placeholder="recrutement@example.fr"
                    value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
              )}

              {(form.application_mode === 'phone' || form.application_mode === 'mixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel" placeholder="06 XX XX XX XX"
                    value={form.contact_phone}
                    onChange={e => set('contact_phone', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
              )}

              {/* Récap */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
                <p className="font-bold text-gray-900 mb-3">✅ Récapitulatif de votre offre</p>
                {[
                  ['Poste',       form.title || '–'],
                  ['Contrat',     form.contract_type ? CONTRACT_TYPE_LABELS[form.contract_type as keyof typeof CONTRACT_TYPE_LABELS] : '–'],
                  ['Employeur',   form.employer_name || '–'],
                  ['Ville',       form.location_city || '–'],
                  ['Salaire',     form.salary_min ? `${form.salary_min}€${form.salary_max ? ` – ${form.salary_max}€` : ''}` : 'Non renseigné'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-gray-600">
                    <span>{k}</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{v}</span>
                  </div>
                ))}
                {form.is_urgent && <p className="text-red-600 font-semibold text-xs mt-2">🔥 Recrutement urgent</p>}
                {form.provides_housing && <p className="text-blue-600 font-semibold text-xs">🏠 Logement fourni</p>}
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
                className="px-6 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="px-8 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Publication…</>
                ) : (
                  <><CheckCircle className="w-5 h-5" />Publier l&apos;offre</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

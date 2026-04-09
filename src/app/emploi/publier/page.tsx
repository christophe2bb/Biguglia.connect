'use client';

/**
 * Page: Publier une offre d'emploi
 * Route: /emploi/publier
 * Connecté à Supabase via publishJobOffer()
 */

import Link from 'next/link';
import { useState } from 'react';
import {
  Briefcase, ArrowLeft, ChevronRight, CheckCircle,
  Building2, MapPin, Euro, Clock, FileText, Phone,
  AlertCircle, Home, Utensils, Car, Zap, Star,
  Coffee, Wifi, GraduationCap, Shield, Heart,
} from 'lucide-react';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES, JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import { publishJobOffer } from '@/services/jobs/publish-offer';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

interface FormData {
  /* Étape 1 – L'offre */
  title: string;
  job_category: string;
  contract_type: string;
  description: string;
  /* Étape 2 – Employeur */
  employer_name: string;
  location_city: string;
  location_address: string;
  sector_id: string;
  is_urgent: boolean;
  /* Étape 3 – Conditions (enrichie) */
  salary_min: string;
  salary_max: string;
  salary_period: string;
  salary_type: 'net' | 'brut' | '';       // ← net ou brut
  salary_is_negotiable: boolean;
  weekly_hours: string;
  schedule_details: string;
  is_flexible_schedule: boolean;
  start_date: string;
  end_date: string;
  experience_level: string;
  provides_housing: boolean;
  housing_details: string;
  provides_meals: boolean;
  requires_vehicle: boolean;
  has_driving_license: boolean;
  other_benefits: string[];               // ← avantages multiples
  /* Étape 4 – Contact */
  contact_email: string;
  contact_phone: string;
  application_mode: string;
  contact_instructions: string;
}

const INITIAL: FormData = {
  title: '', job_category: '', contract_type: '', description: '',
  employer_name: '', location_city: 'Biguglia', location_address: '', sector_id: '', is_urgent: false,
  salary_min: '', salary_max: '', salary_period: 'monthly', salary_type: '', salary_is_negotiable: false,
  weekly_hours: '', schedule_details: '', is_flexible_schedule: false,
  start_date: '', end_date: '', experience_level: '',
  provides_housing: false, housing_details: '', provides_meals: false,
  requires_vehicle: false, has_driving_license: false,
  other_benefits: [],
  contact_email: '', contact_phone: '', application_mode: 'email', contact_instructions: '',
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

const SECTORS = [
  { id: '',            label: 'Non précisé' },
  { id: 'biguglia',    label: 'Biguglia centre' },
  { id: 'lido',        label: 'Zone du Lido' },
  { id: 'marana',      label: 'La Marana' },
  { id: 'furiani',     label: 'Furiani' },
  { id: 'bastia',      label: 'Bastia (proches)' },
];

/* ── Avantages prédéfinis ───────────────────────────────────────────────── */
const BENEFIT_OPTIONS: { id: string; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'mutuelle',       label: 'Mutuelle entreprise',     icon: Shield,       color: 'blue'   },
  { id: 'prime',          label: 'Prime / 13e mois',        icon: Star,         color: 'amber'  },
  { id: 'conges_plus',    label: 'Congés supplémentaires',  icon: Coffee,       color: 'teal'   },
  { id: 'formation',      label: 'Formation / évolution',   icon: GraduationCap,color: 'indigo' },
  { id: 'remote',         label: 'Télétravail partiel',     icon: Wifi,         color: 'cyan'   },
  { id: 'ticket_resto',   label: 'Tickets restaurant',      icon: Utensils,     color: 'green'  },
  { id: 'transport',      label: 'Prise en charge transport',icon: Car,          color: 'orange' },
  { id: 'intéressement',  label: 'Intéressement / participation', icon: Zap,    color: 'yellow' },
  { id: 'cse',            label: 'Avantages CSE',           icon: Heart,        color: 'pink'   },
];

const COLOR_CLASSES: Record<string, string> = {
  blue:   'border-blue-300   bg-blue-50   text-blue-800',
  amber:  'border-amber-300  bg-amber-50  text-amber-800',
  teal:   'border-teal-300   bg-teal-50   text-teal-800',
  indigo: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  cyan:   'border-cyan-300   bg-cyan-50   text-cyan-800',
  green:  'border-green-300  bg-green-50  text-green-800',
  orange: 'border-orange-300 bg-orange-50 text-orange-800',
  yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  pink:   'border-pink-300   bg-pink-50   text-pink-800',
};

export default function PublierOffrePage() {
  const [step, setStep]             = useState<Step>(1);
  const [form, setForm]             = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone]             = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | boolean | string[]) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleBenefit = (id: string) => {
    const cur = form.other_benefits;
    const next = cur.includes(id) ? cur.filter(b => b !== id) : [...cur, id];
    set('other_benefits', next);
  };

  const next = () => { setServerError(null); setStep(s => Math.min(s + 1, 4) as Step); };
  const prev = () => { setServerError(null); setStep(s => Math.max(s - 1, 1) as Step); };

  /* ── Validation par étape ─────────────────────────────────────────────── */
  const canNext = (): boolean => {
    if (step === 1) return form.title.length >= 5 && !!form.job_category && !!form.contract_type && form.description.length >= 20;
    if (step === 2) return form.employer_name.length >= 2 && form.location_city.length >= 2;
    if (step === 3) return true; // tout optionnel sauf logique interne
    if (step === 4) return (
      (form.application_mode !== 'phone' ? form.contact_email.includes('@') : true) &&
      (form.application_mode !== 'email' ? form.contact_phone.length >= 8 : true) &&
      (form.application_mode === 'email' ? form.contact_email.includes('@') : true)
    );
    return false;
  };

  /* ── Soumission Supabase ──────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);

    // Construire la liste des avantages textuels
    const benefitLabels = form.other_benefits
      .map(id => BENEFIT_OPTIONS.find(b => b.id === id)?.label ?? id)
      .join(', ');

    // Enrichir la description avec les avantages
    const enrichedDesc = [
      form.description,
      benefitLabels ? `\n\nAvantages : ${benefitLabels}` : '',
      form.schedule_details ? `\nHoraires : ${form.schedule_details}` : '',
      form.housing_details && form.provides_housing ? `\nLogement : ${form.housing_details}` : '',
      form.contact_instructions ? `\nInformations complémentaires : ${form.contact_instructions}` : '',
    ].join('').trim();

    const result = await publishJobOffer({
      /* Étape 1 */
      title:                  form.title,
      job_category:           form.job_category,
      contract_type:          form.contract_type,
      description:            enrichedDesc,
      /* Étape 2 */
      employer_name:          form.employer_name,
      location_city:          form.location_city,
      location_address:       form.location_address || undefined,
      sector_id:              form.sector_id || undefined,
      is_urgent:              form.is_urgent,
      /* Étape 3 – Conditions enrichies */
      salary_min:             form.salary_min ? parseFloat(form.salary_min) : undefined,
      salary_max:             form.salary_max ? parseFloat(form.salary_max) : undefined,
      salary_period:          form.salary_period || undefined,
      salary_type:            form.salary_type || undefined,
      salary_is_negotiable:   form.salary_is_negotiable,
      weekly_hours:           form.weekly_hours ? parseFloat(form.weekly_hours) : undefined,
      schedule_details:       form.schedule_details || undefined,
      is_flexible_schedule:   form.is_flexible_schedule,
      start_date:             form.start_date || undefined,
      end_date:               form.end_date || undefined,
      experience_level:       form.experience_level || undefined,
      provides_housing:       form.provides_housing,
      housing_details:        form.housing_details || undefined,
      provides_meals:         form.provides_meals,
      requires_vehicle:       form.requires_vehicle,
      has_driving_license:    form.has_driving_license,
      other_benefits:         form.other_benefits.length > 0 ? form.other_benefits : undefined,
      /* Étape 4 */
      contact_email:          form.contact_email || undefined,
      contact_phone:          form.contact_phone || undefined,
      application_mode:       form.application_mode,
      contact_instructions:   form.contact_instructions || undefined,
    });

    setSubmitting(false);
    if (!result.success) { setServerError(result.error ?? 'Une erreur est survenue.'); return; }
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
              <Link href={`/emploi/offres/${publishedSlug}`}
                className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors">
                Voir mon offre →
              </Link>
            )}
            <Link href="/emploi/offres"
              className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors">
              Retour aux offres
            </Link>
            <button onClick={() => { setForm(INITIAL); setStep(1); setDone(false); setPublishedSlug(null); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1">
              Publier une autre offre
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Layout principal ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/emploi/offres"
            className="inline-flex items-center gap-2 text-brand-100 hover:text-white text-sm mb-4 transition-colors">
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

        {/* Stepper */}
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

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ÉTAPE 1 – L'offre
          ══════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" /> Décrivez le poste
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Intitulé du poste <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="Ex : Serveur(se), Maçon, Aide à domicile…"
                  value={form.title} onChange={e => set('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors" />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/100 caractères (min. 5)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select value={form.job_category} onChange={e => set('job_category', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white">
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
                  <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white">
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
                <textarea rows={6}
                  placeholder="Missions principales, responsabilités, profil recherché, ambiance de travail…"
                  value={form.description} onChange={e => set('description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 resize-none" />
                <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères (min. 20)</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ÉTAPE 2 – Employeur
          ══════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" /> L&apos;employeur
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nom de l&apos;entreprise / employeur <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="Restaurant Le Maquis, SARL BTP Corse…"
                  value={form.employer_name} onChange={e => set('employer_name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Ville <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Biguglia, Bastia…"
                      value={form.location_city} onChange={e => set('location_city', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse (optionnel)</label>
                  <input type="text" placeholder="Zone Lido, route nationale…"
                    value={form.location_address} onChange={e => set('location_address', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Secteur / Quartier
                  <span className="text-gray-400 font-normal text-xs ml-1">(utilisé dans la recherche par zone)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SECTORS.filter(s => s.id !== '').map(s => (
                    <label key={s.id}
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                        form.sector_id === s.id
                          ? 'border-brand-500 bg-brand-50 text-brand-800 font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <input type="radio" name="sector" value={s.id}
                        checked={form.sector_id === s.id}
                        onChange={e => set('sector_id', e.target.value)}
                        className="sr-only" />
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        form.sector_id === s.id ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                      }`} />
                      {s.label}
                    </label>
                  ))}
                  <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                    form.sector_id === ''
                      ? 'border-gray-400 bg-gray-50 text-gray-700 font-semibold'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="sector" value=""
                      checked={form.sector_id === ''}
                      onChange={() => set('sector_id', '')}
                      className="sr-only" />
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      form.sector_id === '' ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
                    }`} />
                    Non précisé
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.is_urgent} onChange={e => set('is_urgent', e.target.checked)}
                  className="w-5 h-5 text-red-500 rounded border-gray-300" />
                <div>
                  <span className="text-sm font-bold text-red-800">🔥 Recrutement urgent</span>
                  <p className="text-xs text-red-600">Badge &quot;Urgent&quot; visible sur votre offre</p>
                </div>
              </label>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ÉTAPE 3 – Conditions (enrichie)
          ══════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Euro className="w-5 h-5 text-brand-500" /> Conditions du poste
              </h2>

              {/* ── SALAIRE ───────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Euro className="w-4 h-4 text-green-600" /> Rémunération
                </h3>

                {/* Fourchette */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[100px]">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" placeholder="Min"
                      value={form.salary_min} onChange={e => set('salary_min', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                  </div>
                  <span className="text-gray-400 font-bold">–</span>
                  <div className="relative flex-1 min-w-[100px]">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" placeholder="Max"
                      value={form.salary_max} onChange={e => set('salary_max', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                  </div>
                  <select value={form.salary_period} onChange={e => set('salary_period', e.target.value)}
                    className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white">
                    {Object.entries(SALARY_PERIOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Net ou Brut */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Le salaire indiqué est :</p>
                  <div className="flex gap-3">
                    {[
                      { v: 'net',  label: '💵 Net', desc: 'Ce que le salarié reçoit' },
                      { v: 'brut', label: '📄 Brut', desc: 'Avant déductions sociales' },
                    ].map(opt => (
                      <label key={opt.v}
                        className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                          form.salary_type === opt.v
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <input type="radio" name="salary_type" value={opt.v}
                          checked={form.salary_type === opt.v}
                          onChange={e => set('salary_type', e.target.value)}
                          className="sr-only" />
                        <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                      </label>
                    ))}
                    <label className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                      form.salary_type === '' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="salary_type" value=""
                        checked={form.salary_type === ''}
                        onChange={e => set('salary_type', e.target.value)}
                        className="sr-only" />
                      <span className="text-sm font-bold text-gray-900">❓ NSP</span>
                      <span className="text-xs text-gray-500 mt-0.5">Non précisé</span>
                    </label>
                  </div>
                </div>

                {/* Négociable */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.salary_is_negotiable}
                    onChange={e => set('salary_is_negotiable', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm text-gray-700">
                    Salaire <span className="font-semibold">négociable</span> selon profil
                  </span>
                </label>

                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  💡 Les offres avec salaire visible reçoivent <strong>3× plus</strong> de candidatures.
                </p>
              </div>

              {/* ── HORAIRES ──────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Horaires &amp; Durée
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Heures / semaine</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" placeholder="Ex : 35, 39, 25…"
                        value={form.weekly_hours} onChange={e => set('weekly_hours', e.target.value)}
                        className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début</label>
                    <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                  </div>
                </div>

                {(form.contract_type === 'cdd' || form.contract_type === 'saisonnier' || form.contract_type === 'interim') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin (si connue)</label>
                    <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Précisions horaires <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input type="text"
                    placeholder="Ex : Du lundi au vendredi, service du midi uniquement, week-ends inclus…"
                    value={form.schedule_details} onChange={e => set('schedule_details', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_flexible_schedule}
                    onChange={e => set('is_flexible_schedule', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm text-gray-700">⚡ <span className="font-semibold">Horaires flexibles</span> / à définir ensemble</span>
                </label>
              </div>

              {/* ── EXPÉRIENCE ────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" /> Expérience requise
                </h3>
                <select value={form.experience_level} onChange={e => set('experience_level', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white">
                  <option value="">Non spécifié / Peu importe</option>
                  <option value="debutant">🟢 Débutant accepté – Aucune expérience requise</option>
                  <option value="junior">🔵 Junior – 0 à 2 ans d&apos;expérience</option>
                  <option value="confirme">🟠 Confirmé – 2 à 5 ans d&apos;expérience</option>
                  <option value="senior">🔴 Senior – 5 ans et plus</option>
                  <option value="expert">⭐ Expert – Profil très spécialisé</option>
                </select>
              </div>

              {/* ── AVANTAGES ─────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Avantages proposés
                </h3>
                <p className="text-xs text-gray-500">Cochez tous les avantages inclus dans ce poste</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BENEFIT_OPTIONS.map(b => {
                    const Icon = b.icon;
                    const active = form.other_benefits.includes(b.id);
                    const cls = COLOR_CLASSES[b.color] ?? COLOR_CLASSES.blue;
                    return (
                      <label key={b.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          active ? cls : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                        <input type="checkbox" checked={active} onChange={() => toggleBenefit(b.id)} className="sr-only" />
                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          active ? 'border-current bg-current' : 'border-gray-300'
                        }`}>
                          {active && <span className="text-white text-xs">✓</span>}
                        </div>
                        <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                        <span className="text-sm font-medium">{b.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── HÉBERGEMENT & REPAS ───────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Home className="w-4 h-4 text-indigo-600" /> Hébergement &amp; Repas
                </h3>

                <label className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.provides_housing}
                    onChange={e => set('provides_housing', e.target.checked)}
                    className="w-5 h-5 text-indigo-500 rounded border-gray-300" />
                  <div>
                    <span className="text-sm font-bold text-indigo-800">🏠 Logement fourni</span>
                    <p className="text-xs text-indigo-600">Badge visible sur votre offre</p>
                  </div>
                </label>

                {form.provides_housing && (
                  <input type="text"
                    placeholder="Précisions : chambre individuelle, studio, maison partagée…"
                    value={form.housing_details} onChange={e => set('housing_details', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
                )}

                <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.provides_meals}
                    onChange={e => set('provides_meals', e.target.checked)}
                    className="w-5 h-5 text-green-500 rounded border-gray-300" />
                  <div>
                    <span className="text-sm font-bold text-green-800">
                      <Utensils className="inline w-4 h-4 mr-1" />Repas fournis
                    </span>
                    <p className="text-xs text-green-600">Repas de service inclus</p>
                  </div>
                </label>
              </div>

              {/* ── PRÉREQUIS MOBILITÉ ────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Car className="w-4 h-4 text-gray-600" /> Prérequis de mobilité
                </h3>

                <label className="flex items-center gap-3 p-3 border border-gray-200 bg-white rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.has_driving_license}
                    onChange={e => set('has_driving_license', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm text-gray-700">🪪 <span className="font-semibold">Permis de conduire</span> requis</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 bg-white rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.requires_vehicle}
                    onChange={e => set('requires_vehicle', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm text-gray-700">🚗 <span className="font-semibold">Véhicule personnel</span> requis</span>
                </label>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ÉTAPE 4 – Contact
          ══════════════════════════════════════════════════ */}
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
                      <input type="radio" name="mode" value={opt.value}
                        checked={form.application_mode === opt.value}
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
                  <input type="email" placeholder="recrutement@example.fr"
                    value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400" />
                </div>
              )}

              {(form.application_mode === 'phone' || form.application_mode === 'mixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" placeholder="06 XX XX XX XX"
                    value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400" />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Instructions complémentaires <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea rows={3}
                  placeholder="Ex : Mentionner la référence de l'annonce, joindre un CV, disponible du lundi au vendredi…"
                  value={form.contact_instructions} onChange={e => set('contact_instructions', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 resize-none" />
              </div>

              {/* Récap */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
                <p className="font-bold text-gray-900 mb-3">✅ Récapitulatif de votre offre</p>
                {[
                  ['Poste',      form.title || '–'],
                  ['Contrat',    form.contract_type ? CONTRACT_TYPE_LABELS[form.contract_type as keyof typeof CONTRACT_TYPE_LABELS] : '–'],
                  ['Employeur',  form.employer_name || '–'],
                  ['Ville',      form.location_city || '–'],
                  ['Salaire',    form.salary_min
                      ? `${form.salary_min}€${form.salary_max ? ` – ${form.salary_max}€` : ''} ${SALARY_PERIOD_LABELS[form.salary_period] ?? ''}${form.salary_type ? ` (${form.salary_type})` : ''}`
                      : 'Non renseigné'],
                  ['Horaires',   form.weekly_hours ? `${form.weekly_hours}h/sem${form.is_flexible_schedule ? ' · Flexible' : ''}` : form.is_flexible_schedule ? 'Flexibles' : '–'],
                  ['Avantages',  form.other_benefits.length > 0
                      ? form.other_benefits.map(id => BENEFIT_OPTIONS.find(b => b.id === id)?.label ?? id).join(', ')
                      : 'Aucun coché'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-gray-600 gap-2">
                    <span className="flex-shrink-0">{k}</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[220px] truncate">{v}</span>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.is_urgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">🔥 Urgent</span>}
                  {form.provides_housing && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">🏠 Logement</span>}
                  {form.provides_meals && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">🍽️ Repas</span>}
                  {form.has_driving_license && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🪪 Permis requis</span>}
                  {form.requires_vehicle && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">🚗 Véhicule requis</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button onClick={prev} disabled={step === 1}
              className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Précédent
            </button>

            {step < 4 ? (
              <button onClick={next} disabled={!canNext()}
                className="px-6 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canNext() || submitting}
                className="px-8 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md">
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

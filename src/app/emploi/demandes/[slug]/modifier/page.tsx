/**
 * Page: Modifier une demande d'emploi
 * Route: /emploi/demandes/[slug]/modifier
 * Accessible uniquement au créateur de la demande.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle, MapPin, Euro, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  SECTOR_LABELS,
} from '@/types/jobs/constants';

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly: '/ heure',
  daily: '/ jour',
  monthly: '/ mois',
  yearly: '/ an',
};

const CONTRACT_TYPES = Object.entries(CONTRACT_TYPE_LABELS) as [string, string][];
const JOB_CATEGORIES = Object.entries(JOB_CATEGORY_LABELS) as [string, string][];
const SECTORS = Object.entries(SECTOR_LABELS) as [string, string][];

export default function ModifierDemandePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    full_description: '',
    job_category: '',
    desired_contract_types: [] as string[],
    location_city: '',
    sector_id: '',
    mobility_radius: '',
    experience_level: '',
    salary_expectation_min: '',
    salary_expectation_max: '',
    salary_period: 'monthly',
    salary_type: 'net',
    weekly_hours_desired: '',
    is_flexible_schedule: false,
    has_driving_license: false,
    has_vehicle: false,
    availability_type: 'immediate',
    is_urgent: false,
    contact_email: '',
    contact_phone: '',
    contact_instructions: '',
    contact_mode: 'email',
  });

  useEffect(() => {
    async function loadDemand() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/connexion?redirect=/emploi/demandes/${slug}/modifier`); return; }

      // Vérifier l'ownership via API (service role, bypass RLS)
      const ownerRes = await fetch(`/api/emploi/ownership?type=demand&slug=${slug}`);
      const ownerData = await ownerRes.json();
      if (!ownerData.isOwner) { setNotOwner(true); setLoading(false); return; }

      // Charger les données de la demande
      const { data, error: err } = await supabase
        .from('job_demands')
        .select('*')
        .eq('slug', slug)
        .single();

      if (err || !data) { setError('Demande introuvable.'); setLoading(false); return; }

      setForm({
        title: data.title ?? '',
        short_description: data.short_description ?? '',
        full_description: data.full_description ?? '',
        job_category: data.job_category ?? '',
        desired_contract_types: data.desired_contract_types ?? [],
        location_city: data.location_city ?? '',
        sector_id: data.sector_id ?? '',
        mobility_radius: data.mobility_radius != null ? String(data.mobility_radius) : '',
        experience_level: data.experience_level ?? '',
        salary_expectation_min: data.salary_expectation_min != null ? String(data.salary_expectation_min) : '',
        salary_expectation_max: data.salary_expectation_max != null ? String(data.salary_expectation_max) : '',
        salary_period: data.salary_period ?? 'monthly',
        salary_type: data.salary_type ?? 'net',
        weekly_hours_desired: data.weekly_hours_desired != null ? String(data.weekly_hours_desired) : '',
        is_flexible_schedule: data.is_flexible_schedule ?? false,
        has_driving_license: data.has_driving_license ?? false,
        has_vehicle: data.has_vehicle ?? false,
        availability_type: data.availability_type ?? 'immediate',
        is_urgent: data.is_urgent ?? false,
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        contact_instructions: data.contact_instructions ?? '',
        contact_mode: data.contact_mode ?? 'email',
      });
      setLoading(false);
    }
    loadDemand();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleContractType(ct: string) {
    setForm(prev => ({
      ...prev,
      desired_contract_types: prev.desired_contract_types.includes(ct)
        ? prev.desired_contract_types.filter(c => c !== ct)
        : [...prev.desired_contract_types, ct],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      salary_expectation_min: form.salary_expectation_min ? Number(form.salary_expectation_min) : null,
      salary_expectation_max: form.salary_expectation_max ? Number(form.salary_expectation_max) : null,
      weekly_hours_desired: form.weekly_hours_desired ? Number(form.weekly_hours_desired) : null,
      mobility_radius: form.mobility_radius ? Number(form.mobility_radius) : null,
    };

    try {
      const res = await fetch(`/api/emploi/demandes/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erreur lors de la sauvegarde.');
        setSaving(false);
        return;
      }

      const data = await res.json();
      setSuccess(true);
      setTimeout(() => router.push(`/emploi/demandes/${data.slug ?? slug}`), 1500);
    } catch {
      setError('Erreur réseau, réessayez.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h1>
        <p className="text-gray-500 mb-6">Vous n&apos;êtes pas le créateur de cette demande.</p>
        <Link href={`/emploi/demandes/${slug}`} className="text-purple-600 font-semibold underline">
          ← Voir la demande
        </Link>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-semibold">{error}</p>
        <Link href="/emploi/demandes" className="mt-4 text-purple-600 underline">← Retour aux demandes</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <Link href={`/emploi/demandes/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 font-medium mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour à la demande
          </Link>
          <h1 className="text-2xl font-black text-gray-900">✏️ Modifier ma candidature</h1>
          <p className="text-gray-500 text-sm mt-1">Les modifications sont appliquées immédiatement.</p>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-2xl mb-6 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            Candidature mise à jour ! Redirection…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Poste recherché */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800">🙋 Poste recherché</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Titre / poste recherché *</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                placeholder="Ex : Serveur/se, Aide à domicile, Comptable…" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Catégorie</label>
              <select value={form.job_category} onChange={e => set('job_category', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                <option value="">Choisir…</option>
                {JOB_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Types de contrat recherchés</label>
              <div className="flex flex-wrap gap-2">
                {CONTRACT_TYPES.map(([k, v]) => (
                  <button key={k} type="button"
                    onClick={() => toggleContractType(k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                      form.desired_contract_types.includes(k)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Présentation / description</label>
              <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)}
                rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none resize-none"
                placeholder="Présentez-vous en quelques phrases…" />
            </div>
          </div>

          {/* Lieu */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Lieu & Mobilité</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ville *</label>
                <input type="text" value={form.location_city} onChange={e => set('location_city', e.target.value)}
                  required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                  placeholder="Biguglia…" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rayon mobilité (km)</label>
                <input type="number" min="0" value={form.mobility_radius} onChange={e => set('mobility_radius', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                  placeholder="Ex : 20" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Secteur</label>
              <select value={form.sector_id} onChange={e => set('sector_id', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                <option value="">Non précisé</option>
                {SECTORS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Salaire */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2"><Euro className="w-4 h-4" /> Prétentions salariales</h2>

            <div className="flex items-center gap-2">
              <input type="number" min="0" value={form.salary_expectation_min} onChange={e => set('salary_expectation_min', e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                placeholder="Min (€)" />
              <span className="text-gray-400">–</span>
              <input type="number" min="0" value={form.salary_expectation_max} onChange={e => set('salary_expectation_max', e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                placeholder="Max (€)" />
              <select value={form.salary_period} onChange={e => set('salary_period', e.target.value)}
                className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                {Object.entries(SALARY_PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              {['net', 'brut'].map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="sal_type" value={t} checked={form.salary_type === t} onChange={() => set('salary_type', t)} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Heures souhaitées / semaine</label>
                <input type="number" min="0" value={form.weekly_hours_desired} onChange={e => set('weekly_hours_desired', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                  placeholder="Ex : 35" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
                <input type="checkbox" checked={form.is_flexible_schedule} onChange={e => set('is_flexible_schedule', e.target.checked)} />
                Flexibles
              </label>
            </div>
          </div>

          {/* Atouts & disponibilité */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <h2 className="font-black text-gray-800">🎯 Atouts & disponibilité</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'has_driving_license', label: '🪪 Permis de conduire' },
                { key: 'has_vehicle', label: '🚗 Véhicule personnel' },
                { key: 'is_urgent', label: '🔥 Disponible rapidement' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  {label}
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Disponibilité</label>
              <select value={form.availability_type} onChange={e => set('availability_type', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                <option value="immediate">Immédiate</option>
                <option value="one_month">Dans 1 mois</option>
                <option value="three_months">Dans 3 mois</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800">📞 Contact</h2>

            <div className="flex gap-3">
              {[['email', '📧 Email'], ['phone', '📱 Téléphone'], ['mixed', '🔀 Les deux']].map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="contact_mode_d" value={val} checked={form.contact_mode === val} onChange={() => set('contact_mode', val)} />
                  {lbl}
                </label>
              ))}
            </div>

            {(form.contact_mode === 'email' || form.contact_mode === 'mixed') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                  placeholder="votre@email.fr" />
              </div>
            )}

            {(form.contact_mode === 'phone' || form.contact_mode === 'mixed') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none"
                  placeholder="06 00 00 00 00" />
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pb-8">
            <Link href={`/emploi/demandes/${slug}`}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 text-center text-sm">
              Annuler
            </Link>
            <button type="submit" disabled={saving || success}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white font-black rounded-2xl hover:bg-purple-600 transition-colors disabled:opacity-60 text-sm shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

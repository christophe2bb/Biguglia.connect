/**
 * Page: Modifier une offre d'emploi
 * Route: /emploi/offres/[slug]/modifier
 * Accessible uniquement au créateur de l'annonce.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle,
  Building2, MapPin, Euro, Clock, Flame, Home,
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

export default function ModifierOffrePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    title: '',
    short_description: '',
    full_description: '',
    employer_name: '',
    location_city: '',
    location_address: '',
    sector_id: '',
    contract_type: '',
    experience_level: '',
    salary_range_min: '',
    salary_range_max: '',
    salary_period: 'monthly',
    salary_type: 'net',
    salary_is_negotiable: false,
    weekly_hours: '',
    is_flexible_schedule: false,
    is_urgent: false,
    provides_housing: false,
    provides_meals: false,
    requires_vehicle: false,
    has_driving_license: false,
    contact_email: '',
    contact_phone: '',
    contact_instructions: '',
    application_mode: 'email',
  });

  useEffect(() => {
    async function loadOffer() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/connexion?redirect=/emploi/offres/${slug}/modifier`); return; }

      // Charger les données via API (bypass RLS, vérifie propriété côté serveur)
      // L'API GET /api/emploi/offres/[slug] retourne 401 si non connecté,
      // 403 si non propriétaire, 200 + { offer } si OK
      const res = await fetch(`/api/emploi/offres/${slug}`);

      if (res.status === 401) {
        router.push(`/connexion?redirect=/emploi/offres/${slug}/modifier`);
        return;
      }
      if (res.status === 403) {
        setNotOwner(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('Annonce introuvable ou accès refusé.');
        setLoading(false);
        return;
      }

      const json = await res.json();
      const data = json.offer;
      if (!data) { setError('Annonce introuvable.'); setLoading(false); return; }

      setForm({
        title: data.title ?? '',
        short_description: data.short_description ?? '',
        full_description: data.full_description ?? '',
        employer_name: data.employer_name ?? '',
        location_city: data.location_city ?? '',
        location_address: data.location_address ?? '',
        sector_id: data.sector_id ?? '',
        contract_type: data.contract_type ?? '',
        experience_level: data.experience_level ?? '',
        salary_range_min: data.salary_range_min != null ? String(data.salary_range_min) : '',
        salary_range_max: data.salary_range_max != null ? String(data.salary_range_max) : '',
        salary_period: data.salary_period ?? 'monthly',
        salary_type: data.salary_type ?? 'net',
        salary_is_negotiable: data.salary_is_negotiable ?? false,
        weekly_hours: data.weekly_hours != null ? String(data.weekly_hours) : '',
        is_flexible_schedule: data.is_flexible_schedule ?? false,
        is_urgent: data.is_urgent ?? false,
        provides_housing: data.provides_housing ?? false,
        provides_meals: data.provides_meals ?? false,
        requires_vehicle: data.requires_vehicle ?? false,
        has_driving_license: data.has_driving_license ?? false,
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        contact_instructions: data.contact_instructions ?? '',
        application_mode: data.application_mode ?? 'email',
      });
      setLoading(false);
    }
    loadOffer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      salary_range_min: form.salary_range_min ? Number(form.salary_range_min) : null,
      salary_range_max: form.salary_range_max ? Number(form.salary_range_max) : null,
      weekly_hours: form.weekly_hours ? Number(form.weekly_hours) : null,
    };

    try {
      const res = await fetch(`/api/emploi/offres/${slug}`, {
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
      setTimeout(() => router.push(`/emploi/offres/${data.slug ?? slug}`), 1500);
    } catch {
      setError('Erreur réseau, réessayez.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h1>
        <p className="text-gray-500 mb-6">Vous n&apos;êtes pas le créateur de cette annonce.</p>
        <Link href={`/emploi/offres/${slug}`} className="text-brand-600 font-semibold underline">
          ← Voir l&apos;annonce
        </Link>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-semibold">{error}</p>
        <Link href="/emploi/offres" className="mt-4 text-brand-600 underline">← Retour aux offres</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <Link href={`/emploi/offres/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 font-medium mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;annonce
          </Link>
          <h1 className="text-2xl font-black text-gray-900">✏️ Modifier l&apos;offre</h1>
          <p className="text-gray-500 text-sm mt-1">Les modifications sont appliquées immédiatement.</p>
        </div>

        {/* Succès */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-2xl mb-6 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            Offre mise à jour ! Redirection…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Titre & catégorie */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800">📋 Poste</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Intitulé du poste *</label>
              <input
                type="text" value={form.title} onChange={e => set('title', e.target.value)}
                required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-400 outline-none text-sm"
                placeholder="Ex : Serveur/se, Maçon, Comptable…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type de contrat</label>
                <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none">
                  {CONTRACT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Catégorie</label>
                <select value={form.experience_level} onChange={e => set('experience_level', e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none">
                  <option value="">Non précisé</option>
                  <option value="junior">Junior</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="senior">Senior</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description courte</label>
              <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)}
                rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none resize-none"
                placeholder="Résumé de l'offre en 1-2 phrases…" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description complète</label>
              <textarea value={form.full_description} onChange={e => set('full_description', e.target.value)}
                rows={5} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none resize-none"
                placeholder="Missions, profil recherché, conditions…" />
            </div>
          </div>

          {/* Employeur & lieu */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4" /> Employeur & Lieu</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Entreprise</label>
                <input type="text" value={form.employer_name} onChange={e => set('employer_name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                  placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ville *</label>
                <input type="text" value={form.location_city} onChange={e => set('location_city', e.target.value)}
                  required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                  placeholder="Ex : Biguglia" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse (optionnel)</label>
              <input type="text" value={form.location_address} onChange={e => set('location_address', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                placeholder="Zone Lido, route nationale…" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Secteur</label>
              <select value={form.sector_id} onChange={e => set('sector_id', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none">
                <option value="">Non précisé</option>
                {SECTORS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Salaire & horaires */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2"><Euro className="w-4 h-4" /> Salaire & Horaires</h2>

            <div className="flex items-center gap-2">
              <input type="number" min="0" value={form.salary_range_min} onChange={e => set('salary_range_min', e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                placeholder="Min (€)" />
              <span className="text-gray-400">–</span>
              <input type="number" min="0" value={form.salary_range_max} onChange={e => set('salary_range_max', e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                placeholder="Max (€)" />
              <select value={form.salary_period} onChange={e => set('salary_period', e.target.value)}
                className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none">
                {Object.entries(SALARY_PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="salary_type" value="net" checked={form.salary_type === 'net'} onChange={() => set('salary_type', 'net')} />
                Net
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="salary_type" value="brut" checked={form.salary_type === 'brut'} onChange={() => set('salary_type', 'brut')} />
                Brut
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.salary_is_negotiable} onChange={e => set('salary_is_negotiable', e.target.checked)} />
                Négociable
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Heures / semaine</label>
                <input type="number" min="0" value={form.weekly_hours} onChange={e => set('weekly_hours', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                  placeholder="Ex : 35, 39, 25…" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
                <input type="checkbox" checked={form.is_flexible_schedule} onChange={e => set('is_flexible_schedule', e.target.checked)} />
                Horaires flexibles
              </label>
            </div>
          </div>

          {/* Avantages & badges */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <h2 className="font-black text-gray-800">🎯 Avantages & badges</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'is_urgent', label: '🔥 Recrutement urgent', icon: <Flame className="w-3.5 h-3.5" /> },
                { key: 'provides_housing', label: '🏠 Logement fourni', icon: <Home className="w-3.5 h-3.5" /> },
                { key: 'provides_meals', label: '🍽️ Repas inclus', icon: null },
                { key: 'requires_vehicle', label: '🚗 Véhicule requis', icon: null },
                { key: 'has_driving_license', label: '🪪 Permis exigé', icon: null },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)} className="w-4 h-4 accent-brand-500" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800">📞 Contact</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mode de contact</label>
              <div className="flex gap-3">
                {[['email', '📧 Email'], ['phone', '📱 Téléphone'], ['mixed', '🔀 Les deux']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="app_mode" value={val} checked={form.application_mode === val} onChange={() => set('application_mode', val)} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {(form.application_mode === 'email' || form.application_mode === 'mixed') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email de contact</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                  placeholder="recrutement@exemple.fr" />
              </div>
            )}

            {(form.application_mode === 'phone' || form.application_mode === 'mixed') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone de contact</label>
                <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none"
                  placeholder="06 00 00 00 00" />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions (optionnel)</label>
              <textarea value={form.contact_instructions} onChange={e => set('contact_instructions', e.target.value)}
                rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-400 outline-none resize-none"
                placeholder="Ex : Appelez uniquement le matin…" />
            </div>
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
            <Link href={`/emploi/offres/${slug}`}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 text-center text-sm">
              Annuler
            </Link>
            <button type="submit" disabled={saving || success}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white font-black rounded-2xl hover:bg-brand-600 transition-colors disabled:opacity-60 text-sm shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

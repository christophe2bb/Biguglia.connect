'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  CheckCircle, ChevronLeft, Search,
  AlertCircle, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import type { AdminArtisanEntry } from '@/app/api/admin/artisans/route';
import type { Profile } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { adminFetch } from '@/lib/admin-fetch';

interface ArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: 'professionnel' | 'particulier';
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  created_at: string;
  profile?: Profile & { email: string; phone?: string };
  trade_category?: { name: string; icon: string };
}

// Lazy-load the heavy ArtisanCard
const ArtisanCard = dynamic(() => import('./_components/ArtisanCard'), {
  loading: () => <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />,
});

export default function AdminArtisansPage() {
  useAuthStore(); // keep store subscribed for re-renders
  const [artisans, setArtisans] = useState<ArtisanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');

  const fetchArtisans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminFetch(`/api/admin/artisans?filter=${filter}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoadError(err.error ?? `Erreur ${res.status}`);
        return;
      }
      const json = await res.json();
      // L'API retourne { artisans: [...] } — on extrait le tableau
      const data: AdminArtisanEntry[] = Array.isArray(json) ? json : (json.artisans ?? []);
      const list: ArtisanEntry[] = data.map(a => ({
        id:               a.id,
        user_id:          a.user_id,
        business_name:    a.business_name,
        description:      a.description,
        service_area:     a.service_area,
        years_experience: a.years_experience ?? undefined,
        siret:            a.siret ?? undefined,
        insurance:        a.insurance ?? undefined,
        artisan_type:     a.artisan_type ?? undefined,
        doc_kbis_url:     a.doc_kbis_url ?? undefined,
        doc_insurance_url: a.doc_insurance_url ?? undefined,
        doc_id_url:       a.doc_id_url ?? undefined,
        rejection_reason: a.rejection_reason ?? undefined,
        created_at:       a.created_at,
        trade_category:   a.trade_category ?? undefined,
        profile:          a.profile as ArtisanEntry['profile'],
      }));
      setArtisans(list);
    } catch (err) {
      setLoadError('Impossible de charger les artisans.');
      console.error('[artisans] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // La protection admin est assurée par ProtectedPage (adminOnly).
    // On ne redirige pas manuellement ici pour éviter de polluer l'historique
    // du navigateur avant que le profil soit chargé (race condition).
    fetchArtisans();
  }, [filter, fetchArtisans]);

  const approveArtisan = async (artisanUserId: string) => {
    const res = await adminFetch(`/api/admin/artisans/${artisanUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur lors de la validation : ' + (data.error ?? res.statusText));
      return;
    }
    toast.success('Artisan approuvé et notifié !');
    fetchArtisans();
  };

  const rejectArtisan = async (artisanUserId: string, reason: string) => {
    const res = await adminFetch(`/api/admin/artisans/${artisanUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur lors du refus : ' + (data.error ?? res.statusText));
      return;
    }
    toast.success('Artisan refusé et notifié');
    fetchArtisans();
  };

  const filtered = artisans.filter(a =>
    !search ||
    a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = artisans.filter(a => a.profile?.role === 'artisan_pending').length;

  return (
    <ProtectedPage adminOnly>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── En-tête ── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des artisans</h1>
            <p className="text-gray-500 text-sm">Examinez les dossiers, vérifiez les informations et validez les profils</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold">
              ⏳ {pendingCount} en attente
            </div>
          )}
        </div>

        {/* ── Erreur ── */}
        {loadError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Erreur de chargement</h3>
              <p className="text-sm text-red-800 font-mono bg-red-100 rounded p-2 mb-3">{loadError}</p>
              <button onClick={fetchArtisans} className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* ── Guide ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" /> Comment valider un artisan
          </h3>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Cliquez sur <strong>«&nbsp;Voir le dossier&nbsp;»</strong> pour voir les détails complets</li>
            <li>Vérifiez les informations (nom, téléphone, catégorie, documents éventuels)</li>
            <li>Utilisez <strong>«&nbsp;Envoyer un message&nbsp;»</strong> pour demander des informations supplémentaires</li>
            <li>Cochez <strong>«&nbsp;Artisan de Biguglia ✓&nbsp;»</strong> puis cliquez sur <strong>«&nbsp;Approuver&nbsp;»</strong></li>
          </ol>
        </div>

        {/* ── Filtres ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par nom, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="sm:w-48">
            <option value="pending">En attente de validation</option>
            <option value="verified">Artisans vérifiés</option>
            <option value="all">Tous les dossiers</option>
          </Select>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-gray-700">
              {filter === 'pending' ? 'Aucun artisan en attente de validation' : 'Aucun résultat'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'pending' ? 'Toutes les demandes ont été traitées ✓' : 'Essayez un autre filtre ou une autre recherche.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(artisan => (
              <ArtisanCard
                key={artisan.id}
                artisan={artisan}
                onApprove={approveArtisan}
                onReject={rejectArtisan}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

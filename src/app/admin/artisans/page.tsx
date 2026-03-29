'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Eye, ChevronLeft, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ROLE_LABELS, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  created_at: string;
  profile?: Profile & { email: string };
  trade_category?: { name: string; icon: string };
}

export default function AdminArtisansPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [artisans, setArtisans] = useState<ArtisanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    if (!isAdmin()) { router.push('/'); return; }
    fetchArtisans();
  }, [profile, isAdmin, router, filter]);

  const fetchArtisans = async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('artisan_profiles')
      .select(`
        id, user_id, business_name, description, service_area, years_experience, siret, insurance, created_at,
        profile:profiles!artisan_profiles_user_id_fkey(id, full_name, email, avatar_url, role, status, created_at),
        trade_category:trade_categories(name, icon)
      `)
      .order('created_at', { ascending: true });

    if (filter === 'pending') {
      query = query.eq('profiles.role', 'artisan_pending');
    } else if (filter === 'verified') {
      query = query.eq('profiles.role', 'artisan_verified');
    }

    const { data } = await query;
    setArtisans((data as unknown as ArtisanEntry[]) || []);
    setLoading(false);
  };

  const approveArtisan = async (artisanUserId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'artisan_verified', status: 'active' })
      .eq('id', artisanUserId);

    if (error) { toast.error('Erreur lors de la validation'); return; }

    await supabase.from('notifications').insert({
      user_id: artisanUserId,
      type: 'artisan_approved',
      title: '✅ Profil artisan validé !',
      message: 'Votre profil artisan a été validé. Vous êtes maintenant visible sur la plateforme.',
      link: '/dashboard',
    });

    toast.success('Artisan validé et notifié !');
    fetchArtisans();
  };

  const rejectArtisan = async (artisanUserId: string) => {
    if (!confirm('Refuser cet artisan et le repasser en résident ?')) return;
    const supabase = createClient();

    await supabase.from('profiles').update({ role: 'resident', status: 'active' }).eq('id', artisanUserId);
    await supabase.from('artisan_profiles').delete().eq('user_id', artisanUserId);

    await supabase.from('notifications').insert({
      user_id: artisanUserId,
      type: 'artisan_rejected',
      title: 'Profil artisan refusé',
      message: 'Votre demande d\'inscription artisan n\'a pas été acceptée. Contactez-nous pour plus d\'informations.',
      link: '/aide',
    });

    toast.success('Artisan refusé');
    fetchArtisans();
  };

  const filtered = artisans.filter(a =>
    !search ||
    a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!profile || !isAdmin()) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des artisans</h1>
          <p className="text-gray-500 text-sm">Valider, refuser ou gérer les profils artisans</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="sm:w-48">
          <option value="pending">En attente</option>
          <option value="verified">Vérifiés</option>
          <option value="all">Tous</option>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-medium text-gray-600">Aucun artisan {filter === 'pending' ? 'en attente' : filter === 'verified' ? 'vérifié' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(artisan => (
            <div key={artisan.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar
                    src={artisan.profile?.avatar_url}
                    name={artisan.profile?.full_name || artisan.business_name}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{artisan.business_name}</span>
                      <Badge variant={artisan.profile?.role === 'artisan_verified' ? 'success' : 'warning'}>
                        {ROLE_LABELS[artisan.profile?.role || 'artisan_pending']}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {artisan.profile?.full_name} · {artisan.profile?.email}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                      <span>{artisan.trade_category?.icon} {artisan.trade_category?.name}</span>
                      <span>Zone : {artisan.service_area}</span>
                      {artisan.years_experience && <span>{artisan.years_experience} ans d&apos;exp.</span>}
                      {artisan.siret && <span>SIRET : {artisan.siret}</span>}
                      <span>Inscrit {formatRelative(artisan.created_at)}</span>
                    </div>
                    {artisan.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{artisan.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/artisans/${artisan.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </Button>
                  </Link>
                  {artisan.profile?.role === 'artisan_pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => rejectArtisan(artisan.user_id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveArtisan(artisan.user_id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Valider
                      </Button>
                    </>
                  )}
                  {artisan.profile?.role === 'artisan_verified' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => rejectArtisan(artisan.user_id)}
                    >
                      Révoquer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

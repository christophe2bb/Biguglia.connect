'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Star, MapPin, Shield, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ArtisanProfile, TradeCategory } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import StarRating from '@/components/ui/StarRating';
import { UserRatingBadge } from '@/components/ui/RatingWidget';

function ArtisansContent() {
  const searchParams = useSearchParams();
  const [artisans, setArtisans] = useState<ArtisanProfile[]>([]);
  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categorie') || '');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Catégories
      const { data: cats } = await supabase
        .from('trade_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      // Artisans vérifiés uniquement
      let query = supabase
        .from('artisan_profiles')
        .select(`
          *,
          profile:profiles!artisan_profiles_user_id_fkey(id, full_name, avatar_url, role),
          trade_category:trade_categories(*),
          gallery:artisan_photos(url, display_order),
          reviews(rating)
        `)
        .eq('profiles.role', 'artisan_verified');

      if (selectedCategory) {
        const cat = cats?.find(c => c.slug === selectedCategory);
        if (cat) query = query.eq('trade_category_id', cat.id);
      }

      const { data } = await query.order('is_featured', { ascending: false });

      // Calculer la note moyenne
      const enriched = (data || []).map(a => ({
        ...a,
        avg_rating: a.reviews?.length
          ? a.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / a.reviews.length
          : 0,
        review_count: a.reviews?.length || 0,
      }));

      setArtisans(enriched);
      setLoading(false);
    };

    fetchData();
  }, [selectedCategory]);

  const filtered = artisans.filter(a =>
    !search ||
    a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.trade_category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Artisans de Biguglia</h1>
        <p className="text-gray-500">Tous les artisans sont vérifiés et validés par notre équipe</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Rechercher un artisan, un métier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tous les métiers</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun artisan trouvé"
          description={
            search || selectedCategory
              ? "Essayez avec d'autres critères de recherche."
              : "Aucun artisan n'est encore inscrit sur la plateforme. Revenez bientôt !"
          }
          action={
            selectedCategory ? { label: 'Voir tous les artisans', onClick: () => setSelectedCategory('') } : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{filtered.length} artisan{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(artisan => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ArtisansPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-56" />
          ))}
        </div>
      </div>
    }>
      <ArtisansContent />
    </Suspense>
  );
}

function ArtisanCard({ artisan }: { artisan: ArtisanProfile & { avg_rating?: number; review_count?: number } }) {
  return (
    <Link href={`/artisans/${artisan.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden group">
        {/* Photo de galerie si disponible */}
        {artisan.gallery && artisan.gallery.length > 0 ? (
          <div className="h-40 bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artisan.gallery[0].url}
              alt={artisan.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-40 gradient-hero flex items-center justify-center">
            <span className="text-4xl">{artisan.trade_category?.icon || '🔧'}</span>
          </div>
        )}

        <div className="p-5">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {artisan.is_featured && (
              <Badge variant="warning">⭐ À la une</Badge>
            )}
            <Badge variant="success">
              <Shield className="w-3 h-3 mr-1" />
              Vérifié
            </Badge>
            {artisan.artisan_type === 'professionnel' ? (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                🏢 PRO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                👤 Particulier
              </span>
            )}
          </div>

          {/* Identité */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              src={artisan.profile?.avatar_url}
              name={artisan.business_name || artisan.profile?.full_name || '?'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                {artisan.business_name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{artisan.trade_category?.icon}</span>
                <span>{artisan.trade_category?.name}</span>
                {artisan.profile?.id && (
                  <UserRatingBadge userId={artisan.profile.id} className="ml-1" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {artisan.description || 'Artisan professionnel à votre service.'}
          </p>

          {/* Infos */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {artisan.service_area}
            </div>
            {artisan.years_experience && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {artisan.years_experience} ans d&apos;exp.
              </div>
            )}
          </div>

          {/* Note */}
          {artisan.review_count && artisan.review_count > 0 ? (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <StarRating rating={artisan.avg_rating || 0} />
              <span className="text-xs text-gray-500">
                {artisan.avg_rating?.toFixed(1)} ({artisan.review_count} avis)
              </span>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Pas encore d&apos;avis</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

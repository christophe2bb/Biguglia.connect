'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Listing, ListingCategory } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, CONDITION_LABELS, formatPrice, formatRelative } from '@/lib/utils';

export default function AnnoncesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: cats } = await supabase.from('listing_categories').select('*').order('display_order');
      setCategories(cats || []);

      let query = supabase
        .from('listings')
        .select('*, user:profiles!listings_user_id_fkey(id, full_name, avatar_url), category:listing_categories(*), photos:listing_photos(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        const cat = cats?.find(c => c.slug === selectedCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }
      if (selectedType) query = query.eq('listing_type', selectedType);

      const { data } = await query;
      setListings((data as Listing[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedCategory, selectedType]);

  const filtered = listings.filter(l =>
    !search ||
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Petites annonces</h1>
          <p className="text-gray-500">Achetez, vendez, échangez entre habitants de Biguglia</p>
        </div>
        {profile && (
          <Button onClick={() => router.push('/annonces/nouvelle')}>
            <Plus className="w-4 h-4" /> Publier
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Rechercher une annonce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="sm:w-44">
          <option value="">Tous les types</option>
          <option value="sale">À vendre</option>
          <option value="wanted">Recherché</option>
          <option value="free">Gratuit</option>
          <option value="service">Service</option>
        </Select>
        <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="sm:w-48">
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </Select>
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Aucune annonce pour le moment"
          description="Soyez le premier à publier une annonce sur Biguglia Connect !"
          action={profile ? { label: 'Publier une annonce', onClick: () => router.push('/annonces/nouvelle') } : { label: 'Créer un compte', onClick: () => router.push('/inscription') }}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{filtered.length} annonce{filtered.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const photos = listing.photos as Array<{ url: string }> | undefined;
  const typeColor = LISTING_TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';

  return (
    <Link href={`/annonces/${listing.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
        {/* Photo */}
        <div className="h-44 bg-gray-100 overflow-hidden relative">
          {photos && photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">{listing.category?.icon || '📦'}</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${typeColor}`}>
              {LISTING_TYPE_LABELS[listing.listing_type]}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-brand-600 transition-colors">
            {listing.title}
          </h3>
          <p className="text-sm text-gray-500 truncate mb-3">{listing.category?.name}</p>

          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-brand-700">
              {listing.listing_type === 'free' ? 'Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix à discuter'}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(listing.created_at)}</span>
          </div>

          {listing.condition && (
            <p className="text-xs text-gray-400 mt-2">{CONDITION_LABELS[listing.condition]}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

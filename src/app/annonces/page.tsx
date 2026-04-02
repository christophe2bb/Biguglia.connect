'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Users } from 'lucide-react';
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
import StatusBadge from '@/components/ui/StatusBadge';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, CONDITION_LABELS, formatPrice, formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';

export default function AnnoncesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: cats } = await supabase.from('listing_categories').select('*').order('display_order');
      setCategories(cats || []);

      let query = supabase
        .from('listings')
        .select('*, category:listing_categories(*), photos:listing_photos(*)');

      if (selectedStatus === 'active') query = query.eq('status', 'active');
      else if (selectedStatus === 'reserved') query = query.eq('status', 'reserved').neq('status', 'archived');
      else if (selectedStatus === 'sold') query = query.eq('status', 'sold');
      else query = query.neq('status', 'archived');

      if (selectedCategory) {
        const cat = cats?.find(c => c.slug === selectedCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }
      if (selectedType) query = query.eq('listing_type', selectedType);

      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data } = await query;
      setListings((data as Listing[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedCategory, selectedType, selectedStatus, sortBy]);

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
        <div className="flex items-center gap-2">
          <Link
            href="/communaute/annonces"
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-sm font-semibold hover:bg-violet-100 transition"
          >
            <Users className="w-4 h-4" /> Communauté
          </Link>
          {profile && (
            <Button onClick={() => router.push('/annonces/nouvelle')}>
              <Plus className="w-4 h-4" /> Publier
            </Button>
          )}
        </div>
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
        <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="sm:w-44">
          <option value="active">⚡ Disponibles</option>
          <option value="reserved">🔒 Réservées</option>
          <option value="sold">✅ Vendues</option>
          <option value="all">Toutes</option>
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sm:w-44">
          <option value="recent">🕐 Plus récentes</option>
          <option value="price_asc">💶 Prix croissant</option>
          <option value="price_desc">💶 Prix décroissant</option>
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
              <ListingCard key={listing.id} listing={listing} currentUserId={profile?.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ListingCard({ listing, currentUserId }: { listing: Listing; currentUserId?: string }) {
  const photos = listing.photos as Array<{ url: string }> | undefined;
  const typeColor = LISTING_TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';

  return (
    <Link href={`/annonces/${listing.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
        {/* ── Zone photo — hauteur fixe 44 ── */}
        <div className="relative h-44 overflow-hidden">
          {photos && photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-6xl opacity-25">{listing.category?.icon || '📦'}</span>
            </div>
          )}
          {/* Overlay gradient bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Badge type haut gauche */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-full shadow ${typeColor}`}>
              {LISTING_TYPE_LABELS[listing.listing_type]}
            </span>
            {listing.status !== 'active' && (
              <StatusBadge status={listing.status} contentType="listing" size="xs" showIcon />
            )}
          </div>
          {/* Prix haut droite */}
          <div className="absolute top-3 right-3">
            <span className="text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
              {listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix libre'}
            </span>
          </div>
          {/* Titre en bas */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{listing.title}</p>
            {listing.category?.name && <p className="text-white/75 text-xs mt-0.5">{listing.category.name}</p>}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-brand-700">
              {listing.listing_type === 'free' ? 'Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix à discuter'}
            </span>
              <span className="text-xs text-gray-400">{formatRelative(listing.created_at)}</span>
            {currentUserId && currentUserId !== (listing as Listing & { author_id?: string }).author_id && (
              <ReportButton targetType="listing" targetId={listing.id} targetTitle={listing.title} variant="icon" />
            )}
          </div>

          {listing.condition && (
            <p className="text-xs text-gray-400 mt-2">{CONDITION_LABELS[listing.condition]}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

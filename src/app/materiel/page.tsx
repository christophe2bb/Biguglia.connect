'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EquipmentItem, EquipmentCategory } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import { CONDITION_LABELS, formatPrice } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';

export default function MaterielPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: cats } = await supabase.from('equipment_categories').select('*').order('display_order');
      setCategories(cats || []);

      let query = supabase
        .from('equipment_items')
        .select('*, owner:profiles!equipment_items_owner_id_fkey(id, full_name, avatar_url), category:equipment_categories(*), photos:equipment_photos(*)')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        const cat = cats?.find(c => c.slug === selectedCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }

      const { data } = await query;
      setItems((data as EquipmentItem[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedCategory]);

  const filtered = items.filter(i =>
    !search ||
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prêt de matériel</h1>
          <p className="text-gray-500">Empruntez du matériel entre voisins à Biguglia</p>
        </div>
        {profile && (
          <Button onClick={() => router.push('/materiel/nouveau')}>
            <Plus className="w-4 h-4" /> Proposer du matériel
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-8">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Le prêt de matériel se fait entre particuliers. La plateforme facilite la mise en relation. Lisez les{' '}
          <Link href="/confiance" className="underline">règles de confiance et sécurité</Link> avant d&apos;emprunter.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1">
          <Input placeholder="Rechercher du matériel..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="sm:w-56">
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-5"><div className="h-4 bg-gray-200 rounded mb-3" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔧" title="Aucun matériel disponible" description="Soyez le premier à proposer du matériel à emprunter !"
          action={profile ? { label: 'Proposer du matériel', onClick: () => router.push('/materiel/nouveau') } : { label: 'S\'inscrire', onClick: () => router.push('/inscription') }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => <EquipmentCard key={item.id} item={item} currentUserId={profile?.id} />)}
        </div>
      )}
    </div>
  );
}

function EquipmentCard({ item, currentUserId }: { item: EquipmentItem; currentUserId?: string }) {
  const photos = item.photos as Array<{ url: string }> | undefined;
  return (
    <Link href={`/materiel/${item.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
        {/* ── Zone photo — hauteur fixe 44 ── */}
        <div className="relative h-44 overflow-hidden">
          {photos && photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
              <span className="text-6xl opacity-20">{item.category?.icon || '🔧'}</span>
            </div>
          )}
          {/* Overlay gradient bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Badges haut gauche */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {item.category && (
              <span className="text-xs font-black bg-white/90 text-teal-700 px-2.5 py-1 rounded-full shadow">
                {item.category.icon} {item.category.name}
              </span>
            )}
            {item.is_free && (
              <span className="text-xs font-black bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow">Gratuit</span>
            )}
          </div>
          {/* Tarif haut droite */}
          {!item.is_free && (
            <span className="absolute top-3 right-3 text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
              {item.daily_rate ? `${item.daily_rate}€/j` : 'Prix libre'}
            </span>
          )}
          {/* Titre + auteur en bas */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar src={item.owner?.avatar_url} name={item.owner?.full_name || '?'} size="xs" />
              <span className="text-xs text-gray-500">{item.owner?.full_name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-brand-700">
                {item.is_free ? 'Gratuit' : item.daily_rate ? `${item.daily_rate}€/j` : 'Prix libre'}
              </div>
              <div className="text-xs text-gray-400">{CONDITION_LABELS[item.condition]}</div>
            </div>
            {currentUserId && currentUserId !== (item as EquipmentItem & { owner_id?: string }).owner_id && (
              <ReportButton targetType="equipment" targetId={item.id} targetTitle={item.title} variant="icon" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

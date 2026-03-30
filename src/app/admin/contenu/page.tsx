'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Package, MessageSquare, Wrench, Star,
  Trash2, Eye, EyeOff, Search, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, FileText, Flag, Filter, Clock,
  ShoppingBag, HardHat, ThumbsDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { formatDate, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContentListing {
  id: string;
  title: string;
  description: string;
  status: string;
  condition: string;
  is_free: boolean;
  price?: number;
  created_at: string;
  updated_at: string;
  owner?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
  _photo_count?: number;
}

interface ContentForumPost {
  id: string;
  title: string;
  content: string;
  is_closed: boolean;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  author?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
  _comment_count?: number;
}

interface ContentEquipment {
  id: string;
  title: string;
  description: string;
  is_available: boolean;
  borrow_count: number;
  condition: string;
  created_at: string;
  owner?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
}

interface ContentReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { id: string; full_name: string; email: string; avatar_url: string };
  artisan?: { id: string; business_name: string };
}

type TabId = 'listings' | 'forum' | 'equipment' | 'reviews';

// ─── Composants utilitaires ──────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{rating}/5</span>
    </div>
  );
}

function ConfirmModal({
  open, title, message, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Confirmer la suppression</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Annonces ─────────────────────────────────────────────────────────

function ListingsTab() {
  const [items, setItems] = useState<ContentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('listings')
      .select(`
        id, title, description, status, condition, is_free, price, created_at, updated_at,
        owner:profiles!listings_owner_id_fkey(id, full_name, email, avatar_url),
        category:listing_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentListing[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(l => l.id !== id));
    toast.success('Annonce supprimée');
    setConfirm(null);
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const supabase = createClient();
    const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    toast.success(newStatus === 'active' ? 'Annonce réactivée' : 'Annonce désactivée');
  };

  const filtered = items.filter(l =>
    (!statusFilter || l.status === statusFilter) &&
    (!search || l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'annonce"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.title}" ?`}
        onConfirm={() => confirm && deleteItem(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input placeholder="Rechercher titre, auteur..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="inactive">Désactivées</option>
          <option value="sold">Vendues / Données</option>
        </select>
        <button onClick={fetchListings} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Actualiser">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3"><span className="font-semibold">{filtered.length}</span> annonce{filtered.length !== 1 ? 's' : ''}</p>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">Aucune annonce trouvée</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${item.status !== 'active' ? 'opacity-60' : ''}`}>
              <Avatar src={item.owner?.avatar_url} name={item.owner?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm truncate">{item.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'sold' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
                    {item.status === 'active' ? 'Active' : item.status === 'sold' ? 'Vendue' : 'Inactive'}
                  </span>
                  {item.category && <span className="text-xs text-gray-400">{item.category.icon} {item.category.name}</span>}
                  <span className="text-xs text-gray-400">{item.is_free ? '🎁 Gratuit' : item.price ? `${item.price} €` : ''}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Par <span className="font-medium">{item.owner?.full_name || item.owner?.email}</span>
                  {' · '}{formatRelative(item.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleStatus(item.id, item.status)}
                  className={`p-1.5 rounded-lg transition-colors ${item.status === 'active' ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                  title={item.status === 'active' ? 'Désactiver' : 'Réactiver'}
                >
                  {item.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setConfirm({ id: item.id, title: item.title })}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Forum ─────────────────────────────────────────────────────────────

function ForumTab() {
  const [items, setItems] = useState<ContentForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [closedFilter, setClosedFilter] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('forum_posts')
      .select(`
        id, title, content, is_closed, is_pinned, view_count, created_at,
        author:profiles!forum_posts_author_id_fkey(id, full_name, email, avatar_url),
        category:forum_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentForumPost[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(p => p.id !== id));
    toast.success('Post forum supprimé');
    setConfirm(null);
  };

  const toggleClosed = async (id: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('forum_posts').update({ is_closed: !current }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.map(p => p.id === id ? { ...p, is_closed: !current } : p));
    toast.success(current ? 'Post réouvert' : 'Post fermé');
  };

  const togglePinned = async (id: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('forum_posts').update({ is_pinned: !current }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.map(p => p.id === id ? { ...p, is_pinned: !current } : p));
    toast.success(current ? 'Post désépinglé' : 'Post épinglé');
  };

  const filtered = items.filter(p =>
    (closedFilter === '' || (closedFilter === 'open' ? !p.is_closed : p.is_closed)) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer le post"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.title}" et tous ses commentaires ?`}
        onConfirm={() => confirm && deleteItem(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input placeholder="Rechercher titre, auteur..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select value={closedFilter} onChange={e => setClosedFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tous</option>
          <option value="open">Ouverts</option>
          <option value="closed">Fermés</option>
        </select>
        <button onClick={fetchPosts} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Actualiser">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3"><span className="font-semibold">{filtered.length}</span> post{filtered.length !== 1 ? 's' : ''}</p>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">Aucun post trouvé</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(post => (
            <div key={post.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${post.is_closed ? 'opacity-70' : ''}`}>
              <Avatar src={post.author?.avatar_url} name={post.author?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {post.is_pinned && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">📌 Épinglé</span>}
                  <span className="font-semibold text-gray-900 text-sm truncate">{post.title}</span>
                  {post.is_closed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Fermé</span>}
                  {post.category && <span className="text-xs text-gray-400">{post.category.icon} {post.category.name}</span>}
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count || 0} vues</span>
                </div>
                <div className="text-xs text-gray-500">
                  Par <span className="font-medium">{post.author?.full_name || post.author?.email}</span>
                  {' · '}{formatRelative(post.created_at)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{post.content}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => togglePinned(post.id, post.is_pinned)}
                  className={`p-1.5 rounded-lg transition-colors ${post.is_pinned ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  title={post.is_pinned ? 'Désépingler' : 'Épingler'}
                >
                  📌
                </button>
                <button
                  onClick={() => toggleClosed(post.id, post.is_closed)}
                  className={`p-1.5 rounded-lg transition-colors ${post.is_closed ? 'hover:bg-green-50 text-green-600' : 'hover:bg-amber-50 text-amber-600'}`}
                  title={post.is_closed ? 'Rouvrir' : 'Fermer'}
                >
                  {post.is_closed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setConfirm({ id: post.id, title: post.title })}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Équipements ──────────────────────────────────────────────────────

function EquipmentTab() {
  const [items, setItems] = useState<ContentEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('equipment_items')
      .select(`
        id, title, description, is_available, borrow_count, condition, created_at,
        owner:profiles!equipment_items_owner_id_fkey(id, full_name, email, avatar_url),
        category:equipment_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentEquipment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('equipment_items').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(e => e.id !== id));
    toast.success('Équipement supprimé');
    setConfirm(null);
  };

  const toggleAvail = async (id: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('equipment_items').update({ is_available: !current }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.map(e => e.id === id ? { ...e, is_available: !current } : e));
    toast.success(!current ? 'Équipement marqué disponible' : 'Équipement marqué indisponible');
  };

  const filtered = items.filter(e =>
    (availFilter === '' || (availFilter === 'available' ? e.is_available : !e.is_available)) &&
    (!search || e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.owner?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'équipement"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.title}" ?`}
        onConfirm={() => confirm && deleteItem(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input placeholder="Rechercher titre, propriétaire..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tous</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">Indisponibles</option>
        </select>
        <button onClick={fetchEquipment} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Actualiser">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3"><span className="font-semibold">{filtered.length}</span> équipement{filtered.length !== 1 ? 's' : ''}</p>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">Aucun équipement trouvé</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(equip => (
            <div key={equip.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${!equip.is_available ? 'opacity-70' : ''}`}>
              <Avatar src={equip.owner?.avatar_url} name={equip.owner?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm truncate">{equip.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${equip.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {equip.is_available ? 'Disponible' : 'Indisponible'}
                  </span>
                  {equip.category && <span className="text-xs text-gray-400">{equip.category.icon} {equip.category.name}</span>}
                  {equip.borrow_count > 0 && <span className="text-xs text-indigo-600 font-medium">{equip.borrow_count} prêt{equip.borrow_count > 1 ? 's' : ''}</span>}
                </div>
                <div className="text-xs text-gray-500">
                  Par <span className="font-medium">{equip.owner?.full_name || equip.owner?.email}</span>
                  {' · '}{formatRelative(equip.created_at)}
                  {equip.condition && <span className="text-gray-400"> · État : {equip.condition}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleAvail(equip.id, equip.is_available)}
                  className={`p-1.5 rounded-lg transition-colors ${equip.is_available ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                  title={equip.is_available ? 'Marquer indisponible' : 'Marquer disponible'}
                >
                  {equip.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setConfirm({ id: equip.id, title: equip.title })}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Avis ──────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [items, setItems] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; comment: string } | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email, avatar_url),
        artisan:artisan_profiles!reviews_artisan_id_fkey(id, business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentReview[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(r => r.id !== id));
    toast.success('Avis supprimé');
    setConfirm(null);
  };

  const filtered = items.filter(r =>
    (!ratingFilter || r.rating === parseInt(ratingFilter)) &&
    (!search ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.artisan?.business_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'avis"
        message={`Supprimer définitivement cet avis : "${confirm?.comment?.slice(0, 80)}..." ?`}
        onConfirm={() => confirm && deleteItem(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input placeholder="Rechercher commentaire, auteur, artisan..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Toutes notes</option>
          <option value="1">⭐ 1/5</option>
          <option value="2">⭐⭐ 2/5</option>
          <option value="3">⭐⭐⭐ 3/5</option>
          <option value="4">⭐⭐⭐⭐ 4/5</option>
          <option value="5">⭐⭐⭐⭐⭐ 5/5</option>
        </select>
        <button onClick={fetchReviews} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Actualiser">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3"><span className="font-semibold">{filtered.length}</span> avis</p>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">Aucun avis trouvé</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(review => (
            <div key={review.id} className="bg-white border rounded-xl p-4 flex items-start gap-4">
              <Avatar src={review.reviewer?.avatar_url} name={review.reviewer?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StarRating rating={review.rating} />
                  {review.artisan && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <HardHat className="w-3 h-3" />
                      {review.artisan.business_name}
                    </span>
                  )}
                  {review.rating <= 2 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><ThumbsDown className="w-3 h-3" />Mauvaise note</span>}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-0.5">{review.comment}</p>
                <div className="text-xs text-gray-500">
                  Par <span className="font-medium">{review.reviewer?.full_name || review.reviewer?.email}</span>
                  {' · '}{formatRelative(review.created_at)}
                </div>
              </div>
              <button
                onClick={() => setConfirm({ id: review.id, comment: review.comment || '' })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex-shrink-0"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'listings',  label: 'Annonces',     icon: ShoppingBag },
  { id: 'forum',     label: 'Forum',        icon: FileText    },
  { id: 'equipment', label: 'Équipements',  icon: Package     },
  { id: 'reviews',   label: 'Avis',         icon: Star        },
];

export default function AdminContenuPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('listings');
  const [counts, setCounts] = useState<Record<TabId, number>>({ listings: 0, forum: 0, equipment: 0, reviews: 0 });

  useEffect(() => {
    if (!profile) return;
    if (!isAdmin()) { router.push('/'); return; }

    // Récupérer les compteurs
    const supabase = createClient();
    Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
      supabase.from('equipment_items').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
    ]).then(([l, f, e, r]) => {
      setCounts({
        listings: l.count || 0,
        forum: f.count || 0,
        equipment: e.count || 0,
        reviews: r.count || 0,
      });
    });
  }, [profile, isAdmin, router]);

  if (!profile || !isAdmin()) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6 text-brand-600" /> Gestion du contenu
          </h1>
          <p className="text-sm text-gray-500">
            Modérer les annonces, posts forum, équipements et avis · Pouvoirs complets
          </p>
        </div>
      </div>

      {/* Résumé des compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Annonces', count: counts.listings, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Posts forum', count: counts.forum, icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Équipements', count: counts.equipment, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Avis clients', count: counts.reviews, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`inline-flex p-2 rounded-xl ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <div>
              <div className="text-lg font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? 'bg-gray-100 text-gray-600' : 'bg-white/60 text-gray-500'
                }`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      {activeTab === 'listings'  && <ListingsTab />}
      {activeTab === 'forum'     && <ForumTab />}
      {activeTab === 'equipment' && <EquipmentTab />}
      {activeTab === 'reviews'   && <ReviewsTab />}
    </div>
  );
}

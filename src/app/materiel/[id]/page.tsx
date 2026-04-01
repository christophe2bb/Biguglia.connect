'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Calendar, MessageSquare, Flag, Shield, Clock, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { EquipmentItem } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CONDITION_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import RatingWidget from '@/components/ui/RatingWidget';
import ExchangePrompt from '@/components/ui/ExchangePrompt';
import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';

export default function MaterielDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [borrowForm, setBorrowForm] = useState({ start_date: '', end_date: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      const supabase = createClient();
      // Récupérer sans JOIN cassé
      const { data, error } = await supabase
        .from('equipment_items')
        .select('*, category:equipment_categories(*), photos:equipment_photos(id, url, display_order)')
        .eq('id', id as string)
        .single();

      if (error || !data) { toast.error('Matériel introuvable'); router.push('/materiel'); return; }

      // Profil du propriétaire séparément
      let ownerData = null;
      if (data.owner_id) {
        const { data: op } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', data.owner_id).single();
        ownerData = op;
      }

      const photos = (data.photos || []) as Array<{ id: string; url: string; display_order: number }>;
      photos.sort((a, b) => a.display_order - b.display_order);

      setItem({ ...data, owner: ownerData, photos } as unknown as EquipmentItem);
      setLoading(false);
    };
    fetchItem();
  }, [id, router]);

  const handleBorrowRequest = async () => {
    if (!profile) { router.push('/connexion?redirect=/materiel/' + id); return; }
    if (!borrowForm.start_date || !borrowForm.end_date) { toast.error('Sélectionnez les dates'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('borrow_requests').insert({
      item_id: id as string, borrower_id: profile.id,
      start_date: borrowForm.start_date, end_date: borrowForm.end_date,
      message: borrowForm.message, status: 'pending',
    });
    if (error) toast.error('Erreur lors de la demande');
    else { toast.success('Demande envoyée ! Le propriétaire sera notifié.'); setBorrowForm({ start_date: '', end_date: '', message: '' }); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!item || !profile) return;
    if (!window.confirm('Supprimer définitivement ce matériel ?')) return;
    setDeleting(true);
    const supabase = createClient();
    const photos = item.photos as Array<{ id: string; url: string }> | undefined;
    if (photos?.length) {
      for (const photo of photos) {
        const parts = photo.url.split('/storage/v1/object/public/photos/');
        if (parts[1]) await supabase.storage.from('photos').remove([parts[1]]);
      }
      await supabase.from('equipment_photos').delete().eq('item_id', item.id);
    }
    const { error } = await supabase.from('equipment_items').delete().eq('id', item.id);
    if (error) { toast.error('Erreur lors de la suppression'); setDeleting(false); return; }
    toast.success('Matériel supprimé');
    router.push('/materiel');
  };

  const handleReport = async () => {
    if (!profile) { toast.error('Connexion requise'); return; }
    const reason = prompt('Motif du signalement :');
    if (!reason) return;
    const supabase = createClient();
    await supabase.from('reports').insert({ reporter_id: profile.id, target_type: 'equipment', target_id: id as string, reason, status: 'pending' });
    toast.success('Signalement envoyé');
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-64 bg-gray-200 rounded-2xl" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
    </div>
  );
  if (!item) return null;

  const rawPhotos = item.photos as Array<{ id: string; url: string; display_order?: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const isOwner = profile?.id === item.owner_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/materiel" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au matériel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {photos.length > 0 ? (
            <div className="mb-6">
              <PhotoGallery photos={photos} title={item.title} mainHeight="h-72" />
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-5xl">{item.category?.icon || '🔧'}</span>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {item.is_free ? <Badge variant="success">Gratuit</Badge> : <Badge variant="default">{item.daily_rate}€/jour</Badge>}
              <Badge variant={item.is_available ? 'success' : 'danger'}>{item.is_available ? 'Disponible' : 'Indisponible'}</Badge>
              {item.category && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{item.category.icon} {item.category.name}</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{item.pickup_location}</div>
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(item.created_at)}</div>
              {item.condition && <span>{CONDITION_LABELS[item.condition]}</span>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {item.rules && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-amber-800 mb-1">📋 Règles d&apos;utilisation</h3>
              <p className="text-sm text-amber-700">{item.rules}</p>
            </div>
          )}
          {item.deposit_amount && item.deposit_amount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Caution : {item.deposit_amount}€ (remboursable)</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Proposé par</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={(item.owner as { avatar_url?: string })?.avatar_url} name={(item.owner as { full_name?: string })?.full_name || '?'} size="md" />
              <div>
                <div className="font-medium text-gray-900">{(item.owner as { full_name?: string })?.full_name || 'Habitant'}</div>
                <div className="text-xs text-gray-400">Habitant de Biguglia</div>
              </div>
            </div>

            {isOwner && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-xs text-center text-brand-600 font-medium py-1 bg-brand-50 rounded-xl">✅ C&apos;est votre matériel</div>
                <Link href={`/materiel/${id}/modifier`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">
                  <Pencil className="w-4 h-4" /> Modifier
                </Link>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />{deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            )}
          </div>

          {!isOwner && item.is_available && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Demander à emprunter</h3>
              <div className="space-y-3">
                <Input label="Date de début" type="date" value={borrowForm.start_date}
                  onChange={(e) => setBorrowForm(f => ({ ...f, start_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]} />
                <Input label="Date de fin" type="date" value={borrowForm.end_date}
                  onChange={(e) => setBorrowForm(f => ({ ...f, end_date: e.target.value }))}
                  min={borrowForm.start_date || new Date().toISOString().split('T')[0]} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                  <textarea value={borrowForm.message} onChange={(e) => setBorrowForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Précisez votre usage..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <Button onClick={handleBorrowRequest} loading={submitting} className="w-full">
                  <MessageSquare className="w-4 h-4" /> Envoyer la demande
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation d'échange → débloque l'avis */}
          <ExchangePrompt
            targetType="equipment"
            targetId={item.id}
            authorId={item.owner_id}
            userId={profile?.id}
          />

          {/* Notation (visible seulement après échange confirmé) */}
          <RatingWidget
            targetType="equipment"
            targetId={item.id}
            authorId={item.owner_id}
            userId={profile?.id}
            showPoll
          />

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-blue-600" /><h4 className="text-sm font-medium text-blue-800">Conseils de prêt</h4></div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Vérifiez l&apos;état avant de prendre</li>
              <li>• Respectez les règles d&apos;utilisation</li>
              <li>• Rendez le matériel en bon état</li>
              <li>• Signalez tout problème immédiatement</li>
            </ul>
          </div>

          <button onClick={handleReport} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <Flag className="w-3.5 h-3.5" /> Signaler
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Calendar, MessageSquare, Flag, Tag, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Listing } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, STATUS_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';

export default function AnnonceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      const supabase = createClient();
      
      // Fetch listing without problematic JOIN on profiles
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          category:listing_categories(*),
          photos:listing_photos(id, url, display_order)
        `)
        .eq('id', id as string)
        .single();

      if (error || !data) {
        console.error('Listing fetch error:', error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch user profile separately
      let userData = null;
      if (data.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', data.user_id)
          .single();
        userData = userProfile;
      }

      // Sort photos
      if (data.photos) {
        data.photos.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
      }

      setListing({ ...data, user: userData } as unknown as Listing);
      setLoading(false);
    };

    fetchListing();
  }, [id]);

  const handleContact = async () => {
    if (!profile) {
      router.push('/connexion?redirect=/annonces/' + id);
      return;
    }
    if (!listing) return;

    // Don't contact yourself
    if (profile.id === listing.user_id) {
      toast.error('Vous ne pouvez pas vous contacter vous-même');
      return;
    }

    const supabase = createClient();

    // Check if a conversation already exists for this listing with the current user
    // Use maybeSingle() to avoid crash when no row found
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', profile.id);

    if (myParticipations && myParticipations.length > 0) {
      const myConvIds = myParticipations.map((p: { conversation_id: string }) => p.conversation_id);
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('related_type', 'listing')
        .eq('related_id', listing.id)
        .in('id', myConvIds)
        .maybeSingle();

      if (existing) {
        router.push(`/messages/${existing.id}`);
        return;
      }
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        subject: listing.title,
        related_type: 'listing',
        related_id: listing.id,
      })
      .select()
      .single();

    if (convError || !conv) {
      console.error('Conversation error:', convError);
      toast.error('Erreur lors de la création de la conversation');
      return;
    }

    // Ajouter les participants (ON CONFLICT DO NOTHING pour éviter les doublons)
    const participants = profile.id === listing.user_id
      ? [{ conversation_id: conv.id, user_id: profile.id }]
      : [
          { conversation_id: conv.id, user_id: profile.id },
          { conversation_id: conv.id, user_id: listing.user_id },
        ];

    const { error: partError } = await supabase
      .from('conversation_participants')
      .upsert(participants, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });

    if (partError) {
      console.error('Participants error:', partError);
      // On continue quand même — la conversation existe, on peut y aller
    }

    router.push(`/messages/${conv.id}`);
  };

  const handleDelete = async () => {
    if (!listing || !profile) return;
    if (!window.confirm('Supprimer définitivement cette annonce ? Cette action est irréversible.')) return;

    setDeleting(true);
    const supabase = createClient();

    // Supprimer les photos du storage
    const photos = listing.photos as Array<{ id: string; url: string }> | undefined;
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        // Extraire le path depuis l'URL publique
        const urlParts = photo.url.split('/storage/v1/object/public/photos/');
        if (urlParts[1]) {
          await supabase.storage.from('photos').remove([urlParts[1]]);
        }
      }
      // Supprimer les entrées listing_photos
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);
    }

    // Supprimer l'annonce
    const { error } = await supabase.from('listings').delete().eq('id', listing.id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
      return;
    }

    toast.success('Annonce supprimée');
    router.push('/annonces');
  };

  const handleReport = async () => {
    if (!profile) {
      toast.error('Vous devez être connecté pour signaler');
      return;
    }
    const reason = prompt('Motif du signalement :');
    if (!reason) return;

    const supabase = createClient();
    await supabase.from('reports').insert({
      reporter_id: profile.id,
      target_type: 'listing',
      target_id: id as string,
      reason,
      status: 'pending',
    });
    toast.success("Signalement envoyé à l'équipe de modération");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce introuvable</h1>
        <p className="text-gray-500 mb-6">Cette annonce n&apos;existe pas ou a été supprimée.</p>
        <Link
          href="/annonces"
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl hover:bg-brand-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux annonces
        </Link>
      </div>
    );
  }

  const rawPhotos = listing.photos as Array<{ id: string; url: string; display_order: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const isOwner = profile?.id === listing.user_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link href="/annonces" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Retour aux annonces
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Photos — visionneuse universelle */}
          {photos.length > 0 ? (
            <div className="mb-6">
              <PhotoGallery photos={photos} title={listing.title} mainHeight="h-72" />
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-4xl">{listing.category?.icon || '📦'}</span>
            </div>
          )}

          {/* Title & badges */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LISTING_TYPE_COLORS[listing.listing_type]}`}>
                {LISTING_TYPE_LABELS[listing.listing_type]}
              </span>
              <Badge variant={listing.status === 'active' ? 'success' : 'default'}>
                {STATUS_LABELS[listing.status]}
              </Badge>
              {listing.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {listing.category.icon} {listing.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>

            {listing.price !== undefined && listing.price !== null && (
              <div className="text-3xl font-bold text-brand-600 mb-2">
                {listing.price === 0 ? 'Gratuit' : `${listing.price.toLocaleString('fr-FR')} €`}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(listing.created_at)}
              </div>
              {listing.condition && (
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {listing.condition === 'neuf' ? 'Neuf' : listing.condition === 'tres_bon' ? 'Très bon état' : 'Bon état'}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Vendeur */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Publié par</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                src={(listing.user as { avatar_url?: string })?.avatar_url}
                name={(listing.user as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              <div>
                <div className="font-medium text-gray-900">
                  {(listing.user as { full_name?: string })?.full_name || 'Anonyme'}
                </div>
                <div className="text-xs text-gray-400">Membre Biguglia Connect</div>
              </div>
            </div>

            {!isOwner && listing.status === 'active' && (
              <Button onClick={handleContact} className="w-full mb-3">
                <MessageSquare className="w-4 h-4" />
                Contacter
              </Button>
            )}

            {isOwner && (
              <div className="space-y-2">
                <div className="text-xs text-center text-brand-600 font-medium py-1.5 bg-brand-50 rounded-xl">
                  ✅ C&apos;est votre annonce
                </div>
                <Link
                  href={`/annonces/${listing.id}/modifier`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier l&apos;annonce
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Suppression...' : 'Supprimer l\'annonce'}
                </button>
              </div>
            )}

            <button
              onClick={handleReport}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto mt-3"
            >
              <Flag className="w-3.5 h-3.5" />
              Signaler cette annonce
            </button>
          </div>

          {/* Notation */}
          <RatingWidget
            targetType="listing"
            targetId={listing.id}
            authorId={listing.user_id}
            userId={profile?.id}
            showPoll
          />

          {/* Sécurité */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🔒 Conseils de sécurité</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Rencontrez-vous dans un lieu public</li>
              <li>• Vérifiez le produit avant de payer</li>
              <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
              <li>• Utilisez la messagerie de la plateforme</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

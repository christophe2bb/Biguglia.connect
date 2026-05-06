'use client';
/**
 * AnnonceActions — Client Component (interactions uniquement)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité : tout ce qui nécessite le navigateur ou l'état auth
 *   • favoris (localStorage)
 *   • partage (navigator.share / clipboard)
 *   • suppression + changement de statut (owner)
 *   • signalement (visiteurs authentifiés)
 *   • mobile sticky bar
 *
 * Utilisé 3× dans page.tsx via la prop `variant` :
 *   'topbar'      → boutons favoris + partage (barre sticky du haut)
 *   'owner-panel' → panel de gestion propriétaire dans la sidebar
 *   'report'      → bouton signalement (visiteurs)
 *   'mobile-bar'  → barre fixe mobile
 *
 * Le rendu HTML principal (titre, description, photos…) est fait côté serveur.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart, Share2, Copy, MessageCircle, Pencil, Trash2,
  AlertTriangle, Phone, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Modal from '@/components/ui/Modal';
import StatusManager from '@/components/ui/StatusManager';
import ContactButton from '@/components/ui/ContactButton';
import toast from 'react-hot-toast';
import type { ExtListing, ShareMethod } from '../_types';
import { safeStoragePath } from '@/lib/upload-utils';

const LS_KEY = 'annonces_favorites';

type Variant = 'topbar' | 'owner-panel' | 'report' | 'mobile-bar';

interface Props {
  listing: ExtListing;
  variant?: Variant;
}

// ── Dialog confirmation suppression ──────────────────────────────────────────
function DeleteConfirmDialog({
  isOpen, title, deleting, onConfirm, onCancel,
}: {
  isOpen: boolean;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">
          Supprimer cette annonce ?
        </h3>
        <p className="text-sm text-gray-500 mb-1 font-medium truncate px-2">« {title} »</p>
        <p className="text-sm text-gray-400 mb-6">
          Cette action est irréversible. L&apos;annonce et toutes ses photos seront définitivement supprimées.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</>
              : <><Trash2 className="w-4 h-4" /> Supprimer</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AnnonceActions({ listing, variant = 'topbar' }: Props) {
  const router = useRouter();
  const { profile, userId, phase } = useAuthStore();
  // Stable Supabase client — une seule instance au montage (pas de re-création par render)
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [isSaved,           setIsSaved]           = useState(false);
  const [showSharePanel,    setShowSharePanel]    = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [currentStatus,     setCurrentStatus]     = useState((listing.status as string) || 'active');
  // Dialog suppression (remplace window.confirm() bloquant)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // authReady : true dès que Zustand a résolu INITIAL_SESSION (authenticated ou unauthenticated)
  const authReady = phase !== 'initializing';
  const isOwner   = authReady && !!profile && profile.id === listing.user_id;

  // ── Load saved state from localStorage ────────────────────────────────────
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
      setIsSaved(list.includes(listing.id));
    } catch { /* ignore */ }
  }, [listing.id]);

  // ── toggleSave ─────────────────────────────────────────────────────────────
  const toggleSave = useCallback(() => {
    setIsSaved(prev => {
      const next = !prev;
      try {
        const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const updated = next ? [...list, listing.id] : list.filter(s => s !== listing.id);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      toast(next ? 'Annonce sauvegardée en favoris !' : 'Retirée des favoris', {
        icon: next ? '❤️' : '💔',
      });
      return next;
    });
  }, [listing.id]);

  // ── handleShare ────────────────────────────────────────────────────────────
  const handleShare = useCallback(async (method: ShareMethod) => {
    const shareUrl = window.location.href; // nosec — read-only current URL
    if (method === 'native' && navigator.share) {
      await navigator.share({ title: listing.title, url: shareUrl });
      return;
    }
    if (method === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(`${listing.title} — ${shareUrl}`)}`);
      return;
    }
    if (method === 'email') {
      window.open(
        `mailto:?subject=${encodeURIComponent(listing.title || 'Annonce')}&body=${encodeURIComponent(
          `Bonjour,\n\nJe t'envoie cette annonce sur Biguglia Connect :\n${listing.title}\n${shareUrl}`,
        )}`,
      );
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
    setShowSharePanel(false);
  }, [listing.title]);

  // ── handleDelete ───────────────────────────────────────────────────────────
  // ⚠️ Appelé après confirmation dans le dialog React.
  // Pas de confirm() ni getSession() — userId vient de Zustand (0ms, synchrone).
  const handleDelete = useCallback(async () => {
    if (!userId) {
      toast.error('Connectez-vous pour supprimer cette annonce.');
      router.push('/connexion');
      return;
    }

    setDeleting(true);
    setConfirmDeleteOpen(false);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AnnonceActions] handleDelete START', {
        listingId: listing.id,
        listingUserId: listing.user_id,
        zustandUserId: userId,
        match: listing.user_id === userId,
      });
    }

    // 1. Supprimer les photos du storage
    const photos = listing.photos as Array<{ id: string; url: string }> | undefined;
    if (photos?.length) {
      const paths = photos
        .map(p => safeStoragePath(p.url, 'photos'))
        .filter(Boolean) as string[];
      if (paths.length) {
        await supabase.storage.from('photos').remove(paths); // nosec
      }
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);
    }

    // 2. Supprimer l'annonce — eq('id') seul, pas de eq('user_id') (laisse la RLS décider)
    const { data: deleted, error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listing.id)
      .select('id');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AnnonceActions] DELETE result:', { deleted, error });
    }

    if (error) {
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      setDeleting(false);
      return;
    }

    if (!deleted || deleted.length === 0) {
      toast.error('Suppression bloquée — politique de sécurité. Vérifiez la console.', { duration: 8000 });
      setDeleting(false);
      return;
    }

    toast.success('Annonce supprimée ✅');
    router.replace('/annonces');
    router.refresh();
  }, [listing, userId, router, supabase]);

  // ── handleStatusChange ─────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: string) => {
    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listing.id);
    if (error) throw error;
    setCurrentStatus(newStatus);
  }, [listing.id, supabase]);

  // ── handleReport ───────────────────────────────────────────────────────────
  const handleReport = useCallback(async () => {
    if (!profile?.id) return;
    const reason = prompt('Motif du signalement :');
    if (!reason) return;
    await supabase.from('reports').insert({
      reporter_id: profile.id,
      target_type: 'listing',
      target_id: listing.id,
      reason,
      status: 'pending',
    });
    toast.success("Signalement envoyé à l'équipe de modération");
  }, [profile?.id, listing.id, supabase]);

  // ──────────────────────────────────────────────────────────────────────────
  // Variants
  // ──────────────────────────────────────────────────────────────────────────

  // TOP BAR: favoris + partage + edit link (owner)
  if (variant === 'topbar') {
    return (
      <>
        {/* Favourite */}
        <button
          onClick={toggleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
            isSaved
              ? 'bg-pink-100 text-pink-600 border border-pink-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">{isSaved ? 'Sauvegardé' : 'Sauvegarder'}</span>
        </button>

        {/* Share */}
        <div className="relative">
          <button
            onClick={() => setShowSharePanel(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          {showSharePanel && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-52 z-30">
              <p className="text-xs font-semibold text-gray-500 mb-2 px-2">Partager via</p>
              <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <Copy className="w-4 h-4 text-gray-400" /> Copier le lien
              </button>
              <button onClick={() => handleShare('sms')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <MessageCircle className="w-4 h-4 text-green-500" /> SMS
              </button>
              <button onClick={() => handleShare('email')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <MessageCircle className="w-4 h-4 text-blue-500" /> Email
              </button>
              {'share' in navigator && (
                <button onClick={() => handleShare('native')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                  <Share2 className="w-4 h-4 text-indigo-500" /> Autres…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Owner: edit link — skeleton pendant init, bouton quand owner confirmé */}
        {!authReady ? (
          <div className="w-20 h-8 bg-gray-100 animate-pulse rounded-xl" />
        ) : isOwner ? (
          <Link
            href={`/annonces/${listing.id}/modifier`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Modifier</span>
          </Link>
        ) : null}
      </>
    );
  }

  // OWNER PANEL: gestion statut + suppression (sidebar)
  if (variant === 'owner-panel') {
    // Pendant l'initialisation auth : skeleton pour éviter le flash "boutons invisibles"
    if (!authReady) {
      return (
        <div className="space-y-2 mt-2 animate-pulse">
          <div className="h-8 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      );
    }
    // Auth résolue mais pas propriétaire → rien
    if (!isOwner) return null;
    return (
      <>
        <DeleteConfirmDialog
          isOpen={confirmDeleteOpen}
          title={listing.title}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
        <div className="space-y-2 mt-2">
          <div className="text-xs text-center text-blue-600 font-medium py-1.5 bg-blue-50 rounded-xl">
            ✅ C&apos;est votre annonce
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
            <StatusManager
              contentType="listing"
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              onDelete={() => setConfirmDeleteOpen(true)}
            />
          </div>
          <Link
            href={`/annonces/${listing.id}/modifier`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Modifier l&apos;annonce
          </Link>
          <button
            onClick={() => handleShare('copy')}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Partager
          </button>
        </div>
      </>
    );
  }

  // REPORT BUTTON (visitors only)
  if (variant === 'report') {
    // Pendant init : rien (pas de flash de bouton signalement)
    if (!authReady) return null;
    if (isOwner || !profile?.id) return null;
    return (
      <button
        onClick={handleReport}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Signaler cette annonce
      </button>
    );
  }

  // MOBILE BAR (sticky bottom, visitors only, active listings)
  if (variant === 'mobile-bar') {
    if (isOwner || listing.status !== 'active') return null;
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg">
        <button
          onClick={toggleSave}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            isSaved
              ? 'bg-pink-100 text-pink-600 border-pink-200'
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
          }`}
        >
          <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? 'Favori' : 'Sauvegarder'}
        </button>

        {profile ? (
          <ContactButton
            sourceType="listing"
            sourceId={listing.id}
            sourceTitle={listing.title}
            ownerId={listing.user_id || ''}
            userId={profile.id}
            ctaLabel={listing.listing_type === 'wanted' ? '✉️ Proposer un article' : '💬 Contacter'}
            prefillMsg={`Bonjour, je suis intéressé(e) par votre annonce "${listing.title}".`}
            className="flex-1"
          />
        ) : (
          <Link
            href="/connexion"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Phone className="w-4 h-4" /> Contacter
          </Link>
        )}
      </div>
    );
  }

  return null;
}

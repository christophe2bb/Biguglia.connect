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

import { useState, useCallback, useRef } from 'react';
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
import { useFavorites } from '../../_hooks/useFavorites';
import ReportButton from '@/components/ui/ReportButton';

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
          Cette action est irréversible. Les photos seront nettoyées après confirmation de la suppression.
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

  const { savedIds, toggleSave: toggleFavorite } = useFavorites();
  const isSaved = savedIds.has(listing.id);
  const [showSharePanel,    setShowSharePanel]    = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [currentStatus,     setCurrentStatus]     = useState((listing.status as string) || 'active');
  // Dialog suppression (remplace window.confirm() bloquant)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // authReady : true dès que Zustand a résolu INITIAL_SESSION (authenticated ou unauthenticated)
  const authReady = phase !== 'initializing';
  const isOwner   = authReady && !!profile && profile.id === listing.user_id;

  // Une seule source de vérité pour les boutons topbar/mobile/carte.
  const toggleSave = useCallback(() => {
    void toggleFavorite(listing.id);
  }, [listing.id, toggleFavorite]);

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié !');
      setShowSharePanel(false);
    } catch {
      toast.error('Impossible de copier le lien. Vérifiez votre navigateur.');
    }
  }, [listing.title]);

  // ── Suppression vérifiée par le serveur, sans perte de photos ─────────────
  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (!userId || userId !== listing.user_id) {
      toast.error('Action réservée au propriétaire de cette annonce.');
      return;
    }

    setDeleting(true);
    setConfirmDeleteOpen(false);
    try {
      let bearer: string | undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        bearer = session?.access_token;
      } catch { /* cookies SSR utilisés en repli */ }

      const response = await fetch(`/api/listings/${listing.id}/delete`, {
        method: 'DELETE',
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean; error?: string; cleanupWarning?: boolean;
      } | null;
      if (!response.ok || !result?.ok) {
        toast.error(result?.error || 'Suppression refusée. Réessayez.');
        return;
      }
      if (result.cleanupWarning) {
        toast('Annonce supprimée, nettoyage des fichiers partiellement différé.', {
          icon: '⚠️', duration: 6000,
        });
      } else toast.success('Annonce supprimée');
      router.replace('/annonces');
      router.refresh();
    } catch {
      toast.error('Erreur réseau pendant la suppression. Réessayez.');
    } finally {
      setDeleting(false);
    }
  }, [deleting, listing.id, listing.user_id, userId, router, supabase]);

  // ── handleStatusChange ─────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!userId || userId !== listing.user_id) throw new Error('Action réservée au propriétaire');
    const { data, error } = await supabase
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('Le statut n’a pas été enregistré');
    setCurrentStatus(newStatus);
  }, [listing.id, listing.user_id, userId, supabase]);

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
      <div className="flex justify-center">
        <ReportButton targetType="listing" targetId={listing.id}
          targetTitle={listing.title} variant="text" />
      </div>
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

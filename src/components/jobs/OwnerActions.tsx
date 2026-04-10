'use client';

/**
 * OwnerActions — Vérifie côté CLIENT si l'utilisateur est propriétaire,
 * puis affiche les boutons Modifier / Supprimer.
 *
 * La vérification se fait via /api/emploi/ownership (service role bypass RLS).
 * Le composant est toujours rendu dans la page, mais ne s'affiche que si
 * isOwner === true — ainsi on contourne le problème de session Server Component.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface OwnerActionsProps {
  type: 'offer' | 'demand';
  slug: string;
  editHref: string;
  colorScheme?: 'cyan' | 'purple';
}

export default function OwnerActions({
  type,
  slug,
  editHref,
  colorScheme = 'cyan',
}: OwnerActionsProps) {
  const router = useRouter();
  const [isOwner, setIsOwner]     = useState<boolean | null>(null); // null = en cours
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const apiPath =
    type === 'offer'
      ? `/api/emploi/offres/${slug}`
      : `/api/emploi/demandes/${slug}`;

  const redirectAfterDelete =
    type === 'offer' ? '/emploi/offres' : '/emploi/demandes';

  // ── Vérification de propriété au montage ──────────────────────────────────
  useEffect(() => {
    async function checkOwnership() {
      try {
        // Récupérer le token d'accès depuis le client navigateur
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) { setIsOwner(false); return; }

        const res = await fetch(
          `/api/emploi/ownership?type=${type === 'offer' ? 'offer' : 'demand'}&slug=${slug}`,
          {
            headers: {
              // Envoyer le token Bearer pour que l'API puisse identifier l'utilisateur
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        if (!res.ok) { setIsOwner(false); return; }
        const data = await res.json();
        setIsOwner(!!data.isOwner);
      } catch {
        setIsOwner(false);
      }
    }
    checkOwnership();
  }, [type, slug]);

  // ── Suppression ───────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(apiPath, { method: 'DELETE', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erreur lors de la suppression');
        setDeleting(false);
        return;
      }
      router.push(redirectAfterDelete);
      router.refresh();
    } catch {
      setError('Erreur réseau, réessayez.');
      setDeleting(false);
    }
  }

  // ── Ne rien afficher si vérification en cours ou non propriétaire ─────────
  if (isOwner === null || isOwner === false) return null;

  // ── Styles ────────────────────────────────────────────────────────────────
  const borderColor  = colorScheme === 'purple' ? 'border-purple-200' : 'border-cyan-200';
  const editBtnColor = colorScheme === 'purple'
    ? 'border-purple-300 text-purple-700 hover:bg-purple-50'
    : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50';

  return (
    <div className={`flex flex-col gap-3 p-4 bg-white rounded-2xl border-2 ${borderColor}`}>
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
        ✏️ Gérer mon annonce
      </p>

      <div className="flex gap-2">
        {/* Bouton Modifier */}
        <Link
          href={editHref}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors ${editBtnColor}`}
        >
          <Pencil className="w-4 h-4" />
          Modifier
        </Link>

        {/* Bouton Supprimer */}
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        ) : (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Confirmer la suppression ?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

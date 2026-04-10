'use client';

/**
 * ProtectedContact — Bloc de contact intelligent.
 *
 * Comportement selon l'état de connexion :
 *
 * 1. Non connecté        → "Connectez-vous pour contacter l'employeur"
 * 2. Connecté            → Révèle directement email/téléphone (pas de bouton intermédiaire)
 * 3. Propriétaire        → "Vous gérez cette annonce" (pas de bloc contact)
 * 4. Chargement session  → Spinner discret
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Phone, EyeOff, Loader2, UserCheck, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProtectedContactProps {
  type: 'offer' | 'demand';
  slug: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  colorScheme?: 'brand' | 'purple';
  jobTitle?: string;
  ctaLabel?: string;
}

interface ContactData {
  contact_email: string | null;
  contact_phone: string | null;
  contact_instructions: string | null;
  application_mode: string | null;
}

type UIState = 'loading' | 'guest' | 'owner' | 'revealed' | 'error';

export default function ProtectedContact({
  type,
  slug,
  hasEmail = true,
  hasPhone = false,
  colorScheme = 'brand',
  jobTitle = '',
}: ProtectedContactProps) {
  const [uiState, setUiState]   = useState<UIState>('loading');
  const [contact, setContact]   = useState<ContactData | null>(null);

  const btnPrimary =
    colorScheme === 'purple'
      ? 'bg-white text-purple-700 hover:bg-purple-50'
      : 'bg-white text-brand-700 hover:bg-brand-50';
  const btnSecondary = 'bg-white/20 text-white border border-white/30 hover:bg-white/30';
  const lockBg = colorScheme === 'purple' ? 'bg-purple-800/40' : 'bg-brand-800/40';
  const placeholderCls = `flex items-center gap-2 w-full px-4 py-3 rounded-xl ${lockBg} text-white/60 font-medium text-sm`;

  /* ── Au montage : vérifier la session et charger les coordonnées ── */
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Pas connecté → afficher invitation à se connecter
      if (!session) {
        setUiState('guest');
        return;
      }

      const bearer = { 'Authorization': `Bearer ${session.access_token}` };

      // ── Étape 1 : vérifier si propriétaire (API ownership — on sait qu'elle marche)
      try {
        const ownerRes = await fetch(
          `/api/emploi/ownership?type=${type === 'offer' ? 'offer' : 'demand'}&slug=${slug}`,
          { headers: bearer }
        );
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          if (ownerData.isOwner === true) {
            setUiState('owner');
            return;
          }
        }
      } catch { /* ignore, on continue */ }

      // ── Étape 2 : récupérer les coordonnées
      try {
        const res = await fetch('/api/emploi/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...bearer,
          },
          body: JSON.stringify({ type, slug }),
        });

        if (res.status === 401) { setUiState('guest'); return; }
        if (res.status === 403) { setUiState('owner'); return; }
        if (!res.ok) { setUiState('error'); return; }

        const data: ContactData = await res.json();
        setContact(data);
        setUiState('revealed');
      } catch {
        setUiState('error');
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* ── Chargement ── */
  if (uiState === 'loading') {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-white/60" />
      </div>
    );
  }

  /* ── Propriétaire de l'annonce ── */
  if (uiState === 'owner') {
    return (
      <div className="flex items-center gap-2 text-sm text-white/80 bg-white/10 rounded-xl px-4 py-3">
        <UserCheck className="w-4 h-4 flex-shrink-0" />
        <span>Vous gérez cette annonce</span>
      </div>
    );
  }

  /* ── Non connecté ── */
  if (uiState === 'guest') {
    return (
      <div className="space-y-3">
        {/* Placeholders floutés */}
        {hasEmail && (
          <div className={placeholderCls}>
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">email@exemple.fr</span>
          </div>
        )}
        {hasPhone && (
          <div className={placeholderCls}>
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">06 00 00 00 00</span>
          </div>
        )}

        {/* Message clair : connecté à quoi */}
        <div className="bg-white/10 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-bold text-white">
            Connectez-vous pour contacter l&apos;employeur
          </p>
          <p className="text-xs text-white/70">Inscription gratuite, sans engagement</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Link
              href={`/connexion?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
              className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="inline-flex items-center gap-1.5 border border-white/40 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Erreur ── */
  if (uiState === 'error') {
    return (
      <div className="text-xs text-white/70 bg-white/10 rounded-xl px-4 py-3 text-center">
        <MessageCircle className="w-4 h-4 mx-auto mb-1" />
        Coordonnées temporairement indisponibles
      </div>
    );
  }

  /* ── Connecté : coordonnées révélées ── */
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
        <EyeOff className="w-3.5 h-3.5" />
        Coordonnées visibles uniquement par vous
      </div>

      {contact?.contact_email && (
        <a
          href={`mailto:${contact.contact_email}?subject=Candidature – ${encodeURIComponent(jobTitle)}`}
          className={`flex items-center gap-2 w-full px-4 py-3 ${btnPrimary} font-bold rounded-xl transition-colors justify-center`}
        >
          <Mail className="w-4 h-4" />
          <span className="truncate">{contact.contact_email}</span>
        </a>
      )}

      {contact?.contact_phone && (
        <a
          href={`tel:${contact.contact_phone}`}
          className={`flex items-center gap-2 w-full px-4 py-3 ${btnSecondary} font-semibold rounded-xl transition-colors justify-center`}
        >
          <Phone className="w-4 h-4" />
          {contact.contact_phone}
        </a>
      )}

      {contact?.contact_instructions && (
        <div className="mt-2 p-3 bg-white/15 rounded-xl text-xs text-white/90 leading-relaxed">
          ℹ️ {contact.contact_instructions}
        </div>
      )}

      {!contact?.contact_email && !contact?.contact_phone && (
        <p className="text-sm text-white/80 text-center py-2">
          Aucune coordonnée disponible pour cette annonce.
        </p>
      )}
    </div>
  );
}

'use client';

/**
 * ProtectedContact – affiche les coordonnées de contact de façon protégée.
 *
 * Les informations (email / téléphone) sont masquées par défaut et ne
 * sont jamais intégrées dans le HTML de la page.
 * Un clic sur "Voir les coordonnées" :
 *   1. Vérifie la session côté serveur (via /api/emploi/contact)
 *   2. Si connecté → retourne email/téléphone et les affiche
 *   3. Si non connecté → affiche un message d'invitation à se connecter
 */

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Eye, EyeOff, Lock, ExternalLink, Loader2 } from 'lucide-react';

interface ProtectedContactProps {
  /** 'offer' ou 'demand' */
  type: 'offer' | 'demand';
  /** Slug de l'annonce */
  slug: string;
  /** Indique s'il y a un email (pour afficher le placeholder) */
  hasEmail?: boolean;
  /** Indique s'il y a un téléphone (pour afficher le placeholder) */
  hasPhone?: boolean;
  /** Couleur principale : 'brand' (cyan/teal) ou 'purple' */
  colorScheme?: 'brand' | 'purple';
  /** Titre du poste (pour le sujet de l'email) */
  jobTitle?: string;
  /** Label du bouton */
  ctaLabel?: string;
}

interface ContactData {
  contact_email: string | null;
  contact_phone: string | null;
  contact_instructions: string | null;
  application_mode: string | null;
}

export default function ProtectedContact({
  type,
  slug,
  hasEmail = true,
  hasPhone = false,
  colorScheme = 'brand',
  jobTitle = '',
  ctaLabel = 'Voir les coordonnées',
}: ProtectedContactProps) {
  const [state, setState] = useState<'hidden' | 'loading' | 'revealed' | 'unauth'>('hidden');
  const [contact, setContact] = useState<ContactData | null>(null);

  /* ── Classes Tailwind selon couleur ── */
  const btnPrimary =
    colorScheme === 'purple'
      ? 'bg-white text-purple-700 hover:bg-purple-50'
      : 'bg-white text-brand-700 hover:bg-brand-50';
  const btnSecondary =
    'bg-white/20 text-white border border-white/30 hover:bg-white/30';
  const lockBg =
    colorScheme === 'purple' ? 'bg-purple-800/40' : 'bg-brand-800/40';
  const placeholderCls = `flex items-center gap-2 w-full px-4 py-3 rounded-xl ${lockBg} text-white/60 font-medium text-sm`;

  /* ── Appel API sécurisé ── */
  async function handleReveal() {
    setState('loading');
    try {
      const res = await fetch('/api/emploi/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, slug }),
      });

      if (res.status === 401) {
        setState('unauth');
        return;
      }

      if (!res.ok) {
        setState('hidden');
        return;
      }

      const data: ContactData = await res.json();
      setContact(data);
      setState('revealed');
    } catch {
      setState('hidden');
    }
  }

  /* ══════════════════════════════════════════════
     État : masqué
  ══════════════════════════════════════════════ */
  if (state === 'hidden' || state === 'loading') {
    return (
      <div className="space-y-3">
        {/* Placeholders floutés */}
        {hasEmail && (
          <div className={placeholderCls}>
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">email@exemple.fr</span>
          </div>
        )}
        {hasPhone && (
          <div className={placeholderCls}>
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">06 00 00 00 00</span>
          </div>
        )}

        {/* Bouton principal */}
        <button
          onClick={handleReveal}
          disabled={state === 'loading'}
          className={`flex items-center gap-2 w-full px-4 py-3 ${btnPrimary} font-bold rounded-xl transition-colors justify-center shadow-md disabled:opacity-70`}
        >
          {state === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {state === 'loading' ? 'Vérification…' : ctaLabel}
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     État : non connecté
  ══════════════════════════════════════════════ */
  if (state === 'unauth') {
    return (
      <div className="space-y-3">
        {/* Placeholders floutés */}
        {hasEmail && (
          <div className={placeholderCls}>
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">email@exemple.fr</span>
          </div>
        )}
        {hasPhone && (
          <div className={placeholderCls}>
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="blur-sm select-none flex-1 font-mono">06 00 00 00 00</span>
          </div>
        )}

        {/* Message connexion */}
        <div className="text-xs text-white/90 bg-white/10 rounded-xl p-3 text-center space-y-2">
          <p className="font-semibold">🔒 Connexion requise pour voir les coordonnées</p>
          <p className="text-white/70">C&apos;est gratuit et rapide !</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href={`/auth/connexion?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
              className="inline-flex items-center gap-1 bg-white text-gray-800 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/inscription"
              className="inline-flex items-center gap-1 underline underline-offset-2 text-white/80 hover:text-white text-xs"
            >
              S&apos;inscrire <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     État : révélé
  ══════════════════════════════════════════════ */
  return (
    <div className="space-y-3">
      {/* Badge discrétion */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1">
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

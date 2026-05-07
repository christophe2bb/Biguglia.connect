'use client';

/**
 * ProtectedContact — Bloc de contact intelligent.
 *
 * Un seul appel API POST /api/emploi/contact retourne :
 *   { status: 'guest' }       → non connecté
 *   { status: 'owner' }       → propriétaire de l'annonce
 *   { status: 'revealed', … } → connecté, coordonnées visibles
 *   { status: 'not_found' }   → annonce introuvable
 *   { status: 'error' }       → erreur serveur
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Mail, Phone, EyeOff, Loader2, UserCheck, Info, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProtectedContactProps {
  type: 'offer' | 'demand';
  slug: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  colorScheme?: 'brand' | 'purple';
  jobTitle?: string;
  ctaLabel?: string;
  /** Callback appelé quand l'utilisateur est propriétaire — permet au parent de se masquer */
  onOwner?: () => void;
}

interface ContactData {
  contact_email: string | null;
  contact_phone: string | null;
  contact_instructions: string | null;
  application_mode: string | null;
}

type UIState = 'loading' | 'guest' | 'owner' | 'revealed' | 'not_found' | 'no_contact' | 'error';

export default function ProtectedContact({
  type,
  slug,
  hasEmail = true,
  hasPhone = false,
  colorScheme = 'brand',
  jobTitle = '',
  onOwner,
}: ProtectedContactProps) {
  const [uiState, setUiState]   = useState<UIState>('loading');
  const [contact, setContact]   = useState<ContactData | null>(null);
  const [errorInfo, setErrorInfo] = useState<string>('');

  const btnPrimary =
    colorScheme === 'purple'
      ? 'bg-white text-purple-700 hover:bg-purple-50'
      : 'bg-white text-brand-700 hover:bg-brand-50';
  const btnSecondary = 'bg-white/20 text-white border border-white/30 hover:bg-white/30';
  const lockBg = colorScheme === 'purple' ? 'bg-purple-800/40' : 'bg-brand-800/40';
  const placeholderCls = `flex items-center gap-2 w-full px-4 py-3 rounded-xl ${lockBg} text-white/60 font-medium text-sm`;

  const load = useCallback(async () => {
    setUiState('loading');
    setErrorInfo('');

    try {
      const supabase = createClient();

      // getUser() force un refresh du token si nécessaire
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUiState('guest');
        return;
      }

      // Récupérer la session pour le token d'accès
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUiState('guest');
        return;
      }

      let res: Response;
      try {
        res = await fetch('/api/emploi/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type, slug }),
        });
      } catch (fetchErr: unknown) {
        setErrorInfo('Erreur réseau: ' + (fetchErr instanceof Error ? fetchErr.message : String(fetchErr)));
        setUiState('error');
        return;
      }

      const httpStatus = res.status;

      if (httpStatus === 401) {
        setUiState('guest');
        return;
      }

      // Lire la réponse — peut être du JSON ou du HTML (en cas d'erreur Vercel)
      const rawText = await res.text().catch(() => '');
      let json: Record<string, unknown> = { status: 'error' };
      try {
        json = JSON.parse(rawText);
      } catch {
        // Réponse HTML (page d'erreur Vercel 500) — on log le début
        setErrorInfo(`HTTP ${httpStatus} – réponse non-JSON: ${rawText.slice(0, 80)}`);
        setUiState('error');
        return;
      }

      const apiStatus = json?.status as string | undefined;

      switch (apiStatus) {
        case 'owner':
          setUiState('owner');
          onOwner?.();
          break;
        case 'revealed': {
          const d = json as unknown as ContactData;
          if (d.contact_email || d.contact_phone) {
            setContact(d);
            setUiState('revealed');
          } else {
            setUiState('no_contact');
          }
          break;
        }
        case 'guest':
          setUiState('guest');
          break;
        case 'not_found':
          setUiState('not_found');
          break;
        case 'error':
          setErrorInfo(`HTTP ${httpStatus} – ${(json.error as string) || 'erreur serveur'}`);
          setUiState('error');
          break;
        default:
          setErrorInfo(`HTTP ${httpStatus} – status inattendu: "${apiStatus}"`);
          setUiState('error');
      }
    } catch (e: unknown) {
      setErrorInfo(e instanceof Error ? e.message : String(e));
      setUiState('error');
    }
  }, [type, slug]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Chargement ── */
  if (uiState === 'loading') {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-white/60" />
      </div>
    );
  }

  /* ── Propriétaire de l'annonce — bloc contact masqué (onOwner cache le parent) ── */
  if (uiState === 'owner') {
    return null;
  }

  /* ── Non connecté ── */
  if (uiState === 'guest') {
    return (
      <div className="space-y-3">
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
        <div className="bg-white/10 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-bold text-white">
            Connectez-vous pour contacter l&apos;employeur
          </p>
          <p className="text-xs text-white/70">Inscription gratuite, sans engagement</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Link
              href={`/connexion?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`} /* nosec — read-only pathname, encodeURIComponent prevents injection, hardcoded /connexion route */
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

  /* ── Annonce introuvable ou sans coordonnées ── */
  if (uiState === 'not_found' || uiState === 'no_contact') {
    return (
      <div className="flex items-start gap-2 text-sm text-white/70 bg-white/10 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          {uiState === 'not_found'
            ? 'Annonce introuvable.'
            : 'Aucune coordonnée renseignée pour cette annonce.'}
        </span>
      </div>
    );
  }

  /* ── Erreur réseau / serveur ── */
  if (uiState === 'error') {
    return (
      <div className="flex flex-col gap-2 bg-white/10 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-white/70">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Impossible de charger les coordonnées.</span>
        </div>
        {errorInfo && (
          <p className="text-xs text-white/40 font-mono break-all">{errorInfo}</p>
        )}
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white underline"
        >
          <RefreshCw className="w-3 h-3" />
          Réessayer
        </button>
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
    </div>
  );
}

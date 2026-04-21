'use client';

/**
 * PersonalizedBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Bannière de bienvenue personnalisée selon le profil et l'historique.
 *
 * Affiche :
 *   • Une salutation contextuelle (heure + prénom + profil)
 *   • Le badge de profil (🔵 Artisan vérifié, 🏡 Habitant…)
 *   • Des quick-actions priorisées selon les intérêts
 *   • Un indicateur de personnalisation discret
 *
 * Rendu uniquement côté client (accès localStorage + useAuthStore).
 * Remplace le bloc Quick Actions générique de HomeHero.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  computeUserInterestProfile,
  computeGuestProfile,
  type UserInterestProfile,
  type QuickAction,
} from '@/lib/user-interests';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PersonalizedBannerProps {
  /** Classe CSS additionnelle sur le conteneur */
  className?: string;
  /** Afficher le badge "Personnalisé" discret */
  showPersonalizationBadge?: boolean;
}

// ─── Composant QuickAction pill ───────────────────────────────────────────────

function ActionPill({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className={cn(
        'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
        'border whitespace-nowrap',
        action.highlight
          ? 'bg-white text-gray-900 border-white/80 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98]'
          : 'bg-white/15 text-white border-white/20 hover:bg-white/25 hover:border-white/35',
      )}
    >
      <span className="text-base leading-none">{action.emoji}</span>
      {action.label}
      {action.highlight && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
    </Link>
  );
}

// ─── Sous-composant : Profil connecté ─────────────────────────────────────────

function ConnectedBanner({
  interestProfile,
  showPersonalizationBadge,
}: {
  interestProfile: UserInterestProfile;
  showPersonalizationBadge: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Ligne 1 : Salutation + badge profil */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-white/90 text-lg sm:text-xl font-semibold leading-snug">
            {interestProfile.greeting}
          </p>
          <span className={cn(
            'inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold px-3 py-1 rounded-full',
            'bg-white/20 text-white border border-white/25 backdrop-blur-sm',
          )}>
            {interestProfile.badge}
          </span>
        </div>

        {/* Badge personnalisation discret */}
        {showPersonalizationBadge && (
          <div className="flex items-center gap-1.5 text-white/60 text-xs bg-white/10 rounded-full px-3 py-1.5 border border-white/15">
            <Sparkles className="w-3 h-3" />
            <span>
              {interestProfile.source === 'behavior'
                ? 'Adapté à vos visites'
                : interestProfile.source === 'mixed'
                ? 'Adapté à votre activité'
                : 'Adapté à votre profil'}
            </span>
          </div>
        )}
      </div>

      {/* Ligne 2 : Quick actions */}
      <div className="flex flex-wrap gap-2">
        {interestProfile.quickActions.map((action) => (
          <ActionPill key={action.href} action={action} />
        ))}
      </div>
    </div>
  );
}

// ─── Sous-composant : Visiteur non connecté ───────────────────────────────────

function GuestBanner({
  guestProfile,
}: {
  guestProfile: ReturnType<typeof computeGuestProfile>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white/90 text-lg sm:text-xl font-semibold leading-snug">
          {guestProfile.greeting}
        </p>
        <p className="text-white/60 text-sm mt-1">
          Inscrivez-vous gratuitement pour accéder à toutes les fonctionnalités.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {guestProfile.quickActions.map((action) => (
          <ActionPill key={action.href} action={action} />
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PersonalizedBanner({
  className,
  showPersonalizationBadge = true,
}: PersonalizedBannerProps) {
  const { profile, phase } = useAuthStore();

  // Profil d'intérêt — calculé uniquement si authentifié
  const interestProfile = useMemo(() => {
    if (!profile) return null;
    return computeUserInterestProfile(profile);
  }, [profile]);

  // Profil visiteur — pour non connecté
  const guestProfile = useMemo(() => {
    if (profile) return null;
    if (phase === 'initializing') return null;
    return computeGuestProfile();
  }, [profile, phase]);

  // Rafraîchissement du cache après navigation (en arrière-plan)
  useEffect(() => {
    if (profile) {
      // Recalcule silencieusement pour invalider le cache si le profil a changé
      try {
        import('@/lib/user-interests').then(({ computeUserInterestProfile }) => {
          computeUserInterestProfile(profile);
        });
      } catch { /* silencieux */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  // Phase d'initialisation — skeleton minimaliste
  if (phase === 'initializing') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-6 w-64 bg-white/15 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {[120, 100, 110, 90].map((w) => (
            <div key={w} className="h-10 rounded-2xl bg-white/10 animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {profile && interestProfile ? (
        <ConnectedBanner
          interestProfile={interestProfile}
          showPersonalizationBadge={showPersonalizationBadge}
        />
      ) : guestProfile ? (
        <GuestBanner guestProfile={guestProfile} />
      ) : null}
    </div>
  );
}

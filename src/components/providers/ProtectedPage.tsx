'use client';

/**
 * ProtectedPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Garde de route côté client pour les pages nécessitant une authentification.
 *
 * ── Comportement ──────────────────────────────────────────────────────────────
 *
 *  phase = 'initializing'    → Affiche le skeleton (AuthProvider initialise)
 *  phase = 'unauthenticated' → Redirige vers /connexion
 *  phase = 'authenticated'   → Vérifie adminOnly, puis rend children
 *
 * ── adminOnly ─────────────────────────────────────────────────────────────────
 *
 *  Quand adminOnly=true :
 *  1. On attend que le profil soit chargé (skeleton)
 *  2. Si profil null après tentative de fetch → on force un rechargement UNE FOIS
 *  3. Après le rechargement, si toujours pas admin → redirect '/'
 *  4. Si admin/moderator → affiche les children
 *
 *  Circuit-breaker : un boolean `fetchedRef` empêche les rechargements infinis
 *  si la DB est inaccessible (RLS trop restrictive, réseau, etc.)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

/** Skeleton de chargement réutilisable */
function AuthSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

type AdminCheckState = 'pending' | 'fetching' | 'authorized' | 'unauthorized';

export default function ProtectedPage({ children, adminOnly = false }: Props) {
  const { phase, profile, userId, setProfile } = useAuthStore();
  const router = useRouter();

  // Circuit-breaker: track admin check state to avoid infinite loops
  const [adminState, setAdminState] = useState<AdminCheckState>('pending');
  const fetchAttemptedRef = useRef(false);

  const isAdminRole = useCallback((p: Profile | null): boolean => {
    return p?.role === 'admin' || p?.role === 'moderator';
  }, []);

  useEffect(() => {
    // ── Pas encore initialisé → attendre ──────────────────────────────────
    if (phase === 'initializing') return;

    // ── Non authentifié → rediriger vers /connexion ───────────────────────
    if (phase === 'unauthenticated') {
      router.push('/connexion');
      return;
    }

    // ── Authentifié — si pas adminOnly, rien à faire ─────────────────────
    if (!adminOnly) return;

    // ── AdminOnly: state machine ─────────────────────────────────────────
    // Si profil déjà chargé avec le bon rôle → autorisé directement
    if (profile !== null && isAdminRole(profile)) {
      setAdminState('authorized');
      return;
    }

    // Si on a déjà tenté de recharger le profil → décider maintenant
    if (fetchAttemptedRef.current) {
      if (profile !== null && isAdminRole(profile)) {
        setAdminState('authorized');
      } else {
        // Profil chargé mais pas admin, ou DB inaccessible → refus
        setAdminState('unauthorized');
      }
      return;
    }

    // Première tentative : recharger le profil frais depuis la DB
    // (cas où le rôle a été mis à jour après la connexion)
    if (!userId) {
      setAdminState('unauthorized');
      return;
    }

    fetchAttemptedRef.current = true;
    setAdminState('fetching');

    const supabase = createClient();
    Promise.resolve(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ).then(({ data, error }) => {
      if (error) {
        console.warn('[ProtectedPage] Impossible de charger le profil:', error.message);
        setAdminState('unauthorized');
        return;
      }
      if (data) {
        setProfile(data as Profile);
        if ((data as Profile).role === 'admin' || (data as Profile).role === 'moderator') {
          setAdminState('authorized');
        } else {
          setAdminState('unauthorized');
        }
      } else {
        setAdminState('unauthorized');
      }
    }).catch(() => {
      setAdminState('unauthorized');
    });
  }, [phase, profile, userId, adminOnly, router, isAdminRole, setProfile]);

  // Redirection quand non autorisé
  useEffect(() => {
    if (adminOnly && adminState === 'unauthorized') {
      router.push('/');
    }
  }, [adminOnly, adminState, router]);

  // ── Rendu conditionnel ────────────────────────────────────────────────────

  // 1. En cours d'initialisation → skeleton
  if (phase === 'initializing') {
    return <AuthSkeleton />;
  }

  // 2. Non authentifié → skeleton pendant la redirection
  if (phase === 'unauthenticated') {
    return <AuthSkeleton />;
  }

  // 3. AdminOnly: skeleton pendant la vérification ou fetch
  if (adminOnly && (adminState === 'pending' || adminState === 'fetching')) {
    return <AuthSkeleton />;
  }

  // 4. AdminOnly: skeleton pendant redirect (unauthorized)
  if (adminOnly && adminState === 'unauthorized') {
    return <AuthSkeleton />;
  }

  // 5. Tout est bon → afficher le contenu protégé
  return <>{children}</>;
}

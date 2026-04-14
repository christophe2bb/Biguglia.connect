'use client';

/**
 * ProtectedPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Garde de route côté client pour les pages nécessitant une authentification.
 *
 * ── Comportement ──────────────────────────────────────────────────────────────
 *
 *  phase = 'initializing'   → Affiche le skeleton (AuthProvider initialise)
 *  phase = 'unauthenticated' → Redirige vers /connexion
 *  phase = 'authenticated'  → Vérifie adminOnly, puis rend children
 *
 * ── Ce que ce composant NE fait PAS ──────────────────────────────────────────
 *
 *  ✗ N'appelle PAS supabase.auth.getSession() — antipattern documenté dans
 *    AuthProvider : getSession() lit le localStorage sans valider le token.
 *
 *  ✗ N'écrit PAS dans le store (setProfile, setLoading) — AuthProvider est
 *    le seul écrivain légitime. Des writes concurrents créaient des race
 *    conditions si AuthProvider et ProtectedPage se chevauchaient.
 *
 *  ✗ Ne distingue PAS profile=null de unauthenticated — si l'utilisateur est
 *    'authenticated' mais que son profil DB est absent (erreur réseau), la page
 *    s'affiche quand même (pas de redirection) afin d'éviter une fausse
 *    expulsion vers /connexion.
 *
 * ── Interaction avec le middleware SSR ────────────────────────────────────────
 *
 *  Le middleware src/middleware.ts protège déjà les routes côté serveur.
 *  Ce composant est une seconde couche de protection côté client pour :
 *  - Les routes que le middleware ne couvre pas (ex: montage dynamique)
 *  - L'accès admin-only (role check en plus du simple "est connecté")
 *
 * ── adminOnly ─────────────────────────────────────────────────────────────────
 *
 *  Quand adminOnly=true, on attend que profile soit disponible pour vérifier
 *  le rôle. Si profile est null mais phase='authenticated' (erreur DB), on
 *  affiche le skeleton plutôt que de rediriger vers '/' sur une base incertaine.
 */

import { useEffect, useCallback } from 'react';
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

export default function ProtectedPage({ children, adminOnly = false }: Props) {
  const { phase, profile, userId, setProfile } = useAuthStore();
  const router = useRouter();

  // ── Pour adminOnly : recharge le profil frais depuis la DB ───────────────
  // Nécessaire quand le rôle a été mis à jour en DB après la connexion
  // (le store Zustand garde l'ancien profil en mémoire).
  const refreshProfile = useCallback(async (uid: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (data) setProfile(data as Profile);
    } catch { /* ignore */ }
  }, [setProfile]);

  useEffect(() => {
    // ── Pas encore initialisé → attendre ──────────────────────────────────
    if (phase === 'initializing') return;

    // ── Non authentifié → rediriger vers /connexion ───────────────────────
    if (phase === 'unauthenticated') {
      router.push('/connexion');
      return;
    }

    // ── Authentifié — vérification adminOnly ──────────────────────────────
    if (adminOnly) {
      // Si le profil est null ou le rôle n'est pas encore admin,
      // on recharge le profil frais depuis la DB avant de décider.
      if (profile === null || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        if (userId) refreshProfile(userId);
        return; // attendre le rechargement
      }
    }
  }, [phase, profile, userId, adminOnly, router, refreshProfile]);

  // ── Rendu conditionnel ────────────────────────────────────────────────────

  // 1. En cours d'initialisation → skeleton
  if (phase === 'initializing') {
    return <AuthSkeleton />;
  }

  // 2. Non authentifié → skeleton pendant la redirection
  if (phase === 'unauthenticated') {
    return <AuthSkeleton />;
  }

  // 3. Authentifié + adminOnly + profil en attente → skeleton
  if (adminOnly && profile === null) {
    return <AuthSkeleton />;
  }

  // 4. Authentifié + adminOnly + rôle insuffisant → skeleton pendant redirect
  if (adminOnly && profile !== null && profile.role !== 'admin') {
    return <AuthSkeleton />;
  }

  // 5. Tout est bon → afficher le contenu protégé
  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';

/**
 * AuthProvider — initialise et maintient la session Supabase dans le store Zustand.
 *
 * ─── Stratégie d'initialisation ────────────────────────────────────────────────
 *
 *  On utilise UNIQUEMENT onAuthStateChange() pour détecter la session initiale
 *  et ses changements. Supabase émet un événement INITIAL_SESSION au montage
 *  (session valide ou null), et TOKEN_REFRESHED quand il renouvelle le JWT.
 *
 *  ⚠️  Pourquoi PAS getSession() ici :
 *    getSession() côté client lit le localStorage sans valider/rafraîchir le token.
 *    Si le token est expiré, getSession() retourne quand même une session avec le
 *    token expiré → fetchProfile() reçoit un 401 → setProfile(null) → authLoading=false
 *    → les pages protégées (MessagesPage) redirigent vers /connexion alors que
 *    l'utilisateur est connecté.
 *
 *  onAuthStateChange() gère le cycle complet :
 *    INITIAL_SESSION  → session valide (token frais ou rafraîchi) ou null
 *    SIGNED_IN        → connexion réussie
 *    TOKEN_REFRESHED  → token renouvelé automatiquement (silent refresh)
 *    SIGNED_OUT       → déconnexion
 *
 * ─── Timeout de sécurité ────────────────────────────────────────────────────────
 *
 *  Si onAuthStateChange ne répond pas en 8s (réseau lent, Supabase indisponible),
 *  on débloque forcément l'UI (setLoading(false)) pour éviter un écran blanc.
 */

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Timeout de sécurité étendu à 8s — le renouvellement du token peut prendre
    // plus longtemps sur une connexion lente
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthProvider] timeout 8s — déblocage forcé (réseau lent ?)');
        setLoading(false);
      }
    }, 8000);

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!mounted) return;

        if (!error && data) {
          setProfile(data as Profile);
        } else {
          console.warn('[AuthProvider] fetchProfile: profil introuvable pour', userId, error?.message);
          setProfile(null);
        }
      } catch (e) {
        console.error('[AuthProvider] fetchProfile exception:', e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    // ── onAuthStateChange gère TOUS les cas : initial, refresh, login, logout ──
    //
    // INITIAL_SESSION est émis une seule fois au montage avec la session courante
    // (null si non connecté, ou session avec token valide/rafraîchi si connecté).
    // C'est le seul endroit fiable pour lire la session initiale côté client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          // Session initiale valide — charger le profil
          fetchProfile(session.user.id);
        } else {
          // Pas de session au démarrage (non connecté ou déconnecté)
          clearTimeout(timeout);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Connexion ou renouvellement de token — recharger le profil
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        setProfile(null);
        setLoading(false);
        return;
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

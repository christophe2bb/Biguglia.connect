'use client';

/**
 * AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Source unique de vérité pour le cycle session → profil → store.
 *
 * ── Cycle complet tracé ───────────────────────────────────────────────────────
 *
 *  Montage du composant
 *    └─ phase = 'initializing'  (état initial du store)
 *       └─ onAuthStateChange s'inscrit
 *
 *  INITIAL_SESSION (session valide)
 *    └─ _setAuth('authenticated', userId, null)    ← userId connu, profil en cours
 *       └─ fetchProfile(userId)
 *          ├─ succès → _setAuth('authenticated', userId, profile)
 *          └─ erreur → _setAuth('authenticated', userId, null)
 *                       ↑ PAS unauthenticated — l'utilisateur EST connecté
 *
 *  INITIAL_SESSION (session null)
 *    └─ _setAuth('unauthenticated', null, null)
 *
 *  SIGNED_IN
 *    └─ _setAuth('authenticated', userId, null)
 *       └─ fetchProfile(userId)
 *
 *  TOKEN_REFRESHED
 *    └─ Même userId qu'avant → PAS de refetch profil (token renouvelé silencieusement)
 *       Nouvel userId (cas exceptionnel) → fetchProfile(userId)
 *
 *  SIGNED_OUT
 *    └─ _setAuth('unauthenticated', null, null)
 *
 * ── Garanties ─────────────────────────────────────────────────────────────────
 *
 *  1. Mutation ATOMIQUE : _setAuth() est appelé en une seule opération Zustand.
 *     Il n'existe pas de fenêtre entre phase=X et userId=Y où l'état serait
 *     incohérent.
 *
 *  2. Jamais de fausse déconnexion : une erreur DB lors de fetchProfile ne
 *     passe PAS en 'unauthenticated'. La phase reste 'authenticated', profile=null.
 *     Les consommateurs distinguent via `phase` et non `profile === null`.
 *
 *  3. TOKEN_REFRESHED sans fetch inutile : le renouvellement silencieux du JWT
 *     (toutes les ~55 min) ne déclenche un refetch de profil que si l'userId
 *     a changé (ne se produit pas en pratique — garde uniquement défensive).
 *
 *  4. Timeout 8s : si onAuthStateChange ne répond pas (Supabase indisponible,
 *     réseau hors ligne), l'UI est débloquée en passant à 'unauthenticated'.
 *     L'utilisateur peut naviguer sur les pages publiques.
 *
 *  5. cleanup : subscription.unsubscribe() + clearTimeout au démontage.
 *     `mounted` empêche toute mutation de store après démontage.
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import type { Profile } from '@/types';

/** Durée avant déblocage forcé de l'UI si Supabase ne répond pas */
const AUTH_TIMEOUT_MS = 8_000;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { _setAuth, userId: currentUserId } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // ── Timeout de sécurité ───────────────────────────────────────────────────
    // Si INITIAL_SESSION n'arrive pas dans AUTH_TIMEOUT_MS, débloquer l'UI.
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn(
          `[AuthProvider] Timeout ${AUTH_TIMEOUT_MS / 1000}s — ` +
          'INITIAL_SESSION non reçu. Supabase indisponible ou réseau hors ligne. ' +
          'Passage en unauthenticated.'
        );
        _setAuth('unauthenticated', null, null);
      }
    }, AUTH_TIMEOUT_MS);

    // ── fetchProfile ──────────────────────────────────────────────────────────
    // Charge le profil DB pour un userId Supabase Auth connu.
    //
    // Phase AVANT l'appel : 'authenticated' (userId déjà défini dans le store).
    // Sur succès  → _setAuth('authenticated', userId, profile)
    // Sur erreur  → _setAuth('authenticated', userId, null)
    //   ↑ On reste 'authenticated' : l'utilisateur est connecté côté Supabase.
    //     profile=null signifie "profil non disponible" pas "non connecté".
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!mounted) return;

        if (!error && data) {
          _setAuth('authenticated', userId, data as Profile);
        } else {
          // Erreur DB (table manquante, RLS, réseau) — PAS une déconnexion
          if (error) {
            console.warn(
              '[AuthProvider] fetchProfile: profil introuvable pour', userId,
              '—', error.message,
              '(utilisateur reste authenticated)'
            );
          }
          // Profil null mais phase 'authenticated' : pas de redirection vers /connexion
          _setAuth('authenticated', userId, null);
        }
      } catch (e) {
        if (!mounted) return;
        console.error('[AuthProvider] fetchProfile exception:', e);
        // Exception réseau : idem, rester 'authenticated'
        _setAuth('authenticated', userId, null);
      } finally {
        if (mounted) clearTimeout(timeout);
      }
    };

    // ── onAuthStateChange — seul point d'entrée de la session ────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        switch (event) {

          // ── Initialisation (émis une fois au montage) ──────────────────────
          case 'INITIAL_SESSION':
            if (session?.user) {
              // Marquer 'authenticated' immédiatement (userId connu) avant
              // le fetch profil asynchrone. Évite un état 'initializing' prolongé
              // si le fetch est lent.
              _setAuth('authenticated', session.user.id, null);
              fetchProfile(session.user.id);
            } else {
              clearTimeout(timeout);
              _setAuth('unauthenticated', null, null);
            }
            break;

          // ── Connexion réussie ──────────────────────────────────────────────
          case 'SIGNED_IN':
            if (session?.user) {
              _setAuth('authenticated', session.user.id, null);
              fetchProfile(session.user.id);
            }
            break;

          // ── Renouvellement silencieux du JWT ──────────────────────────────
          // Ne recharger le profil QUE si l'userId a changé.
          // En pratique, TOKEN_REFRESHED préserve toujours le même userId.
          // Cette garde évite un refetch DB inutile toutes les ~55 min.
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              const newUserId = session.user.id;
              // Lire l'userId courant directement depuis le store (pas le snapshot
              // de la closure, qui serait périmé après le premier fetch)
              const storeUserId = useAuthStore.getState().userId;
              if (newUserId !== storeUserId) {
                // Cas exceptionnel (changement de compte) → recharger le profil
                _setAuth('authenticated', newUserId, null);
                fetchProfile(newUserId);
              }
              // Même userId → rien à faire (token renouvelé côté Supabase,
              // profile et phase déjà à jour dans le store)
            }
            break;

          // ── Déconnexion ────────────────────────────────────────────────────
          case 'SIGNED_OUT':
            clearTimeout(timeout);
            _setAuth('unauthenticated', null, null);
            break;

          // Les autres événements (PASSWORD_RECOVERY, USER_UPDATED, etc.)
          // ne nécessitent pas de mise à jour du store ici.
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: _setAuth et currentUserId sont stables (références Zustand) — pas
  // besoin de les lister dans les deps. L'effect ne doit tourner qu'une fois.

  return <>{children}</>;
}

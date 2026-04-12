'use client';

/**
 * auth-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Source unique de vérité pour l'état d'authentification côté client.
 *
 * ── Cycle d'état (AuthPhase) ─────────────────────────────────────────────────
 *
 *  'initializing'   → Valeur initiale. AuthProvider n'a pas encore reçu
 *                     l'événement INITIAL_SESSION de Supabase.
 *                     → L'UI doit afficher un skeleton / loader.
 *
 *  'authenticated'  → INITIAL_SESSION ou SIGNED_IN reçu avec session valide.
 *                     `userId` est défini. `profile` peut être null si la
 *                     requête DB a échoué (erreur réseau, table manquante)
 *                     mais l'utilisateur EST authentifié côté Supabase.
 *
 *  'unauthenticated' → INITIAL_SESSION avec session=null, ou SIGNED_OUT.
 *                      `userId` et `profile` sont null.
 *
 * ── Transitions valides ───────────────────────────────────────────────────────
 *
 *   initializing → authenticated    (INITIAL_SESSION valide)
 *   initializing → unauthenticated  (INITIAL_SESSION null / SIGNED_OUT)
 *   authenticated → unauthenticated (SIGNED_OUT)
 *   unauthenticated → authenticated (SIGNED_IN)
 *   authenticated → authenticated   (TOKEN_REFRESHED, profile refresh)
 *
 * ── Pourquoi un AuthPhase au lieu d'un boolean `loading` ? ───────────────────
 *
 *  Le boolean `loading` crée une ambiguïté fatale :
 *    loading=false + profile=null peut signifier :
 *      (a) Utilisateur non connecté  → rediriger vers /connexion
 *      (b) Utilisateur connecté mais profil DB introuvable (erreur réseau)
 *                                   → NE PAS rediriger
 *  L'enum `AuthPhase` lève cette ambiguïté explicitement.
 *
 *  `loading` est maintenu comme getter calculé pour rétro-compatibilité
 *  avec les 30+ consommateurs existants.
 *
 * ── Mutations publiques ───────────────────────────────────────────────────────
 *
 *  Seul AuthProvider doit appeler `_setAuth()`. Les autres composants sont
 *  READ-ONLY. `setProfile` et `setLoading` sont conservés pour les cas
 *  légitimes (page profil : mise à jour après edit, tests).
 *
 *  `ProtectedPage` NE DOIT PAS écrire dans le store — il lit `phase` seulement.
 */

import { create } from 'zustand';
import { Profile } from '@/types';

// ─── AuthPhase ────────────────────────────────────────────────────────────────

/**
 * Les trois états possibles du cycle d'authentification.
 * Remplace le boolean `loading` qui créait une ambiguïté sur profile=null.
 */
export type AuthPhase =
  | 'initializing'     // En attente de l'événement INITIAL_SESSION
  | 'authenticated'    // Session valide — userId défini (profile peut être null si erreur DB)
  | 'unauthenticated'; // Pas de session ou SIGNED_OUT

// ─── AuthState ────────────────────────────────────────────────────────────────

export interface AuthState {
  // ── État principal ──────────────────────────────────────────────────────────
  phase: AuthPhase;

  /** ID Supabase Auth de l'utilisateur connecté. Null si non connecté. */
  userId: string | null;

  /** Profil DB. Null si non connecté OU si la requête profiles a échoué. */
  profile: Profile | null;

  // ── Getter calculé rétro-compatible ────────────────────────────────────────
  /**
   * true si phase === 'initializing'.
   * Conservé pour compatibilité avec les composants existants.
   * Préférer `phase` pour les nouveaux composants.
   */
  loading: boolean;

  /** true si phase === 'authenticated' (indépendamment de profile) */
  isAuthenticated: boolean;

  // ── Actions — AuthProvider uniquement ──────────────────────────────────────
  /**
   * Transition atomique : met à jour phase + userId + profile en un seul appel.
   * Élimine la fenêtre de temps entre setLoading + setProfile qui créait des
   * états intermédiaires incohérents lisibles par les consommateurs.
   */
  _setAuth: (phase: AuthPhase, userId: string | null, profile: Profile | null) => void;

  // ── Actions — usage restreint ───────────────────────────────────────────────
  /**
   * Mise à jour du profil seul (ex : page profil après edit).
   * N'affecte pas `phase` ni `userId`.
   */
  setProfile: (profile: Profile | null) => void;

  /**
   * @deprecated Utiliser `_setAuth` depuis AuthProvider.
   * Conservé pour rétro-compatibilité.
   */
  setLoading: (loading: boolean) => void;

  // ── Sélecteurs de rôle ─────────────────────────────────────────────────────
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isArtisanVerified: () => boolean;
  isArtisanPending: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  // ── État initial ────────────────────────────────────────────────────────────
  phase:           'initializing',
  userId:          null,
  profile:         null,
  loading:         true,   // calculé : phase === 'initializing'
  isAuthenticated: false,  // calculé : phase === 'authenticated'

  // ── _setAuth : transition atomique ──────────────────────────────────────────
  _setAuth: (phase, userId, profile) =>
    set({
      phase,
      userId,
      profile,
      loading:         phase === 'initializing',
      isAuthenticated: phase === 'authenticated',
    }),

  // ── setProfile : mise à jour profil seule ───────────────────────────────────
  setProfile: (profile) =>
    set((state) => ({
      profile,
      // Si on reçoit un profil valide alors qu'on était en initializing,
      // passer automatiquement en authenticated (cas : ProtectedPage legacy).
      phase:
        state.phase === 'initializing' && profile !== null
          ? 'authenticated'
          : state.phase,
      userId: profile?.id ?? state.userId,
      loading: state.phase === 'initializing' && profile !== null
        ? false
        : state.phase === 'initializing',
      isAuthenticated:
        state.phase === 'initializing' && profile !== null
          ? true
          : state.phase === 'authenticated',
    })),

  // ── setLoading : rétro-compat ───────────────────────────────────────────────
  setLoading: (loading) =>
    set((state) => {
      if (loading) {
        // Forcer retour à initializing (cas rare : reset manuel)
        return { phase: 'initializing', loading: true, isAuthenticated: false };
      }
      // setLoading(false) : terminer l'initialisation sans connaître le résultat.
      // Si on est encore en initializing, passer à unauthenticated (comportement legacy).
      if (state.phase === 'initializing') {
        return {
          phase: 'unauthenticated',
          loading: false,
          isAuthenticated: false,
        };
      }
      return {}; // Pas de changement si déjà authenticated/unauthenticated
    }),

  // ── Sélecteurs de rôle ─────────────────────────────────────────────────────
  isAdmin:          () => get().profile?.role === 'admin',
  isModerator:      () => ['admin', 'moderator'].includes(get().profile?.role ?? ''),
  isArtisanVerified:() => get().profile?.role === 'artisan_verified',
  isArtisanPending: () => get().profile?.role === 'artisan_pending',
}));

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
 *  4. Timeout 5s : si onAuthStateChange ne répond pas (Supabase indisponible,
 *     réseau hors ligne), l'UI est débloquée en passant à 'unauthenticated'.
 *     L'utilisateur peut naviguer sur les pages publiques.
 *
 *  5. cleanup : subscription.unsubscribe() + clearTimeout au démontage.
 *     `mounted` empêche toute mutation de store après démontage.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import type { Profile } from '@/types';

/** Durée avant déblocage forcé de l'UI si Supabase ne répond pas */
const AUTH_TIMEOUT_MS = 5_000; // 5s max — Supabase INITIAL_SESSION arrive normalement en < 1s
// 5s (au lieu de 3s) : marge pour les connexions mobiles ou réseaux lents sans
// pénaliser les utilisateurs rapides (le timeout est annulé dès réception de INITIAL_SESSION).

// ─── Purge client-side des cookies Supabase obsolètes ────────────────────────
//
// @supabase/ssr 0.9 utilise le format "base64-<base64url>" pour stocker la session.
// Les anciens cookies des versions 0.3/0.4/0.6 (formats JSON brut, base64l-, ou
// binaire) peuvent déclencher des erreurs ou warnings si @supabase/ssr 0.9 tente
// de les lire.
//
// Le middleware serveur (middleware.ts) purge déjà les cookies corrompus côté
// serveur (Set-Cookie: maxAge=0), mais le NAVIGATEUR continue d'envoyer les
// anciens cookies lors des premières requêtes AVANT que le middleware ne réponde.
// Le client Supabase (createBrowserClient) lit document.cookie directement et
// peut générer des erreurs AVANT toute communication avec le serveur.
//
// Solution : purger les cookies corrompus/invalides dans document.cookie directement,
// AVANT que createClient() soit appelé, à l'initialisation d'AuthProvider.
//
// Formats VALIDES reconnus par @supabase/ssr 0.9 :
//   - base64-<base64url>                (format par défaut 0.9+)
//   - base64l-<len_base36>-<data>       (héritage 0.6 — accepté pour compatibilité)
//   - {"access_token":"eyJ..."}         (JSON brut héritage 0.3/0.4)
//
// Formats INVALIDES → purge immédiate :
//   - Tout autre format (binaire, URL-encodé non-JSON, etc.)
//
// Cette purge est IDEMPOTENTE et ne touche JAMAIS les cookies valides.

function purgeStaleSupabaseCookiesClientSide(): void {
  if (typeof document === 'undefined') return; // SSR safety

  const allCookies = document.cookie.split(';').map(c => {
    const idx = c.indexOf('=');
    return idx === -1
      ? { name: c.trim(), value: '' }
      : { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() };
  });

  // Trouver les cookies principaux Supabase (sb-*-auth-token, sans chunk .N)
  const authTokenCookies = allCookies.filter(
    c => /^sb-.+-auth-token$/.test(c.name)
  );

  for (const cookie of authTokenCookies) {
    let isValid = false;

    try {
      const decoded = decodeURIComponent(cookie.value);

      if (decoded.startsWith('base64-')) {
        // Format 0.9+ : base64-<base64url>
        // Valide si le payload est non vide (le SDK valide le contenu lui-même)
        isValid = decoded.length > 'base64-'.length;
      } else if (decoded.startsWith('base64l-')) {
        // Format héritage 0.6 : base64l-<len>-<data>
        // Accepter — sera remplacé par base64- lors du prochain login avec 0.9
        isValid = true;
      } else {
        // Format JSON brut (héritage 0.3/0.4) :
        // {"access_token":"eyJ...","refresh_token":"..."}
        const parsed = JSON.parse(decoded) as Record<string, unknown>;
        const hasValidJwt =
          typeof parsed.access_token === 'string' &&
          parsed.access_token.startsWith('eyJ');
        isValid = hasValidJwt;
      }
    } catch {
      // Décodage ou parse échoué → cookie binaire/corrompu
      isValid = false;
    }

    if (!isValid) {
      // Expirer le cookie principal
      const expireStr = `${cookie.name}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = expireStr;

      // Expirer aussi les chunks associés (.0, .1, .2 …)
      for (const c of allCookies) {
        if (c.name.startsWith(`${cookie.name}.`)) {
          document.cookie = `${c.name}=; path=/; max-age=0; SameSite=Lax`;
        }
      }

      console.info(
        `[AuthProvider] Cookie obsolète supprimé : ${cookie.name}. ` +
        'Reconnectez-vous pour créer un nouveau cookie de session valide.'
      );
    }
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { _setAuth } = useAuthStore();
  // Stable ref so the effect never needs to re-run when _setAuth identity changes
  const setAuthRef = useRef(_setAuth);
  useEffect(() => { setAuthRef.current = _setAuth; }, [_setAuth]);

  useEffect(() => {
    // Purger les cookies Supabase obsolètes AVANT d'initialiser le client.
    // Évite le warning "@supabase/ssr: Detected stale cookie data" causé par
    // les anciens cookies laissés par @supabase/ssr 0.3/0.4.
    purgeStaleSupabaseCookiesClientSide();

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
        setAuthRef.current('unauthenticated', null, null);
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
        // Colonnes explicites — jamais de select('*') sur profiles.
        // La policy RLS "profiles_select_own_or_admin" garantit que seul
        // l'utilisateur connecté peut lire son propre profil complet ici.
        // .maybeSingle() renvoie null (pas 406) quand aucune ligne ne correspond.
        // .single() levait PGRST116 / HTTP 406 si le profil n'existe pas encore
        // (ex : utilisateur créé dans Auth mais trigger DB pas encore exécuté).
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, phone, role, status, legal_consent, legal_consent_at, created_at, updated_at, home_sector_id')
          .eq('id', userId)
          .maybeSingle();

        if (!mounted) return;

        if (!error && data) {
          setAuthRef.current('authenticated', userId, data as Profile);
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
          setAuthRef.current('authenticated', userId, null);
        }
      } catch (e) {
        if (!mounted) return;
        console.error('[AuthProvider] fetchProfile exception:', e);
        // Exception réseau : idem, rester 'authenticated'
        setAuthRef.current('authenticated', userId, null);
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
              setAuthRef.current('authenticated', session.user.id, null);
              fetchProfile(session.user.id);
            } else {
              clearTimeout(timeout);
              setAuthRef.current('unauthenticated', null, null);
            }
            break;

          // ── Connexion réussie ──────────────────────────────────────────────
          case 'SIGNED_IN':
            if (session?.user) {
              setAuthRef.current('authenticated', session.user.id, null);
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
                setAuthRef.current('authenticated', newUserId, null);
                fetchProfile(newUserId);
              }
              // Même userId → rien à faire (token renouvelé côté Supabase,
              // profile et phase déjà à jour dans le store)
            }
            break;

          // ── Déconnexion ────────────────────────────────────────────────────
          case 'SIGNED_OUT':
            clearTimeout(timeout);
            setAuthRef.current('unauthenticated', null, null);
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
  }, []);

  return <>{children}</>;
}

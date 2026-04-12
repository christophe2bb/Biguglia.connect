/**
 * Tests unitaires — src/lib/auth-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  État initial
 *    - phase = 'initializing', userId = null, profile = null
 *    - loading = true (getter calculé)
 *    - isAuthenticated = false (getter calculé)
 *
 *  _setAuth() — transition atomique
 *    - initializing → authenticated (userId défini, profile null)
 *    - initializing → authenticated (userId + profile)
 *    - initializing → unauthenticated
 *    - authenticated → unauthenticated (SIGNED_OUT)
 *    - unauthenticated → authenticated (SIGNED_IN)
 *    - authenticated → authenticated (TOKEN_REFRESHED, même userId)
 *    - Atomicité : les 4 champs changent en une seule opération
 *    - loading et isAuthenticated cohérents après chaque transition
 *
 *  setProfile()
 *    - Met à jour profile sans changer phase
 *    - Si phase=initializing + profile non-null → passe à authenticated
 *    - Si phase=authenticated + profile=null → reste authenticated
 *    - Met à jour userId depuis profile.id
 *
 *  setLoading() — rétro-compatibilité
 *    - setLoading(false) depuis initializing → passe à unauthenticated
 *    - setLoading(false) depuis authenticated → aucun changement
 *    - setLoading(true) → retour à initializing
 *
 *  isAuthenticated getter
 *    - false en initializing et unauthenticated
 *    - true en authenticated (même si profile=null)
 *
 *  loading getter
 *    - true en initializing uniquement
 *    - false en authenticated et unauthenticated
 *
 *  Sélecteurs de rôle
 *    - isAdmin()           : true seulement pour role='admin'
 *    - isModerator()       : true pour 'admin' et 'moderator'
 *    - isArtisanVerified() : true pour 'artisan_verified'
 *    - isArtisanPending()  : true pour 'artisan_pending'
 *    - Tous false si profile=null
 *    - Tous false en unauthenticated
 *
 *  Cohérence des invariants
 *    - initializing : loading=true, isAuthenticated=false, userId=null, profile=null
 *    - authenticated : loading=false, isAuthenticated=true
 *    - unauthenticated : loading=false, isAuthenticated=false, userId=null, profile=null
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, type AuthPhase } from '../auth-store';
import type { Profile } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Profil minimal valide */
const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  email: 'test@biguglia.fr',
  full_name: 'Test User',
  role: 'resident',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  legal_consent: true,
  ...overrides,
});

const ADMIN_PROFILE    = makeProfile({ role: 'admin' });
const MOD_PROFILE      = makeProfile({ role: 'moderator' });
const ARTISAN_PROFILE  = makeProfile({ role: 'artisan_verified' });
const PENDING_PROFILE  = makeProfile({ role: 'artisan_pending' });
const RESIDENT_PROFILE = makeProfile({ role: 'resident' });

/** Réinitialise le store avant chaque test */
function resetStore() {
  useAuthStore.setState({
    phase:           'initializing',
    userId:          null,
    profile:         null,
    loading:         true,
    isAuthenticated: false,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
});

// ─── État initial ─────────────────────────────────────────────────────────────

describe('État initial', () => {
  it('phase = initializing', () => {
    expect(useAuthStore.getState().phase).toBe('initializing');
  });

  it('userId = null', () => {
    expect(useAuthStore.getState().userId).toBeNull();
  });

  it('profile = null', () => {
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('loading = true (getter calculé)', () => {
    expect(useAuthStore.getState().loading).toBe(true);
  });

  it('isAuthenticated = false (getter calculé)', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ─── _setAuth() — transitions ─────────────────────────────────────────────────

describe('_setAuth()', () => {
  const { _setAuth } = useAuthStore.getState();

  describe('initializing → authenticated', () => {
    it('avec userId seul (profil pas encore chargé)', () => {
      _setAuth('authenticated', 'uid-1', null);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('authenticated');
      expect(s.userId).toBe('uid-1');
      expect(s.profile).toBeNull();
      expect(s.loading).toBe(false);
      expect(s.isAuthenticated).toBe(true);
    });

    it('avec userId + profil (après fetchProfile réussi)', () => {
      _setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('authenticated');
      expect(s.userId).toBe('uid-1');
      expect(s.profile).toEqual(RESIDENT_PROFILE);
      expect(s.isAuthenticated).toBe(true);
    });
  });

  describe('initializing → unauthenticated', () => {
    it('tous les champs sont réinitialisés', () => {
      _setAuth('unauthenticated', null, null);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('unauthenticated');
      expect(s.userId).toBeNull();
      expect(s.profile).toBeNull();
      expect(s.loading).toBe(false);
      expect(s.isAuthenticated).toBe(false);
    });
  });

  describe('authenticated → unauthenticated (SIGNED_OUT)', () => {
    it('efface userId et profile', () => {
      _setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
      _setAuth('unauthenticated', null, null);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('unauthenticated');
      expect(s.userId).toBeNull();
      expect(s.profile).toBeNull();
      expect(s.isAuthenticated).toBe(false);
    });
  });

  describe('unauthenticated → authenticated (SIGNED_IN)', () => {
    it('établit la session', () => {
      _setAuth('unauthenticated', null, null);
      _setAuth('authenticated', 'uid-2', null);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('authenticated');
      expect(s.userId).toBe('uid-2');
      expect(s.isAuthenticated).toBe(true);
    });
  });

  describe('authenticated → authenticated (profil chargé après fetch)', () => {
    it('met à jour profile sans toucher phase ni userId', () => {
      _setAuth('authenticated', 'uid-1', null);
      _setAuth('authenticated', 'uid-1', ADMIN_PROFILE);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('authenticated');
      expect(s.userId).toBe('uid-1');
      expect(s.profile).toEqual(ADMIN_PROFILE);
      expect(s.isAuthenticated).toBe(true);
    });
  });

  describe('Atomicité', () => {
    it('les 5 champs changent ensemble en une seule opération', () => {
      // On ne peut pas tester directement l'atomicité dans Zustand en dehors
      // d'un vrai environnement React, mais on vérifie la cohérence post-transition.
      _setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
      const s = useAuthStore.getState();
      // Tous les champs doivent être cohérents simultanément
      expect(s.phase).toBe('authenticated');
      expect(s.loading).toBe(false);
      expect(s.isAuthenticated).toBe(true);
      expect(s.userId).toBe('uid-1');
      expect(s.profile?.id).toBe('user-123');
    });

    it('phase=authenticated avec erreur DB : profile=null mais isAuthenticated=true', () => {
      // Simule fetchProfile échoué : l'utilisateur est connecté mais profil indisponible
      _setAuth('authenticated', 'uid-1', null);
      const s = useAuthStore.getState();
      expect(s.phase).toBe('authenticated');
      expect(s.isAuthenticated).toBe(true);
      expect(s.profile).toBeNull(); // profil manquant (erreur DB)
      expect(s.userId).toBe('uid-1'); // mais userId connu
    });
  });
});

// ─── setProfile() ─────────────────────────────────────────────────────────────

describe('setProfile()', () => {
  it('met à jour profile sans changer phase quand authenticated', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    useAuthStore.getState().setProfile(ADMIN_PROFILE);
    const s = useAuthStore.getState();
    expect(s.phase).toBe('authenticated');
    expect(s.profile).toEqual(ADMIN_PROFILE);
  });

  it('met à jour userId depuis profile.id', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    useAuthStore.getState().setProfile(makeProfile({ id: 'uid-updated' }));
    expect(useAuthStore.getState().userId).toBe('uid-updated');
  });

  it('phase=initializing + profile non-null → passe à authenticated', () => {
    // État initial = initializing
    useAuthStore.getState().setProfile(RESIDENT_PROFILE);
    const s = useAuthStore.getState();
    expect(s.phase).toBe('authenticated');
    expect(s.loading).toBe(false);
    expect(s.isAuthenticated).toBe(true);
  });

  it('phase=authenticated + setProfile(null) → reste authenticated', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    useAuthStore.getState().setProfile(null);
    const s = useAuthStore.getState();
    // Phase reste authenticated — null profil ≠ déconnexion
    expect(s.phase).toBe('authenticated');
    expect(s.isAuthenticated).toBe(true);
    expect(s.profile).toBeNull();
  });

  it('phase=unauthenticated + setProfile(null) → reste unauthenticated', () => {
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    useAuthStore.getState().setProfile(null);
    expect(useAuthStore.getState().phase).toBe('unauthenticated');
  });
});

// ─── setLoading() — rétro-compatibilité ──────────────────────────────────────

describe('setLoading() — rétro-compat', () => {
  it('setLoading(false) depuis initializing → passe à unauthenticated', () => {
    // Comportement legacy : le timeout du AuthProvider appelait setLoading(false)
    useAuthStore.getState().setLoading(false);
    const s = useAuthStore.getState();
    expect(s.phase).toBe('unauthenticated');
    expect(s.loading).toBe(false);
    expect(s.isAuthenticated).toBe(false);
  });

  it('setLoading(false) depuis authenticated → aucun changement de phase', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().phase).toBe('authenticated');
  });

  it('setLoading(false) depuis unauthenticated → aucun changement', () => {
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().phase).toBe('unauthenticated');
  });

  it('setLoading(true) → retour à initializing', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    useAuthStore.getState().setLoading(true);
    const s = useAuthStore.getState();
    expect(s.phase).toBe('initializing');
    expect(s.loading).toBe(true);
    expect(s.isAuthenticated).toBe(false);
  });
});

// ─── Getters calculés ─────────────────────────────────────────────────────────

describe('Getter loading', () => {
  it('true uniquement en initializing', () => {
    expect(useAuthStore.getState().loading).toBe(true);
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().loading).toBe(false);
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    expect(useAuthStore.getState().loading).toBe(false);
  });
});

describe('Getter isAuthenticated', () => {
  it('false en initializing', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('true en authenticated (même si profile=null)', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('true en authenticated avec profil', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('false en unauthenticated', () => {
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ─── Sélecteurs de rôle ───────────────────────────────────────────────────────

describe('isAdmin()', () => {
  it('true pour role=admin', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', ADMIN_PROFILE);
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('false pour role=moderator', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', MOD_PROFILE);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('false pour role=resident', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('false si profile=null', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('false en unauthenticated', () => {
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});

describe('isModerator()', () => {
  it('true pour role=admin', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', ADMIN_PROFILE);
    expect(useAuthStore.getState().isModerator()).toBe(true);
  });

  it('true pour role=moderator', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', MOD_PROFILE);
    expect(useAuthStore.getState().isModerator()).toBe(true);
  });

  it('false pour role=resident', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    expect(useAuthStore.getState().isModerator()).toBe(false);
  });

  it('false si profile=null', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isModerator()).toBe(false);
  });
});

describe('isArtisanVerified()', () => {
  it('true pour role=artisan_verified', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', ARTISAN_PROFILE);
    expect(useAuthStore.getState().isArtisanVerified()).toBe(true);
  });

  it('false pour role=artisan_pending', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', PENDING_PROFILE);
    expect(useAuthStore.getState().isArtisanVerified()).toBe(false);
  });

  it('false si profile=null', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isArtisanVerified()).toBe(false);
  });
});

describe('isArtisanPending()', () => {
  it('true pour role=artisan_pending', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', PENDING_PROFILE);
    expect(useAuthStore.getState().isArtisanPending()).toBe(true);
  });

  it('false pour role=artisan_verified', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', ARTISAN_PROFILE);
    expect(useAuthStore.getState().isArtisanPending()).toBe(false);
  });

  it('false si profile=null', () => {
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isArtisanPending()).toBe(false);
  });
});

// ─── Invariants de cohérence ──────────────────────────────────────────────────

describe('Invariants de cohérence', () => {
  const phases: AuthPhase[] = ['initializing', 'authenticated', 'unauthenticated'];

  it('loading est l\'inverse de (phase !== initializing)', () => {
    phases.forEach(phase => {
      if (phase === 'authenticated') {
        useAuthStore.getState()._setAuth(phase, 'uid-1', null);
      } else {
        useAuthStore.getState()._setAuth(phase, null, null);
      }
      const s = useAuthStore.getState();
      expect(s.loading).toBe(phase === 'initializing');
    });
  });

  it('isAuthenticated est vrai seulement en authenticated', () => {
    phases.forEach(phase => {
      if (phase === 'authenticated') {
        useAuthStore.getState()._setAuth(phase, 'uid-1', null);
      } else {
        useAuthStore.getState()._setAuth(phase, null, null);
      }
      const s = useAuthStore.getState();
      expect(s.isAuthenticated).toBe(phase === 'authenticated');
    });
  });

  it('unauthenticated : userId et profile sont toujours null', () => {
    useAuthStore.getState()._setAuth('unauthenticated', null, null);
    const s = useAuthStore.getState();
    expect(s.userId).toBeNull();
    expect(s.profile).toBeNull();
  });

  it('initializing : userId et profile sont toujours null', () => {
    // État initial du store (resetStore appelé dans beforeEach)
    const s = useAuthStore.getState();
    expect(s.userId).toBeNull();
    expect(s.profile).toBeNull();
    expect(s.loading).toBe(true);
    expect(s.isAuthenticated).toBe(false);
  });

  it('Séquence complète login → logout → login', () => {
    const { _setAuth } = useAuthStore.getState();

    // Login
    _setAuth('authenticated', 'uid-1', null);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Profile chargé
    _setAuth('authenticated', 'uid-1', RESIDENT_PROFILE);
    expect(useAuthStore.getState().profile?.id).toBe('user-123');

    // Logout
    _setAuth('unauthenticated', null, null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();

    // Re-login avec un autre user
    _setAuth('authenticated', 'uid-2', makeProfile({ id: 'uid-2', role: 'admin' }));
    expect(useAuthStore.getState().userId).toBe('uid-2');
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('Erreur DB sur fetchProfile : authenticated mais profile=null', () => {
    // Ce cas simule INITIAL_SESSION valide + fetchProfile qui échoue
    useAuthStore.getState()._setAuth('authenticated', 'uid-1', null);
    const s = useAuthStore.getState();
    // L'utilisateur EST connecté
    expect(s.phase).toBe('authenticated');
    expect(s.isAuthenticated).toBe(true);
    expect(s.userId).toBe('uid-1');
    // Mais le profil est indisponible (erreur réseau, pas une déconnexion)
    expect(s.profile).toBeNull();
    // Les sélecteurs de rôle sont false (profil inconnu)
    expect(s.isAdmin()).toBe(false);
    expect(s.isModerator()).toBe(false);
    // loading est false (on sait que l'init est terminée)
    expect(s.loading).toBe(false);
  });
});

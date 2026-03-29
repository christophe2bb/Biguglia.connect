'use client';

import { create } from 'zustand';
import { Profile } from '@/types';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isArtisanVerified: () => boolean;
  isArtisanPending: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  loading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().profile?.role === 'admin',
  isModerator: () => ['admin', 'moderator'].includes(get().profile?.role ?? ''),
  isArtisanVerified: () => get().profile?.role === 'artisan_verified',
  isArtisanPending: () => get().profile?.role === 'artisan_pending',
}));

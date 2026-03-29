'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async (userId: string): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('fetchProfile error:', error.message);
          // Si PGRST116 = pas de résultat, ce n'est pas une vraie erreur
          if (error.code === 'PGRST116') {
            setProfile(null);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(data as Profile);
        }
      } catch (e) {
        console.error('fetchProfile exception:', e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    // Initialisation : récupérer la session existante
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('getSession error:', error);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (e) {
        console.error('initAuth error:', e);
        setProfile(null);
        setLoading(false);
      }
    };

    if (!initialized.current) {
      initialized.current = true;
      initAuth();
    }

    // Écouter les changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Ne pas refetch le profil à chaque refresh de token
          const currentProfile = useAuthStore.getState().profile;
          if (!currentProfile) {
            await fetchProfile(session.user.id);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading]);

  return <>{children}</>;
}

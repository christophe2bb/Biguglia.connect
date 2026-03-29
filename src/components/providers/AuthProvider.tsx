'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Timeout de sécurité : si rien ne répond en 5s, on débloque
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthProvider: timeout atteint, déblocage forcé');
        setLoading(false);
      }
    }, 5000);

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (mounted) {
          if (!error && data) {
            setProfile(data as Profile);
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.error('fetchProfile error:', e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    // Récupérer la session immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        clearTimeout(timeout);
        setProfile(null);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        clearTimeout(timeout);
        setProfile(null);
        setLoading(false);
      }
    });

    // Écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        setProfile(null);
        setLoading(false);
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

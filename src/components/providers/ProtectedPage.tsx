'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedPage({ children, adminOnly = false }: Props) {
  const { profile, setProfile, setLoading } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const check = async () => {
      // Si déjà un profil dans le store, c'est bon
      if (profile) {
        if (adminOnly && profile.role !== 'admin') {
          router.push('/');
          return;
        }
        setReady(true);
        return;
      }

      // Sinon, vérifier la session directement
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/connexion');
        return;
      }

      // Récupérer le profil
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!data) {
        router.push('/connexion');
        return;
      }

      // Mettre à jour le store
      setProfile(data as Profile);
      setLoading(false);

      if (adminOnly && (data as Profile).role !== 'admin') {
        router.push('/');
        return;
      }

      setReady(true);
    };

    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
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
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

/**
 * ProtectedPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Garde de route côté client.
 *
 * ARCHITECTURE :
 *  - Un seul fetch DB, déclenché une seule fois quand phase='authenticated'
 *  - adminState géré via ref (pas state) pour éviter les re-renders en boucle
 *  - profile du store utilisé en lecture directe (ref), jamais comme dépendance
 *    du useEffect principal → zéro clignotement
 *
 * ÉTATS :
 *  'idle'       → pas encore démarré
 *  'fetching'   → fetch DB en cours → skeleton
 *  'ok'         → admin/moderator confirmé → afficher children
 *  'denied'     → rôle insuffisant ou erreur → redirect '/'
 *  'no-admin'   → adminOnly=false → afficher children directement
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

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

type GuardStatus = 'idle' | 'fetching' | 'ok' | 'denied' | 'no-admin';

export default function ProtectedPage({ children, adminOnly = false }: Props) {
  // Lire phase + userId depuis le store — PAS profile (évite boucle de re-render)
  const phase  = useAuthStore((s) => s.phase);
  const userId = useAuthStore((s) => s.userId);
  const setProfile = useAuthStore((s) => s.setProfile);

  const router = useRouter();

  // État de la garde — ref pour ne pas déclencher de re-render depuis le fetch
  const [status, setStatus] = useState<GuardStatus>('idle');
  const startedRef = useRef(false); // fetch lancé une seule fois

  useEffect(() => {
    // Attendre la fin d'initialisation
    if (phase === 'initializing') return;

    // Non connecté → /connexion
    if (phase === 'unauthenticated') {
      router.replace('/connexion');
      return;
    }

    // page non-admin → afficher directement
    if (!adminOnly) {
      setStatus('no-admin');
      return;
    }

    // Lancer le fetch une seule fois
    if (startedRef.current) return;
    startedRef.current = true;

    if (!userId) {
      setStatus('denied');
      return;
    }

    setStatus('fetching');

    // Timeout de sécurité 6s
    const timer = setTimeout(() => setStatus('denied'), 6_000);

    void (async () => {
      try {
        const { data, error } = await createClient()
          .from('profiles')
          .select('id, email, full_name, avatar_url, phone, role, status, legal_consent, legal_consent_at, created_at, updated_at, home_sector_id')
          .eq('id', userId)
          .single();

        clearTimeout(timer);

        if (error || !data) {
          // Erreur RLS ou réseau : tenter de lire le profil déjà dans le store
          const storeProfile = useAuthStore.getState().profile;
          if (storeProfile?.role === 'admin' || storeProfile?.role === 'moderator') {
            setStatus('ok');
          } else {
            console.warn('[ProtectedPage] profil inaccessible:', error?.message);
            setStatus('denied');
          }
          return;
        }

        setProfile(data as Profile);
        const role = (data as Profile).role;
        setStatus(role === 'admin' || role === 'moderator' ? 'ok' : 'denied');
      } catch {
        clearTimeout(timer);
        setStatus('denied');
      }
    })();

  // Dépendances minimales : phase et userId suffisent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, userId]);

  // Redirection si accès refusé
  useEffect(() => {
    if (status === 'denied') router.replace('/');
  }, [status, router]);

  // ── Rendu ────────────────────────────────────────────────────────────────

  if (phase === 'initializing')    return <AuthSkeleton />;
  if (phase === 'unauthenticated') return <AuthSkeleton />;
  if (status === 'idle')           return <AuthSkeleton />;
  if (status === 'fetching')       return <AuthSkeleton />;
  if (status === 'denied')         return <AuthSkeleton />;

  return <>{children}</>;
}

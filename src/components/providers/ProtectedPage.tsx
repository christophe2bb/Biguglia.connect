'use client';

/**
 * ProtectedPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Garde de route côté client — pages authentifiées NON-admin.
 *
 * ARCHITECTURE :
 *  - Lit uniquement `phase` depuis le store (jamais `profile`)
 *  - Affiche un skeleton pendant l'initialisation
 *  - Redirige vers /connexion si la session est absente
 *  - Aucune logique admin : les pages /admin/* sont protégées côté serveur
 *    par verifyAdminLayout() dans src/app/admin/layout.tsx
 *
 * NOTE : le prop `adminOnly` a été supprimé (inutile — double-fetch causait
 * un clignotement en boucle sur la page /admin).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface Props {
  children: React.ReactNode;
  /** @deprecated Ignoré — la protection admin est gérée côté serveur. */
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

export default function ProtectedPage({ children }: Props) {
  const phase = useAuthStore((s) => s.phase);
  const router = useRouter();

  useEffect(() => {
    if (phase === 'unauthenticated') {
      router.replace('/connexion');
    }
  }, [phase, router]);

  // Attendre la fin d'initialisation
  if (phase === 'initializing')    return <AuthSkeleton />;
  if (phase === 'unauthenticated') return <AuthSkeleton />;

  return <>{children}</>;
}

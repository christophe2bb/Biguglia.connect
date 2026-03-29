'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedPage({ children, adminOnly = false }: Props) {
  const { profile, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // attendre
    if (!profile) { router.push('/connexion'); return; }
    if (adminOnly && profile.role !== 'admin') { router.push('/'); return; }
  }, [loading, profile, adminOnly, router]);

  // Skeleton pendant chargement
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!profile) return null;
  if (adminOnly && profile.role !== 'admin') return null;

  return <>{children}</>;
}

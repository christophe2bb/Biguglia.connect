import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes avis | Biguglia Connect',
  robots: { index: false, follow: false },
};

// Lazy-load the heavy avis client (527 lines, Supabase client)
const AvisClient = dynamic(
  () => import('./AvisClient'),
  {
    loading: () => (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 flex-1 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    ),
    ssr: false,
  }
);

export default function MesAvisPage() {
  return <AvisClient />;
}

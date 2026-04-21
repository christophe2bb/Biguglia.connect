'use client';
import dynamic from 'next/dynamic';

const ModifierClient = dynamic(
  () => import('./ModifierClient'),
  {
    loading: () => (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-56 bg-gray-100 rounded-xl animate-pulse" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    ),
    ssr: false,
  }
);

export default function ModifierLoader() {
  return <ModifierClient />;
}

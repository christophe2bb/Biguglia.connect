'use client';
// RechercheLoader — Client Component wrapper (Next.js 15: ssr:false requires 'use client')
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

function RechercheShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-12 bg-gray-100 rounded-2xl animate-pulse mb-4" />
          <div className="flex gap-2 overflow-x-auto">
            {[80, 90, 100, 85, 95, 75].map((w, i) => (
              <div key={i} className="h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    </div>
  );
}

const RechercheClient = dynamic(() => import('./_client'), {
  ssr: false,
  loading: () => <RechercheShell />,
});

export default function RechercheLoader() {
  return <RechercheClient />;
}

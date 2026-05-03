'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton — Uses router.back() if there's browser history,
 * otherwise falls back to /evenements.
 * Compact style to fit in the sticky nav bar.
 */
export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/evenements');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-gray-600 hover:text-purple-700 font-semibold text-sm transition-colors px-2 py-1 rounded-lg hover:bg-purple-50 flex-shrink-0"
      aria-label="Retour aux événements"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Retour</span>
    </button>
  );
}

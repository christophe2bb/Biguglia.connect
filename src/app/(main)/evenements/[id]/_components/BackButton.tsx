'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton — Uses router.back() if there's browser history (came from our app),
 * otherwise falls back to /evenements.
 */
export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // If we have a previous history entry within the app, go back
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/evenements');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Retour
    </button>
  );
}

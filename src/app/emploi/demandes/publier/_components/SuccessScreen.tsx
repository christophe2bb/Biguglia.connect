'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface Props {
  publishedSlug: string | null;
  onReset: () => void;
}

export function SuccessScreen({ publishedSlug, onReset }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Demande publiée !</h2>
        <p className="text-gray-500 mb-8 text-sm">
          Votre profil est maintenant visible. Les employeurs de Biguglia peuvent vous contacter.
        </p>

        <div className="flex flex-col gap-3">
          {publishedSlug && (
            <Link
              href={`/emploi/demandes/${publishedSlug}`}
              className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
            >
              Voir mon profil →
            </Link>
          )}
          <Link
            href="/emploi/demandes"
            className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            Retour aux demandes
          </Link>
          <button
            onClick={onReset}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            Déposer une autre demande
          </button>
        </div>
      </div>
    </div>
  );
}

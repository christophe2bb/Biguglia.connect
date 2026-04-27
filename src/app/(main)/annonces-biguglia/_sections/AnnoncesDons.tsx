import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';

interface AnnoncesDonsProps {
  donCount: number;
}

export default function AnnoncesDons({ donCount }: AnnoncesDonsProps) {
  return (
    <section className="bg-gradient-to-br from-amber-50 to-emerald-50 rounded-3xl border border-amber-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🎁</span>
        <h2 className="text-xl font-black text-gray-900">
          Dons gratuits à {GEO.city}
        </h2>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-5 max-w-2xl">
        L&apos;économie circulaire est très active à Biguglia. Plutôt que de jeter, de nombreux habitants donnent
        gratuitement leurs objets dont ils n&apos;ont plus besoin. Meubles, électroménager, vêtements, livres,
        jouets — tout est possible. C&apos;est bon pour l&apos;environnement et ça renforce les liens de voisinage.
        {donCount > 0 ? ` ${donCount} dons gratuits disponibles en ce moment.` : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/annonces?type=don"
          className="inline-flex items-center gap-2 bg-amber-500 text-white font-black px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-colors shadow-sm">
          🎁 Voir les dons gratuits <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/materiel"
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white transition-colors">
          🛠️ Matériel partagé entre voisins
        </Link>
      </div>
    </section>
  );
}

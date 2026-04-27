import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';
import type { ReactNode } from 'react';

interface AnnoncesHeroProps {
  total:     number;
  donCount:  number;
  /** Slot optionnel rendu avant le badge — utilisé pour le fil d'Ariane. */
  children?: ReactNode;
}

export default function AnnoncesHero({ total, donCount, children }: AnnoncesHeroProps) {
  return (
    <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05] bg-dot-grid-md" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {children}
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
          <MapPin className="w-3.5 h-3.5 text-white/80" />
          <span className="text-white/90 text-xs font-bold">
            {total > 0 ? `${total} annonces actives` : 'Annonces gratuites'} · {GEO.city} · {GEO.postalCode}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
          Petites Annonces<br />
          <span className="text-emerald-300">à Biguglia</span>
        </h1>
        <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
          Vendez, achetez, donnez ou échangez avec vos voisins de {GEO.city} et de Haute-Corse.
          {total > 0 ? ` ${total} annonces actives` : ' Des annonces'} — mobilier, électronique,
          vêtements, véhicules et bien plus. 100 % gratuit.
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
          {[
            { value: total    > 0 ? `${total}`    : '—', label: 'Annonces actives' },
            { value: donCount > 0 ? `${donCount}` : '—', label: 'Dons gratuits' },
            { value: '0 €',                               label: 'Frais pour tous' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/60 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/annonces"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-emerald-50 transition-colors shadow-md">
            Voir toutes les annonces <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/annonces/nouvelle"
            className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
            Déposer une annonce gratuite
          </Link>
        </div>
      </div>
    </section>
  );
}

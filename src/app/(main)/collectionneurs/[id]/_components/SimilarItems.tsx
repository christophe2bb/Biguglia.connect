

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MODE_CONFIG, type CollectionItem } from '@/lib/collectionneurs-config';
import { cn } from '@/lib/utils';

interface Props {
  similar: CollectionItem[];
}

export function SimilarItems({ similar }: Props) {
  if (similar.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">
          Objets similaires
        </h2>
        <Link
          href="/collectionneurs"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {similar.map(sim => {
          const simMode  = MODE_CONFIG[sim.mode] || MODE_CONFIG.vente;
          const SimIcon  = simMode.icon;
          const simPhoto = sim.photos?.find(p => p.is_cover) || sim.photos?.[0];

          return (
            <Link
              key={sim.id}
              href={`/collectionneurs/${sim.id}`}
              className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-sm transition-colors"
            >
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                {simPhoto ? (
                  <Image
                    src={simPhoto.url ?? ''}
                    alt={sim.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                    📦
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{sim.title}</p>
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full',
                  simMode.bg, simMode.color,
                )}>
                  <SimIcon className="w-2.5 h-2.5" />
                  {sim.mode === 'vente' && sim.price != null
                    ? (sim.price === 0 ? 'Gratuit' : `${sim.price} €`)
                    : simMode.label
                  }
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

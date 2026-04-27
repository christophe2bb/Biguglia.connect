import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { GEO } from '@/lib/seo/local-data';

interface AnnonceRow {
  id:           string;
  title:        string;
  price:        number | null;
  category:     string | null;
  published_at: string | null;
  listing_type: string | null;
}

interface AnnoncesRecentesProps {
  annonces: AnnonceRow[];
}

const LISTING_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vehicule:       { label: 'Véhicule',        emoji: '🚗', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  electromenager: { label: 'Électroménager',  emoji: '🧺', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  mobilier:       { label: 'Mobilier',        emoji: '🪑', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  electronique:   { label: 'Électronique',    emoji: '📱', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  vetement:       { label: 'Vêtements',       emoji: '👕', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  sport:          { label: 'Sport & Loisirs', emoji: '⚽', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  maison:         { label: 'Maison & Jardin', emoji: '🏡', color: 'bg-green-50 text-green-700 border-green-200' },
  autre:          { label: 'Autre',           emoji: '📦', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatPrice(price: number | null, type: string | null): string {
  if (type === 'don' || price === 0) return 'Don gratuit';
  if (!price) return 'Prix à convenir';
  return `${price.toLocaleString('fr-FR')} €`;
}

export default function AnnoncesRecentes({ annonces }: AnnoncesRecentesProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900">
          Annonces récentes à {GEO.city}
        </h2>
        <Link href="/annonces"
          className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700">
          Voir tout <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {annonces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {annonces.map(a => {
            const cat = LISTING_CATEGORIES[a.category ?? 'autre'] ?? LISTING_CATEGORIES.autre;
            return (
              <Link key={a.id} href={`/annonces/${a.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-[color,border-color,box-shadow,transform] h-full flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm line-clamp-2 flex-1">{a.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-emerald-600">
                      {formatPrice(a.price, a.listing_type)}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDate(a.published_at)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <span className="text-4xl mb-4 block">📦</span>
          <h3 className="font-black text-gray-900 mb-2">Soyez le premier à publier</h3>
          <p className="text-gray-500 text-sm mb-4">
            Déposez votre première annonce gratuitement et touchez tous les habitants de {GEO.city}.
          </p>
          <Link href="/annonces/nouvelle"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors">
            Déposer une annonce <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

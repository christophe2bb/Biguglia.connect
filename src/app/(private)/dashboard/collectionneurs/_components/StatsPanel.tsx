'use client';

import Link from 'next/link';
import { BarChart3, TrendingUp, Eye, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MODE_CONFIG,
  type CollectionMode, type CollectionItem,
} from '@/lib/collectionneurs-config';

interface Stats {
  total: number;
  byMode: Record<CollectionMode, number>;
}

interface StatsPanelProps {
  items: CollectionItem[];
  stats: Stats;
}

export default function StatsPanel({ items, stats }: StatsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Mode breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" /> Répartition par mode
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
            const Icon  = cfg.icon;
            const count = stats.byMode[mode] || 0;
            const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={mode} className={cn('p-4 rounded-2xl border', cfg.bg, cfg.border)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', cfg.color)} />
                  <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', cfg.dot)} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}% du total</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top items */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Top annonces (par vues)
          </h3>
          <div className="space-y-2">
            {[...items]
              .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
              .slice(0, 5)
              .map((item, rank) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-6 h-6 bg-gray-100 rounded-full text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0">
                    {rank + 1}
                  </span>
                  <Link
                    href={`/collectionneurs/${item.id}`}
                    className="flex-1 text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1 transition"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{item.favorites_count || 0}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
        <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Conseils pour booster vos annonces
        </h3>
        <ul className="space-y-2 text-sm text-amber-700">
          {[
            'Ajoutez au moins 5 photos de qualité (vues différentes, détails)',
            'Renseignez la marque, l\'époque et la rareté pour mieux cibler les collectionneurs',
            'Répondez rapidement aux messages — ça améliore votre score de réactivité',
            'Indiquez honnêtement les défauts — la transparence inspire confiance',
            'Utilisez des tags précis pour apparaître dans plus de recherches',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

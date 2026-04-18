/**
 * AdminArtisansBanner — bannière de raccourci vers la gestion artisans.
 * Chargé dynamiquement depuis admin/page.tsx (lazy) pour alléger le bundle initial.
 */

import Link from 'next/link';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

interface AdminArtisansBannerProps {
  stats: AdminDashboardStats | null;
}

export default function AdminArtisansBanner({ stats }: AdminArtisansBannerProps) {
  const pending = stats?.pending_artisans ?? 0;

  return (
    <Link href="/admin/artisans">
      <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group ${
        pending > 0
          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
          pending > 0 ? 'bg-orange-100' : 'bg-green-100'
        }`}>
          {pending > 0
            ? <AlertTriangle className="w-6 h-6 text-orange-600" />
            : <CheckCircle    className="w-6 h-6 text-green-600" />
          }
        </div>

        <div className="flex-1">
          {pending > 0 ? (
            <>
              <p className="font-bold text-orange-900 text-base">
                {pending} dossier{pending > 1 ? 's' : ''} artisan en attente
              </p>
              <p className="text-sm text-orange-700 mt-0.5">
                Cliquez pour ouvrir la page de gestion et valider les profils.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-green-800 text-base">Aucune demande artisan en attente ✓</p>
              <p className="text-sm text-green-600 mt-0.5">Cliquez pour gérer les artisans vérifiés.</p>
            </>
          )}
        </div>

        <div className={`flex-shrink-0 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
          pending > 0
            ? 'bg-orange-600 group-hover:bg-orange-700'
            : 'bg-green-600 group-hover:bg-green-700'
        }`}>
          <Wrench className="w-4 h-4" /> Gérer les artisans
        </div>
      </div>
    </Link>
  );
}

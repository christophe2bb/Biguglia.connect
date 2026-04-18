

/**
 * UserStatsBar — Bande de statistiques rapides pour la liste des utilisateurs.
 * Composant pur, sans fetch.
 */

import { Users, Shield, Clock, UserX } from 'lucide-react';

interface UserStatsBarProps {
  total: number;
  artisansPending: number;
  suspended: number;
  admins: number;
}

export default function UserStatsBar({ total, artisansPending, suspended, admins }: UserStatsBarProps) {
  const stats = [
    { icon: Users,   label: 'Total',             value: total,           color: 'text-gray-700',   bg: 'bg-gray-50' },
    { icon: Clock,   label: 'Artisans en attente', value: artisansPending, color: 'text-amber-700',  bg: 'bg-amber-50' },
    { icon: UserX,   label: 'Suspendus',           value: suspended,       color: 'text-red-700',    bg: 'bg-red-50' },
    { icon: Shield,  label: 'Admins / Modos',      value: admins,          color: 'text-brand-700',  bg: 'bg-brand-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3`}>
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

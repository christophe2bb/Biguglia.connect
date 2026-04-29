/**
 * AdminNavGrid — grille de navigation des sections admin.
 * Composant purement présentatif : reçoit les stats pour les badges en props.
 */

import Link from 'next/link';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

interface AdminNavGridProps {
  stats: AdminDashboardStats | null;
}

interface NavItem {
  href:      string;
  label:     string;
  desc:      string;
  icon:      string;
  highlight?: boolean;
  hasBadge?:  boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/stats',        label: 'Statistiques',               desc: 'Graphiques & activité complète',                                  icon: '📊', highlight: true  },
  { href: '/admin/artisans',     label: 'Gestion artisans',           desc: 'Valider, refuser, suspendre',                                     icon: '⚒️'  },
  { href: '/admin/utilisateurs', label: 'Utilisateurs',               desc: 'Gérer les comptes',                                               icon: '👥'  },
  { href: '/admin/messages',     label: 'Messages',                   desc: 'Voir toutes les conversations membres',                            icon: '💬'  },
  { href: '/admin/contenu',      label: 'Contenu',                    desc: 'Annonces, forum, avis, matériel',                                 icon: '📋'  },
  { href: '/admin/moderation',   label: 'Modération',                 desc: 'File de validation des publications',                              icon: '🛡️', hasBadge: true  },
  { href: '/admin/signalements', label: 'Signalements',               desc: 'Modérer le contenu',                                              icon: '🚩'  },
  { href: '/admin/confiance',    label: 'Confiance & Réputation',     desc: 'Modérer les avis, membres à risque, badges',                      icon: '🛡️'  },
  { href: '/admin/migration',    label: 'Migration DB',               desc: 'Tables thèmes (collectionneurs, promenades, événements)',          icon: '🗄️'  },
  { href: '/admin/spec',         label: 'Spécification fonctionnelle',desc: 'Cahier des charges Collectionneurs v2.0 — état du développement',  icon: '📋'  },
  { href: '/admin/securite',     label: 'Sécurité & Cloudflare',      desc: 'Guide Cloudflare WAF, anti-DDoS, headers',                        icon: '🛡️'  },
  { href: '/admin/logs',         label: 'Journal des actions',        desc: 'Traçabilité de toutes les mutations admin',                        icon: '📋'  },
];

export default function AdminNavGrid({ stats }: AdminNavGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      {NAV_ITEMS.map(({ href, label, desc, icon, highlight, hasBadge }) => {
        const badge   = hasBadge ? (stats?.pending_moderation ?? 0) : undefined;
        const isAlert = highlight || (hasBadge && (stats?.pending_moderation ?? 0) > 0);

        return (
          <Link key={href} href={href}>
            <div className={`relative bg-white rounded-2xl border p-5 hover:shadow-sm transition-colors cursor-pointer ${
              isAlert ? 'border-brand-300 bg-brand-50/30' : 'border-gray-100 hover:border-gray-200'
            }`}>
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.4rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse shadow">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              <div className="text-2xl mb-2">{icon}</div>
              <div className={`font-semibold ${isAlert ? 'text-brand-700' : 'text-gray-900'}`}>{label}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

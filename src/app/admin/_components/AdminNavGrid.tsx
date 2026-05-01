/**
 * AdminNavGrid — grille de navigation des sections admin.
 * Refonte : sections groupées (Gestion / Modération / Outils), hiérarchie claire.
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
  color:     string;   // Tailwind border + text accent
  hasBadge?: boolean;
  badgeColor?: string;
}

// ── Section Gestion quotidienne ───────────────────────────────────────────────
const GESTION_ITEMS: NavItem[] = [
  {
    href: '/admin/artisans', label: 'Artisans', desc: 'Valider, refuser, suspendre les profils',
    icon: '⚒️', color: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    href: '/admin/utilisateurs', label: 'Utilisateurs', desc: 'Gérer tous les comptes membres',
    icon: '👥', color: 'border-blue-200 hover:border-blue-400',
  },
  {
    href: '/admin/messages', label: 'Messages', desc: 'Voir toutes les conversations privées',
    icon: '💬', color: 'border-violet-200 hover:border-violet-400',
  },
  {
    href: '/admin/contenu', label: 'Contenu', desc: 'Annonces, forum, avis, matériel',
    icon: '📋', color: 'border-indigo-200 hover:border-indigo-400',
  },
];

// ── Section Modération & Sécurité ─────────────────────────────────────────────
const MODERATION_ITEMS: NavItem[] = [
  {
    href: '/admin/moderation', label: 'Modération', desc: 'File de validation des publications',
    icon: '🛡️', color: 'border-amber-200 hover:border-amber-400',
    hasBadge: true, badgeColor: 'bg-amber-500',
  },
  {
    href: '/admin/signalements', label: 'Signalements', desc: 'Traiter les contenus signalés',
    icon: '🚩', color: 'border-red-200 hover:border-red-400',
  },
  {
    href: '/admin/confiance', label: 'Confiance', desc: 'Avis, badges, membres à risque',
    icon: '⭐', color: 'border-yellow-200 hover:border-yellow-400',
  },
  {
    href: '/admin/logs', label: 'Journal', desc: 'Traçabilité des actions admin',
    icon: '📜', color: 'border-gray-200 hover:border-gray-400',
  },
];

// ── Section Analyse & Outils ──────────────────────────────────────────────────
const OUTILS_ITEMS: NavItem[] = [
  {
    href: '/admin/stats', label: 'Statistiques', desc: 'Graphiques & activité complète',
    icon: '📊', color: 'border-teal-200 hover:border-teal-400',
  },
  {
    href: '/admin/securite', label: 'Sécurité', desc: 'Cloudflare WAF, DDoS, headers',
    icon: '🔐', color: 'border-slate-200 hover:border-slate-400',
  },
  {
    href: '/admin/migration', label: 'Migration DB', desc: 'Tables et migrations Supabase',
    icon: '🗄️', color: 'border-stone-200 hover:border-stone-400',
  },
  {
    href: '/admin/spec', label: 'Spécification', desc: 'Cahier des charges & développement',
    icon: '📐', color: 'border-pink-200 hover:border-pink-400',
  },
];

// ── Composants ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}
    </p>
  );
}

function NavCard({ item, badge }: { item: NavItem; badge?: number }) {
  const hasAlert = badge !== undefined && badge > 0;
  return (
    <Link href={item.href} className="block group">
      <div className={`relative bg-white rounded-2xl border-2 p-4 h-full cursor-pointer transition-all hover:shadow-md ${
        hasAlert ? 'border-red-300 bg-red-50/20' : item.color
      }`}>
        {/* Badge compteur */}
        {hasAlert && (
          <span className={`absolute -top-2 -right-2 min-w-[1.5rem] h-6 px-1.5 rounded-full text-white text-xs font-black flex items-center justify-center shadow-md border-2 border-white animate-pulse ${item.badgeColor ?? 'bg-red-500'}`}>
            {badge! > 99 ? '99+' : badge}
          </span>
        )}
        {/* Icône */}
        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">
          {item.icon}
        </div>
        {/* Texte */}
        <div className={`font-bold text-sm mb-0.5 ${hasAlert ? 'text-red-800' : 'text-gray-900'}`}>
          {item.label}
        </div>
        <div className="text-xs text-gray-500 leading-snug">{item.desc}</div>
      </div>
    </Link>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AdminNavGrid({ stats }: AdminNavGridProps) {
  const pendingMod = stats?.pending_moderation ?? 0;

  return (
    <div className="space-y-6 mb-8">

      {/* Gestion quotidienne */}
      <div>
        <SectionTitle>⚙️ Gestion quotidienne</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GESTION_ITEMS.map(item => (
            <NavCard key={item.href} item={item} />
          ))}
        </div>
      </div>

      {/* Modération & Sécurité */}
      <div>
        <SectionTitle>🛡️ Modération & Sécurité</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODERATION_ITEMS.map(item => (
            <NavCard
              key={item.href}
              item={item}
              badge={item.hasBadge ? pendingMod : undefined}
            />
          ))}
        </div>
      </div>

      {/* Analyse & Outils */}
      <div>
        <SectionTitle>📊 Analyse & Outils</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OUTILS_ITEMS.map(item => (
            <NavCard key={item.href} item={item} />
          ))}
        </div>
      </div>

    </div>
  );
}

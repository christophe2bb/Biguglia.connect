'use client';

import Link from 'next/link';
import {
  Zap, BookmarkCheck, Sparkles, MapPin, TrendingUp, ArrowRight, Shield,
  Building2, UserCheck, Gift, Calendar, MessageSquare, Handshake, Tag,
  Send, Eye, Bell, CheckCircle2, ChevronRight, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CAT_CONFIG } from '../_constants';
import type { Association, AssoCategory } from '../_types';

interface SectorCount {
  id: string;
  slug: string;
  name: string;
  count: number;
}

interface AssociationsSidebarProps {
  assos: Association[];
  filterCat: AssoCategory | 'all';
  setFilterCat: (v: AssoCategory | 'all') => void;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  savedAssos: Set<string>;
  showSavedOnly: boolean;
  setShowSavedOnly: (fn: (prev: boolean) => boolean) => void;
  setShowAdvFilters: (fn: (prev: boolean) => boolean) => void;
  urgentCount: number;
  volunteerCount: number;
  eventsAssosCount: number;
  donationsCount: number;
  totalActive: number;
  sectorCounts: SectorCount[];
  profile: { id: string; full_name: string } | null;
}

export default function AssociationsSidebar({
  assos, filterCat, setFilterCat, filterSector, setFilterSector,
  savedAssos, showSavedOnly: _showSavedOnly, setShowSavedOnly, setShowAdvFilters,
  urgentCount, volunteerCount, eventsAssosCount, donationsCount,
  totalActive, sectorCounts, profile,
}: AssociationsSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

      {/* Besoins urgents */}
      {urgentCount > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5 shadow-sm">
          <h3 className="text-sm font-black text-red-800 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500 animate-pulse" /> Besoins urgents
          </h3>
          <div className="space-y-2">
            {assos.filter(a => a.urgent_need).slice(0, 4).map(a => {
              const cat = CAT_CONFIG[a.category];
              return (
                <a key={a.id} href={`#${a.id}`}
                  className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-red-100 hover:border-red-300 transition-colors group">
                  <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-red-600">{a.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{a.needs.slice(0, 2).join(', ')}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Favoris */}
      {savedAssos.size > 0 && (
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-yellow-800 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-yellow-500" /> Mes favoris
            </h3>
            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{savedAssos.size}</span>
          </div>
          <button onClick={() => { setShowSavedOnly(() => true); setShowAdvFilters(() => false); }}
            className="w-full text-xs font-bold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Voir mes associations sauvegardées
          </button>
        </div>
      )}

      {/* Explorer par catégorie */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" /> Explorer par catégorie
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
            const Icon = conf.icon;
            const count = assos.filter(a => a.category === key).length;
            const isActive = filterCat === key;
            return (
              <button key={key}
                onClick={() => setFilterCat(filterCat === key ? 'all' : key)}
                className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-colors hover:shadow-sm text-xs font-bold',
                  isActive ? `${conf.bg} ${conf.color}` : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200')}>
                <span className="text-xl leading-none">{conf.emoji}</span>
                <Icon className="w-3.5 h-3.5" />
                <span className="leading-tight">{conf.label}</span>
                {count > 0 && <span className={cn('text-[10px] font-semibold', isActive ? conf.color : 'text-gray-400')}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secteurs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-500" /> Par quartier
        </h3>
        <div className="space-y-2">
          {sectorCounts.filter(s => s.count > 0).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Aucun secteur renseigné</p>
          ) : (
            sectorCounts.map(s => (
              <button key={s.id} onClick={() => setFilterSector(filterSector === s.slug ? null : s.slug)}
                className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-colors',
                  filterSector === s.slug ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-gray-200')}>
                <span>{s.name}</span>
                <span className={cn('font-black', filterSector === s.slug ? 'text-violet-600' : 'text-gray-400')}>{s.count}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Vie associative — KPIs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" /> Vie associative
        </h3>
        <div className="space-y-3">
          {[
            { icon: Building2, label: `${totalActive} actives`,       sub: 'à Biguglia',            color: 'text-violet-500', bg: 'bg-violet-50' },
            { icon: UserCheck, label: `${volunteerCount} bénévolat`,  sub: 'places ouvertes',        color: 'text-rose-500',   bg: 'bg-rose-50' },
            { icon: Gift,      label: `${donationsCount} dons`,       sub: 'associations soutenues', color: 'text-amber-500',  bg: 'bg-amber-50' },
            { icon: Calendar,  label: `${eventsAssosCount} événements`, sub: 'en préparation',       color: 'text-pink-500',   bg: 'bg-pink-50' },
          ].map(({ icon: I, label, sub, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                <I className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modules liés */}
      <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-violet-800 mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-violet-500" /> Modules liés
        </h3>
        <div className="space-y-2">
          {[
            { href: '/evenements',    icon: Calendar,      label: 'Événements',   sub: 'Agenda communautaire' },
            { href: '/forum',         icon: MessageSquare, label: 'Forum',         sub: 'Discussions locales' },
            { href: '/coups-de-main', icon: Handshake,     label: 'Coups de main', sub: 'Entraide & bénévolat' },
            { href: '/annonces',      icon: Tag,           label: 'Annonces',      sub: 'Matériel & dons' },
            { href: '/messages',      icon: Send,          label: 'Messages',      sub: 'Contacter une asso' },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors group">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-violet-800 group-hover:text-violet-600">{label}</p>
                <p className="text-[10px] text-violet-500">{sub}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-violet-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* Charte */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-500" /> Charte associations
        </h3>
        <ul className="space-y-2">
          {[
            'Nom, catégorie, description et contact obligatoires',
            'Un seul besoin actif à la fois par type',
            'Dons et sponsors distincts des adhésions',
            'Modération légère — signalement possible',
            "Mise à jour requise si changement d'activité",
          ].map(rule => (
            <li key={rule} className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />{rule}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA non connecté */}
      {!profile && (
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black mb-1">Rejoignez la communauté</h3>
          <p className="text-xs text-purple-200 mb-4 leading-relaxed">Inscrivez-vous pour contacter des associations, proposer votre aide et suivre les besoins locaux.</p>
          <Link href="/connexion"
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-purple-50 transition-colors w-full justify-center shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Se connecter &amp; participer
          </Link>
        </div>
      )}

      {/* Notification nouveaux besoins */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">
        <h3 className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" /> Rester informé
        </h3>
        <p className="text-xs text-emerald-700 mb-3">Activez les notifications pour être alerté des nouveaux besoins et événements associatifs.</p>
        <Link href={profile ? '/notifications' : '/connexion'}
          className="w-full text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> {profile ? 'Gérer mes alertes' : 'Se connecter pour les alertes'}
        </Link>
      </div>

    </aside>
  );
}

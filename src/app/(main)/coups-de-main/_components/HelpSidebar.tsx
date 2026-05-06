'use client';

import Link from 'next/link';
import { MapPin, Zap, Filter, Bookmark, Shield, HandHeart, ChevronRight, Flame, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import { CATEGORIES, SECURITY_TIPS, TYPE_CONFIG } from '../_constants';
import type { HelpRequest, UrgencyLevel } from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  items: HelpRequest[];
  filterSector: string | null;
  filterCat: string;
  filterUrgency: 'all' | UrgencyLevel;
  savedIds: Set<string>;
  isLoggedIn: boolean;
  kpi: {
    demandes: number;
    offres: number;
    echanges: number;
    urgents: number;
  };
  onSetFilterSector: (id: string | null) => void;
  onSetFilterCat: (v: string) => void;
  onSetFilterUrgency: (v: 'all' | UrgencyLevel) => void;
  onSetFilterMyHelp: (v: boolean) => void;
};

// ─── HelpSidebar ──────────────────────────────────────────────────────────────
export default function HelpSidebar({
  items, filterSector, filterCat, filterUrgency, savedIds, isLoggedIn, kpi,
  onSetFilterSector, onSetFilterCat, onSetFilterUrgency, onSetFilterMyHelp,
}: Props) {
  const urgentItems = items.filter(i => i.urgency === 'urgent' && i.status === 'active');

  return (
    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-5">

      {/* ── Statistiques communauté ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" /> Communauté entraide
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Demandes actives', value: kpi.demandes, color: 'text-orange-600', bg: 'bg-orange-50', emoji: '🙋' },
            { label: "Offres d'aide",    value: kpi.offres,   color: 'text-emerald-600', bg: 'bg-emerald-50', emoji: '🤝' },
            { label: 'Échanges',         value: kpi.echanges, color: 'text-blue-600',    bg: 'bg-blue-50',    emoji: '🔄' },
            { label: 'Urgents',          value: kpi.urgents,  color: 'text-red-600',     bg: 'bg-red-50',     emoji: '🔥' },
          ].map(s => (
            <div key={s.label} className={`flex items-center justify-between ${s.bg} rounded-xl px-3 py-2.5`}>
              <span className="text-xs text-gray-600 font-medium">{s.emoji} {s.label}</span>
              <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Explorer par quartier ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" /> Explorer par quartier
        </h3>
        <p className="text-[10px] text-gray-400 mb-3">Cliquez sur un secteur pour filtrer</p>

        {/* Toute la ville */}
        <button
          type="button"
          onClick={() => onSetFilterSector(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold mb-2 transition-colors border ${
            !filterSector
              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
              : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-gray-200'
          }`}
        >
          <span className="text-base">🗺️</span>
          <span className="flex-1 text-left text-xs">Toute la ville</span>
          <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
            !filterSector ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {items.filter(i => i.status === 'active').length}
          </span>
          {!filterSector && <CheckCircle2 className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />}
        </button>

        {/* Secteurs */}
        <div className="space-y-1">
          {SECTORS.map(sector => {
            const count = items.filter(i => i.sector_id === sector.id && i.status === 'active').length;
            const colors = SECTOR_COLORS[sector.color];
            const isActive = filterSector === sector.id;
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => onSetFilterSector(isActive ? null : sector.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors border ${
                  isActive
                    ? `${colors.bg} ${colors.text} border-transparent font-bold shadow-sm`
                    : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-gray-200'
                }`}
              >
                <span className="text-base flex-shrink-0">{sector.icon}</span>
                <span className="flex-1 text-left text-xs font-semibold">{sector.name}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? `${colors.badge}` : count === 0 ? 'text-gray-300' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count === 0 ? '–' : count}
                </span>
                {isActive && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Catégories populaires ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-orange-500" /> Explorer par catégorie
        </h3>
        <div className="space-y-1.5">
          {CATEGORIES.slice(0, 8).map(cat => {
            const count = items.filter(i => i.category === cat.value && i.status === 'active').length;
            if (count === 0) return null;
            const Icon = cat.icon;
            return (
              <button key={cat.value} type="button"
                onClick={() => onSetFilterCat(filterCat === cat.value ? 'all' : cat.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                  filterCat === cat.value
                    ? 'bg-orange-100 text-orange-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{cat.label}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filterCat === cat.value ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Urgents en ce moment ── */}
      {urgentItems.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-5">
          <h3 className="text-sm font-black text-red-800 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500 animate-pulse" /> Urgents en ce moment
          </h3>
          <div className="space-y-2">
            {urgentItems.slice(0, 3).map(item => {
              const catConf = CATEGORIES.find(c => c.value === item.category);
              return (
                <Link key={item.id} href={`/coups-de-main/${item.id}`}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-red-100 transition-colors group">
                  <span className="text-base flex-shrink-0">{catConf?.emoji ?? '🤗'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-red-900 line-clamp-2 group-hover:text-red-700">{item.title}</p>
                    <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{item.location_area}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onSetFilterUrgency(filterUrgency === 'urgent' ? 'all' : 'urgent')}
            className={`mt-2 w-full text-xs font-bold py-1.5 rounded-xl transition-colors ${
              filterUrgency === 'urgent'
                ? 'bg-red-200 text-red-800'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}>
            {filterUrgency === 'urgent' ? 'Voir toutes les annonces' : 'Voir toutes les urgences →'}
          </button>
        </div>
      )}

      {/* ── Favoris ── */}
      {savedIds.size > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5">
          <h3 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" /> Mes favoris ({savedIds.size})
          </h3>
          <div className="space-y-2">
            {/* Items are passed via items filtered by savedIds */}
            {items.filter(i => savedIds.has(i.id)).slice(0, 4).map(item => (
              <Link key={item.id} href={`/coups-de-main/${item.id}`}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-amber-100 transition-colors">
                <span className="text-base flex-shrink-0">{TYPE_CONFIG[item.help_type].emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900 truncate">{item.title}</p>
                  <p className="text-xs text-amber-600">{item.location_area}</p>
                </div>
              </Link>
            ))}
          </div>
          {savedIds.size > 4 && (
            <button type="button" onClick={() => onSetFilterMyHelp(true)}
              className="mt-2 text-xs text-amber-700 font-semibold hover:underline">
              Voir tous les favoris →
            </button>
          )}
        </div>
      )}

      {/* ── Conseils sécurité ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> Conseils sécurité
        </h3>
        <ul className="space-y-2">
          {SECURITY_TIPS.map((tip, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="flex-shrink-0">{tip.split(' ')[0]}</span>
              <span>{tip.split(' ').slice(1).join(' ')}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── CTA connexion ── */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white text-center">
          <HandHeart className="w-8 h-8 mx-auto mb-3 opacity-90" />
          <p className="font-black text-sm mb-1">Rejoignez la communauté</p>
          <p className="text-orange-100 text-xs mb-4">Publiez ou répondez à des annonces d&apos;entraide</p>
          <Link href="/connexion"
            className="block bg-white text-orange-600 font-bold py-2.5 rounded-xl text-sm hover:bg-orange-50 transition-colors">
            Se connecter <ArrowRight className="w-3.5 h-3.5 inline" />
          </Link>
        </div>
      )}

      {/* ── Charte ── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-xs font-bold text-gray-600">Charte entraide</p>
        </div>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />Entraide entre particuliers uniquement</li>
          <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />Pas de travail dissimulé</li>
          <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />Respect et bienveillance obligatoires</li>
          <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />Clôturez vos annonces résolues</li>
          <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />Signalez tout contenu inapproprié</li>
        </ul>
      </div>

    </aside>
  );
}

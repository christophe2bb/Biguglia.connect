'use client';

import Link from 'next/link';
import {
  TreePine, Map, MapPin, Sun, Shield, Sparkles, Plus, TrendingUp,
  Footprints, Users, MessageSquare, CheckCircle2,
  Thermometer, Droplets, Wind, CloudRain, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import { TYPE_CONFIG } from '../_constants';
import { SYSTEM_THEMES } from '../_hooks/useForum';
import type { Promenade } from '../_types';

interface Props {
  promenades: Promenade[];
  outingsCount: number;
  forumPostsCount: number;
  totalCount: number;
  quickFilter: string | null;
  filterSector: string | null;
  activeTab: string;
  profileId?: string;
  setActiveTab: (tab: 'itineraires' | 'forum' | 'agenda') => void;
  setQuickFilter: (v: string | null) => void;
  setFilterSector: (v: string | null) => void;
  setShowForm: (v: boolean) => void;
  setShowOutingForm: (v: boolean) => void;
  setShowPostForm: (v: boolean) => void;
  /** Fonction pour appliquer un filtre de thème forum */
  applyThemeFilter?: (theme: string | null) => void;
}

export default function PromenadesSidebar({
  promenades, outingsCount, forumPostsCount, totalCount,
  quickFilter, filterSector, activeTab, profileId,
  setActiveTab, setQuickFilter, setFilterSector, setShowForm, setShowOutingForm, setShowPostForm,
  applyThemeFilter,
}: Props) {

  // ── Statistiques rapides par type ──────────────────────────────────────────
  const countByType = promenades.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});

  // ── Thèmes forum les plus actifs (juste les icônes système) ───────────────
  const topForumThemes = SYSTEM_THEMES.slice(0, 4);

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">

      {/* ── Navigation rapide — 3 onglets ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Navigation rapide</h3>
        <div className="space-y-1.5">
          {[
            {
              tab: 'itineraires' as const,
              emoji: '🗺️',
              label: 'Itinéraires',
              sub: `${totalCount} fiche${totalCount !== 1 ? 's' : ''} parcours`,
              color: 'text-emerald-700',
              activeBg: 'bg-emerald-50 border-emerald-200',
              hoverBg: 'hover:bg-emerald-50/50',
              count: totalCount,
              countBg: 'bg-emerald-100 text-emerald-700',
            },
            {
              tab: 'agenda' as const,
              emoji: '📅',
              label: 'Sorties groupées',
              sub: outingsCount > 0 ? `${outingsCount} sortie${outingsCount !== 1 ? 's' : ''} à venir` : 'Organisez une sortie',
              color: 'text-orange-700',
              activeBg: 'bg-orange-50 border-orange-200',
              hoverBg: 'hover:bg-orange-50/50',
              count: outingsCount,
              countBg: 'bg-orange-100 text-orange-700',
            },
            {
              tab: 'forum' as const,
              emoji: '💬',
              label: 'Échanges',
              sub: forumPostsCount > 0 ? `${forumPostsCount} discussion${forumPostsCount !== 1 ? 's' : ''}` : 'Posez vos questions',
              color: 'text-sky-700',
              activeBg: 'bg-sky-50 border-sky-200',
              hoverBg: 'hover:bg-sky-50/50',
              count: forumPostsCount,
              countBg: 'bg-sky-100 text-sky-700',
            },
          ].map(({ tab, emoji, label, sub, color, activeBg, hoverBg, count, countBg }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                  isActive
                    ? cn(activeBg, 'shadow-sm')
                    : cn('bg-white border-gray-100', hoverBg, 'hover:border-gray-200')
                )}
              >
                <span className="text-lg flex-shrink-0 w-7 text-center">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-black leading-tight', isActive ? color : 'text-gray-700')}>{label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">{sub}</p>
                </div>
                {count > 0 && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0', isActive ? countBg : 'bg-gray-100 text-gray-500')}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', color.replace('text-', 'bg-'))} />
                )}
              </button>
            );
          })}
        </div>

        {/* CTA selon l'onglet actif */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {activeTab === 'itineraires' && profileId && (
            <button
              onClick={() => { setShowForm(true); setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Partager un itinéraire
            </button>
          )}
          {activeTab === 'agenda' && profileId && (
            <button
              onClick={() => { setShowOutingForm(true); setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Organiser une sortie
            </button>
          )}
          {activeTab === 'forum' && profileId && (
            <button
              onClick={() => { setShowPostForm(true); setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouveau sujet
            </button>
          )}
          {!profileId && (
            <Link
              href="/connexion"
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Rejoindre la communauté
            </Link>
          )}
        </div>
      </div>

      {/* 🌿 Réserve naturelle spotlight */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-[0.08] bg-dot-grid-sm" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <TreePine className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-semibold">🏆 Incontournable</p>
              <h3 className="text-sm font-black">Étang de Biguglia</h3>
            </div>
          </div>
          <p className="text-emerald-100 text-xs leading-relaxed mb-3">
            Réserve naturelle classée, 1 456 ha. Sentier découverte, observation des oiseaux migrateurs, coucher de soleil exceptionnel — chiens admis en laisse.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['🦅 Oiseaux', '🌅 Sunset', '🚶 Sentier', '🐕 Chiens OK'].map(t => (
              <span key={t} className="text-[11px] bg-white/18 border border-white/25 rounded-full px-2.5 py-0.5 font-semibold">{t}</span>
            ))}
          </div>
          <button
            onClick={() => { setActiveTab('itineraires'); setQuickFilter('sunset'); setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100); }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 rounded-xl transition-colors"
          >
            Voir les sentiers <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Explorer par type ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Map className="w-4 h-4 text-emerald-500" /> Explorer par type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const _Icon = cfg.icon;
            const isActive = quickFilter === key && activeTab === 'itineraires';
            const count = countByType[key] || 0;
            return (
              <button key={key}
                onClick={() => {
                  setActiveTab('itineraires');
                  setQuickFilter(quickFilter === key && activeTab === 'itineraires' ? null : key);
                }}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors text-center hover:shadow-sm',
                  isActive ? cn(cfg.bg, cfg.border, cfg.color, 'shadow-sm') : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'
                )}>
                <span className="text-xl leading-none">{cfg.emoji}</span>
                <span className="text-[11px] font-bold leading-tight">{cfg.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center',
                    isActive ? 'bg-white text-emerald-700' : 'bg-gray-200 text-gray-600'
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Raccourcis Forum ─────────────────────────────────────────────── */}
      {applyThemeFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-500" /> Thèmes forum
            </h3>
            <button
              onClick={() => { setActiveTab('forum'); setTimeout(() => window.scrollTo({ top: 400, behavior: 'smooth' }), 100); }}
              className="text-[11px] font-bold text-sky-500 hover:text-sky-700 transition-colors flex items-center gap-0.5"
            >
              Tous <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {topForumThemes.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setActiveTab('forum');
                  applyThemeFilter(theme.id);
                  setTimeout(() => window.scrollTo({ top: 600, behavior: 'smooth' }), 100);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-sky-50 hover:border-sky-100 border border-transparent transition-colors group"
              >
                <span className="text-base flex-shrink-0">{theme.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 group-hover:text-sky-700 transition-colors leading-tight">{theme.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight truncate">{theme.sub}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-gray-200 group-hover:text-sky-400 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conseils saisonniers */}
      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Conseils de saison
        </h3>
        <div className="space-y-2.5">
          {[
            { icon: Thermometer, text: 'Partez tôt le matin en été pour éviter la chaleur' },
            { icon: Droplets,    text: "Emportez min. 1.5L d'eau par personne par sortie" },
            { icon: Wind,        text: 'Vérifiez les prévisions météo avant de partir' },
            { icon: CloudRain,   text: 'Après la pluie, certains sentiers peuvent être glissants' },
          ].map(({ icon: I, text }) => (
            <div key={text} className="flex items-start gap-2">
              <I className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sécurité randonnée */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> Sécurité en randonnée
        </h3>
        <ul className="space-y-2">
          {[
            'Prévenez un proche avant une sortie longue',
            'Chargez votre téléphone avant de partir',
            'Portez des chaussures adaptées au terrain',
            'Respectez les zones protégées et la faune',
            'En cas de problème : 15, 17, 18 ou 112',
          ].map(c => (
            <li key={c} className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{c}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA contribuer — non connecté */}
      {!profileId && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black mb-1">Contribuez à la carte</h3>
          <p className="text-xs text-emerald-100 mb-4 leading-relaxed">Partagez vos balades préférées et aidez les habitants à découvrir Biguglia.</p>
          <Link href="/connexion"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-emerald-50 transition-colors w-full justify-center shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Se connecter &amp; contribuer
          </Link>
        </div>
      )}

      {/* Statistiques communauté — connecté */}
      {profileId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Communauté active
          </h3>
          <div className="space-y-3">
            {[
              { icon: Footprints,    label: `${totalCount} itinéraire${totalCount !== 1 ? 's' : ''}`,         sub: 'partagés',        color: 'text-emerald-500', bg: 'bg-emerald-50', tab: 'itineraires' as const },
              { icon: Users,         label: `${outingsCount} sortie${outingsCount !== 1 ? 's' : ''}`,          sub: 'à venir',         color: 'text-teal-500',    bg: 'bg-teal-50',   tab: 'agenda' as const },
              { icon: MessageSquare, label: `${forumPostsCount} échange${forumPostsCount !== 1 ? 's' : ''}`,  sub: 'dans le forum',   color: 'text-sky-500',     bg: 'bg-sky-50',    tab: 'forum' as const },
            ].map(({ icon: I, label, sub, color, bg, tab }) => (
              <button
                key={label}
                onClick={() => setActiveTab(tab)}
                className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-xl p-1.5 -mx-1.5 transition-colors text-left group"
              >
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                  <I className={cn('w-4 h-4', color)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Secteurs géographiques (compact) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" /> Par secteur
          </h3>
          {filterSector && (
            <button
              onClick={() => setFilterSector(null)}
              className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕ Tout
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SECTORS.map(sector => {
            const colors  = SECTOR_COLORS[sector.color];
            const active  = filterSector === sector.id;
            return (
              <button
                key={sector.id}
                onClick={() => { setFilterSector(active ? null : sector.id); if (activeTab === 'forum') setActiveTab('itineraires'); }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left transition-all text-[11px] font-bold',
                  active
                    ? cn(colors.bg, colors.border, colors.text, 'shadow-sm')
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-white hover:border-gray-200'
                )}
              >
                <span className="text-sm">{sector.icon}</span>
                <span className="truncate">{sector.name}</span>
              </button>
            );
          })}
        </div>
      </div>

    </aside>
  );
}

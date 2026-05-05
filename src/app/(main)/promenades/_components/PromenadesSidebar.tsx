'use client';

import Link from 'next/link';
import {
  TreePine, Map, Sun, Shield, Sparkles, Plus, TrendingUp,
  Footprints, Users, MessageSquare, CheckCircle2,
  Thermometer, Droplets, Wind, CloudRain,
  Compass, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPE_CONFIG } from '../_constants';
import type { Promenade } from '../_types';

// Les 5 thèmes forum les plus utiles à mettre en avant
const FORUM_THEME_SHORTCUTS = [
  { id: 'itineraires', emoji: '🗺️', label: 'Itinéraires' },
  { id: 'alertes',     emoji: '⚠️', label: 'Alertes'     },
  { id: 'nature',      emoji: '🌿', label: 'Nature'       },
  { id: 'chien',       emoji: '🐕', label: 'Chiens'       },
  { id: 'questions',   emoji: '❓', label: 'Questions'    },
] as const;

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
  /** Appelé quand l'utilisateur clique sur un raccourci de thème forum */
  onForumTheme?: (themeId: string) => void;
}

export default function PromenadesSidebar({
  promenades: _promenades, outingsCount, forumPostsCount, totalCount,
  quickFilter, filterSector: _filterSector, activeTab, profileId,
  setActiveTab, setQuickFilter, setFilterSector: _setFilterSector,
  setShowForm, setShowOutingForm, setShowPostForm,
  onForumTheme,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

      {/* ── Navigation rapide par onglet ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Navigation</h3>
        <div className="space-y-1.5">
          {[
            {
              tab: 'itineraires' as const,
              emoji: '🗺️',
              label: 'Itinéraires',
              count: totalCount,
              color: 'bg-emerald-500',
              hoverBg: 'hover:bg-emerald-50',
              activeBg: 'bg-emerald-50',
              activeText: 'text-emerald-700',
              activeBorder: 'border-emerald-200',
            },
            {
              tab: 'agenda' as const,
              emoji: '📅',
              label: 'Sorties groupées',
              count: outingsCount,
              color: 'bg-orange-500',
              hoverBg: 'hover:bg-orange-50',
              activeBg: 'bg-orange-50',
              activeText: 'text-orange-700',
              activeBorder: 'border-orange-200',
            },
            {
              tab: 'forum' as const,
              emoji: '💬',
              label: 'Échanges',
              count: forumPostsCount,
              color: 'bg-sky-500',
              hoverBg: 'hover:bg-sky-50',
              activeBg: 'bg-sky-50',
              activeText: 'text-sky-700',
              activeBorder: 'border-sky-200',
            },
          ].map(({ tab, emoji, label, count, hoverBg, activeBg, activeText, activeBorder }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border',
                  isActive
                    ? cn(activeBg, activeText, activeBorder)
                    : cn('bg-transparent border-transparent text-gray-600', hoverBg)
                )}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-sm font-bold flex-1">{label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                    isActive ? cn(activeText, 'bg-white/60') : 'bg-gray-100 text-gray-500'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CTAs contextuels selon onglet actif */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {activeTab === 'itineraires' && profileId && (
            <button
              onClick={() => { setActiveTab('itineraires'); setShowForm(true); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-emerald-600 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Partager un itinéraire
            </button>
          )}
          {activeTab === 'agenda' && profileId && (
            <button
              onClick={() => { setShowOutingForm(true); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" /> Créer une sortie groupée
            </button>
          )}
          {activeTab === 'forum' && profileId && (
            <button
              onClick={() => { setShowPostForm(true); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-sky-600 transition-colors shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Nouveau sujet
            </button>
          )}
          {!profileId && (
            <Link
              href="/connexion"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:from-emerald-600 hover:to-teal-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Se connecter & contribuer
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
          <div className="flex flex-wrap gap-1.5">
            {['🦅 Oiseaux', '🌅 Sunset', '🚶 Sentier', '🐕 Chiens OK'].map(t => (
              <span key={t} className="text-[11px] bg-white/18 border border-white/25 rounded-full px-2.5 py-0.5 font-semibold">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Explorer par type */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Map className="w-4 h-4 text-emerald-500" /> Explorer par type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const _Icon = cfg.icon;
            const isActive = quickFilter === key && activeTab === 'itineraires';
            return (
              <button key={key}
                onClick={() => {
                  setActiveTab('itineraires');
                  setQuickFilter(quickFilter === key && activeTab === 'itineraires' ? null : key);
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors text-center hover:shadow-sm',
                  isActive ? cn(cfg.bg, cfg.border, cfg.color, 'shadow-sm') : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'
                )}>
                <span className="text-xl leading-none">{cfg.emoji}</span>
                <span className="text-[11px] font-bold leading-tight">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 💬 Raccourcis forum thèmes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-500" /> Thèmes forum
        </h3>
        <div className="space-y-1.5">
          {FORUM_THEME_SHORTCUTS.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab('forum');
                onForumTheme?.(t.id);
                setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-sky-50 hover:text-sky-700 transition-colors group border border-transparent hover:border-sky-100"
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="text-sm font-semibold text-gray-600 group-hover:text-sky-700 transition-colors">{t.label}</span>
              <Compass className="w-3.5 h-3.5 ml-auto text-gray-200 group-hover:text-sky-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

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

      {/* Statistiques communauté (si connecté) */}
      {profileId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Communauté active
          </h3>
          <div className="space-y-3">
            {[
              { icon: Footprints,    label: `${totalCount} itinéraire${totalCount !== 1 ? 's' : ''}`,         sub: 'partagés',        color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: Users,         label: `${outingsCount} sortie${outingsCount !== 1 ? 's' : ''}`,          sub: 'à venir',         color: 'text-teal-500',    bg: 'bg-teal-50' },
              { icon: MessageSquare, label: `${forumPostsCount} échange${forumPostsCount !== 1 ? 's' : ''}`,  sub: 'dans le forum',   color: 'text-sky-500',     bg: 'bg-sky-50' },
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
      )}

      {/* CTA contribuer (si non connecté) */}
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
    </aside>
  );
}

'use client';

import Link from 'next/link';
import {
  TreePine, Compass, Map, MapPin, Sun, Shield, Sparkles, Plus, TrendingUp,
  Footprints, Users, MessageSquare, ArrowRight, CheckCircle2,
  Thermometer, Droplets, Wind, CloudRain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import { TYPE_CONFIG } from '../_constants';
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
}

export default function PromenadesSidebar({
  promenades, outingsCount, forumPostsCount, totalCount,
  quickFilter, filterSector, activeTab, profileId,
  setActiveTab, setQuickFilter, setFilterSector, setShowForm, setShowOutingForm, setShowPostForm,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

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

      {/* Actions rapides */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-500" /> Actions rapides
        </h3>
        <div className="space-y-1.5">
          {[
            { onClick: () => { setActiveTab('itineraires'); setShowForm(true); }, icon: Plus, label: 'Partager un itinéraire', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { onClick: () => { setActiveTab('agenda'); setShowOutingForm(true); }, icon: Users, label: 'Organiser une sortie', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
            { onClick: () => { setActiveTab('forum'); setShowPostForm(true); }, icon: MessageSquare, label: 'Poser une question', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
          ].map(({ onClick, icon: I, label, color, bg, border }) => (
            <button key={label}
              onClick={() => { if (!profileId) { window.location.href = '/connexion'; return; } onClick?.(); }} // nosec — hardcoded path '/connexion', no open redirect
              className={cn('flex items-center gap-3 p-3 rounded-xl transition-colors group border w-full text-left', bg, border, 'hover:shadow-sm')}>
              <I className={cn('w-4 h-4 flex-shrink-0', color)} />
              <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
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

      {/* CTA contribuer */}
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

      {/* Statistiques communauté */}
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
    </aside>
  );
}

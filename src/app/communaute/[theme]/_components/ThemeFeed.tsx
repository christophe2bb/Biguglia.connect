'use client';

import Link from 'next/link';
import { Users, Search, Filter, Loader2, RefreshCw, Info, Settings } from 'lucide-react';
import MemberCard, { type ThemeMember } from '@/components/ui/MemberCard';
import type { ThemeConfig, ThemeTab } from '../_types';

interface ThemeFeedProps {
  themeConfig: ThemeConfig;
  themeSlug: string;
  filteredMembers: ThemeMember[];
  loading: boolean;
  search: string;
  filterLevel: string;
  memberCount: number;
  currentUserId?: string;
  isLoggedIn: boolean;
  onSearchChange: (v: string) => void;
  onFilterLevelChange: (v: string) => void;
  onRefresh: () => void;
  onTabChange: (tab: ThemeTab) => void;
}

export default function ThemeFeed({
  themeConfig,
  themeSlug,
  filteredMembers,
  loading,
  search,
  filterLevel,
  memberCount,
  currentUserId,
  isLoggedIn,
  onSearchChange,
  onFilterLevelChange,
  onRefresh,
  onTabChange,
}: ThemeFeedProps) {
  return (
    <div className="space-y-5">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un membre, un tag..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filterLevel}
            onChange={(e) => onFilterLevelChange(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="">Tous les niveaux</option>
            <option value="débutant">Débutant</option>
            <option value="intermédiaire">Intermédiaire</option>
            <option value="avancé">Avancé</option>
            <option value="expert">Expert</option>
          </select>
          <button
            onClick={onRefresh}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition flex-shrink-0"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner if not logged in */}
      {!isLoggedIn && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Rejoignez la communauté</p>
            <p className="text-xs text-blue-600 mt-0.5">
              <Link href="/connexion" className="underline font-semibold">Connectez-vous</Link>{' '}
              pour rejoindre ce thème et apparaître dans la liste des membres.
            </p>
          </div>
        </div>
      )}

      {/* Members grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm">Chargement des membres…</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search || filterLevel
              ? 'Aucun membre ne correspond à votre recherche.'
              : "Aucun membre dans cette communauté pour l'instant."}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {isLoggedIn ? (
              'Soyez le premier ! Cliquez sur « Rejoindre » ci-dessus.'
            ) : (
              <>
                <Link href="/connexion" className="text-brand-600 underline">Se connecter</Link>{' '}
                et rejoindre ce thème.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              themeSlug={themeSlug}
              themeLabel={themeConfig.label}
            />
          ))}
        </div>
      )}

      {/* CTA complete profile */}
      {isLoggedIn && !loading && memberCount > 0 && (
        <div
          className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
        >
          <div>
            <p className={`font-semibold ${themeConfig.textColor}`}>
              Complétez votre mini-profil {themeConfig.label}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Ajoutez votre bio, vos centres d&apos;intérêt et ce que vous proposez pour être plus visible.
            </p>
          </div>
          <button
            onClick={() => onTabChange('monprofil')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} bg-white hover:shadow-sm transition whitespace-nowrap flex-shrink-0`}
          >
            <Settings className="w-4 h-4" />
            Mon profil
          </button>
        </div>
      )}
    </div>
  );
}

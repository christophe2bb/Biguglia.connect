'use client';

import Link from 'next/link';
import { Users, Search, Filter, Loader2, RefreshCw, Info, Settings, Sparkles, UserPlus } from 'lucide-react';
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
    <div className="space-y-6">

      {/* ── Banner if not logged in ───────────────────────────────────────── */}
      {!isLoggedIn && (
        <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex items-start gap-4`}>
          <div className={`w-10 h-10 ${themeConfig.accentBg} rounded-xl flex items-center justify-center flex-shrink-0 border ${themeConfig.borderColor}`}>
            <Info className={`w-5 h-5 ${themeConfig.textColor}`} />
          </div>
          <div>
            <p className={`font-semibold ${themeConfig.textColor} mb-0.5`}>Rejoignez la communauté !</p>
            <p className="text-sm text-gray-600">
              <Link href="/connexion" className={`underline font-semibold ${themeConfig.textColor}`}>Connectez-vous</Link>{' '}
              pour rejoindre ce thème et apparaître dans la liste des membres.
            </p>
          </div>
        </div>
      )}

      {/* ── Search + filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un membre, un tag…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-400 bg-white shadow-sm transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={filterLevel}
              onChange={(e) => onFilterLevelChange(e.target.value)}
              className="pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-400 bg-white shadow-sm appearance-none cursor-pointer transition"
            >
              <option value="">Tous les niveaux</option>
              <option value="débutant">Débutant</option>
              <option value="intermédiaire">Intermédiaire</option>
              <option value="avancé">Avancé</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <button
            onClick={onRefresh}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 bg-white shadow-sm transition flex-shrink-0"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Members count header ──────────────────────────────────────────── */}
      {!loading && memberCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filteredMembers.length}</span>
            {search || filterLevel
              ? ` résultat${filteredMembers.length !== 1 ? 's' : ''} sur ${memberCount} membre${memberCount !== 1 ? 's' : ''}`
              : ` membre${memberCount !== 1 ? 's' : ''} dans cette communauté`
            }
          </p>
          {(search || filterLevel) && (
            <button
              onClick={() => { onSearchChange(''); onFilterLevelChange(''); }}
              className={`text-xs font-medium ${themeConfig.textColor} hover:underline`}
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* ── Members grid ─────────────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="flex gap-1 mb-3">
                <div className="h-5 bg-gray-100 rounded-full w-14" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
              <div className="h-8 bg-gray-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
          <div className={`w-16 h-16 ${themeConfig.accentBg} rounded-2xl flex items-center justify-center mx-auto mb-4 border ${themeConfig.borderColor}`}>
            {search || filterLevel
              ? <Search className={`w-7 h-7 ${themeConfig.textColor} opacity-60`} />
              : <Users className={`w-7 h-7 ${themeConfig.textColor} opacity-60`} />
            }
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">
            {search || filterLevel
              ? 'Aucun membre trouvé'
              : 'Aucun membre pour l\'instant'}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {search || filterLevel
              ? 'Essayez d\'autres mots-clés ou supprimez les filtres.'
              : isLoggedIn
              ? 'Soyez le ou la première à rejoindre cette communauté !'
              : 'Connectez-vous et rejoignez ce thème pour être le premier membre.'}
          </p>
          {isLoggedIn && !search && !filterLevel && (
            <button
              onClick={() => onTabChange('monprofil')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} ${themeConfig.accentBg} hover:shadow-md transition`}
            >
              <UserPlus className="w-4 h-4" />
              Rejoindre &amp; créer mon profil
            </button>
          )}
          {!isLoggedIn && (
            <Link
              href="/connexion"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white ${themeConfig.headerBg} hover:opacity-90 transition shadow-sm`}
            >
              <UserPlus className="w-4 h-4" />
              Se connecter pour rejoindre
            </Link>
          )}
        </div>
      ) : (
        /* Member cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member, idx) => (
            <div
              key={member.id}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
            >
              <MemberCard
                member={member}
                currentUserId={currentUserId}
                themeSlug={themeSlug}
                themeLabel={themeConfig.label}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── CTA complete profile ──────────────────────────────────────────── */}
      {isLoggedIn && !loading && memberCount > 0 && (
        <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{themeConfig.emoji}</span>
            <div>
              <p className={`font-semibold ${themeConfig.textColor}`}>
                Complétez votre mini-profil {themeConfig.label}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Bio, tags, ce que vous proposez — soyez plus visible auprès des autres membres.
              </p>
            </div>
          </div>
          <button
            onClick={() => onTabChange('monprofil')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} bg-white hover:shadow-md transition whitespace-nowrap flex-shrink-0`}
          >
            <Settings className="w-4 h-4" />
            Mon profil
          </button>
        </div>
      )}

      {/* ── "Discover more" nudge if guest sees members ──────────────────── */}
      {!isLoggedIn && !loading && memberCount > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-center text-white shadow-lg">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
          <p className="font-bold text-base mb-1">Rejoignez la conversation</p>
          <p className="text-sm text-white/70 mb-4">
            {memberCount} voisin{memberCount > 1 ? 's' : ''} vous attend{memberCount > 1 ? 'ent' : ''} dans cette communauté.
          </p>
          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow"
          >
            <UserPlus className="w-4 h-4" />
            Rejoindre gratuitement
          </Link>
        </div>
      )}
    </div>
  );
}

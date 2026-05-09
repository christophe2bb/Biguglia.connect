'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Users, Sparkles, TrendingUp } from 'lucide-react';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import type { ThemeConfig } from '../_types';

interface ThemeHeaderProps {
  themeSlug: string;
  themeConfig: ThemeConfig;
  memberCount: number;
  loading: boolean;
  userId?: string;
  onJoined: () => void;
  onLeft: () => void;
}

export default function ThemeHeader({
  themeSlug,
  themeConfig,
  memberCount,
  loading,
  userId,
  onJoined,
  onLeft,
}: ThemeHeaderProps) {
  const router = useRouter();
  const IconComp = themeConfig.icon;

  return (
    <div className={`relative overflow-hidden ${themeConfig.headerBg} text-white`}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-white/10 rounded-full blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse [animation-delay:2s]" />
        {/* Floating decorative dots */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-5 pb-8">
        {/* Top bar: back button + breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm group"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/15 group-hover:bg-white/25 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Retour</span>
          </button>

          <nav className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <Link href={themeConfig.href} className="hover:text-white transition-colors">
              {themeConfig.label}
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Communauté</span>
          </nav>
        </div>

        {/* Main hero content */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          {/* Left: icon + title + description */}
          <div className="flex items-start gap-4">
            {/* Animated icon container */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl border border-white/30">
                <span className="text-3xl sm:text-4xl">{themeConfig.emoji}</span>
              </div>
              {/* Sparkle badge */}
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-yellow-900" />
              </span>
            </div>

            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                Espace communautaire
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow-sm">
                Communauté {themeConfig.label}
              </h1>
              <p className="text-white/80 text-sm sm:text-base mt-1.5 max-w-md leading-relaxed">
                {themeConfig.description}
              </p>
            </div>
          </div>

          {/* Right: stats + join button */}
          <div className="flex flex-col sm:items-end gap-3">
            {/* Stats row */}
            <div className="flex items-center gap-2">
              {/* Members stat pill */}
              <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  {loading ? (
                    <div className="w-6 h-3.5 bg-white/30 rounded animate-pulse" />
                  ) : (
                    <span className="font-bold text-base leading-none">{memberCount}</span>
                  )}
                  <p className="text-white/70 text-[10px] leading-none mt-0.5">
                    membre{memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Active pill */}
              <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-base leading-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                    Actif
                  </span>
                  <p className="text-white/70 text-[10px] leading-none mt-0.5">
                    en ligne
                  </p>
                </div>
              </div>
            </div>

            {/* Join button */}
            <CommunityJoinButton
              themeSlug={themeSlug}
              userId={userId}
              size="md"
              onJoined={onJoined}
              onLeft={onLeft}
              className="bg-white text-gray-900 hover:bg-gray-50 border-white/0 shadow-lg font-bold"
            />
          </div>
        </div>

        {/* Purpose explainer strip */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <IconComp className="w-4 h-4 text-white/80" />
            <span className="text-white/90 font-semibold text-sm">À quoi sert cette page ?</span>
          </div>
          <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
            Retrouvez tous les membres de la communauté <strong className="text-white">{themeConfig.label}</strong> de Biguglia —
            discutez, partagez, connectez-vous et gérez votre mini-profil thématique.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { PenLine, Plus, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface HomeHeroProps {
  totalItems: number;
  generatedAt: string;
}

function timeAgo(iso: string): string {
  const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  return 'récemment';
}

const QUICK_ACTIONS = [
  { label: 'Annonce',      emoji: '📦', href: '/annonces/nouvelle',      color: 'hover:bg-blue-500/20 hover:border-blue-400/40' },
  { label: 'Coup de main', emoji: '🤝', href: '/coups-de-main/nouveau',  color: 'hover:bg-orange-500/20 hover:border-orange-400/40' },
  { label: 'Événement',    emoji: '🎉', href: '/evenements/nouveau',      color: 'hover:bg-purple-500/20 hover:border-purple-400/40' },
  { label: 'Discussion',   emoji: '💬', href: '/forum/nouveau',           color: 'hover:bg-sky-500/20 hover:border-sky-400/40' },
];

export default function HomeHero({ totalItems, generatedAt }: HomeHeroProps) {
  const { profile } = useAuthStore();

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8"
      style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #2d1200 40%, #3d1a00 70%, #1a0500 100%)' }}>

      {/* Texture pointillée */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Halo brand */}
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-600/15 rounded-full blur-3xl" />

      <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">

        {/* Indicateur live */}
        <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-400/30 rounded-full px-3.5 py-1.5 mb-6">
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-brand-300 text-xs font-bold tracking-wide">
            {totalItems > 0
              ? `${totalItems} publication${totalItems > 1 ? 's' : ''} de vos voisins · ${timeAgo(generatedAt)}`
              : 'Biguglia Connect · Village numérique · 2B'
            }
          </span>
        </div>

        {/* Titre + sous-titre */}
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight">
          {profile
            ? `Bonjour ${profile.full_name?.split(' ')[0] ?? ''} 👋`
            : 'Ce qui se passe à Biguglia'
          }
        </h2>
        <p className="text-white/50 text-sm sm:text-base mb-7 max-w-lg leading-relaxed">
          {totalItems > 0
            ? 'Le fil local de votre village — mis à jour en temps réel.'
            : 'Le fil de vie local de Biguglia. Rejoignez vos voisins et publiez le premier !'
          }
        </p>

        {/* Actions contextuelles */}
        {profile ? (
          <div className="space-y-3">
            {/* Barre de publication rapide */}
            <Link href="/forum/nouveau"
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl px-4 py-3.5 transition-all group cursor-text">
              <PenLine className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors flex-shrink-0" />
              <span className="text-sm text-white/35 group-hover:text-white/55 transition-colors">
                Quoi de neuf à Biguglia ? Partagez quelque chose…
              </span>
            </Link>

            {/* Boutons actions rapides */}
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`inline-flex items-center gap-1.5 bg-white/8 border border-white/10 text-white/80 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:-translate-y-0.5 ${action.color}`}
                >
                  <span className="text-sm">{action.emoji}</span>
                  {action.label}
                  <Plus className="w-3 h-3 opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/inscription"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-lg shadow-brand-900/40 hover:-translate-y-0.5 text-sm">
              <Sparkles className="w-4 h-4" />
              Rejoindre la communauté
            </Link>
            <Link href="/connexion"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/80 font-bold px-6 py-3 rounded-2xl hover:bg-white/8 transition-all text-sm">
              J&apos;ai déjà un compte
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

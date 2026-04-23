// ─────────────────────────────────────────────────────────────────────────────
// HomeHero — Bannière principale de la Maison vivante
// Design : humain, local, personnalisé via PersonalizedBanner
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { PenLine, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import dynamic from 'next/dynamic';

// Chargement différé : PersonalizedBanner accède localStorage, non critique au SSR
const PersonalizedBanner = dynamic(() => import('./PersonalizedBanner'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="h-6 w-64 bg-white/15 rounded-lg animate-pulse" />
      <div className="flex gap-2">
        {[120, 100, 110, 90, 80].map((w) => (
          <div key={w} className="h-10 rounded-2xl bg-white/10 animate-pulse" style={{ width: w }} />
        ))}
      </div>
    </div>
  ),
});

interface HomeHeroProps {
  totalItems: number;
  generatedAt: string;
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function HomeHero({ totalItems, generatedAt }: HomeHeroProps) {
  const { profile } = useAuthStore();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-orange-800 mb-8">
      {/* Décoration */}
      <div className="absolute inset-0 opacity-[0.06] bg-dot-grid-lg"
      />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />

      <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">
        {/* Indicateur preuve de vie */}
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3.5 py-1.5 mb-5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-white/90 text-xs font-bold">
            {totalItems > 0
              ? `${totalItems} contenus actifs · Mis à jour ${formatGeneratedAt(generatedAt)}`
              : 'Biguglia Connect · Village numérique'
            }
          </span>
        </div>

        {/* Bannière personnalisée (connecté) ou CTA inscription (visiteur) */}
        {profile ? (
          /* Utilisateur connecté → bannière entièrement personnalisée */
          <PersonalizedBanner showPersonalizationBadge={true} />
        ) : (
          /* Visiteur → message + inscription + quick actions visiteur */
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight">
                Bienvenue à Biguglia 👋
              </h2>
              <p className="text-white/70 text-sm sm:text-base max-w-lg leading-relaxed">
                {totalItems > 0
                  ? 'Voici ce qui se passe dans votre village aujourd\'hui.'
                  : 'Le fil de vie local de Biguglia. Rejoignez vos voisins.'
                }
              </p>
            </div>

            {/* Bannière visiteur : quick-actions adaptées à l'historique de navigation */}
            <PersonalizedBanner showPersonalizationBadge={false} />

            {/* CTA inscription */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/inscription"
                className="group inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-2xl hover:bg-brand-50 transition-transform shadow-lg hover:-translate-y-0.5 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Rejoindre la communauté
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white/90 font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors text-sm"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Barre de publication rapide pour membres */}
      {profile && (
        <div className="border-t border-white/10 px-6 py-3 sm:px-8 flex items-center gap-2">
          <PenLine className="w-4 h-4 text-white/50 flex-shrink-0" />
          <Link
            href="/forum/nouveau"
            className="flex-1 text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            Quoi de neuf à Biguglia ? Partagez quelque chose…
          </Link>
        </div>
      )}
    </div>
  );
}

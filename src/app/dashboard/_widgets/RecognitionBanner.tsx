'use client';

/**
 * RecognitionBanner — Bloc de reconnaissance dans le dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche des messages personnalisés de valorisation selon les statistiques
 * du membre : "Vous avez aidé X personnes", "Votre profil inspire confiance",
 * "Vos annonces ont été utiles", etc.
 *
 * Principe "qualité plutôt que quantité" :
 *   – On valorise les accomplissements concrets (aides résolues, avis positifs)
 *   – On ne célèbre PAS le nombre brut de publications
 *   – On propose une prochaine action quand l'utilisateur peut progresser
 *
 * Affichage conditionnel : n'apparaît que si l'utilisateur a au moins
 * un accomplissement à valoriser (pas pour les tout nouveaux membres).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, Heart, Star, Shield, Users, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import type { useDashboardData } from '@/hooks/useDashboardData';
import type { useTrustData } from '@/components/ui/TrustScore';
import { BADGE_CONFIG } from '@/lib/trust';
import type { BadgeCode } from '@/lib/trust';
import type { Profile } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecognitionBannerProps {
  dashData:    ReturnType<typeof useDashboardData>;
  trustStats:  ReturnType<typeof useTrustData>['stats'];
  trustBadges: ReturnType<typeof useTrustData>['badges'];
}

// ─── Types internes ───────────────────────────────────────────────────────────

interface RecognitionMessage {
  icon:     React.ElementType;
  emoji:    string;
  title:    string;
  body:     string;
  cta?:     { label: string; href: string };
  gradient: string;
  priority: number; // Plus élevé = affiché en premier
}

// ─── Calcul des messages méritants ────────────────────────────────────────────

function buildMessages(
  profile: Profile,
  stats: ReturnType<typeof useDashboardData>['stats'],
  trustStats: ReturnType<typeof useTrustData>['stats'],
  badges: ReturnType<typeof useTrustData>['badges'],
): RecognitionMessage[] {
  const messages: RecognitionMessage[] = [];
  const firstName = profile.full_name?.split(' ')[0] ?? 'vous';

  // ── Aides accomplies ──────────────────────────────────────────────────────
  const totalHelps = stats.helpsByStatus?.resolved ?? stats.openHelps;
  if (totalHelps >= 3) {
    messages.push({
      icon:     Heart,
      emoji:    '🤝',
      title:    `Vous avez aidé ${totalHelps} voisin${totalHelps > 1 ? 's' : ''} !`,
      body:     'Votre solidarité fait vraiment la différence à Biguglia. Merci pour chaque coup de main.',
      cta:      { label: 'Voir mes aides', href: '/coups-de-main' },
      gradient: 'from-emerald-50 to-teal-50 border-emerald-200',
      priority: 90,
    });
  }

  // ── Avis reçus positifs ───────────────────────────────────────────────────
  const reviews = trustStats?.reviews_received ?? stats.totalReviewsReceived;
  const avgRating = trustStats?.avg_rating ?? stats.averageRating ?? 0;
  if (reviews >= 3 && avgRating >= 4.0) {
    messages.push({
      icon:     Star,
      emoji:    '⭐',
      title:    `${firstName}, votre réputation parle pour vous`,
      body:     `${reviews} avis reçus · moyenne ${avgRating.toFixed(1)}/5. Votre sérieux est reconnu par la communauté.`,
      cta:      { label: 'Voir mes avis', href: '/dashboard/avis' },
      gradient: 'from-amber-50 to-yellow-50 border-amber-200',
      priority: 85,
    });
  } else if (reviews >= 1) {
    messages.push({
      icon:     Star,
      emoji:    '💬',
      title:    `Premier avis reçu — merci !`,
      body:     `Les avis construisent la confiance sur Biguglia. Continuez ainsi !`,
      gradient: 'from-amber-50 to-yellow-50 border-amber-100',
      priority: 60,
    });
  }

  // ── Badge de confiance ────────────────────────────────────────────────────
  const highBadges = badges.filter(b =>
    ['trusted_member', 'admin_validated', 'top_rated', 'community_pillar', 'reliable_profile'].includes(b)
  );
  if (highBadges.length > 0) {
    const topBadge = highBadges[0];
    const cfg = BADGE_CONFIG[topBadge as BadgeCode];
    messages.push({
      icon:     Shield,
      emoji:    cfg?.emoji ?? '🛡️',
      title:    `Votre profil inspire confiance`,
      body:     `Badge "${cfg?.label ?? topBadge}" : ${cfg?.description ?? ''}. La communauté peut vous faire confiance.`,
      cta:      { label: 'Mon score de confiance', href: '/dashboard/avis' },
      gradient: 'from-purple-50 to-violet-50 border-purple-200',
      priority: 80,
    });
  }

  // ── Artisan : visibilité pro ──────────────────────────────────────────────
  if (profile.role === 'artisan_verified') {
    const artisanMsg = reviews >= 5
      ? {
          icon:     Star,
          emoji:    '🔧',
          title:    `${firstName}, votre réputation artisanale est établie`,
          body:     `Avec ${reviews} avis et ${avgRating.toFixed(1)}/5 de moyenne, vous faites partie des artisans les plus fiables de Biguglia.`,
          cta:      { label: 'Optimiser mon profil', href: '/dashboard/artisan' },
          gradient: 'from-brand-50 to-blue-50 border-brand-200',
          priority: 95,
        }
      : {
          icon:     Shield,
          emoji:    '✅',
          title:    `Artisan vérifié — vous avez notre confiance`,
          body:     `Votre dossier a été validé par notre équipe. Complétez vos photos et services pour attirer plus de clients.`,
          cta:      { label: 'Mon espace artisan', href: '/dashboard/artisan' },
          gradient: 'from-brand-50 to-indigo-50 border-brand-200',
          priority: 88,
        };
    messages.push(artisanMsg);
  }

  // ── Participation communautaire ───────────────────────────────────────────
  const participations = (stats.eventParticipations ?? 0) + (stats.outingParticipations ?? 0);
  if (participations >= 2) {
    messages.push({
      icon:     Users,
      emoji:    '🎉',
      title:    `Vous êtes un membre engagé !`,
      body:     `${participations} participations à des événements et sorties. Votre présence anime la communauté.`,
      cta:      { label: 'Voir les événements', href: '/evenements' },
      gradient: 'from-violet-50 to-purple-50 border-violet-200',
      priority: 70,
    });
  }

  // ── Nouveau badge gagné ───────────────────────────────────────────────────
  const newCommunityBadges = badges.filter(b =>
    ['local_contributor', 'solidarity_neighbor', 'active_organizer', 'welcome_ambassador'].includes(b)
  );
  if (newCommunityBadges.length > 0) {
    const nb = newCommunityBadges[0];
    const cfg = BADGE_CONFIG[nb as BadgeCode];
    messages.push({
      icon:     Sparkles,
      emoji:    cfg?.emoji ?? '🏅',
      title:    `Nouveau badge : "${cfg?.label ?? nb}"`,
      body:     cfg?.description ?? 'Votre contribution à la communauté est reconnue.',
      cta:      { label: 'Voir mes badges', href: '/dashboard/avis' },
      gradient: 'from-pink-50 to-rose-50 border-pink-200',
      priority: 92,
    });
  }

  // ── Prochain objectif ─────────────────────────────────────────────────────
  // (Seulement si pas déjà beaucoup de messages)
  if (messages.length < 2) {
    if ((trustStats?.trust_score ?? 0) < 55 && profile.role !== 'artisan_verified') {
      messages.push({
        icon:     Shield,
        emoji:    '📈',
        title:    `Renforcez votre profil`,
        body:     `Ajoutez une photo et un numéro de téléphone pour gagner en crédibilité auprès de la communauté.`,
        cta:      { label: 'Compléter mon profil', href: '/profil' },
        gradient: 'from-sky-50 to-blue-50 border-sky-200',
        priority: 40,
      });
    } else if ((trustStats?.interactions_done ?? 0) < 3) {
      messages.push({
        icon:     Heart,
        emoji:    '🤝',
        title:    `Participez à la vie locale`,
        body:     `Aider un voisin, partager une annonce ou rejoindre un événement — chaque action compte.`,
        cta:      { label: 'Coups de main', href: '/coups-de-main' },
        gradient: 'from-emerald-50 to-teal-50 border-emerald-100',
        priority: 30,
      });
    }
  }

  return messages.sort((a, b) => b.priority - a.priority);
}

// ─── Composant message card ───────────────────────────────────────────────────

function RecognitionCard({ msg }: { msg: RecognitionMessage }) {
  const IconComp = msg.icon;
  return (
    <div className={cn('rounded-2xl border p-4 bg-gradient-to-br', msg.gradient)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-lg">
          {msg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-snug">{msg.title}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{msg.body}</p>
          {msg.cta && (
            <Link href={msg.cta.href}
              className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
              {msg.cta.label} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <IconComp className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function RecognitionBanner({ dashData, trustStats, trustBadges }: RecognitionBannerProps) {
  const { profile } = useAuthStore();
  const { stats } = dashData;

  const messages = useMemo(() => {
    if (!profile) return [];
    return buildMessages(profile, stats, trustStats, trustBadges);
  }, [profile, stats, trustStats, trustBadges]);

  // N'afficher que si on a vraiment quelque chose à dire
  if (!profile || messages.length === 0) return null;

  // On affiche max 2 messages (les plus prioritaires)
  const displayed = messages.slice(0, 2);

  return (
    <div>
      {/* En-tête discret */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Votre impact</span>
        </div>
        <Link href="/communaute/artisans"
          className="text-xs text-brand-500 font-semibold hover:text-brand-700 flex items-center gap-1">
          La communauté <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Messages */}
      <div className={cn(
        'grid gap-3',
        displayed.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
      )}>
        {displayed.map((msg, i) => (
          <RecognitionCard key={i} msg={msg} />
        ))}
      </div>
    </div>
  );
}

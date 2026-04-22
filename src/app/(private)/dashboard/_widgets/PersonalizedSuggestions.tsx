'use client';

/**
 * PersonalizedSuggestions — Dashboard widget "Pour vous"
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche des suggestions intelligentes basées sur le profil d'intérêt
 * calculé dans user-interests.ts (rôle + historique de navigation local).
 *
 * Sections affichées :
 *   • "Pour vous"      — liens prioritaires selon le profil d'intérêt
 *   • "Autour de vous" — contenu local selon le secteur (home_sector_id)
 *   • "Nouvelles opportunités" — actions "à ne pas manquer" contextuelles
 *
 * Philosophie : zéro requête Supabase ici — tout est dérivé du profil
 * Supabase (rôle, secteur) et du localStorage (comportement de navigation).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, MapPin, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { computeUserInterestProfile, type InterestCategory } from '@/lib/user-interests';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  emoji: string;
  label: string;
  desc: string;
  href: string;
  highlight?: boolean;
}

// ─── Suggestions par profil d'intérêt ────────────────────────────────────────

const PROFILE_SUGGESTIONS: Record<InterestCategory, SuggestionItem[]> = {
  artisanat: [
    { emoji: '💼', label: 'Offres d\'emploi',         desc: 'Missions et CDD locaux', href: '/emploi/offres',           highlight: true  },
    { emoji: '🔧', label: 'Mon espace artisan',       desc: 'Profil, devis, avis',    href: '/dashboard/artisan',       highlight: true  },
    { emoji: '📋', label: 'Demandes de service',      desc: 'Clients qui cherchent',  href: '/artisans/demande',                          },
    { emoji: '⭐', label: 'Mes avis clients',         desc: 'Gérer ma réputation',    href: '/dashboard/avis',                             },
    { emoji: '🛠️', label: 'Matériel professionnel',  desc: 'Outils à emprunter',     href: '/materiel',                                   },
  ],
  emploi: [
    { emoji: '💼', label: 'Offres d\'emploi',         desc: 'CDI, CDD, saisonnier',   href: '/emploi/offres',           highlight: true  },
    { emoji: '📄', label: 'Déposer votre CV',         desc: 'Faites-vous connaître',  href: '/emploi/demandes/publier', highlight: true  },
    { emoji: '🙋', label: 'Candidatures locales',     desc: 'Voir les profils',       href: '/emploi/demandes',                           },
    { emoji: '🔧', label: 'Artisans locaux',          desc: 'Services à domicile',    href: '/artisans',                                   },
    { emoji: '📦', label: 'Petites annonces',         desc: 'Bonnes affaires locales',href: '/annonces',                                   },
  ],
  communaute: [
    { emoji: '🎉', label: 'Événements à venir',       desc: 'Ce qui se passe ici',    href: '/evenements',              highlight: true  },
    { emoji: '💬', label: 'Forum local',              desc: 'Discussions des voisins',href: '/forum',                   highlight: true  },
    { emoji: '🌿', label: 'Promenades & Nature',      desc: 'Sorties groupées',       href: '/promenades',                                },
    { emoji: '🏛️', label: 'Associations',            desc: 'Sport, culture, bénév.', href: '/associations',                              },
    { emoji: '🤝', label: 'Coups de main',            desc: 'Entraide entre voisins', href: '/coups-de-main',                             },
  ],
  entraide: [
    { emoji: '🤝', label: 'Coups de main',            desc: 'Demandes actives',       href: '/coups-de-main',           highlight: true  },
    { emoji: '🔍', label: 'Perdu / Trouvé',           desc: 'Aider à retrouver',      href: '/perdu-trouve',            highlight: true  },
    { emoji: '💬', label: 'Forum local',              desc: 'Discuter avec voisins',  href: '/forum',                                     },
    { emoji: '🤝', label: 'Proposer de l\'aide',      desc: 'Publiez une offre',      href: '/coups-de-main/nouveau',                      },
    { emoji: '🎉', label: 'Événements',               desc: 'Rencontrer la communauté',href: '/evenements',                               },
  ],
  annonces: [
    { emoji: '📦', label: 'Petites annonces',         desc: 'Toutes les offres',      href: '/annonces',                highlight: true  },
    { emoji: '🛠️', label: 'Matériel partagé',        desc: 'Outils à emprunter',     href: '/materiel',                highlight: true  },
    { emoji: '🏆', label: 'Collections',              desc: 'Objets rares, vintage',  href: '/collectionneurs',                           },
    { emoji: '➕', label: 'Publier une annonce',      desc: 'Vente, don, échange',    href: '/annonces/nouvelle',                          },
    { emoji: '🔍', label: 'Perdu / Trouvé',           desc: 'Signalez un objet',      href: '/perdu-trouve',                               },
  ],
  promenades: [
    { emoji: '🌿', label: 'Promenades & Nature',      desc: 'Sentiers et sorties',    href: '/promenades',              highlight: true  },
    { emoji: '🎉', label: 'Événements locaux',        desc: 'Activités de plein air', href: '/evenements',              highlight: true  },
    { emoji: '💬', label: 'Forum nature',             desc: 'Conseils et partages',   href: '/forum',                                     },
    { emoji: '🤝', label: 'Associations',             desc: 'Randonnée, nature',      href: '/associations',                               },
    { emoji: '📸', label: 'Coups de main',            desc: 'Organiser une sortie',   href: '/coups-de-main',                              },
  ],
};

// ─── Opportunités contextuelles par rôle ─────────────────────────────────────

function getOpportunities(role: string, sectorId?: string | null): SuggestionItem[] {
  const sector = sectorId ? `?secteur=${sectorId}` : '';

  if (role === 'artisan_verified') {
    return [
      { emoji: '📊', label: 'Boostez votre visibilité',  desc: 'Complétez photos & description',  href: '/dashboard/artisan',   highlight: true },
      { emoji: '💌', label: 'Nouveaux messages',         desc: 'Prospects et demandes',           href: '/messages',                              },
      { emoji: '🏅', label: 'Obtenez le badge Pro',      desc: 'Gagnez en crédibilité',           href: '/confiance',                             },
    ];
  }
  if (role === 'artisan_pending') {
    return [
      { emoji: '⏳', label: 'Complétez votre dossier',   desc: 'Accélérez la validation',         href: '/inscription/artisan-profil', highlight: true },
      { emoji: '📋', label: 'En quoi ça consiste ?',     desc: 'Guide artisan vérifié',           href: '/confiance',                                  },
    ];
  }
  // Resident, moderator, admin
  return [
    { emoji: '📍', label: 'Contenu près de vous',       desc: `Votre secteur${sector ? ' ciblé' : ''}`, href: `/forum${sector}`, highlight: true },
    { emoji: '🔔', label: 'Activer les alertes',        desc: 'Soyez notifié localement',        href: '/notifications',                         },
    { emoji: '🚀', label: 'Invitez vos voisins',        desc: 'Faites grandir la communauté',    href: '/partager',                              },
  ];
}

// ─── Composant suggestion card ────────────────────────────────────────────────

function SuggestionCard({ item, size = 'normal' }: { item: SuggestionItem; size?: 'normal' | 'small' }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-2xl border transition-transform hover:-translate-y-0.5',
        item.highlight
          ? 'bg-brand-50 border-brand-200 hover:bg-brand-100 hover:border-brand-300 hover:shadow-sm'
          : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm',
        size === 'small' && 'p-2.5',
      )}
    >
      <span className={cn(
        'text-xl flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl',
        item.highlight ? 'bg-brand-100' : 'bg-gray-100',
        size === 'small' && 'w-8 h-8 text-base',
      )}>
        {item.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-bold text-gray-900 truncate',
          size === 'small' ? 'text-xs' : 'text-sm',
          item.highlight && 'text-brand-800',
        )}>
          {item.label}
        </p>
        <p className="text-xs text-gray-500 truncate">{item.desc}</p>
      </div>
      <ChevronRight className={cn(
        'w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
        item.highlight ? 'text-brand-500' : 'text-gray-400',
      )} />
    </Link>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PersonalizedSuggestions() {
  const { profile } = useAuthStore();

  const interestProfile = useMemo(() => {
    if (!profile) return null;
    return computeUserInterestProfile(profile);
  }, [profile]);

  if (!profile || !interestProfile) return null;

  const suggestions = PROFILE_SUGGESTIONS[interestProfile.primary] ?? PROFILE_SUGGESTIONS.communaute;
  const opportunities = getOpportunities(profile.role, profile.home_sector_id);

  // Titre contextuel de la section
  const sectionTitle = {
    artisanat: 'Pour votre activité',
    emploi:    'Opportunités emploi',
    communaute:'Pour votre communauté',
    entraide:  'Entraide locale',
    annonces:  'Bonnes affaires',
    promenades:'Sorties & Nature',
  }[interestProfile.primary] ?? 'Pour vous';

  return (
    <div className="space-y-5">

      {/* ── Section "Pour vous" ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            {sectionTitle}
            {interestProfile.source !== 'role' && (
              <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full ml-1">
                {interestProfile.source === 'behavior' ? 'Adapté à vos visites' : 'Adapté à votre profil'}
              </span>
            )}
          </h3>
          <span className="text-xs text-gray-400">{interestProfile.badge}</span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.slice(0, 4).map(item => (
            <SuggestionCard key={item.href} item={item} />
          ))}
        </div>
      </div>

      {/* ── Section "Autour de vous" (géo) ── */}
      {profile.home_sector_id && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              Autour de vous
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { emoji: '💬', label: 'Forum de votre secteur',  desc: 'Discussions locales',    href: `/forum?secteur=${profile.home_sector_id}`,       highlight: true  },
              { emoji: '🎉', label: 'Événements proches',      desc: 'À ne pas manquer',       href: `/evenements?secteur=${profile.home_sector_id}`,                    },
              { emoji: '🤝', label: 'Coups de main locaux',    desc: 'Besoins de vos voisins', href: `/coups-de-main?secteur=${profile.home_sector_id}`,                 },
              { emoji: '📦', label: 'Annonces du secteur',     desc: 'Bonnes affaires proches',href: `/annonces?secteur=${profile.home_sector_id}`,                      },
            ].map(item => (
              <SuggestionCard key={item.href} item={item} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* ── Section "Nouvelles opportunités" ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Nouvelles opportunités locales
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {opportunities.map(item => (
            <SuggestionCard key={item.href} item={item} size="small" />
          ))}
        </div>
      </div>

    </div>
  );
}

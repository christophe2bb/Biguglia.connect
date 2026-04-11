'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Plus, MessageCircle, Eye, Pin, Flame, Lock, Archive,
  Search, Filter, MapPin, Tag, Users, Bell,
  TrendingUp, Clock, Star, List, X, Image as ImageIcon,
  CheckCircle2, AlertTriangle, Lightbulb, HelpCircle,
  ThumbsUp, BookOpen, Megaphone, Wrench, Heart,
  ArrowRight, ChevronRight, Zap, Sparkles,
  Calendar, TreePine, ShoppingBag, Dog,
  MessageSquare, LayoutGrid, Share2, Flag, Shield,
  Siren, Handshake, Baby, ShoppingCart, Home, Bike,
  ChevronDown, CheckCheck, Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ForumSector, ForumCategory, ForumTopic } from '@/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─── Secteurs Biguglia ────────────────────────────────────────────────────────
const SECTORS_DEFAULT: Omit<ForumSector, 'topic_count'>[] = [
  { id: 'les-collines', name: 'Les Collines',        slug: 'les-collines', description: 'Quartier résidentiel sur les hauteurs', icon: '⛰️', color: 'emerald', display_order: 1 },
  { id: 'figabruna',    name: 'Figabruna',            slug: 'figabruna',    description: 'Secteur sud de Biguglia',               icon: '🌊', color: 'blue',    display_order: 2 },
  { id: 'village',      name: 'Village de Biguglia',  slug: 'village',      description: 'Cœur historique du village',            icon: '🏘️', color: 'amber',   display_order: 3 },
  { id: 'casatorra',    name: 'Casatorra',             slug: 'casatorra',    description: 'Secteur Casatorra',                     icon: '🌿', color: 'green',   display_order: 4 },
  { id: 'ortale',       name: 'Ortale',                slug: 'ortale',       description: 'Quartier Ortale',                       icon: '🏡', color: 'violet',  display_order: 5 },
  { id: 'la-plaine',    name: 'La Plaine',             slug: 'la-plaine',    description: 'Zone de la plaine et étang',            icon: '🌾', color: 'orange',  display_order: 6 },
  { id: 'la-marana',    name: 'La Marana',             slug: 'la-marana',    description: 'Zone de La Marana',                     icon: '🏖️', color: 'cyan',    display_order: 7 },
];

const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; dot: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', ring: 'ring-emerald-300' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    ring: 'ring-blue-300'    },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',   ring: 'ring-amber-300'   },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   badge: 'bg-green-100 text-green-700',     dot: 'bg-green-400',   ring: 'ring-green-300'   },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400',  ring: 'ring-violet-300'  },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400',  ring: 'ring-orange-300'  },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-400',    ring: 'ring-cyan-300'    },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-700',       dot: 'bg-gray-400',    ring: 'ring-gray-300'    },
};

// ─── Catégories enrichies ─────────────────────────────────────────────────────
const CATEGORIES_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; desc: string; priority: 'high' | 'medium' | 'low' }> = {
  'vie-pratique':   { icon: '🔧', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  desc: 'Voirie, éclairage, déchets, eau',        priority: 'high'   },
  'vie-locale':     { icon: '🏘️', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   desc: 'Fêtes, animations, mairie, école',        priority: 'high'   },
  'besoins':        { icon: '🙋', color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    desc: 'Demandes, avis, recommandations',         priority: 'high'   },
  'recommandations':{ icon: '⭐', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  desc: 'Bonnes adresses, artisans, services',     priority: 'high'   },
  'idees':          { icon: '💡', color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  desc: 'Propositions, idées pour la ville',       priority: 'high'   },
  'promenades':     { icon: '🌿', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Balades, sentiers, spots nature',          priority: 'medium' },
  'vigilance':      { icon: '👁️', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     desc: 'Informations utiles, sécurité douce',     priority: 'medium' },
  'entraide':       { icon: '🤝', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',    desc: 'Covoiturage, aide ponctuelle',            priority: 'medium' },
  'vie-quartier':   { icon: '🏠', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     desc: 'Vie de quartier au quotidien',            priority: 'medium' },
  'infos-pratiques':{ icon: 'ℹ️', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    desc: 'Informations locales utiles',             priority: 'medium' },
  'securite':       { icon: '🚨', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     desc: 'Sécurité, vigilance de quartier',         priority: 'medium' },
  'commerces':      { icon: '🛒', color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  desc: 'Commerces et services locaux',            priority: 'low'    },
  'enfants-ecoles': { icon: '🎒', color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',    desc: 'Enfants, écoles, activités',              priority: 'low'    },
  'nature-animaux': { icon: '🌿', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Nature, animaux, environnement',          priority: 'low'    },
  'travaux':        { icon: '🔧', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  desc: 'Travaux, chantiers, bricolage',           priority: 'low'    },
  'evenements':     { icon: '🎉', color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  desc: 'Événements, sorties locales',             priority: 'low'    },
  'libre':          { icon: '💬', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200',    desc: 'Discussion libre entre habitants',        priority: 'low'    },
};

function getCatConfig(slug?: string) {
  if (!slug) return CATEGORIES_CONFIG['libre'];
  return CATEGORIES_CONFIG[slug] ?? CATEGORIES_CONFIG['libre'];
}

// ─── Types de post ────────────────────────────────────────────────────────────
const POST_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
  question:      { icon: HelpCircle,    label: 'Question',        color: 'text-sky-700',     bg: 'bg-sky-100',     border: 'border-sky-200'    },
  information:   { icon: Megaphone,     label: 'Info',            color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200'   },
  idee:          { icon: Lightbulb,     label: 'Idée',            color: 'text-violet-700',  bg: 'bg-violet-100',  border: 'border-violet-200' },
  avis:          { icon: ThumbsUp,      label: 'Avis',            color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200'  },
  besoin:        { icon: Heart,         label: 'Besoin',          color: 'text-rose-700',    bg: 'bg-rose-100',    border: 'border-rose-200'   },
  alerte:        { icon: AlertTriangle, label: 'Alerte douce',    color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200' },
  retour:        { icon: BookOpen,      label: "Retour d'exp.",   color: 'text-teal-700',    bg: 'bg-teal-100',    border: 'border-teal-200'   },
  recommandation:{ icon: Star,          label: 'Recommandation',  color: 'text-yellow-700',  bg: 'bg-yellow-100',  border: 'border-yellow-200' },
};

// ─── Niveaux d'urgence ────────────────────────────────────────────────────────
const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  haute:  { label: 'Urgent',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',   dot: 'bg-red-500'    },
  normal: { label: 'Normal',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300', dot: 'bg-amber-500'  },
  basse:  { label: 'Info',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300', dot: 'bg-green-500'  },
};

// ─── Modules inter-app ────────────────────────────────────────────────────────
const MODULE_LINKS = [
  { href: '/evenements',    icon: Calendar,     label: 'Événements',     color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { href: '/promenades',    icon: TreePine,     label: 'Promenades',     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { href: '/coups-de-main', icon: Heart,        label: 'Coups de main',  color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200'    },
  { href: '/annonces',      icon: ShoppingBag,  label: 'Annonces',       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
  { href: '/artisans',      icon: Wrench,       label: 'Artisans',       color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200'  },
  { href: '/perdu-trouve',  icon: Dog,          label: 'Perdu / Trouvé', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     },
];

// ─── Raccourcis catégories hero ───────────────────────────────────────────────
const HERO_SHORTCUTS = [
  { slug: 'vie-pratique',    icon: '🔧', label: 'Problème local'  },
  { slug: 'idees',           icon: '💡', label: 'Idée'            },
  { slug: 'besoins',         icon: '🙋', label: 'Besoin / Avis'  },
  { slug: 'entraide',        icon: '🤝', label: 'Entraide'        },
  { slug: 'evenements',      icon: '🎉', label: 'Événement'       },
  { slug: 'recommandations', icon: '⭐', label: 'Bonne adresse'  },
];

type SortMode = 'recent' | 'hot' | 'replies' | 'views';

// ─── Statut badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isResolved }: { status: string; isResolved?: boolean }) {
  if (isResolved) return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
      <CheckCircle2 className="w-3 h-3" /> Résolu
    </span>
  );
  if (status === 'verrouille') return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
      <Lock className="w-3 h-3" /> Verrouillé
    </span>
  );
  if (status === 'archive') return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      <Archive className="w-3 h-3" /> Archivé
    </span>
  );
  return null;
}

// ─── UrgencyDot ───────────────────────────────────────────────────────────────
function UrgencyDot({ urgency }: { urgency?: string }) {
  if (!urgency || urgency === 'basse') return null;
  const cfg = URGENCY_CONFIG[urgency];
  if (!cfg) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold border', cfg.color, cfg.bg, cfg.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── TopicCard PRO ─────────────────────────────────────────────────────────────
function TopicCard({ topic, sectors, compact = false }: { topic: ForumTopic; sectors: ForumSector[]; compact?: boolean }) {
  const sector = sectors.find(s => s.id === topic.sector_id);
  const colors = SECTOR_COLORS[sector?.color || 'gray'];
  const replyCount = topic.reply_count ?? 0;
  const photos = (topic as ForumTopic & { photos?: { url: string }[] }).photos;
  const coverPhoto = photos?.[0]?.url;
  const photoCount = photos?.length ?? 0;
  const catSlug = (topic.category as { slug?: string })?.slug;
  const catCfg = getCatConfig(catSlug);
  const postType = (topic as ForumTopic & { post_type?: string }).post_type;
  const ptCfg = postType ? POST_TYPE_CONFIG[postType] : null;
  const PtIcon = ptCfg?.icon;
  const isResolved = (topic as ForumTopic & { is_resolved?: boolean }).is_resolved;
  const urgency = (topic as ForumTopic & { urgency?: string }).urgency;
  const isHot = topic.is_hot || replyCount >= 5;
  const isNew = !topic.last_reply_at && new Date(topic.created_at).getTime() > Date.now() - 86400000 * 2;

  // Version compacte (sidebar)
  if (compact) {
    return (
      <Link href={`/forum/${topic.id}`} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm', catCfg.bg)}>
          {catCfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 line-clamp-1 transition-colors">{topic.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{formatRelative(topic.created_at)}</span>
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageCircle className="w-3 h-3" /> {replyCount}
            </span>
            {isHot && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">🔥</span>}
            {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-1 transition-colors" />
      </Link>
    );
  }

  return (
    <Link href={`/forum/${topic.id}`}>
      <article className={cn(
        'bg-white rounded-2xl border transition-all duration-200 overflow-hidden group hover:-translate-y-0.5',
        urgency === 'haute' ? 'border-red-100 hover:shadow-lg hover:border-red-200' :
        isHot ? 'border-orange-100 hover:shadow-lg hover:border-orange-200' :
        'border-gray-100 hover:shadow-md hover:border-violet-100'
      )}>
        {/* Barre couleur catégorie */}
        <div className={cn('h-1 w-full',
          urgency === 'haute' ? 'bg-red-400' :
          catCfg.bg.replace('-50', '-300')
        )} />

        {/* Photo de couverture */}
        {coverPhoto && (
          <div className="relative h-44 bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhoto} alt={topic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {photoCount > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> {photoCount}
              </span>
            )}
            {topic.is_pinned && (
              <span className="absolute top-2 left-2 bg-violet-600/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
                <Pin className="w-3 h-3" /> Épinglé
              </span>
            )}
            {isHot && (
              <span className="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                <Flame className="w-3 h-3" /> Actif
              </span>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              <Avatar
                src={(topic.author as { avatar_url?: string })?.avatar_url}
                name={(topic.author as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              {isNew && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" title="Nouveau" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges ligne 1 : type + secteur + urgence */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {ptCfg && PtIcon && (
                  <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border', ptCfg.bg, ptCfg.color, ptCfg.border)}>
                    <PtIcon className="w-3 h-3" /> {ptCfg.label}
                  </span>
                )}
                {sector && (
                  <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold', colors.badge)}>
                    <span className="text-[11px]">{sector.icon}</span> {sector.name}
                  </span>
                )}
                <UrgencyDot urgency={urgency} />
                {!coverPhoto && topic.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-semibold">
                    <Pin className="w-3 h-3" /> Épinglé
                  </span>
                )}
                {!coverPhoto && isHot && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    <Flame className="w-3 h-3" /> Actif
                  </span>
                )}
                {isNew && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    <Zap className="w-3 h-3" /> Nouveau
                  </span>
                )}
                <StatusBadge status={topic.status} isResolved={isResolved} />
              </div>

              {/* Titre */}
              <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">
                {topic.title}
              </h3>

              {/* Catégorie tag */}
              {topic.category && (
                <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium mb-2', catCfg.bg, catCfg.color, catCfg.border)}>
                  <span>{catCfg.icon}</span>
                  {(topic.category as { name?: string })?.name}
                </span>
              )}

              {/* Extrait */}
              <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">{topic.content}</p>

              {/* Tags */}
              {topic.tags && (topic.tags as string[]).length > 0 && (
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {(topic.tags as string[]).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md hover:bg-violet-50 hover:text-violet-600 transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Métadonnées */}
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap pt-2 border-t border-gray-50">
                <span className="font-semibold text-gray-600">{(topic.author as { full_name?: string })?.full_name ?? 'Membre'}</span>
                <span className="text-gray-200">·</span>
                <span>{formatRelative(topic.created_at)}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg font-semibold">
                    <MessageCircle className="w-3 h-3" /> {replyCount}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                    <Eye className="w-3 h-3" /> {topic.views ?? 0}
                  </span>
                  {photoCount > 0 && !coverPhoto && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                      <ImageIcon className="w-3 h-3" /> {photoCount}
                    </span>
                  )}
                </div>
                {topic.last_reply_at && (
                  <span className="text-gray-300 ml-1 hidden sm:inline text-[11px]" title="Dernière réponse">
                    <Clock className="w-3 h-3 inline mr-0.5" />{formatRelative(topic.last_reply_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Page principale (inner) ──────────────────────────────────────────────────
function ForumPageInner() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [hotTopics, setHotTopics] = useState<ForumTopic[]>([]);
  const [recentlyResolved, setRecentlyResolved] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSector, setSelectedSector] = useState<string | null>(searchParams.get('secteur'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('categorie'));
  const [selectedType, setSelectedType] = useState<string | null>(searchParams.get('type'));
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ topics: 0, replies: 0, members: 0, resolved: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'ouvert' | 'resolu'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'haute'>('all');
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Secteurs
    const { data: sectorData } = await supabase.from('forum_sectors').select('*').order('display_order');
    const usedSectors: ForumSector[] = (sectorData && sectorData.length > 0)
      ? sectorData
      : SECTORS_DEFAULT.map(s => ({ ...s, topic_count: 0 }));
    setSectors(usedSectors);

    // Catégories
    const { data: catData } = await supabase.from('forum_categories').select('*').order('display_order');
    const catList = (catData && catData.length > 0 ? catData : [
      { id: 'vie-quartier',    name: 'Vie du quartier',     icon: '🏠', slug: 'vie-quartier',    description: '', display_order: 1 },
      { id: 'infos-pratiques', name: 'Infos pratiques',     icon: 'ℹ️', slug: 'infos-pratiques', description: '', display_order: 2 },
      { id: 'entraide',        name: 'Entraide',             icon: '🤝', slug: 'entraide',        description: '', display_order: 3 },
      { id: 'securite',        name: 'Sécurité',             icon: '🚨', slug: 'securite',        description: '', display_order: 4 },
      { id: 'commerces',       name: 'Commerces & Services', icon: '🛒', slug: 'commerces',       description: '', display_order: 5 },
      { id: 'enfants-ecoles',  name: 'Enfants & Écoles',     icon: '🎒', slug: 'enfants-ecoles',  description: '', display_order: 6 },
      { id: 'nature-animaux',  name: 'Nature & Animaux',     icon: '🌿', slug: 'nature-animaux',  description: '', display_order: 7 },
      { id: 'travaux',         name: 'Travaux & Chantiers',  icon: '🔧', slug: 'travaux',         description: '', display_order: 8 },
      { id: 'evenements',      name: 'Événements locaux',    icon: '🎉', slug: 'evenements',      description: '', display_order: 9 },
      { id: 'libre',           name: 'Discussion libre',     icon: '💬', slug: 'libre',           description: '', display_order: 10 },
    ]) as ForumCategory[];
    setCategories(catList);

    // Statistiques enrichies
    const [{ count: tc }, { count: rc }, { count: mc }, { count: resc }] = await Promise.all([
      supabase.from('forum_topics').select('*', { count: 'exact', head: true }),
      supabase.from('forum_replies').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('forum_topics').select('*', { count: 'exact', head: true }).eq('is_resolved', true),
    ]);
    setStats({ topics: tc || 0, replies: rc || 0, members: mc || 0, resolved: resc || 0 });

    // Topics principaux
    let topicList: ForumTopic[] = [];
    try {
      let query = supabase
        .from('forum_topics')
        .select(`*, author:profiles!forum_topics_author_id_fkey(id, full_name, avatar_url, role), sector:forum_sectors(id, name, slug, icon, color), category:forum_categories(id, name, icon, slug)`)
        .not('status', 'eq', 'masque')
        .order('is_pinned', { ascending: false });

      if (selectedSector) query = query.eq('sector_id', selectedSector);
      if (selectedCategory) query = query.eq('category_id', selectedCategory);
      if (selectedType) query = query.eq('post_type', selectedType);
      if (statusFilter === 'resolu') query = query.eq('is_resolved', true);
      else if (statusFilter === 'ouvert') query = query.eq('status', 'ouvert');
      if (urgencyFilter === 'haute') query = query.eq('urgency', 'haute');
      if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery.trim()}%`);

      if (sortMode === 'hot') query = query.order('reply_count', { ascending: false });
      else if (sortMode === 'replies') query = query.order('reply_count', { ascending: false });
      else if (sortMode === 'views') query = query.order('views', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      query = query.limit(40);
      const { data } = await query;
      if (data && data.length > 0) topicList = data as unknown as ForumTopic[];
    } catch { /* ignore */ }

    // Fallback vers forum_posts
    if (topicList.length === 0) {
      let q2 = supabase
        .from('forum_posts')
        .select(`*, author:profiles!forum_posts_author_id_fkey(id, full_name, avatar_url, role), category:forum_categories(id, name, icon, slug)`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40);
      if (selectedCategory) q2 = q2.eq('category_id', selectedCategory);
      if (searchQuery.trim()) q2 = q2.ilike('title', `%${searchQuery.trim()}%`);
      const { data: postsData } = await q2;
      topicList = (postsData || []).map((p: Record<string, unknown>) => ({
        ...p,
        status: p.is_closed ? 'verrouille' : 'ouvert',
        reply_count: 0, reaction_count: 0, last_reply_at: null,
        is_hot: false, sector_id: null, visibility: 'public', tags: [],
      } as unknown as ForumTopic));
    }

    setTopics(topicList);
    setHotTopics([...topicList].sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0)).slice(0, 5));
    setRecentlyResolved(topicList.filter(t => (t as ForumTopic & { is_resolved?: boolean }).is_resolved).slice(0, 3));
    setLoading(false);
  }, [selectedSector, selectedCategory, selectedType, sortMode, statusFilter, urgencyFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const clearFilters = () => {
    setSelectedSector(null);
    setSelectedCategory(null);
    setSelectedType(null);
    setStatusFilter('all');
    setUrgencyFilter('all');
    setSearchQuery('');
    setSearchInput('');
  };
  const activeFiltersCount = [selectedSector, selectedCategory, selectedType, statusFilter !== 'all', searchQuery, urgencyFilter !== 'all'].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ════════════════════════════════════════════════════════
          HERO — Forum local Biguglia
      ════════════════════════════════════════════════════════ */}
      <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
        {/* Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-300/15 rounded-full blur-2xl translate-y-1/3" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-purple-300/10 rounded-full blur-2xl -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 text-violet-200 text-sm">
            <span className="p-1.5 bg-white/15 rounded-lg"><MessageSquare className="w-4 h-4" /></span>
            <span className="font-medium opacity-90">Forum · Vie locale Biguglia</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-none tracking-tight">
                💬 Forum local<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-indigo-200">Biguglia</span>
              </h1>
              <p className="text-white/80 text-lg leading-relaxed mb-5 max-w-xl">
                Votre espace pour échanger, signaler, proposer et vous entraider — entre voisins, pour votre quartier.
              </p>

              {/* Stats dynamiques */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                {[
                  { icon: MessageCircle, val: stats.topics,   label: 'sujets',   sub: 'discussions actives',  color: 'text-violet-200' },
                  { icon: TrendingUp,    val: stats.replies,  label: 'réponses', sub: 'échanges locaux',      color: 'text-indigo-200' },
                  { icon: Users,         val: stats.members,  label: 'membres',  sub: 'habitants actifs',     color: 'text-purple-200' },
                  { icon: CheckCheck,    val: stats.resolved, label: 'résolus',  sub: 'problèmes réglés',     color: 'text-emerald-200' },
                ].map(({ icon: I, val, label, sub, color }) => (
                  <div key={label} className="inline-flex items-center gap-2.5 bg-white/12 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                    <I className={cn('w-4 h-4 flex-shrink-0', color)} />
                    <div>
                      <p className="text-sm font-black leading-tight">{val} <span className="font-bold opacity-90">{label}</span></p>
                      <p className="text-[11px] text-violet-200/80 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Raccourcis thématiques */}
              <div className="flex flex-wrap gap-2 mb-2">
                {HERO_SHORTCUTS.map(s => (
                  <button
                    key={s.slug}
                    onClick={() => setSelectedCategory(s.slug)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/25 transition-all backdrop-blur-sm"
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
              {profile ? (
                <button
                  onClick={() => router.push('/forum/nouveau')}
                  className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-7 py-3.5 rounded-2xl hover:bg-violet-50 transition-all shadow-xl hover:-translate-y-0.5 text-sm w-full lg:w-auto"
                >
                  <Plus className="w-5 h-5" /> Nouveau sujet
                </button>
              ) : (
                <Link
                  href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-7 py-3.5 rounded-2xl hover:bg-violet-50 transition-all shadow-xl text-sm w-full lg:w-auto"
                >
                  <Plus className="w-5 h-5" /> Rejoindre la discussion
                </Link>
              )}
              <Link
                href="/recherche?q=forum"
                className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-7 py-3 rounded-2xl hover:bg-white/25 transition-all text-sm w-full lg:w-auto"
              >
                <Search className="w-4 h-4" /> Recherche avancée
              </Link>
            </div>
          </div>

          {/* ── Secteurs pills ── */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-violet-200 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Mon quartier
              </p>
              {selectedSector && (
                <button onClick={() => setSelectedSector(null)} className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Tout afficher
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-6">
              <button
                onClick={() => setSelectedSector(null)}
                className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all border backdrop-blur-sm',
                  !selectedSector ? 'bg-white text-violet-700 border-white shadow-lg' : 'bg-white/12 border-white/25 text-white hover:bg-white/22')}
              >
                🗺️ Tous les secteurs
              </button>
              {sectors.map(s => {
                const isActive = selectedSector === s.id || selectedSector === s.slug;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSector(isActive ? null : (s.id || s.slug))}
                    className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all border backdrop-blur-sm',
                      isActive ? 'bg-white text-violet-700 border-white shadow-lg' : 'bg-white/12 border-white/25 text-white hover:bg-white/22')}
                  >
                    <span>{s.icon}</span> {s.name}
                    {s.topic_count ? <span className="text-xs opacity-70">({s.topic_count})</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          BARRE CATÉGORIES SCROLLABLE
      ════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap flex-shrink-0',
                !selectedCategory ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
            >
              Toutes les catégories
            </button>
            {categories.map(cat => {
              const cfg = getCatConfig(cat.slug);
              const isActive = selectedCategory === cat.id || selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap flex-shrink-0',
                    isActive ? cn(cfg.bg, cfg.color, cfg.border, 'shadow-sm') : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
                >
                  <span>{cat.icon}</span> {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          LAYOUT PRINCIPAL
      ════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0">

            {/* ── Filtres actifs pills ── */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSector && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-semibold border border-violet-200">
                    <MapPin className="w-3 h-3" />
                    {sectors.find(s => s.id === selectedSector || s.slug === selectedSector)?.name ?? selectedSector}
                    <button onClick={() => setSelectedSector(null)} className="ml-1 hover:text-violet-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold border border-indigo-200">
                    <Tag className="w-3 h-3" />
                    {categories.find(c => c.id === selectedCategory || c.slug === selectedCategory)?.name ?? selectedCategory}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:text-indigo-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedType && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full font-semibold border border-sky-200">
                    {POST_TYPE_CONFIG[selectedType]?.label ?? selectedType}
                    <button onClick={() => setSelectedType(null)} className="ml-1 hover:text-sky-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold border border-emerald-200">
                    {statusFilter === 'resolu' ? '✅ Résolus' : '🟢 Ouverts'}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-emerald-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {urgencyFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold border border-red-200">
                    🚨 Urgents
                    <button onClick={() => setUrgencyFilter('all')} className="ml-1 hover:text-red-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-semibold border border-gray-200">
                    <Search className="w-3 h-3" /> &quot;{searchQuery}&quot;
                    <button onClick={() => { setSearchQuery(''); setSearchInput(''); }} className="ml-1 hover:text-gray-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold px-2">
                  Tout effacer
                </button>
              </div>
            )}

            {/* ── Barre recherche + contrôles ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4">
              <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Voirie, éclairage, fête, voisinage, idée…"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 focus:bg-white transition-all"
                  />
                  {searchInput && (
                    <button type="button" onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors flex-shrink-0 flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> <span className="hidden sm:inline">Chercher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(v => !v)}
                  className={cn('px-3 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 flex-shrink-0',
                    showFilters || activeFiltersCount > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtres</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-violet-700 rounded-full w-4 h-4 flex items-center justify-center text-xs font-black">{activeFiltersCount}</span>
                  )}
                </button>
              </form>

              {/* Filtres avancés */}
              {showFilters && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  {/* Type de post */}
                  <div>
                    <label className="text-xs font-black text-gray-500 mb-2 block uppercase tracking-wide">Type de post</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
                        const I = cfg.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedType(selectedType === key ? null : key)}
                            className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all',
                              selectedType === key ? cn(cfg.bg, cfg.color, cfg.border) : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}
                          >
                            <I className="w-3 h-3" /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Statut */}
                    <div>
                      <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Statut</label>
                      <div className="flex gap-1.5">
                        {[
                          { val: 'all',    label: 'Tous' },
                          { val: 'ouvert', label: '🟢 Ouverts' },
                          { val: 'resolu', label: '✅ Résolus' },
                        ].map(s => (
                          <button key={s.val}
                            onClick={() => setStatusFilter(s.val as 'all' | 'ouvert' | 'resolu')}
                            className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', statusFilter === s.val ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Urgence */}
                    <div>
                      <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Urgence</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setUrgencyFilter('all')}
                          className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', urgencyFilter === 'all' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                          Tous
                        </button>
                        <button
                          onClick={() => setUrgencyFilter('haute')}
                          className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', urgencyFilter === 'haute' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50')}>
                          🚨 Urgents
                        </button>
                      </div>
                    </div>

                    {/* Vue */}
                    <div>
                      <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Vue</label>
                      <div className="flex gap-1.5">
                        <button onClick={() => setViewMode('list')} className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1', viewMode === 'list' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                          <List className="w-3.5 h-3.5" /> Liste
                        </button>
                        <button onClick={() => setViewMode('grid')} className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1', viewMode === 'grid' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                          <LayoutGrid className="w-3.5 h-3.5" /> Grille
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="w-full text-xs text-red-500 hover:text-red-700 py-2 border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-all font-semibold">
                      ✕ Effacer tous les filtres ({activeFiltersCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Barre tri + compteur ── */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
                {([
                  { key: 'recent',  icon: Clock,         label: 'Récents'    },
                  { key: 'hot',     icon: Flame,         label: '🔥 Actifs'  },
                  { key: 'replies', icon: MessageCircle, label: 'Réponses'   },
                  { key: 'views',   icon: Eye,           label: 'Vus'        },
                ] as { key: SortMode; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(s => (
                  <button key={s.key} onClick={() => setSortMode(s.key)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                      sortMode === s.key ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                    <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!loading && (
                  <span className="text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl font-semibold shadow-sm">
                    {topics.length} sujet{topics.length !== 1 ? 's' : ''}
                  </span>
                )}
                <div className="flex gap-0.5 bg-white rounded-xl border border-gray-100 p-0.5 shadow-sm">
                  <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Liste des sujets ── */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex gap-2 mb-3">
                          <div className="h-5 bg-gray-100 rounded-full w-16" />
                          <div className="h-5 bg-gray-100 rounded-full w-20" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-violet-300" />
                </div>
                <p className="text-gray-600 font-bold mb-1 text-lg">
                  {activeFiltersCount > 0 ? 'Aucun sujet pour ces filtres' : 'Aucun sujet pour l\'instant'}
                </p>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                  {activeFiltersCount > 0 ? 'Essayez d\'élargir vos critères ou changez de catégorie.' : 'Lancez la première discussion dans votre quartier !'}
                </p>
                {activeFiltersCount > 0 ? (
                  <button onClick={clearFilters} className="inline-flex items-center gap-2 text-violet-600 font-bold text-sm bg-violet-50 px-5 py-2.5 rounded-xl border border-violet-200 hover:bg-violet-100 transition-colors">
                    Effacer les filtres
                  </button>
                ) : profile ? (
                  <button onClick={() => router.push('/forum/nouveau')}
                    className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all shadow-sm">
                    <Plus className="w-4 h-4" /> Créer le premier sujet
                  </button>
                ) : (
                  <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all shadow-sm">
                    Se connecter pour contribuer
                  </Link>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                {topics.map(topic => (
                  <TopicCard key={topic.id} topic={topic} sectors={sectors} />
                ))}
              </div>
            )}

            {/* CTA non connecté */}
            {!profile && topics.length > 0 && (
              <div className="mt-8 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-6 text-center">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-violet-500" />
                </div>
                <p className="text-violet-800 font-bold text-base mb-1">Rejoignez la conversation</p>
                <p className="text-violet-600 text-sm mb-4">Connectez-vous pour créer un sujet, répondre, réagir et suivre les discussions.</p>
                <Link href="/connexion">
                  <button className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all shadow-sm">
                    Se connecter
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════
              SIDEBAR DROITE (desktop)
          ════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

            {/* Créer un sujet CTA */}
            {profile ? (
              <div className="relative bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg overflow-hidden">
                <div className="absolute inset-0 opacity-[0.07] rounded-2xl" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-base mb-1">Lancez la discussion</h3>
                  <p className="text-violet-100 text-xs mb-4 leading-relaxed">Posez votre question, signalez un problème, partagez une info utile à vos voisins.</p>
                  <button
                    onClick={() => router.push('/forum/nouveau')}
                    className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-sm w-full justify-center"
                  >
                    <Plus className="w-4 h-4" /> Nouveau sujet
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
                <h3 className="font-black text-base mb-1">Rejoignez la conversation</h3>
                <p className="text-violet-100 text-xs mb-4 leading-relaxed">Connectez-vous pour participer aux échanges locaux.</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-sm w-full justify-center">
                  Se connecter
                </Link>
              </div>
            )}

            {/* Sujets urgents */}
            {topics.some(t => (t as ForumTopic & { urgency?: string }).urgency === 'haute') && (
              <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Sujets urgents
                </h3>
                <div className="space-y-1">
                  {topics
                    .filter(t => (t as ForumTopic & { urgency?: string }).urgency === 'haute')
                    .slice(0, 3)
                    .map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
                </div>
              </div>
            )}

            {/* Sujets chauds */}
            {hotTopics.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Sujets actifs
                </h3>
                <div className="space-y-1">
                  {hotTopics.map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
                </div>
              </div>
            )}

            {/* Explorer par type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-violet-500" /> Explorer par type
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
                  const I = cfg.icon;
                  const isActive = selectedType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedType(isActive ? null : key)}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all',
                        isActive ? cn(cfg.bg, cfg.color, cfg.border) : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-white')}
                    >
                      <I className="w-3 h-3" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catégories visuelles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-violet-500" /> Explorer par thème</span>
                <button onClick={() => setShowCategoryGrid(v => !v)} className="text-gray-400 hover:text-gray-600">
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showCategoryGrid && 'rotate-180')} />
                </button>
              </h3>
              <div className={cn('grid grid-cols-2 gap-2 transition-all', !showCategoryGrid && 'max-h-48 overflow-hidden')}>
                {categories.map(cat => {
                  const cfg = getCatConfig(cat.slug);
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:shadow-sm',
                        isActive ? cn(cfg.bg, cfg.border, cfg.color) : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200')}>
                      <span className="text-xl leading-none">{cat.icon}</span>
                      <span className="text-[11px] font-bold leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
              {categories.length > 6 && (
                <button onClick={() => setShowCategoryGrid(v => !v)} className="mt-2 w-full text-xs text-violet-600 hover:text-violet-800 font-semibold py-1">
                  {showCategoryGrid ? '↑ Réduire' : `+ ${categories.length - 6} autres thèmes`}
                </button>
              )}
            </div>

            {/* Récemment résolus */}
            {recentlyResolved.length > 0 && (
              <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Récemment résolus
                </h3>
                <div className="space-y-1">
                  {recentlyResolved.map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
                </div>
              </div>
            )}

            {/* Inter-modules */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500" /> Modules liés
              </h3>
              <div className="space-y-2">
                {MODULE_LINKS.map(({ href, icon: I, label, color, bg, border }) => (
                  <Link key={href} href={href}
                    className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm group', bg, border)}>
                    <I className={cn('w-4 h-4 flex-shrink-0', color)} />
                    <span className={cn('text-sm font-semibold flex-1', color)}>{label}</span>
                    <ArrowRight className={cn('w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity', color)} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Secteurs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-500" /> Secteurs de Biguglia
              </h3>
              <div className="space-y-1.5">
                {sectors.map(s => {
                  const c = SECTOR_COLORS[s.color || 'gray'];
                  const isActive = selectedSector === s.id || selectedSector === s.slug;
                  return (
                    <button key={s.id}
                      onClick={() => setSelectedSector(isActive ? null : (s.id || s.slug))}
                      className={cn('flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-all text-left',
                        isActive ? cn(c.bg, c.text, c.border, 'border font-bold') : 'text-gray-600 hover:bg-gray-50 font-medium')}>
                      <span className="text-base leading-none">{s.icon}</span>
                      <span className="flex-1">{s.name}</span>
                      {s.topic_count ? <span className="text-xs opacity-60 bg-gray-100 px-1.5 py-0.5 rounded-full">{s.topic_count}</span> : null}
                      {isActive && <CheckCircle2 className={cn('w-3.5 h-3.5', c.text)} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accès rapide */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-violet-500" /> Accès rapide
              </h3>
              <div className="space-y-1">
                {[
                  { icon: Flame,        label: 'Sujets actifs',    action: () => setSortMode('hot')             },
                  { icon: Clock,        label: 'Plus récents',     action: () => setSortMode('recent')          },
                  { icon: CheckCircle2, label: 'Résolus',          action: () => setStatusFilter('resolu')      },
                  { icon: AlertTriangle,label: 'Urgents',          action: () => setUrgencyFilter('haute')      },
                  { icon: Bell,         label: 'Mes suivis',       action: () => router.push('/dashboard/forum') },
                  { icon: BookOpen,     label: 'Mes sujets',       action: () => router.push('/dashboard/forum') },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center gap-2.5 font-medium">
                    <item.icon className="w-3.5 h-3.5 text-gray-400" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Charte communautaire */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" /> Charte du forum
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                {[
                  { icon: '✅', text: 'Restez respectueux et bienveillant' },
                  { icon: '📍', text: 'Thèmes liés à la vie locale Biguglia' },
                  { icon: '🔍', text: 'Vérifiez si le sujet existe déjà' },
                  { icon: '📷', text: 'Photos : max 3, compressées' },
                  { icon: '🚫', text: 'Pas de données personnelles sensibles' },
                ].map(r => (
                  <li key={r.text} className="flex items-start gap-2">
                    <span className="flex-shrink-0">{r.icon}</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/forum/charte" className="mt-3 text-xs text-violet-600 hover:text-violet-800 font-semibold inline-flex items-center gap-1">
                Lire la charte complète <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Export avec Suspense ──────────────────────────────────────────────────────
export default function ForumPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-700 h-64 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    }>
      <ForumPageInner />
    </Suspense>
  );
}

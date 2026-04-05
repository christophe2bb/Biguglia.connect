'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Shield, Users, CheckCircle, MapPin,
  Wrench, MessageSquare, PenLine, Hammer, Zap, Paintbrush,
  Layers, Wind, Leaf, Drill, Loader2, Sparkles,
  TreePine, Gem, PartyPopper, Trophy, Calendar,
  Heart, Music, Footprints, HandHeart, Dog,
  Building2, ShoppingBag, ChevronRight, Star,
  Package, Lock, Eye, Bell,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import GlobalSearch from '@/components/ui/GlobalSearch';

// ─── AnimatedCount ─────────────────────────────────────────────────────────────
function AnimatedCount({ target, suffix = '', loading = false }: { target: number; suffix?: string; loading?: boolean }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (loading || started) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [loading, started]);

  useEffect(() => {
    if (!started || target === 0) return;
    let start = 0;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target]);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-300 inline" />;
  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Métiers ──────────────────────────────────────────────────────────────────
const trades = [
  { icon: Drill,      label: 'Plomberie',     href: '/artisans?categorie=plomberie',     color: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200' },
  { icon: Zap,        label: 'Électricité',   href: '/artisans?categorie=electricite',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
  { icon: Layers,     label: 'Maçonnerie',    href: '/artisans?categorie=maconnerie',    color: 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200' },
  { icon: Paintbrush, label: 'Peinture',      href: '/artisans?categorie=peinture',      color: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
  { icon: Hammer,     label: 'Menuiserie',    href: '/artisans?categorie=menuiserie',    color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
  { icon: Wind,       label: 'Climatisation', href: '/artisans?categorie=climatisation', color: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200' },
  { icon: Leaf,       label: 'Jardinage',     href: '/artisans?categorie=jardinage',     color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
  { icon: Wrench,     label: 'Bricolage',     href: '/artisans?categorie=bricolage',     color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
];

// ─── Tous les thèmes/rubriques ────────────────────────────────────────────────
const allThemes = [
  // ── Services
  {
    group: 'Services',
    href: '/artisans',
    emoji: '🔧',
    title: 'Artisans vérifiés',
    desc: 'Trouvez un professionnel de confiance à Biguglia. SIRET, assurance RC Pro, avis réels.',
    color: 'bg-brand-50 border-brand-200 text-brand-700',
    dot: 'bg-brand-500',
  },
  {
    group: 'Services',
    href: '/artisans/demande',
    emoji: '📋',
    title: 'Déposer une demande',
    desc: 'Décrivez votre projet en 2 min. Les artisans locaux vous contactent avec un devis.',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  // ── Vie pratique
  {
    group: 'Vie pratique',
    href: '/annonces',
    emoji: '📦',
    title: 'Petites annonces',
    desc: 'Achetez, vendez, échangez ou donnez avec vos voisins. Tout est local.',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500',
  },
  {
    group: 'Vie pratique',
    href: '/materiel',
    emoji: '🛠️',
    title: 'Matériel partagé',
    desc: 'Empruntez ou prêtez outils, perceuse, échelle… Sans rien acheter.',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    dot: 'bg-teal-500',
  },
  {
    group: 'Vie pratique',
    href: '/collectionneurs',
    emoji: '🏆',
    title: 'Collectionneurs',
    desc: 'Timbres, vinyles, monnaies, figurines, livres anciens… Un marché de passionnés.',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    group: 'Vie pratique',
    href: '/perdu-trouve',
    emoji: '🔍',
    title: 'Perdu / Trouvé',
    desc: 'Clés, animal, portefeuille, vélo… Signalez ou retrouvez ce qui est perdu.',
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
  },
  // ── Vie locale
  {
    group: 'Vie locale',
    href: '/evenements',
    emoji: '🎉',
    title: 'Événements',
    desc: 'Matchs SC Biguglia, concerts, vide-greniers, fêtes, ateliers… Un seul agenda.',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-500',
  },
  {
    group: 'Vie locale',
    href: '/promenades',
    emoji: '🌿',
    title: 'Promenades & Nature',
    desc: 'Sentiers, étang aux flamants roses, sorties groupées chaque week-end.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  {
    group: 'Vie locale',
    href: '/forum',
    emoji: '💬',
    title: 'Forum',
    desc: 'Posez vos questions, partagez vos infos, discutez avec les habitants.',
    color: 'bg-sky-50 border-sky-200 text-sky-700',
    dot: 'bg-sky-500',
  },
  {
    group: 'Vie locale',
    href: '/associations',
    emoji: '🏛️',
    title: 'Associations',
    desc: 'Sport, culture, bénévolat, seniors… Toutes les associations de Biguglia.',
    color: 'bg-violet-50 border-violet-200 text-violet-700',
    dot: 'bg-violet-500',
  },
  {
    group: 'Vie locale',
    href: '/coups-de-main',
    emoji: '🤝',
    title: 'Coups de main',
    desc: 'Besoin d\'aide ? Gardiennage, co-voiturage, course… Les voisins sont là.',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    dot: 'bg-orange-500',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { profile } = useAuthStore();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [counts, setCounts] = useState({ artisans: 0, membres: 0, annonces: 0, events: 0, help: 0, outings: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = createClient();
      const [
        { count: artisans },
        { count: membres },
        { count: annonces },
        { count: events },
        { count: help },
        { count: outings },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_date', new Date().toISOString().split('T')[0]),
        supabase.from('help_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('group_outings').select('id', { count: 'exact', head: true }).gte('outing_date', new Date().toISOString().split('T')[0]),
      ]);
      setCounts({
        artisans: artisans || 0,
        membres: membres || 0,
        annonces: annonces || 0,
        events: events || 0,
        help: help || 0,
        outings: outings || 0,
      });
      setCountsLoading(false);
    };
    fetchCounts();
  }, []);

  const groups = ['Services', 'Vie pratique', 'Vie locale'] as const;

  return (
    <div className="overflow-hidden">

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Fond photo — pleine visibilité */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/biguglia-hero.jpg"
          alt="Biguglia"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Léger dégradé en bas uniquement pour lisibilité de la vague */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white/30 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* GAUCHE */}
            <div className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-white/60 rounded-full px-4 py-2 mb-7 shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <MapPin className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-sm font-bold text-gray-800">Biguglia · Haute-Corse · 2B</span>
              </div>

              {/* Titre — sur fond blanc translucide pour lisibilité */}
              <div className="bg-white/70 backdrop-blur-md rounded-3xl px-7 py-6 mb-6 shadow-xl border border-white/50">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-black text-gray-900 leading-[1.05] mb-4 tracking-tight">
                  Toute la vie de
                  <br />
                  <span className="bg-gradient-to-r from-brand-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    Biguglia
                  </span>
                  <br />
                  au même endroit
                </h1>
                <p className="text-gray-700 text-lg leading-relaxed max-w-lg">
                  Artisans vérifiés, événements, promenades, associations, annonces, forum,
                  coups de main entre voisins…{' '}
                  <span className="text-gray-900 font-bold">100% gratuit, 100% local.</span>
                </p>
              </div>

              {/* Barre de recherche globale */}
              <div className={`mb-5 transition-all duration-700 delay-100 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <GlobalSearch
                  size="lg"
                  placeholder="🔍  Rechercher artisans, annonces, événements…"
                  className="w-full"
                />
              </div>

              {/* Rubriques condensées */}
              <div className={`space-y-2.5 mb-7 transition-all duration-700 delay-150 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {groups.map(g => {
                  const items = allThemes.filter(t => t.group === g);
                  const groupColor = g === 'Services' ? 'text-brand-700' : g === 'Vie pratique' ? 'text-sky-700' : 'text-purple-700';
                  return (
                    <div key={g} className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${groupColor} w-full sm:w-auto sm:min-w-[80px] drop-shadow-sm`}>{g}</span>
                      {items.map(t => (
                        <Link key={t.href} href={t.href}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-white/60 text-gray-800 hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5 shadow-sm">
                          {t.emoji} {t.title.split(' ')[0]}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 delay-300 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {!profile ? (
                  <>
                    <Link href="/inscription"
                      className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-8 py-4 rounded-2xl font-black text-base shadow-xl hover:-translate-y-0.5 transition-all">
                      <Sparkles className="w-5 h-5" />
                      Rejoindre la communauté
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="/artisans"
                      className="inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur border border-white/60 text-gray-800 px-8 py-4 rounded-2xl font-bold text-base hover:bg-white transition-all shadow-md">
                      <PenLine className="w-5 h-5 text-brand-600" />
                      Trouver un artisan
                    </Link>
                  </>
                ) : (
                  <Link href="/artisans/demande"
                    className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-8 py-4 rounded-2xl font-black text-base shadow-xl hover:-translate-y-0.5 transition-all">
                    <PenLine className="w-5 h-5" />
                    Déposer ma demande
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Social proof */}
              <div className={`flex flex-wrap gap-3 mt-6 transition-all duration-700 delay-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {[
                  { icon: Shield,       text: 'Artisans vérifiés',  color: 'text-emerald-600' },
                  { icon: CheckCircle,  text: '100 % gratuit',       color: 'text-sky-600'     },
                  { icon: Heart,        text: 'Projet citoyen',      color: 'text-rose-600'    },
                  { icon: Lock,         text: 'RGPD respecté',       color: 'text-amber-600'   },
                ].map(({ icon: I, text, color }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/75 backdrop-blur border border-white/50 text-gray-800 shadow-sm">
                    <I className={`w-3.5 h-3.5 ${color}`} />{text}
                  </span>
                ))}
              </div>
            </div>

            {/* DROITE — Stats live + thèmes */}
            <div className={`transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>

              {/* Grille stats live */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { val: counts.artisans, label: 'Artisans',    suffix: '', color: 'from-brand-500 to-brand-600',     icon: Wrench      },
                  { val: counts.membres,  label: 'Membres',     suffix: '', color: 'from-purple-500 to-violet-600',   icon: Users       },
                  { val: counts.annonces, label: 'Annonces',    suffix: '', color: 'from-blue-500 to-blue-600',       icon: ShoppingBag },
                  { val: counts.events,   label: 'Événements',  suffix: '', color: 'from-pink-500 to-rose-600',       icon: Calendar    },
                  { val: counts.outings,  label: 'Sorties',     suffix: '', color: 'from-emerald-500 to-teal-600',    icon: Footprints  },
                  { val: counts.help,     label: 'Coups de main',suffix:'', color: 'from-orange-500 to-amber-600',    icon: HandHeart   },
                ].map(({ val, label, suffix, color, icon: Icon }) => (
                  <div key={label} className="bg-white/75 backdrop-blur-md border border-white/60 rounded-2xl p-3 text-center shadow-sm">
                    <div className={`w-8 h-8 mx-auto mb-1.5 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xl font-black text-gray-900 tabular-nums">
                      <AnimatedCount target={val} suffix={suffix} loading={countsLoading} />
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Card rubriques */}
              <div className="bg-white/75 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Les rubriques</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {allThemes.map(t => (
                    <Link key={t.href} href={t.href}
                      className="flex items-center gap-2.5 bg-white/60 hover:bg-white border border-white/60 hover:border-gray-200 rounded-xl px-3 py-2.5 transition-all group hover:shadow-sm">
                      <span className="text-base flex-shrink-0">{t.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{t.title}</div>
                        <div className="text-[10px] text-gray-500 truncate">{t.group}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vague */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 56" className="w-full fill-gray-50" preserveAspectRatio="none">
            <path d="M0,28 C480,56 960,0 1440,36 L1440,56 L0,56 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          VIE LOCALE — 5 rubriques en spotlight
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-purple-100 border border-purple-200 rounded-full px-5 py-2 mb-5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 text-sm font-black">Vie locale · Nouveautés</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Bien plus qu&apos;un annuaire
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-brand-500 to-orange-500 bg-clip-text text-transparent">
                d&apos;artisans
              </span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Biguglia Connect rassemble tous les aspects de la vie de village en un seul endroit
            </p>
          </div>

          {/* Grille 5 thèmes vie locale */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">

            {/* Événements — grand */}
            <div className="lg:col-span-2 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-pink-500 relative group">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="p-7 relative z-10 h-full flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs font-black mb-5">
                  <PartyPopper className="w-3 h-3" /> Événements locaux
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                  🎉 Ne ratez plus<br />aucun événement
                </h3>
                <p className="text-purple-100 text-sm leading-relaxed mb-5 flex-1">
                  SC Biguglia, concerts, vide-greniers, ateliers enfants, fêtes de quartier…
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    { e: '⚽', t: 'Match SC Biguglia · Dim. 15h30', c: 'bg-white/15' },
                    { e: '🎵', t: 'Concert fanfare · Sam. 19h',     c: 'bg-white/10' },
                    { e: '🛒', t: 'Vide-grenier · 13 avril',        c: 'bg-white/10' },
                  ].map(({ e, t, c }) => (
                    <div key={t} className={`${c} backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2 flex items-center gap-2.5`}>
                      <span className="text-base">{e}</span>
                      <span className="text-sm text-white font-medium">{t}</span>
                    </div>
                  ))}
                </div>
                <Link href="/evenements"
                  className="self-start inline-flex items-center gap-2 bg-white text-purple-700 font-black px-6 py-3 rounded-xl hover:bg-purple-50 transition-all shadow-lg text-sm hover:-translate-y-0.5">
                  Voir l&apos;agenda <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Coups de main */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 relative group">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="p-7 relative z-10 h-full flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs font-black mb-5">
                  <HandHeart className="w-3 h-3" /> Coups de main
                </span>
                <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                  🤝 L&apos;entraide<br />entre voisins
                </h3>
                <p className="text-orange-100 text-sm leading-relaxed mb-5 flex-1">
                  Gardiennage, co-voiturage, bricolage, courses, déménagement…
                  Les habitants s&apos;entraident.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    '🚗 Co-voiturage Bastia',
                    '🌱 Jardinage chez voisin',
                    '📦 Aide déménagement',
                  ].map(t => (
                    <div key={t} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-medium">
                      {t}
                    </div>
                  ))}
                </div>
                <Link href="/coups-de-main"
                  className="self-start inline-flex items-center gap-2 bg-white text-orange-700 font-black px-6 py-3 rounded-xl hover:bg-orange-50 transition-all shadow-lg text-sm hover:-translate-y-0.5">
                  Voir les demandes <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Promenades */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 relative group">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="p-7 relative z-10 h-full flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs font-black mb-5">
                  <TreePine className="w-3 h-3" /> Promenades & Nature
                </span>
                <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                  🌿 Explorez<br />la nature
                </h3>
                <p className="text-emerald-100 text-sm leading-relaxed mb-5 flex-1">
                  Étang aux flamants roses, sentiers balisés, sorties groupées chaque week-end.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    '🦩 Étang de Biguglia · 12 km',
                    '⛰️ Monte Castellu · Facile',
                    '👥 Sortie dim. · 8 participants',
                  ].map(t => (
                    <div key={t} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-medium">
                      {t}
                    </div>
                  ))}
                </div>
                <Link href="/promenades"
                  className="self-start inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-6 py-3 rounded-xl hover:bg-emerald-50 transition-all shadow-lg text-sm hover:-translate-y-0.5">
                  Voir les sentiers <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Associations */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700 relative group">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="p-7 relative z-10 h-full flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs font-black mb-5">
                  <Building2 className="w-3 h-3" /> Associations
                </span>
                <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                  🏛️ La vie<br />associative
                </h3>
                <p className="text-violet-100 text-sm leading-relaxed mb-5 flex-1">
                  Sport, culture, bénévolat, seniors, environnement…
                  Toutes les assos de Biguglia.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    '⚽ SC Biguglia Football',
                    '🎵 Fanfare municipale',
                    '🌱 Biguglia Nature',
                  ].map(t => (
                    <div key={t} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-medium">
                      {t}
                    </div>
                  ))}
                </div>
                <Link href="/associations"
                  className="self-start inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl hover:bg-violet-50 transition-all shadow-lg text-sm hover:-translate-y-0.5">
                  Voir les assos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Perdu / Trouvé */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 relative group">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="p-7 relative z-10 h-full flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs font-black mb-5">
                  <Dog className="w-3 h-3" /> Perdu / Trouvé
                </span>
                <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                  🔍 Perdu<br />ou trouvé ?
                </h3>
                <p className="text-rose-100 text-sm leading-relaxed mb-5 flex-1">
                  Clés, animal, vélo, portefeuille… Signalez ou aidez à retrouver.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    '🐕 Chien perdu · Biguglia',
                    '🔑 Clés trouvées · Centre',
                    '👜 Sac retrouvé · Marché',
                  ].map(t => (
                    <div key={t} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-medium">
                      {t}
                    </div>
                  ))}
                </div>
                <Link href="/perdu-trouve"
                  className="self-start inline-flex items-center gap-2 bg-white text-rose-700 font-black px-6 py-3 rounded-xl hover:bg-rose-50 transition-all shadow-lg text-sm hover:-translate-y-0.5">
                  Voir les annonces <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>

          {/* Forum + Collectionneurs — petits */}
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                href: '/forum',
                emoji: '💬',
                label: 'Forum',
                title: 'Discutez avec les habitants',
                desc: 'Questions, infos pratiques, bons plans, discussions locales…',
                color: 'bg-sky-600',
                textColor: 'text-sky-700',
                bg: 'bg-sky-50 border-sky-200',
                cta: 'Rejoindre le forum',
              },
              {
                href: '/collectionneurs',
                emoji: '🏆',
                label: 'Collectionneurs',
                title: 'Vendez, échangez, partagez',
                desc: 'Timbres, vinyles, monnaies, figurines, cartes postales… Un marché de passionnés.',
                color: 'bg-amber-500',
                textColor: 'text-amber-700',
                bg: 'bg-amber-50 border-amber-200',
                cta: 'Explorer les collections',
              },
            ].map(item => (
              <div key={item.href} className={`rounded-3xl border-2 ${item.bg} p-6 flex items-center gap-5`}>
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-3xl flex-shrink-0 shadow-md`}>
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <h3 className="font-black text-gray-900 text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 leading-relaxed">{item.desc}</p>
                  <Link href={item.href}
                    className={`inline-flex items-center gap-1.5 text-sm font-bold ${item.textColor} hover:underline`}>
                    {item.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ARTISANS — Section
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Texte */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-2 mb-6">
                <Wrench className="w-4 h-4 text-brand-600" />
                <span className="text-brand-700 text-sm font-black">Services · Artisans</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5 leading-tight">
                Besoin d&apos;un artisan ?
                <br />
                <span className="text-brand-600">Trouvez-le ici.</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
                Chaque artisan est vérifié manuellement — SIRET, assurance RC Pro, identité confirmée.
                Avis réels, messagerie sécurisée, devis gratuits.
              </p>

              {/* Métiers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {trades.map(({ icon: I, label, href, color }) => (
                  <Link key={label} href={href}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}>
                    <I className="w-5 h-5" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="flex gap-3">
                <Link href="/artisans/demande"
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3.5 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg hover:-translate-y-0.5 text-sm">
                  Déposer ma demande <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/artisans"
                  className="inline-flex items-center gap-2 border-2 border-brand-200 text-brand-700 px-6 py-3.5 rounded-2xl font-bold hover:bg-brand-50 transition-all text-sm">
                  Voir les artisans
                </Link>
              </div>
            </div>

            {/* Garanties */}
            <div className="space-y-4">
              {[
                { icon: Shield,   color: 'bg-emerald-100 text-emerald-600', title: 'Vérification manuelle',   desc: 'SIRET, assurance RC Pro, identité confirmée un par un.' },
                { icon: Star,     color: 'bg-amber-100 text-amber-600',     title: 'Avis clients réels',      desc: 'Seuls les membres ayant fait appel peuvent laisser un avis.' },
                { icon: Lock,     color: 'bg-blue-100 text-blue-600',       title: 'Messagerie sécurisée',    desc: 'Vos échanges restent dans la plateforme. Votre numéro est protégé.' },
                { icon: Eye,      color: 'bg-purple-100 text-purple-600',   title: 'Modération humaine',      desc: 'Pas de bots. Un modérateur surveille forum, annonces et événements.' },
              ].map(({ icon: I, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                    <I className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          VIE PRATIQUE — Annonces / Matériel
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
              La vie pratique de{' '}
              <span className="text-blue-600">tous les jours</span>
            </h2>
            <p className="text-gray-500 text-lg">Achetez, vendez, empruntez, donnez — tout reste local</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                href: '/annonces',
                emoji: '📦',
                title: 'Petites annonces',
                desc: 'Vendez, achetez, échangez ou donnez avec vos voisins de Biguglia.',
                items: ['🏷️ Vente entre particuliers', '🎁 Dons gratuits', '🔄 Troc local'],
                color: 'border-blue-200 bg-white',
                badge: 'bg-blue-100 text-blue-700',
                cta: 'Voir les annonces',
                ctaStyle: 'text-blue-700 hover:bg-blue-50 border-blue-200',
              },
              {
                href: '/materiel',
                emoji: '🛠️',
                title: 'Matériel partagé',
                desc: 'Empruntez outils, perceuse, échelle, karcher… Sans rien acheter.',
                items: ['🔩 Outillage pro', '🚜 Matériel de jardin', '🎉 Matériel de fête'],
                color: 'border-teal-200 bg-white',
                badge: 'bg-teal-100 text-teal-700',
                cta: 'Voir le matériel',
                ctaStyle: 'text-teal-700 hover:bg-teal-50 border-teal-200',
              },
              {
                href: '/collectionneurs',
                emoji: '🏆',
                title: 'Collectionneurs',
                desc: '12 catégories : timbres, vinyles, monnaies, figurines, cartes postales…',
                items: ['🏷️ Vente & troc', '🎁 Dons gratuits', '🔍 Petites recherches'],
                color: 'border-amber-200 bg-white',
                badge: 'bg-amber-100 text-amber-700',
                cta: 'Explorer',
                ctaStyle: 'text-amber-700 hover:bg-amber-50 border-amber-200',
              },
            ].map(card => (
              <div key={card.href} className={`rounded-3xl border-2 ${card.color} p-6 flex flex-col`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{card.emoji}</span>
                  <div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${card.badge}`}>Vie pratique</span>
                    <h3 className="font-black text-gray-900 mt-1">{card.title}</h3>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{card.desc}</p>
                <div className="space-y-1.5 mb-5 flex-1">
                  {card.items.map(i => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {i}
                    </div>
                  ))}
                </div>
                <Link href={card.href}
                  className={`w-full flex items-center justify-center gap-2 border-2 font-bold py-3 rounded-2xl transition-all text-sm ${card.ctaStyle}`}>
                  {card.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA INSCRIPTION — Final
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/80 text-sm font-bold">100 % gratuit · Projet citoyen</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
            Rejoignez la communauté
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-amber-300 bg-clip-text text-transparent">
              de Biguglia
            </span>
          </h2>

          <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            {counts.membres > 0
              ? `Déjà ${counts.membres} habitants inscrits. Artisans, événements, promenades, forum, coups de main…`
              : 'Artisans vérifiés, événements, promenades, forum, coups de main entre voisins…'
            } Tout ce qui fait la vie de votre village.
          </p>

          {!profile ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:-translate-y-1 transition-all">
                <Sparkles className="w-5 h-5" />
                Créer mon compte gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/connexion"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
                J&apos;ai déjà un compte
              </Link>
            </div>
          ) : (
            <Link href="/artisans/demande"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:-translate-y-1 transition-all">
              <PenLine className="w-5 h-5" />
              Déposer une demande
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* Avantages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
            {[
              { icon: Shield,      label: 'Artisans vérifiés',  color: 'text-emerald-400' },
              { icon: Users,       label: 'Communauté locale',  color: 'text-blue-400'    },
              { icon: Bell,        label: 'Alertes & notifs',   color: 'text-amber-400'   },
              { icon: MessageSquare, label: 'Messagerie privée', color: 'text-purple-400'  },
            ].map(({ icon: I, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/8">
                <I className={`w-6 h-6 ${color}`} />
                <span className="text-xs font-semibold text-white/60 text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Star, Shield, Users, CheckCircle, MapPin,
  Wrench, Package, BookOpen, ChevronRight, ClipboardList,
  MessageSquare, Bell, PenLine, Hammer, Zap, Paintbrush,
  Layers, Wind, Leaf, Drill, Loader2, Sparkles,
  TreePine, Gem, PartyPopper, Trophy, Calendar,
  Heart, Mountain, Music, Footprints, Tag,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';

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
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target]);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400 inline" />;
  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Données métiers ──────────────────────────────────────────────────────────
const trades = [
  { icon: Drill,      label: 'Plomberie',    href: '/artisans?categorie=plomberie',    grad: 'from-sky-400 to-blue-600',    bg: 'bg-sky-50 hover:bg-sky-100 border-sky-100' },
  { icon: Zap,        label: 'Électricité',  href: '/artisans?categorie=electricite',  grad: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-100' },
  { icon: Layers,     label: 'Maçonnerie',   href: '/artisans?categorie=maconnerie',   grad: 'from-stone-400 to-stone-600',  bg: 'bg-stone-50 hover:bg-stone-100 border-stone-100' },
  { icon: Paintbrush, label: 'Peinture',     href: '/artisans?categorie=peinture',     grad: 'from-pink-400 to-rose-500',    bg: 'bg-pink-50 hover:bg-pink-100 border-pink-100' },
  { icon: Hammer,     label: 'Menuiserie',   href: '/artisans?categorie=menuiserie',   grad: 'from-amber-400 to-orange-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100' },
  { icon: Wind,       label: 'Climatisation',href: '/artisans?categorie=climatisation',grad: 'from-cyan-400 to-cyan-600',    bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100' },
  { icon: Leaf,       label: 'Jardinage',    href: '/artisans?categorie=jardinage',    grad: 'from-green-400 to-green-600',  bg: 'bg-green-50 hover:bg-green-100 border-green-100' },
  { icon: Wrench,     label: 'Bricolage',    href: '/artisans?categorie=bricolage',    grad: 'from-orange-400 to-orange-600',bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100' },
];

// ─── Thèmes principaux ────────────────────────────────────────────────────────
const themes = [
  {
    href: '/evenements',
    emoji: '🎉',
    label: 'NOUVEAU',
    title: 'Événements locaux',
    headline: 'Tout l\'agenda de Biguglia',
    desc: 'Matchs du SC Biguglia, concerts, vide-greniers, fêtes de quartier, ateliers enfants… Ne ratez plus rien !',
    features: ['📅 Agenda complet', '⚽ Stade & matchs', '🎵 Concerts & culture', '🏡 Fêtes de quartier'],
    grad: 'from-purple-500 via-violet-500 to-pink-500',
    gradLight: 'from-purple-50 to-violet-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    cta: 'Voir l\'agenda',
    icon: PartyPopper,
    bigIcon: '🎉',
    preview: [
      { dot: 'bg-blue-400',   label: 'Match SC Biguglia · Dim. 15h30' },
      { dot: 'bg-pink-400',   label: 'Concert fanfare · Sam. 19h' },
      { dot: 'bg-amber-400',  label: 'Vide-grenier · 13 avril' },
    ],
  },
  {
    href: '/promenades',
    emoji: '🌿',
    label: 'NATURE',
    title: 'Promenades & Nature',
    headline: 'Explorez Biguglia autrement',
    desc: 'Sentiers, balades en famille, sorties groupées, observation des flamants roses à l\'étang de Biguglia.',
    features: ['🗺️ Itinéraires détaillés', '🦩 Réserve naturelle', '🚴 Pistes cyclables', '👨‍👩‍👧 Sorties groupées'],
    grad: 'from-emerald-500 via-teal-500 to-green-500',
    gradLight: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cta: 'Découvrir les sentiers',
    icon: TreePine,
    bigIcon: '🌿',
    preview: [
      { dot: 'bg-emerald-400', label: 'Étang de Biguglia · 12 km' },
      { dot: 'bg-teal-400',    label: 'Cap Tormentoso · 4,5 km · Facile' },
      { dot: 'bg-green-400',   label: 'Sortie dimanche · 8 participants' },
    ],
  },
  {
    href: '/collectionneurs',
    emoji: '🏆',
    label: 'PASSIONNÉS',
    title: 'Collectionneurs',
    headline: 'Vendez, échangez, partagez',
    desc: 'Timbres, vinyles, monnaies, figurines, cartes postales… Un marché local dédié aux passionnés de collections.',
    features: ['🏷️ Vente & troc', '🎁 Dons gratuits', '🔍 Petites recherches', '💬 Forum entraide'],
    grad: 'from-amber-500 via-orange-500 to-yellow-500',
    gradLight: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    cta: 'Explorer les collections',
    icon: Gem,
    bigIcon: '🏆',
    preview: [
      { dot: 'bg-amber-400',  label: 'Timbres France 1960-80 · 280€' },
      { dot: 'bg-orange-400', label: 'Vinyles jazz · Troc proposé' },
      { dot: 'bg-yellow-400', label: 'Cartes Corse XXe · Don' },
    ],
  },
];


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { profile } = useAuthStore();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [counts, setCounts] = useState({ artisans: 0, membres: 0, annonces: 0 });
  const [countsLoading, setCountsLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Auto-rotate theme showcase
  useEffect(() => {
    const interval = setInterval(() => setActiveTheme(p => (p + 1) % themes.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = createClient();
      const [{ count: artisans }, { count: membres }, { count: annonces }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      setCounts({ artisans: artisans || 0, membres: membres || 0, annonces: annonces || 0 });
      setCountsLoading(false);
    };
    fetchCounts();
  }, []);

  const th = themes[activeTheme];

  return (
    <div className="overflow-hidden">

      {/* ══════════════════════════════════════
          HERO — Vie locale complète
      ══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 via-orange-50 to-amber-50">
        {/* Orbs décoratifs */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-brand-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />
        {/* Points décoratifs */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* ── GAUCHE ── */}
            <div className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

              {/* Badge localisation */}
              <div className="inline-flex items-center gap-2.5 bg-white/90 border border-orange-200 rounded-full px-4 py-2 mb-8 shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-sm font-bold text-gray-700">Biguglia · Haute-Corse · 2B</span>
              </div>

              {/* Titre */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] mb-4 tracking-tight">
                Toute la vie locale
                <br />
                <span className="bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  de Biguglia
                </span>
                <br />
                au même endroit
              </h1>

              <p className="text-gray-600 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
                Artisans, événements, promenades, collectionneurs, annonces, forum, matériel partagé… 
                <strong className="text-gray-800"> Le réseau gratuit des habitants de Biguglia.</strong>
              </p>

              {/* Pills thèmes — 3 univers */}
              <div className={`space-y-2.5 mb-8 transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {/* Services */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest w-full">Services</span>
                  {[
                    { href: '/artisans',         label: '🔧 Artisans',       bg: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
                    { href: '/artisans/demande',  label: '📋 Poster demande', bg: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
                    { href: '/demandes',          label: '👥 Voir demandes',  bg: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                    { href: '/artisans',          label: '💰 Devis',          bg: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
                  ].map(({ href, label, bg }) => (
                    <Link key={label} href={href}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${bg}`}>
                      {label}
                    </Link>
                  ))}
                </div>
                {/* Vie pratique */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest w-full">Vie pratique</span>
                  {[
                    { href: '/annonces',          label: '📦 Annonces',        bg: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                    { href: '/materiel',           label: '🛠️ Matériel',        bg: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' },
                    { href: '/annonces',           label: '🔄 Échanges',        bg: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200' },
                    { href: '/collectionneurs',    label: '🏆 Collectionneurs', bg: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
                  ].map(({ href, label, bg }) => (
                    <Link key={label} href={href}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${bg}`}>
                      {label}
                    </Link>
                  ))}
                </div>
                {/* Vie locale */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest w-full">Vie locale</span>
                  {[
                    { href: '/evenements',  label: '🎉 Événements',  bg: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
                    { href: '/promenades',  label: '🌿 Promenades',  bg: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
                    { href: '/forum',       label: '💬 Forum',       bg: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200' },
                    { href: '/forum',       label: '🤝 Communauté',  bg: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' },
                  ].map(({ href, label, bg }) => (
                    <Link key={label} href={href}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${bg}`}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 delay-300 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <Link href="/inscription"
                  className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:from-brand-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:-translate-y-0.5 overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Rejoindre la communauté</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/artisans/demande"
                  className="group inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-2xl font-bold text-base border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                  <PenLine className="w-5 h-5 text-brand-500" />
                  Trouver un artisan
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Preuves sociales */}
              <div className={`flex flex-wrap gap-4 mt-8 transition-all duration-700 delay-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {[
                  { icon: Shield,      text: 'Artisans vérifiés', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                  { icon: CheckCircle, text: '100 % gratuit',      color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200' },
                  { icon: Heart,       text: 'Projet citoyen',     color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200' },
                ].map(({ icon: I, text, color, bg }) => (
                  <span key={text} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${bg}`}>
                    <I className={`w-3.5 h-3.5 ${color}`} /><span className="text-gray-700">{text}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* ── DROITE — Showcase thèmes animé ── */}
            <div className={`transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>

              {/* Sélecteur thèmes */}
              <div className="flex gap-2 mb-4">
                {themes.map((t, i) => (
                  <button key={t.href} onClick={() => setActiveTheme(i)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 border ${
                      i === activeTheme
                        ? `bg-gradient-to-r ${t.grad} text-white border-transparent shadow-lg`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {t.emoji} {t.title.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Carte thème actif */}
              <div key={activeTheme} className={`bg-gradient-to-br ${th.gradLight} border-2 ${th.border} rounded-3xl p-6 shadow-xl transition-all duration-500`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${th.grad} flex items-center justify-center text-2xl shadow-lg`}>
                      {th.bigIcon}
                    </div>
                    <div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${th.badge}`}>{th.label}</span>
                      <h3 className="font-black text-gray-900 text-lg mt-1">{th.title}</h3>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-5">{th.desc}</p>

                {/* Preview items */}
                <div className="space-y-2.5 mb-5">
                  {th.preview.map(({ dot, label }) => (
                    <div key={label} className="flex items-center gap-3 bg-white/80 rounded-xl px-3 py-2.5 shadow-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot} flex-shrink-0`} />
                      <span className="text-sm text-gray-700 font-medium">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {th.features.map(f => (
                    <span key={f} className="text-xs bg-white/70 text-gray-700 font-semibold px-2.5 py-1 rounded-full border border-white">{f}</span>
                  ))}
                </div>

                <Link href={th.href}
                  className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${th.grad} text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all hover:-translate-y-0.5 shadow-lg text-sm`}>
                  {th.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { val: counts.artisans, label: 'Artisans',  color: 'text-brand-600',   ld: countsLoading },
                  { val: counts.membres,  label: 'Membres',   color: 'text-purple-600',  ld: countsLoading },
                  { val: counts.annonces, label: 'Annonces',  color: 'text-emerald-600', ld: countsLoading },
                ].map(({ val, label, color, ld }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                    <div className={`text-2xl font-black ${color} tabular-nums`}>
                      <AnimatedCount target={val} loading={ld} />
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vague bas */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-white" preserveAspectRatio="none">
            <path d="M0,30 C360,60 1080,0 1440,40 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          3 THÈMES — Grands spotlight
      ══════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-full px-5 py-2.5 mb-5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 text-sm font-black">Thèmes exclusifs · Vie locale</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Biguglia, c'est bien plus<br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">qu'un annuaire d'artisans</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Trois espaces dédiés à la vraie vie de votre village</p>
          </div>

          {/* Spotlight 1 — Événements (grand) */}
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-pink-500 mb-6 relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="grid lg:grid-cols-2 gap-0 items-stretch">
              {/* Texte */}
              <div className="p-8 lg:p-12 relative z-10">
                <span className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-white text-xs font-black mb-6">
                  <PartyPopper className="w-3.5 h-3.5" /> THÈME · ÉVÉNEMENTS LOCAUX
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                  🎉 Ne ratez plus<br />aucun événement<br />à Biguglia
                </h3>
                <p className="text-purple-100 text-base leading-relaxed mb-6 max-w-md">
                  Matchs du <strong className="text-white">SC Biguglia</strong>, concerts de la fanfare, vide-greniers, ateliers enfants, fêtes de quartier… Tout est là, dans un seul agenda.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { icon: Trophy,      label: 'Stade & matchs' },
                    { icon: Music,       label: 'Concerts & culture' },
                    { icon: Calendar,    label: 'Agenda complet' },
                    { icon: Users,       label: 'Créer un événement' },
                  ].map(({ icon: I, label }) => (
                    <div key={label} className="flex items-center gap-2.5 bg-white/15 rounded-xl px-3 py-2.5">
                      <I className="w-4 h-4 text-white flex-shrink-0" />
                      <span className="text-white text-sm font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/evenements"
                  className="inline-flex items-center gap-2.5 bg-white text-purple-700 font-black px-8 py-4 rounded-2xl hover:bg-purple-50 transition-all shadow-xl hover:-translate-y-0.5 text-base">
                  Voir l&apos;agenda <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              {/* Preview événements */}
              <div className="p-6 lg:p-8 relative z-10 flex flex-col justify-center gap-3">
                {[
                  { emoji: '⚽', title: 'Match SC Biguglia vs Furiani', sub: 'Dimanche 6 avril · 15h30 · Stade municipal', tag: '🏠 Domicile', tagBg: 'bg-blue-400/30' },
                  { emoji: '🎵', title: 'Concert fanfare municipale', sub: 'Samedi 19 avril · 19h00 · Salle des fêtes', tag: '🎟️ Gratuit', tagBg: 'bg-emerald-400/30' },
                  { emoji: '🛒', title: 'Vide-grenier de printemps', sub: 'Dimanche 13 avril · Dès 8h · Place du village', tag: '200 exposants', tagBg: 'bg-amber-400/30' },
                  { emoji: '🎨', title: 'Atelier poterie enfants', sub: 'Samedi 12 avril · 10h · Médiathèque', tag: '8/12 places', tagBg: 'bg-rose-400/30' },
                ].map(({ emoji, title, sub, tag, tagBg }) => (
                  <div key={title} className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl p-4 hover:bg-white/20 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">{title}</p>
                        <p className="text-purple-200 text-xs mt-0.5">{sub}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs text-white font-bold px-2 py-1 rounded-full ${tagBg}`}>{tag}</span>
                    </div>
                  </div>
                ))}
                <p className="text-center text-purple-200 text-xs font-semibold mt-1">+ des dizaines d&apos;autres événements</p>
              </div>
            </div>
          </div>

          {/* Spotlight 2 & 3 — Promenades + Collectionneurs (côte à côte) */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Promenades */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-green-500 relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="p-8 relative z-10">
                <span className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-white text-xs font-black mb-5">
                  <TreePine className="w-3.5 h-3.5" /> THÈME · PROMENADES & NATURE
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                  🌿 Explorez<br />la nature de<br />Biguglia
                </h3>
                <p className="text-emerald-100 text-sm leading-relaxed mb-5">
                  Sentiers balisés, balades en bord de mer, tour de l&apos;étang avec ses <strong className="text-white">flamants roses</strong>, sorties groupées chaque week-end.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    { icon: Footprints, label: 'Itinéraires balisés avec difficulté' },
                    { icon: Mountain,   label: 'Randonnées Monte Castellu' },
                    { icon: Users,      label: 'Sorties groupées organisées' },
                  ].map(({ icon: I, label }) => (
                    <div key={label} className="flex items-center gap-2 text-white/90 text-sm">
                      <I className="w-3.5 h-3.5 flex-shrink-0" /> {label}
                    </div>
                  ))}
                </div>
                <Link href="/promenades"
                  className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-6 py-3 rounded-2xl hover:bg-emerald-50 transition-all shadow-lg hover:-translate-y-0.5 text-sm">
                  Voir les sentiers <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Collectionneurs */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="p-8 relative z-10">
                <span className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-white text-xs font-black mb-5">
                  <Gem className="w-3.5 h-3.5" /> THÈME · COLLECTIONNEURS
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                  🏆 Vendez,<br />échangez,<br />donnez
                </h3>
                <p className="text-amber-100 text-sm leading-relaxed mb-5">
                  <strong className="text-white">12 catégories</strong> de collections : timbres, vinyles, monnaies, figurines, cartes postales, livres anciens, art, vintage…
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    { icon: Tag,     label: 'Vente, troc et dons gratuits' },
                    { icon: Heart,   label: 'Forum entraide entre passionnés' },
                    { icon: Gem,     label: 'Estimation & conseils' },
                  ].map(({ icon: I, label }) => (
                    <div key={label} className="flex items-center gap-2 text-white/90 text-sm">
                      <I className="w-3.5 h-3.5 flex-shrink-0" /> {label}
                    </div>
                  ))}
                </div>
                <Link href="/collectionneurs"
                  className="inline-flex items-center gap-2 bg-white text-amber-700 font-black px-6 py-3 rounded-2xl hover:bg-amber-50 transition-all shadow-lg hover:-translate-y-0.5 text-sm">
                  Explorer les collections <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          3 UNIVERS — Vue d'ensemble structurée
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Tout Biguglia, bien organisé</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">3 grands univers pour trouver ce dont vous avez besoin</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── UNIVERS 1 · SERVICES ── */}
            <div className="bg-white rounded-3xl border-2 border-orange-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Univers 1</p>
                  <h3 className="text-lg font-black text-white">Services</h3>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { href: '/artisans',        icon: Wrench,        label: 'Artisans',      desc: 'Professionnels vérifiés', color: 'text-orange-500', bg: 'bg-orange-50' },
                  { href: '/artisans/demande', icon: ClipboardList, label: 'Demandes',      desc: 'Déposez votre besoin',    color: 'text-amber-600',  bg: 'bg-amber-50' },
                  { href: '/artisans',         icon: Star,          label: 'Devis',         desc: 'Comparez les offres',     color: 'text-yellow-500', bg: 'bg-yellow-50' },
                  { href: '/artisans',         icon: Calendar,      label: 'Rendez-vous',   desc: 'Planifiez facilement',    color: 'text-red-400',    bg: 'bg-red-50' },
                ].map(({ href, icon: Icon, label, desc, color, bg }) => (
                  <Link key={label} href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 transition-colors group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* ── UNIVERS 2 · VIE PRATIQUE ── */}
            <div className="bg-white rounded-3xl border-2 border-blue-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Univers 2</p>
                  <h3 className="text-lg font-black text-white">Vie pratique</h3>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { href: '/annonces',       icon: Package, label: 'Annonces',        desc: 'Vendez et achetez local',     color: 'text-blue-500',  bg: 'bg-blue-50' },
                  { href: '/materiel',       icon: Drill,   label: 'Matériel',         desc: 'Empruntez des outils',         color: 'text-teal-500',  bg: 'bg-teal-50' },
                  { href: '/annonces',       icon: Heart,   label: 'Échanges',         desc: 'Troc et dons entre voisins',   color: 'text-cyan-500',  bg: 'bg-cyan-50' },
                  { href: '/collectionneurs',icon: Gem,     label: 'Collectionneurs',  desc: 'Timbres, vinyles, rareté…',    color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map(({ href, icon: Icon, label, desc, color, bg }) => (
                  <Link key={label} href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* ── UNIVERS 3 · VIE LOCALE ── */}
            <div className="bg-white rounded-3xl border-2 border-purple-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <PartyPopper className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Univers 3</p>
                  <h3 className="text-lg font-black text-white">Vie locale</h3>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { href: '/evenements',  icon: Calendar,   label: 'Événements',  desc: 'Concerts, matchs, fêtes',          color: 'text-purple-500',  bg: 'bg-purple-50' },
                  { href: '/promenades',  icon: Footprints, label: 'Promenades',  desc: 'Sentiers et sorties groupées',      color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { href: '/forum',       icon: BookOpen,   label: 'Forum',       desc: 'Discussions entre habitants',       color: 'text-violet-500',  bg: 'bg-violet-50' },
                  { href: '/forum',       icon: Users,      label: 'Communauté',  desc: 'Entraide et vie de quartier',       color: 'text-rose-500',    bg: 'bg-rose-50' },
                ].map(({ href, icon: Icon, label, desc, color, bg }) => (
                  <Link key={label} href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* CTA artisans */}
          <div className="mt-10 bg-gradient-to-r from-brand-500 via-orange-500 to-amber-500 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white'%3E%3Cpath d='M20 20v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">Besoin d&apos;un artisan ?</h3>
                <p className="text-orange-100">Décrivez votre projet, recevez des réponses d&apos;artisans locaux vérifiés.</p>
              </div>
              <Link href="/artisans/demande"
                className="flex-shrink-0 inline-flex items-center gap-2.5 bg-white text-brand-600 px-8 py-4 rounded-2xl font-black text-base hover:bg-orange-50 transition-all shadow-xl hover:-translate-y-0.5 whitespace-nowrap">
                <PenLine className="w-5 h-5" /> Déposer ma demande <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MÉTIERS — grille compacte
      ══════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Quel artisan cherchez-vous ?</h2>
            <Link href="/artisans" className="hidden sm:inline-flex items-center gap-1 text-brand-600 font-bold text-sm hover:text-brand-700 transition-colors">
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {trades.map(({ icon: Icon, label, href, grad, bg }) => (
              <Link key={href} href={href}
                className={`group flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 ${bg} transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5`}>
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONFIANCE
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-full px-4 py-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 text-sm font-bold">Plateforme de confiance</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Pourquoi nous faire confiance ?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Des preuves concrètes, pas des promesses</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {[
              { icon: Shield,       title: 'Vérification manuelle', desc: 'Chaque artisan est contrôlé un par un. SIRET, assurance RC Pro, identité confirmée.', accent: 'text-emerald-700', iconBg: 'bg-emerald-100', border: 'border-emerald-200' },
              { icon: Star,         title: 'Avis clients réels',     desc: 'Seuls les membres ayant fait appel à un artisan peuvent laisser un avis. Zéro faux avis.', accent: 'text-amber-700',   iconBg: 'bg-amber-100',   border: 'border-amber-200' },
              { icon: MessageSquare,title: 'Messagerie sécurisée',  desc: 'Vos échanges restent dans la plateforme. Votre numéro ne circule jamais sans votre accord.', accent: 'text-sky-700',     iconBg: 'bg-sky-100',     border: 'border-sky-200' },
              { icon: Bell,         title: 'Signalement facilité',  desc: 'Bouton "Signaler" sur chaque profil. Notre équipe traite sous 24h.', accent: 'text-rose-700',    iconBg: 'bg-rose-100',    border: 'border-rose-200' },
              { icon: Users,        title: 'Modération humaine',    desc: 'Pas de bots. Un modérateur humain surveille forum, annonces et événements.', accent: 'text-purple-700', iconBg: 'bg-purple-100',  border: 'border-purple-200' },
              { icon: CheckCircle,  title: 'Données protégées',     desc: 'RGPD respecté. Vos données ne sont jamais vendues ni partagées sans consentement.', accent: 'text-teal-700',   iconBg: 'bg-teal-100',    border: 'border-teal-200' },
            ].map(({ icon: Icon, title, desc, accent, iconBg, border }) => (
              <div key={title} className={`bg-white border ${border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`inline-flex p-2.5 rounded-xl ${iconBg} mb-3`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/confiance" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors group">
              Voir notre politique de confiance complète
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL — Rejoindre
      ══════════════════════════════════════ */}
      {!profile && (
        <section className="relative py-24 overflow-hidden bg-gradient-to-br from-brand-50 via-purple-50 to-amber-50">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-300/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex p-3 bg-gradient-to-br from-brand-100 to-purple-100 rounded-2xl mb-6 border border-purple-200">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
              Rejoignez la vraie<br />
              <span className="bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                communauté de Biguglia
              </span>
            </h2>
            <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
              Habitant ou artisan — accédez à <strong>tous les thèmes</strong>, les événements, les promenades, les artisans et bien plus. <strong>Gratuitement, pour toujours.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 via-purple-600 to-pink-500 text-white px-10 py-4 rounded-2xl font-black text-base hover:opacity-90 transition-all shadow-xl hover:-translate-y-0.5">
                <Sparkles className="w-5 h-5" /> Créer mon compte gratuit <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/artisans/demande"
                className="group inline-flex items-center justify-center gap-2 bg-white text-gray-800 px-8 py-4 rounded-2xl font-bold text-base border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-md">
                🔧 Trouver un artisan
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-10 pt-8 border-t border-purple-200">
              {[
                { v: counts.artisans, l: 'Artisans vérifiés', ld: countsLoading, color: 'text-brand-600' },
                { v: counts.membres,  l: 'Membres inscrits',  ld: countsLoading, color: 'text-purple-600' },
                { v: 0,               l: 'Inscription',       ld: false,         suf: '€', color: 'text-emerald-600' },
              ].map(({ v, l, ld, suf, color }) => (
                <div key={l} className="text-center">
                  <div className={`text-3xl font-black ${color}`}>
                    {ld ? <Loader2 className="w-7 h-7 animate-spin text-gray-300 inline" /> : <>{v}{suf || ''}</>}
                  </div>
                  <div className="text-sm text-gray-500 font-medium mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

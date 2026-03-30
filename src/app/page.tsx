'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Star, Shield, Users, CheckCircle, MapPin,
  Clock, Wrench, Package, BookOpen, ChevronRight,
  MessageSquare, Bell, PenLine, Hammer, Zap, Paintbrush,
  Layers, Wind, Leaf, Drill, AlertCircle, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';

// ─── Icônes SVG modernes ─────────────────────────────────────────────────────

function IconVerified() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2l2.4 4.8L20 8l-4 3.9 1 5.6L12 15l-5 2.5 1-5.6L4 8l5.6-1.2L12 2z"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function IconRequest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="17" r="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 15.5v1.5l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCommunity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 19c0-3.3 2.7-6 6-6h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 17c0-2.2 1.8-4 4-4h.5c2 0 3.5 1.6 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Illustration Hero — village moderne ────────────────────────────────────

function HeroIllustration() {
  return (
    <svg viewBox="0 0 540 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="hSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="hHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
        </filter>
      </defs>
      {/* Sky */}
      <rect width="540" height="400" fill="url(#hSky)" rx="24" />
      {/* Sun */}
      <circle cx="440" cy="70" r="40" fill="#fbbf24" opacity="0.9" />
      <circle cx="440" cy="70" r="55" fill="#fbbf24" opacity="0.12" />
      {/* Clouds */}
      <ellipse cx="90" cy="55" rx="52" ry="22" fill="white" opacity="0.9" />
      <ellipse cx="120" cy="44" rx="36" ry="20" fill="white" opacity="0.9" />
      <ellipse cx="310" cy="38" rx="44" ry="18" fill="white" opacity="0.75" />
      <ellipse cx="338" cy="30" rx="30" ry="16" fill="white" opacity="0.8" />
      {/* Sea */}
      <path d="M0 295 Q135 275 270 290 Q405 305 540 285 L540 400 L0 400 Z" fill="url(#hSea)" />
      <path d="M0 315 Q135 300 270 310 Q405 320 540 305 L540 400 L0 400 Z" fill="#0369a1" opacity="0.45" />
      <path d="M30 318 Q60 313 92 318" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M160 308 Q200 303 238 308" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
      <path d="M360 313 Q400 308 440 313" stroke="white" strokeWidth="2" strokeOpacity="0.35" strokeLinecap="round" />
      {/* Hill */}
      <path d="M-10 305 Q85 225 185 255 Q260 275 330 238 Q408 198 542 248 L542 315 L-10 315 Z" fill="url(#hHill)" />
      <path d="M-10 318 Q85 262 175 280 Q268 300 358 265 Q435 242 542 268 L542 328 L-10 328 Z" fill="#065f46" opacity="0.55" />
      {/* Trees */}
      <ellipse cx="62" cy="265" rx="17" ry="21" fill="#059669" />
      <rect x="59" y="280" width="6" height="14" fill="#92400e" rx="2" />
      <ellipse cx="132" cy="255" rx="14" ry="18" fill="#047857" />
      <rect x="129" y="268" width="6" height="12" fill="#92400e" rx="2" />
      <ellipse cx="445" cy="250" rx="19" ry="23" fill="#064e3b" />
      <rect x="441" y="266" width="8" height="15" fill="#92400e" rx="2" />
      <ellipse cx="492" cy="258" rx="13" ry="17" fill="#059669" />
      <rect x="489" y="270" width="5" height="11" fill="#92400e" rx="2" />
      {/* Houses - modern flat design */}
      {/* House 1 (center) */}
      <g filter="url(#shadow)">
        <rect x="195" y="215" width="96" height="80" fill="#fef9ec" rx="4" />
        <polygon points="190,217 296,217 243,170" fill="#d97706" />
        <rect x="224" y="258" width="26" height="37" fill="#b45309" rx="3" />
        <circle cx="247" cy="277" r="2.5" fill="#78350f" />
        <rect x="202" y="230" width="20" height="17" fill="#bae6fd" rx="2.5" />
        <rect x="262" y="230" width="20" height="17" fill="#bae6fd" rx="2.5" />
      </g>
      {/* House 2 (left) */}
      <g filter="url(#shadow)">
        <rect x="82" y="240" width="75" height="62" fill="#fce7f3" rx="4" />
        <polygon points="76,242 162,242 119,205" fill="#be185d" />
        <rect x="108" y="272" width="22" height="30" fill="#9d174d" rx="2.5" />
        <rect x="90" y="254" width="17" height="15" fill="#bae6fd" rx="2" />
        <rect x="137" y="254" width="17" height="15" fill="#bae6fd" rx="2" />
      </g>
      {/* House 3 (right) */}
      <g filter="url(#shadow)">
        <rect x="348" y="230" width="84" height="68" fill="#ecfdf5" rx="4" />
        <polygon points="342,232 436,232 390,194" fill="#15803d" />
        <rect x="375" y="264" width="24" height="34" fill="#166534" rx="2.5" />
        <rect x="353" y="246" width="18" height="16" fill="#bae6fd" rx="2" />
        <rect x="410" y="246" width="18" height="16" fill="#bae6fd" rx="2" />
      </g>
      {/* Road */}
      <path d="M155 295 Q270 290 390 295" stroke="#d1d5db" strokeWidth="7" strokeLinecap="round" />
      <path d="M200 293 Q270 290 338 293" stroke="white" strokeWidth="2.5" strokeDasharray="14 10" strokeLinecap="round" />
      {/* Boat */}
      <path d="M62 350 Q80 342 98 350 L93 362 L67 362 Z" fill="white" opacity="0.9" />
      <path d="M80 342 L80 328" stroke="#374151" strokeWidth="1.5" />
      <path d="M80 328 L96 338 L80 342 Z" fill="#f97316" />
      {/* WiFi signal arcs top */}
      <path d="M202 95 Q210 90 218 95" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M198 102 Q210 94 222 102" stroke="#374151" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => (
        <line key={i}
          x1={440 + Math.cos(angle * Math.PI / 180) * 46} y1={70 + Math.sin(angle * Math.PI / 180) * 46}
          x2={440 + Math.cos(angle * Math.PI / 180) * 58} y2={70 + Math.sin(angle * Math.PI / 180) * 58}
          stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" opacity="0.55"
        />
      ))}
    </svg>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedCount({ target, suffix = '', loading }: { target: number; suffix?: string; loading: boolean }) {
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

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-300 inline" />;
  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Données ─────────────────────────────────────────────────────────────────

const trades = [
  { icon: Drill,      label: 'Plomberie',    href: '/artisans?categorie=plomberie',    grad: 'from-sky-400 to-blue-600',    bg: 'bg-sky-50 hover:bg-sky-100 border-sky-100 hover:border-sky-200' },
  { icon: Zap,        label: 'Électricité',  href: '/artisans?categorie=electricite',  grad: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-100 hover:border-yellow-200' },
  { icon: Layers,     label: 'Maçonnerie',   href: '/artisans?categorie=maconnerie',   grad: 'from-stone-400 to-stone-600',  bg: 'bg-stone-50 hover:bg-stone-100 border-stone-100 hover:border-stone-200' },
  { icon: Paintbrush, label: 'Peinture',     href: '/artisans?categorie=peinture',     grad: 'from-pink-400 to-rose-500',    bg: 'bg-pink-50 hover:bg-pink-100 border-pink-100 hover:border-pink-200' },
  { icon: Hammer,     label: 'Menuiserie',   href: '/artisans?categorie=menuiserie',   grad: 'from-amber-400 to-orange-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100 hover:border-amber-200' },
  { icon: Wind,       label: 'Climatisation',href: '/artisans?categorie=climatisation',grad: 'from-cyan-400 to-cyan-600',    bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100 hover:border-cyan-200' },
  { icon: Leaf,       label: 'Jardinage',    href: '/artisans?categorie=jardinage',    grad: 'from-green-400 to-green-600',  bg: 'bg-green-50 hover:bg-green-100 border-green-100 hover:border-green-200' },
  { icon: Wrench,     label: 'Bricolage',    href: '/artisans?categorie=bricolage',    grad: 'from-orange-400 to-orange-600',bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100 hover:border-orange-200' },
];

const steps = [
  { num: '01', icon: PenLine,      title: 'Décrivez votre besoin', desc: 'Sélectionnez le type de travaux, décrivez votre projet et ajoutez des photos.', grad: 'from-brand-400 to-brand-600', num_bg: 'bg-brand-600' },
  { num: '02', icon: MessageSquare,title: 'Contactez un artisan',  desc: 'Parcourez les profils vérifiés et échangez par messagerie sécurisée.', grad: 'from-blue-400 to-blue-600', num_bg: 'bg-blue-600' },
  { num: '03', icon: CheckCircle,  title: 'Planifiez & évaluez',   desc: 'Convenez d\'un rendez-vous, suivez l\'avancement et laissez un avis.', grad: 'from-emerald-400 to-emerald-600', num_bg: 'bg-emerald-600' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { profile } = useAuthStore();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [counts, setCounts] = useState({ artisans: 0, membres: 0, annonces: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 60);
    return () => clearTimeout(t);
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

  return (
    <div className="overflow-hidden">

      {/* ══════════════════════════════════════
          HERO — ultra-moderne
      ══════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-sky-50">
        {/* Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* LEFT */}
            <div className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Location badge */}
              <div className="inline-flex items-center gap-2.5 bg-white/80 border border-orange-200 rounded-full px-4 py-2 mb-8 shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-sm font-semibold text-gray-700">Biguglia · Haute-Corse</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] mb-3 tracking-tight">
                Services, entraide et vie locale
                <br />
                <span className="bg-gradient-to-r from-brand-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Tout Biguglia, au même endroit
                </span>
              </h1>

              <p className="text-gray-500 text-base sm:text-lg font-semibold mb-3 max-w-lg">
                Le réseau local des habitants de Biguglia
              </p>

              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-10 max-w-lg">
                Trouvez un artisan vérifié, échangez des services, prêtez du matériel et rejoignez la communauté — gratuitement.
              </p>

              {/* Primary CTAs */}
              <div className={`flex flex-col sm:flex-row gap-3 mb-10 transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <Link
                  href="/artisans/demande"
                  className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-400 hover:to-brand-500 transition-all duration-300 shadow-xl shadow-brand-900/40 hover:shadow-2xl hover:shadow-brand-900/50 hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <PenLine className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Déposer une demande</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/artisans"
                  className="group inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-2xl font-bold text-base border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md"
                >
                  <Wrench className="w-5 h-5 text-brand-500" />
                  Trouver un artisan
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Trust chips */}
              <div className={`flex flex-wrap gap-2 transition-all duration-700 delay-400 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {[
                  { icon: Shield,       text: 'Artisans vérifiés', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                  { icon: CheckCircle,  text: '100% gratuit',       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200' },
                  { icon: MapPin,       text: '100% local',          color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
                ].map(({ icon: I, text, color, bg }) => (
                  <span key={text} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${bg}`}>
                    <I className={`w-3.5 h-3.5 ${color}`} /><span className="text-gray-700">{text}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — illustration */}
            <div className={`transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-float">
                  <HeroIllustration />
                </div>
                {/* Floating card — artisan */}
                <div className="absolute -bottom-6 -left-6 bg-white shadow-xl rounded-2xl ring-1 ring-gray-100 p-4 w-60 animate-float" style={{ animationDelay: '1.2s' }}>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg shadow-lg">🔧</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Jean-Pierre M.</div>
                      <div className="text-xs text-gray-500">Plombier · Biguglia</div>
                    </div>
                    <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap border border-emerald-200">● Dispo</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                    <span className="text-xs text-gray-500 ml-1">5.0</span>
                  </div>
                </div>
                {/* Floating badge — verified */}
                <div className="absolute -top-4 -right-4 bg-white shadow-xl rounded-2xl ring-1 ring-emerald-200 px-3 py-2.5 flex items-center gap-2 animate-bounce-soft">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-gray-900">Vérifié ✓</div>
                    <div className="text-gray-500">Documents validés</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-white" preserveAspectRatio="none">
            <path d="M0,38 C360,64 1080,12 1440,44 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS RÉELLES
      ══════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: counts.artisans, suf: '', label: 'Artisans vérifiés', color: 'text-brand-600', ld: countsLoading },
              { val: counts.membres,  suf: '', label: 'Membres inscrits',  color: 'text-blue-600',  ld: countsLoading },
              { val: counts.annonces, suf: '', label: 'Annonces actives',  color: 'text-amber-600', ld: countsLoading },
              { val: 0,               suf: '€',label: 'Inscription gratuite', color: 'text-emerald-600', ld: false },
            ].map(({ val, suf, label, color, ld }) => (
              <div key={label} className="text-center">
                <div className={`text-4xl font-black ${color} mb-1 tabular-nums`}>
                  <AnimatedCount target={val} suffix={suf} loading={ld} />
                </div>
                <div className="text-sm text-gray-500 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BOUTON DEMANDE — section claire
      ══════════════════════════════════════ */}
      <section className="py-14 bg-gradient-to-r from-brand-500 via-orange-500 to-amber-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">Besoin d&apos;un artisan ?</h2>
            <p className="text-orange-100 text-sm sm:text-base">Décrivez votre projet et recevez des réponses d&apos;artisans locaux vérifiés.</p>
          </div>
          <Link
            href="/artisans/demande"
            className="group flex-shrink-0 inline-flex items-center gap-2.5 bg-white text-brand-600 px-8 py-4 rounded-2xl font-black text-base hover:bg-orange-50 transition-all duration-300 shadow-xl hover:-translate-y-0.5 whitespace-nowrap"
          >
            <PenLine className="w-5 h-5" />
            Déposer ma demande
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MÉTIERS — grid moderne avec icônes Lucide
      ══════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 mb-5">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 text-sm font-bold">Corps de métier</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Quel artisan cherchez-vous ?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Tous les métiers à Biguglia et dans les communes alentours</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 lg:gap-4">
            {trades.map(({ icon: Icon, label, href, grad, bg }) => (
              <Link key={href} href={href}
                className={`group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 ${bg} transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/artisans" className="inline-flex items-center gap-2 font-bold text-brand-600 hover:text-brand-700 transition-colors group">
              Voir tous les artisans disponibles
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4 MODULES — cartes modernes
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Une plateforme complète pour la vie locale à Biguglia</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Wrench, emoji: '⚒️',
                title: 'Artisans vérifiés', desc: 'Plombiers, électriciens, maçons — tous validés par notre équipe avant publication.',
                href: '/artisans', grad: 'from-brand-500 to-orange-600', bg: 'bg-brand-50', border: 'border-brand-100', text: 'text-brand-700',
              },
              {
                icon: Package, emoji: '📦',
                title: 'Petites annonces', desc: 'Vendez, cherchez ou offrez du matériel et des services à vos voisins.',
                href: '/annonces', grad: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700',
              },
              {
                icon: Drill, emoji: '🔧',
                title: 'Prêt de matériel', desc: 'Empruntez perceuse, escabeau, remorque… La solidarité entre voisins.',
                href: '/materiel', grad: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700',
              },
              {
                icon: BookOpen, emoji: '💬',
                title: 'Forum communauté', desc: 'Discutez, recommandez et échangez avec les habitants de Biguglia.',
                href: '/forum', grad: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700',
              },
            ].map(({ icon: Icon, emoji, title, desc, href, grad, bg, border, text }) => (
              <Link key={href} href={href}
                className={`group ${bg} ${border} border-2 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">{desc}</p>
                <span className={`inline-flex items-center gap-1 ${text} text-sm font-bold`}>
                  Explorer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className={`h-1 bg-gradient-to-r ${grad} scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left mt-4 rounded-full`} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          COMMENT ÇA MARCHE
      ══════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-5">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 text-sm font-bold">Simple & rapide</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Comment ça marche ?</h2>
            <p className="text-gray-500 text-lg">3 étapes pour trouver votre artisan et planifier votre intervention</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-brand-200 via-blue-200 to-emerald-200" />
            {steps.map(({ num, icon: Icon, title, desc, grad, num_bg }) => (
              <div key={num} className="relative flex flex-col items-center text-center group">
                <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-all duration-300 group-hover:shadow-2xl`}>
                  <Icon className="w-9 h-9 text-white" />
                  <div className={`absolute -top-3 -right-3 w-7 h-7 ${num_bg} rounded-full flex items-center justify-center text-xs font-black text-white shadow-md`}>{num}</div>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5">
              Commencer maintenant <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONFIANCE & PREUVES
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-sky-200/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-full px-4 py-2 mb-5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 text-sm font-bold">Notre engagement</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Pourquoi nous faire confiance ?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Des preuves concrètes, pas des promesses vagues</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: Shield, title: 'Vérification manuelle',
                desc: 'Chaque artisan est examiné un par un par notre équipe avant d\'être publié. Zéro automatisation sur la validation.',
                accent: 'text-emerald-700', bg: 'bg-white border-emerald-200', iconBg: 'bg-emerald-100',
              },
              {
                icon: AlertCircle, title: 'Documents contrôlés',
                desc: 'Attestation d\'assurance RC Pro, SIRET vérifié, identité confirmée. Les profils "Professionnel vérifié" le sont vraiment.',
                accent: 'text-sky-700', bg: 'bg-white border-sky-200', iconBg: 'bg-sky-100',
              },
              {
                icon: Star, title: 'Avis clients réels',
                desc: 'Seuls les membres inscrits ayant effectué une demande peuvent laisser un avis. Impossible de falsifier.',
                accent: 'text-amber-700', bg: 'bg-white border-amber-200', iconBg: 'bg-amber-100',
              },
              {
                icon: MessageSquare, title: 'Messagerie sécurisée',
                desc: 'Vos échanges restent dans la plateforme. Votre numéro de téléphone ne circule jamais sans votre accord.',
                accent: 'text-purple-700', bg: 'bg-white border-purple-200', iconBg: 'bg-purple-100',
              },
              {
                icon: Bell, title: 'Signalement facilité',
                desc: 'Un bouton "Signaler" sur chaque profil, chaque annonce et chaque message. Notre équipe traite sous 24h.',
                accent: 'text-rose-700', bg: 'bg-white border-rose-200', iconBg: 'bg-rose-100',
              },
              {
                icon: Users, title: 'Communauté modérée',
                desc: 'Un modérateur humain surveille le forum et les annonces. Pas de bots, pas d\'automatisation aveugle.',
                accent: 'text-indigo-700', bg: 'bg-white border-indigo-200', iconBg: 'bg-indigo-100',
              },
            ].map(({ icon: Icon, title, desc, accent, bg, iconBg }) => (
              <div key={title} className={`${bg} border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`inline-flex p-2.5 rounded-xl ${iconBg} mb-4`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/confiance"
              className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors group">
              Voir notre politique de confiance complète
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          AVANTAGES — grille légère
      ══════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Pourquoi choisir Biguglia Connect ?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Une plateforme pensée pour la confiance et la simplicité</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield,       title: 'Artisans vérifiés',     desc: 'SIRET, assurance, documents contrôlés manuellement.',     grad: 'from-brand-400 to-orange-500',  bg: 'bg-orange-50' },
              { icon: Star,         title: 'Avis authentiques',      desc: 'Seuls les vrais clients peuvent évaluer. Zéro faux avis.', grad: 'from-amber-400 to-yellow-500',   bg: 'bg-amber-50' },
              { icon: MapPin,       title: '100 % local',            desc: 'Artisans de Biguglia uniquement. Circuits courts.',        grad: 'from-blue-400 to-indigo-500',    bg: 'bg-blue-50' },
              { icon: MessageSquare,title: 'Messagerie privée',      desc: 'Échanges directs sécurisés — coordonnées protégées.',     grad: 'from-emerald-400 to-teal-500',   bg: 'bg-emerald-50' },
              { icon: Users,        title: 'Communauté active',      desc: 'Forum, entraide et prêt de matériel entre voisins.',      grad: 'from-purple-400 to-violet-500',  bg: 'bg-purple-50' },
              { icon: CheckCircle,  title: 'Gratuit pour tous',      desc: 'Aucun abonnement, aucune publicité, aucun engagement.',   grad: 'from-pink-400 to-rose-500',      bg: 'bg-pink-50' },
            ].map(({ icon: Icon, title, desc, grad, bg }) => (
              <div key={title} className={`group ${bg} rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA — inscription
      ══════════════════════════════════════ */}
      {!profile && (
        <section className="relative py-24 overflow-hidden bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-200/30 rounded-full blur-3xl animate-pulse-soft pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl animate-float-slow pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex p-3 bg-brand-100 rounded-2xl mb-6 border border-brand-200">
              <Users className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight">
              Rejoignez la communauté<br />
              <span className="bg-gradient-to-r from-brand-500 to-amber-500 bg-clip-text text-transparent">de Biguglia</span>
            </h2>
            <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
              Habitant ou artisan, inscrivez-vous gratuitement et commencez dès aujourd&apos;hui.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg hover:-translate-y-0.5">
                🏠 Créer un compte habitant <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/inscription?role=artisan"
                className="group inline-flex items-center justify-center gap-2 bg-white text-gray-800 px-8 py-4 rounded-2xl font-bold text-base border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                🔨 Rejoindre en tant qu&apos;artisan
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-10 pt-8 border-t border-orange-200">
              {[
                { v: counts.artisans, l: 'Artisans', ld: countsLoading },
                { v: counts.membres,  l: 'Membres',  ld: countsLoading },
                { v: 0, l: 'Inscription', ld: false, suf: '€' },
              ].map(({ v, l, ld, suf }) => (
                <div key={l} className="text-center">
                  <div className="text-3xl font-black text-gray-900">
                    {ld ? <Loader2 className="w-7 h-7 animate-spin text-gray-400 inline" /> : <>{v}{suf || ''}</>}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

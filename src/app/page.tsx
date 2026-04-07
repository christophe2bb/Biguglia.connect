// ─────────────────────────────────────────────────────────────────────────────
// Page d'accueil — Biguglia Connect
// Design moderne, couleurs brand, positionnement clair, rubriques lisibles
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Shield, Users, CheckCircle, MapPin,
  Wrench, Hammer, Zap, Paintbrush, Layers, Wind, Leaf, Drill,
  Star, Lock, Eye, Bell, MessageSquare, Package, Sparkles,
  Heart, Calendar, Search, ShoppingBag, Mountain, Building2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHomeFeed } from '@/services/home/feed';
import HomeHero from '@/components/home/HomeHero';
import HomeSection from '@/components/home/HomeSection';
import GlobalSearchWrapper from '@/components/home/GlobalSearchWrapper';

// ─── Données statiques ────────────────────────────────────────────────────────

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

// Rubriques avec description courte et action claire
const RUBRIQUES = [
  {
    group: 'Services',
    items: [
      { href: '/artisans',         emoji: '🔧', title: 'Artisans vérifiés',    pitch: 'Un pro de confiance à Biguglia', action: 'Trouver un artisan',   color: 'from-orange-500 to-amber-500',   bg: 'bg-orange-50',   border: 'border-orange-200', text: 'text-orange-700' },
      { href: '/artisans/demande', emoji: '📋', title: 'Demande de devis',      pitch: 'Décrivez votre projet, recevez des offres', action: 'Déposer ma demande', color: 'from-amber-500 to-yellow-500',   bg: 'bg-amber-50',    border: 'border-amber-200',  text: 'text-amber-700'  },
    ],
  },
  {
    group: 'Vie pratique',
    items: [
      { href: '/annonces',         emoji: '📦', title: 'Petites annonces',      pitch: 'Acheter, vendre, donner entre voisins',    action: 'Voir les annonces',  color: 'from-blue-500 to-indigo-500',    bg: 'bg-blue-50',     border: 'border-blue-200',   text: 'text-blue-700'   },
      { href: '/materiel',         emoji: '🛠️', title: 'Matériel partagé',     pitch: 'Emprunter outils et équipements',          action: 'Emprunter',         color: 'from-teal-500 to-cyan-500',      bg: 'bg-teal-50',     border: 'border-teal-200',   text: 'text-teal-700'   },
      { href: '/perdu-trouve',     emoji: '🔍', title: 'Perdu / Trouvé',        pitch: 'Clés, animal, sac — signaler ou chercher', action: 'Voir les signalements', color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50',     border: 'border-rose-200',   text: 'text-rose-700'   },
      { href: '/collectionneurs',  emoji: '🏆', title: 'Collectionneurs',        pitch: 'Timbres, vinyles, monnaies, figurines…',   action: 'Explorer',          color: 'from-amber-600 to-orange-500',   bg: 'bg-amber-50',    border: 'border-amber-200',  text: 'text-amber-700'  },
    ],
  },
  {
    group: 'Vie locale',
    items: [
      { href: '/evenements',       emoji: '🎉', title: 'Événements',            pitch: 'Fêtes, concerts, marchés, ateliers…',     action: 'Voir l\'agenda',    color: 'from-purple-500 to-violet-500',  bg: 'bg-purple-50',   border: 'border-purple-200', text: 'text-purple-700' },
      { href: '/promenades',       emoji: '🌿', title: 'Promenades & Nature',   pitch: 'Sentiers, étang, sorties groupées',       action: 'Partir en balade',  color: 'from-emerald-500 to-green-500',  bg: 'bg-emerald-50',  border: 'border-emerald-200',text: 'text-emerald-700'},
      { href: '/coups-de-main',    emoji: '🤝', title: 'Coups de main',         pitch: 'Aide, co-voiturage, garde, courses…',     action: 'Aider un voisin',   color: 'from-orange-500 to-red-400',     bg: 'bg-orange-50',   border: 'border-orange-200', text: 'text-orange-700' },
      { href: '/forum',            emoji: '💬', title: 'Forum',                 pitch: 'Discuter, poser une question, s\'informer',action: 'Rejoindre',         color: 'from-sky-500 to-blue-500',       bg: 'bg-sky-50',      border: 'border-sky-200',    text: 'text-sky-700'    },
      { href: '/associations',     emoji: '🏛️', title: 'Associations',          pitch: 'Sport, culture, bénévolat, seniors…',     action: 'Découvrir',         color: 'from-violet-500 to-purple-500',  bg: 'bg-violet-50',   border: 'border-violet-200', text: 'text-violet-700' },
    ],
  },
];

// ─── Composant SSR principal ──────────────────────────────────────────────────

export default async function HomePage() {
  // Utilisateur connecté côté serveur
  let currentUserId: string | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch { /* non critique */ }

  // Feed SSR
  let feedResult;
  try {
    feedResult = await getHomeFeed(currentUserId);
  } catch {
    feedResult = { sections: [], totalItems: 0, generatedAt: new Date().toISOString(), hasContent: false };
  }

  const { sections, totalItems, generatedAt } = feedResult;
  const hasContent = sections.some(s => !s.isEmpty);

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════════════════════
          HERO — Photo + Positionnement clair + Search
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[65vh] sm:min-h-[75vh] flex items-end overflow-hidden">
        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/biguglia-hero.jpg"
          alt="Biguglia"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dégradé fort pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/50 to-gray-900/10" />
        {/* Teinte brand légère */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-transparent" />

        {/* Contenu Hero */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">

          {/* Pill localisation */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <MapPin className="w-3.5 h-3.5 text-white/70" />
            <span className="text-sm font-semibold text-white/90 tracking-wide">Biguglia · Haute-Corse · 2B</span>
          </div>

          {/* Accroche principale — positionnement ultra-clair */}
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-[1.05] mb-4 tracking-tight">
            Votre village,
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-orange-300 to-amber-300 bg-clip-text text-transparent">
              enfin connecté.
            </span>
          </h1>

          {/* Sous-titre : ce que c'est en 1 phrase */}
          <p className="text-white/70 text-lg sm:text-xl mb-3 max-w-2xl leading-relaxed font-medium">
            Artisans vérifiés · Événements · Annonces · Entraide · Forum
          </p>
          <p className="text-white/50 text-sm sm:text-base mb-8 max-w-xl leading-relaxed">
            Biguglia Connect réunit tous les habitants en un seul endroit. 100 % local, 100 % gratuit.
          </p>

          {/* Barre de recherche */}
          <Suspense fallback={
            <div className="w-full h-14 bg-white/10 backdrop-blur rounded-2xl animate-pulse" />
          }>
            <GlobalSearchWrapper />
          </Suspense>

          {/* Pills rubriques rapides sous la search */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { href: '/artisans', label: '🔧 Artisans' },
              { href: '/annonces', label: '📦 Annonces' },
              { href: '/evenements', label: '🎉 Événements' },
              { href: '/coups-de-main', label: '🤝 Entraide' },
              { href: '/perdu-trouve', label: '🔍 Perdu/Trouvé' },
              { href: '/forum', label: '💬 Forum' },
            ].map(p => (
              <Link key={p.href} href={p.href}
                className="text-xs font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full px-3 py-1.5 transition-all hover:text-white">
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BANDE "CE QUE C'EST" — Positionnement en 3 mots
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-brand-600 text-white py-4 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-bold">
          {[
            { icon: Shield,    label: 'Artisans vérifiés SIRET' },
            { icon: Users,     label: 'Communauté 100 % locale' },
            { icon: Heart,     label: 'Entraide entre voisins' },
            { icon: Calendar,  label: 'Agenda des événements' },
            { icon: ShoppingBag, label: 'Annonces & troc local' },
          ].map(({ icon: I, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-white/90">
              <I className="w-3.5 h-3.5 text-white/60" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FIL LOCAL — Maison vivante
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <HomeHero totalItems={totalItems} generatedAt={generatedAt} />

        {hasContent ? (
          sections.filter(s => !s.isEmpty).map(section => (
            <HomeSection key={section.id} section={section} />
          ))
        ) : (
          /* État vide global — on montre les rubriques directement */
          <div className="text-center py-8 mb-4">
            <p className="text-gray-400 text-sm">Le village s&apos;éveille — soyez le premier à publier !</p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          RUBRIQUES — Navigation visuelle moderne
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-gray-950 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* En-tête */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Tout Biguglia Connect
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
              Qu&apos;est-ce que vous cherchez ?
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto">
              11 rubriques, 1 seule plateforme. Tout ce qui se passe à Biguglia.
            </p>
          </div>

          {/* Groupes */}
          <div className="space-y-12">
            {RUBRIQUES.map(group => (
              <div key={group.group}>
                {/* Titre groupe */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{group.group}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                {/* Cartes rubriques */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group relative overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                    >
                      {/* Gradient accent en haut */}
                      <div className={`h-1 w-full bg-gradient-to-r ${item.color}`} />

                      <div className="p-5">
                        {/* Emoji + titre */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl leading-none">{item.emoji}</span>
                            <div>
                              <p className="font-black text-white text-base leading-tight">{item.title}</p>
                              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.pitch}</p>
                            </div>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-gradient-to-r ${item.color} text-white group-hover:gap-2.5 transition-all`}>
                          {item.action}
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Glow au hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-2xl`} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ARTISANS — Section dédiée
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Gauche : pitch */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-2 mb-6">
                <Wrench className="w-4 h-4 text-brand-600" />
                <span className="text-brand-700 text-sm font-black">Artisans & Services</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 leading-tight">
                Besoin d&apos;un artisan ?
                <br />
                <span className="text-brand-600">Trouvez-le ici.</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                Chaque artisan est vérifié manuellement — SIRET, assurance RC Pro, identité confirmée.
                Avis réels de voisins, messagerie sécurisée, devis gratuits.
              </p>

              {/* Métiers */}
              <div className="grid grid-cols-4 gap-2 mb-8">
                {trades.map(({ icon: I, label, href, color }) => (
                  <Link key={label} href={href}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}>
                    <I className="w-5 h-5" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
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

            {/* Droite : garanties */}
            <div className="space-y-3">
              {[
                { icon: Shield, color: 'bg-emerald-500', title: 'Vérification manuelle',  desc: 'SIRET, assurance RC Pro, identité confirmée un par un.' },
                { icon: Star,   color: 'bg-amber-500',   title: 'Avis clients réels',     desc: 'Seuls les membres ayant fait appel peuvent laisser un avis.' },
                { icon: Lock,   color: 'bg-blue-500',    title: 'Messagerie sécurisée',   desc: 'Vos échanges restent dans la plateforme. Votre numéro est protégé.' },
                { icon: Eye,    color: 'bg-purple-500',  title: 'Modération humaine',     desc: 'Pas de bots. Un modérateur surveille forum, annonces et événements.' },
              ].map(({ icon: I, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                    <I className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          VIE PRATIQUE — 3 cartes
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
              La vie pratique de <span className="text-blue-600">tous les jours</span>
            </h2>
            <p className="text-gray-500">Achetez, vendez, empruntez, donnez — tout reste local</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                href: '/annonces', emoji: '📦', title: 'Petites annonces',
                desc: 'Vendez, achetez, échangez ou donnez avec vos voisins.',
                items: ['Vente entre particuliers', 'Dons gratuits', 'Troc local'],
                gradient: 'from-blue-500 to-indigo-600',
                bg: 'bg-blue-50', border: 'border-blue-100',
                cta: 'Voir les annonces',
              },
              {
                href: '/materiel', emoji: '🛠️', title: 'Matériel partagé',
                desc: 'Empruntez outils, perceuse, échelle, karcher… Sans rien acheter.',
                items: ['Outillage pro', 'Matériel de jardin', 'Matériel de fête'],
                gradient: 'from-teal-500 to-cyan-600',
                bg: 'bg-teal-50', border: 'border-teal-100',
                cta: 'Emprunter du matériel',
              },
              {
                href: '/collectionneurs', emoji: '🏆', title: 'Collectionneurs',
                desc: '12 catégories : timbres, vinyles, monnaies, figurines…',
                items: ['Vente & troc', 'Dons de pièces rares', 'Petites recherches'],
                gradient: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50', border: 'border-amber-100',
                cta: 'Explorer',
              },
            ].map(card => (
              <div key={card.href} className={`rounded-3xl border-2 ${card.border} ${card.bg} overflow-hidden flex flex-col`}>
                {/* Barre gradient */}
                <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">{card.emoji}</span>
                    <h3 className="font-black text-gray-900 text-lg leading-tight">{card.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{card.desc}</p>
                  <div className="space-y-2 mb-6 flex-1">
                    {card.items.map(i => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {i}
                      </div>
                    ))}
                  </div>
                  <Link href={card.href}
                    className={`w-full flex items-center justify-center gap-2 text-white font-black py-3 rounded-2xl text-sm bg-gradient-to-r ${card.gradient} hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
                    {card.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA INSCRIPTION
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/80 text-sm font-bold">100 % gratuit · Projet citoyen · Biguglia 2B</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Rejoignez la communauté
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-amber-300 bg-clip-text text-transparent">
              de Biguglia
            </span>
          </h2>

          <p className="text-white/55 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Artisans vérifiés, événements, promenades, forum, coups de main entre voisins…
            Tout ce qui fait la vie de votre village, en un seul endroit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link href="/inscription"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-brand-900/40 hover:-translate-y-1 transition-all">
              Créer mon compte gratuit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/connexion"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
              J&apos;ai déjà un compte
            </Link>
          </div>

          {/* 4 piliers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Shield,        label: 'Artisans vérifiés',  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { icon: Users,         label: 'Communauté locale',  color: 'text-blue-400',    bg: 'bg-blue-400/10'    },
              { icon: Bell,          label: 'Alertes & notifs',   color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
              { icon: MessageSquare, label: 'Messagerie privée',  color: 'text-purple-400',  bg: 'bg-purple-400/10'  },
            ].map(({ icon: I, label, color, bg }) => (
              <div key={label} className={`flex flex-col items-center gap-2.5 p-5 ${bg} rounded-2xl border border-white/5`}>
                <I className={`w-6 h-6 ${color}`} />
                <span className="text-xs font-bold text-white/60 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

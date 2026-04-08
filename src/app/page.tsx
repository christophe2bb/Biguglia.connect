// ─────────────────────────────────────────────────────────────────────────────
// Page d'accueil — Maison vivante
// Architecture : SSR pour le feed local + client uniquement pour UI dynamique
// Principe : aucune logique métier dans la page — tout est délégué aux services
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Shield, Users, CheckCircle, MapPin,
  Wrench, Hammer, Zap, Paintbrush, Layers, Wind, Leaf, Drill,
  Star, Lock, Eye, Bell, MessageSquare, Package,
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

const allThemes = [
  { group: 'Services',      href: '/artisans',          emoji: '🔧', title: 'Artisans vérifiés',   desc: 'Trouvez un professionnel de confiance à Biguglia. SIRET, assurance RC Pro, avis réels.',   color: 'bg-brand-50 border-brand-200 text-brand-700',   dot: 'bg-brand-500' },
  { group: 'Services',      href: '/artisans/demande',  emoji: '📋', title: 'Déposer une demande', desc: 'Décrivez votre projet en 2 min. Les artisans locaux vous contactent avec un devis.',         color: 'bg-indigo-50 border-indigo-200 text-indigo-700', dot: 'bg-indigo-500' },
  { group: 'Vie pratique',  href: '/annonces',          emoji: '📦', title: 'Petites annonces',     desc: 'Achetez, vendez, échangez ou donnez avec vos voisins. Tout est local.',                     color: 'bg-blue-50 border-blue-200 text-blue-700',       dot: 'bg-blue-500' },
  { group: 'Vie pratique',  href: '/materiel',          emoji: '🛠️', title: 'Matériel partagé',    desc: 'Empruntez ou prêtez outils, perceuse, échelle… Sans rien acheter.',                         color: 'bg-teal-50 border-teal-200 text-teal-700',       dot: 'bg-teal-500' },
  { group: 'Vie pratique',  href: '/collectionneurs',   emoji: '🏆', title: 'Collectionneurs',      desc: 'Timbres, vinyles, monnaies, figurines, livres anciens… Un marché de passionnés.',           color: 'bg-amber-50 border-amber-200 text-amber-700',    dot: 'bg-amber-500' },
  { group: 'Vie pratique',  href: '/perdu-trouve',      emoji: '🔍', title: 'Perdu / Trouvé',       desc: 'Clés, animal, portefeuille, vélo… Signalez ou retrouvez ce qui est perdu.',                 color: 'bg-rose-50 border-rose-200 text-rose-700',       dot: 'bg-rose-500' },
  { group: 'Vie locale',    href: '/evenements',        emoji: '🎉', title: 'Événements',           desc: 'Matchs SC Biguglia, concerts, vide-greniers, fêtes, ateliers… Un seul agenda.',             color: 'bg-purple-50 border-purple-200 text-purple-700', dot: 'bg-purple-500' },
  { group: 'Vie locale',    href: '/promenades',        emoji: '🌿', title: 'Promenades & Nature',  desc: 'Sentiers, étang aux flamants roses, sorties groupées chaque week-end.',                      color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  { group: 'Vie locale',    href: '/forum',             emoji: '💬', title: 'Forum',                desc: 'Posez vos questions, partagez vos infos, discutez avec les habitants.',                     color: 'bg-sky-50 border-sky-200 text-sky-700',          dot: 'bg-sky-500' },
  { group: 'Vie locale',    href: '/associations',      emoji: '🏛️', title: 'Associations',        desc: 'Sport, culture, bénévolat, seniors… Toutes les associations de Biguglia.',                  color: 'bg-violet-50 border-violet-200 text-violet-700', dot: 'bg-violet-500' },
  { group: 'Vie locale',    href: '/coups-de-main',     emoji: '🤝', title: 'Coups de main',        desc: 'Besoin d\'aide ? Gardiennage, co-voiturage, course… Les voisins sont là.',                  color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
];

const groups = ['Services', 'Vie pratique', 'Vie locale'] as const;

// ─── Composant SSR principal ──────────────────────────────────────────────────

export default async function HomePage() {
  // Récupère l'utilisateur connecté côté serveur (pour exclure ses propres contenus)
  let currentUserId: string | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch { /* non critique */ }

  // Fetch du feed côté serveur — aucun appel Supabase dans l'UI
  let feedResult;
  try {
    feedResult = await getHomeFeed(currentUserId);
  } catch {
    feedResult = {
      sections: [],
      totalItems: 0,
      generatedAt: new Date().toISOString(),
      hasContent: false,
    };
  }

  const { sections, totalItems, generatedAt } = feedResult;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════════════════════
          HERO PHOTO + SEARCH
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-end">
        {/* Fond photo — overflow-hidden ici uniquement pour ne pas couper le dropdown search */}
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/biguglia-hero.jpg"
            alt="Biguglia"
            className="w-full h-full object-cover object-center"
          />
          {/* Dégradé bas pour lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
        </div>

        {/* Contenu — z-10 pour passer au-dessus du fond, dropdown z-50 passe librement */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 text-center flex flex-col items-center justify-center">
          {/* Badge lieu */}
          <div className="inline-flex items-center gap-2.5 bg-white/25 backdrop-blur-md border border-white/40 rounded-full px-6 py-2.5 mb-10">
            <span className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse shadow-lg shadow-emerald-300/50" />
            <MapPin className="w-5 h-5 text-white" />
            <span className="text-lg font-bold text-white tracking-wide">Biguglia · Haute-Corse · 2B</span>
          </div>

          {/* Titre principal de l'application - ULTRA ÉNORME avec couleurs pastel harmonieuses */}
          <h1 className="text-8xl sm:text-9xl lg:text-[12rem] xl:text-[14rem] font-black mb-10 leading-[0.85] tracking-tighter">
            <span className="bg-gradient-to-br from-rose-300 via-pink-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_8px_25px_rgba(255,182,193,0.5)] animate-[gradient_8s_ease_infinite]">
              Biguglia Connect
            </span>
          </h1>

          {/* Slogan - Plus gros et avec couleurs pastel harmonieuses */}
          <p className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 leading-tight mx-auto bg-gradient-to-r from-sky-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
            Toute la vie de Biguglia
          </p>

          <p className="text-white text-xl sm:text-2xl lg:text-3xl mb-12 mx-auto max-w-3xl font-semibold leading-relaxed">
            Voisins, artisans, événements, forum, annonces… En un seul endroit.
          </p>

          {/* Barre de recherche */}
          <Suspense fallback={
            <div className="w-full h-12 bg-white/20 backdrop-blur rounded-2xl animate-pulse" />
          }>
            <GlobalSearchWrapper />
          </Suspense>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MAISON VIVANTE — Fil local
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* HomeHero — client (connaît le profil) */}
        <HomeHero totalItems={totalItems} generatedAt={generatedAt} />

        {/* Sections du feed — rendu SSR, composants purs */}
        {/* Les sections vides sont masquées : pas de bloc "rien ici" si pas de contenu */}
        {sections.filter(s => !s.isEmpty).map(section => (
          <HomeSection key={section.id} section={section} />
        ))}

      </section>

      {/* ══════════════════════════════════════════════════════════
          THÈMES / RUBRIQUES — Navigation complète
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-black text-brand-600 uppercase tracking-wider mb-2">Toutes les rubriques</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Explorez Biguglia Connect
            </h2>
          </div>

          <div className="space-y-10">
            {groups.map(group => (
              <div key={group}>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-px bg-gray-200" />
                  {group}
                  <span className="flex-1 h-px bg-gray-100" />
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {allThemes.filter(t => t.group === group).map(theme => (
                    <Link
                      key={theme.href}
                      href={theme.href}
                      className={`group flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md ${theme.color}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dot}`} />
                        <span className="text-xl">{theme.emoji}</span>
                      </div>
                      <p className="font-black text-sm leading-tight">{theme.title}</p>
                      <p className="text-xs opacity-70 leading-relaxed line-clamp-2">{theme.desc}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity mt-auto">
                        Accéder <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ARTISANS
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {trades.map(({ icon: I, label, href, color }) => (
                  <Link key={label} href={href}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}>
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
            <div className="space-y-4">
              {[
                { icon: Shield, color: 'bg-emerald-100 text-emerald-600', title: 'Vérification manuelle',  desc: 'SIRET, assurance RC Pro, identité confirmée un par un.' },
                { icon: Star,   color: 'bg-amber-100 text-amber-600',     title: 'Avis clients réels',     desc: 'Seuls les membres ayant fait appel peuvent laisser un avis.' },
                { icon: Lock,   color: 'bg-blue-100 text-blue-600',       title: 'Messagerie sécurisée',   desc: 'Vos échanges restent dans la plateforme. Votre numéro est protégé.' },
                { icon: Eye,    color: 'bg-purple-100 text-purple-600',   title: 'Modération humaine',     desc: 'Pas de bots. Un modérateur surveille forum, annonces et événements.' },
              ].map(({ icon: I, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
          VIE PRATIQUE
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
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
          CTA INSCRIPTION
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950 relative overflow-hidden">
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
            Artisans vérifiés, événements, promenades, forum, coups de main entre voisins…
            Tout ce qui fait la vie de votre village.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/inscription"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:-translate-y-1 transition-all">
              Créer mon compte gratuit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/connexion"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
              J&apos;ai déjà un compte
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
            {[
              { icon: Shield,        label: 'Artisans vérifiés',  color: 'text-emerald-400' },
              { icon: Users,         label: 'Communauté locale',  color: 'text-blue-400'    },
              { icon: Bell,          label: 'Alertes & notifs',   color: 'text-amber-400'   },
              { icon: MessageSquare, label: 'Messagerie privée',  color: 'text-purple-400'  },
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

/**
 * Route /forum-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour "forum Biguglia", "discussion Biguglia",
 * "forum village Corse", "entraide habitants Biguglia".
 *
 * Architecture SSR + JSON-LD complet
 * (BreadcrumbList + FAQPage + DiscussionForumPosting + ItemList + CollectionPage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, ChevronRight, MapPin, ArrowRight, Users, Heart, Lightbulb, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  JsonLd, breadcrumbSchema, faqSchema, forumPostingSchema, collectionPageSchema,
} from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Forum de Biguglia — Discussion & Entraide entre Habitants (Haute-Corse)',
  description: 'Le forum des habitants de Biguglia : questions pratiques, vie locale, coups de main, alertes de voisinage, actualités du village. Échangez avec vos voisins de Biguglia (20620), Haute-Corse, en toute confiance.',
  keywords: [
    'forum Biguglia', 'discussion Biguglia', 'forum village Corse',
    'entraide Biguglia', 'vie locale Biguglia', 'forum Haute-Corse',
    'habitants Biguglia', 'questions Biguglia', 'communauté Biguglia',
    'voisins Biguglia', 'alertes Biguglia', 'conseil Biguglia',
    'forum 20620', 'entre voisins Corse',
  ],
  alternates: { canonical: `${SITE_URL}/forum-biguglia` },
  openGraph: {
    title:       'Forum de Biguglia — Discussion & Entraide Locale (Corse)',
    description: 'Posez vos questions, partagez vos conseils, signalez des infos utiles et échangez avec les habitants de Biguglia.',
    url:         `${SITE_URL}/forum-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Forum des habitants de Biguglia, Haute-Corse' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface PostRow {
  id:          string;
  title:       string;
  category:    string | null;
  created_at:  string | null;
  reply_count: number | null;
}

async function fetchRecentPosts(): Promise<{ posts: PostRow[]; total: number }> {
  try {
    const supabase = createClient();
    const { data, count } = await supabase
      .from('forum_posts')
      .select('id, title, category, created_at, reply_count', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6);
    return { posts: (data ?? []) as PostRow[], total: count ?? 0 };
  } catch {
    return { posts: [], total: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const FORUM_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vie_locale: { label: 'Vie locale',  emoji: '🏘️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  travaux:    { label: 'Travaux',     emoji: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  entraide:   { label: 'Entraide',   emoji: '🤝', color: 'bg-green-50 text-green-700 border-green-200' },
  nature:     { label: 'Nature',     emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  loisirs:    { label: 'Loisirs',    emoji: '🎉', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  securite:   { label: 'Sécurité',  emoji: '🔒', color: 'bg-red-50 text-red-700 border-red-200' },
  annonces:   { label: 'Annonces',  emoji: '📢', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autre:      { label: 'Autre',      emoji: '💬', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── Sujets phares par catégorie ──────────────────────────────────────────────

const TOPIC_SPOTLIGHTS = [
  {
    category: 'vie_locale',
    emoji: '🏘️',
    title: 'Vie locale à Biguglia',
    desc: 'Travaux municipaux, arrêtés, nouveaux commerces, fermetures de routes, informations pratiques sur la commune. La catégorie la plus consultée du forum.',
    examples: ['Chantier rue principale', 'Nouveau médecin à Biguglia ?', 'Horaires mairie', 'Collecte des ordures'],
    href: '/forum?categorie=vie_locale',
  },
  {
    category: 'travaux',
    emoji: '🔧',
    title: 'Travaux & Artisans',
    desc: 'Recommandations d\'artisans locaux, avis sur des prestataires, questions techniques de bricolage et rénovation. Les habitants de Biguglia partagent leurs bonnes adresses.',
    examples: ['Bon plombier ?', 'Maçon sérieux', 'Prix devis peinture', 'Isolation maison corse'],
    href: '/forum?categorie=travaux',
  },
  {
    category: 'entraide',
    emoji: '🤝',
    title: 'Entraide & Coups de main',
    desc: 'Demandes et offres d\'aide entre voisins : garde d\'animaux, déménagement, courses, dépannage informatique… La solidarité de proximité au cœur de la communauté de Biguglia.',
    examples: ['Besoin d\'aide déménagement', 'Qui prête une remorque ?', 'Garde chat vacances', 'Babysitting'],
    href: '/forum?categorie=entraide',
  },
  {
    category: 'nature',
    emoji: '🌿',
    title: 'Étang & Nature',
    desc: 'Discussions sur l\'étang de Biguglia (réserve naturelle), observations d\'oiseaux (flamants roses, hérons), qualité de l\'eau, sorties naturalistes et préservation de l\'environnement local.',
    examples: ['Flamants roses vus', 'Qualité eau étang', 'Rando autour de l\'étang', 'Espèces protégées'],
    href: '/forum?categorie=nature',
  },
];

// ─── FAQ enrichie (7 questions) ───────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment participer au forum de Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect et accédez au forum immédiatement. Vous pouvez créer des sujets, répondre aux messages et interagir avec vos voisins. Seule une adresse email valide est nécessaire — vos coordonnées personnelles restent confidentielles.',
  },
  {
    q: 'Quels sujets peut-on aborder sur le forum de Biguglia ?',
    a: 'Tout ce qui touche à la vie locale : questions pratiques sur la commune, recommandations d\'artisans et de commerçants, entraide entre voisins, actualités du village, discussions sur l\'étang et la nature, alertes de voisinage, loisirs et événements locaux.',
  },
  {
    q: 'Le forum est-il modéré ?',
    a: 'Oui, le forum est modéré par l\'équipe de Biguglia Connect. Les règles sont simples : bienveillance, respect et utilité pour la communauté locale. Les messages hors-sujet, les contenus illicites ou irrespectueux sont supprimés rapidement.',
  },
  {
    q: 'Peut-on signaler un problème de voisinage sur le forum ?',
    a: 'Oui, la catégorie "Sécurité" et "Vie locale" permettent de signaler des problèmes de voisinage, des incivilités, des tags, des dégradations ou des comportements dangereux. La communauté peut réagir et informer les autorités compétentes si nécessaire.',
  },
  {
    q: 'Comment trouver un artisan recommandé par les habitants de Biguglia ?',
    a: 'Consultez la catégorie "Travaux" du forum pour lire les retours d\'expériences des voisins et les recommandations d\'artisans locaux. Pour trouver des artisans vérifiés avec SIRET et assurance contrôlés, rendez-vous aussi sur la section Artisans de Biguglia Connect.',
  },
  {
    q: 'Peut-on rester anonyme sur le forum de Biguglia ?',
    a: 'Un compte est nécessaire pour poster, mais vous choisissez librement le nom affiché publiquement (pseudonyme autorisé). Votre adresse email et vos données personnelles ne sont jamais visibles par les autres membres.',
  },
  {
    q: 'Y a-t-il des discussions sur l\'étang de Biguglia dans le forum ?',
    a: 'Oui, la catégorie "Nature" est dédiée aux échanges sur l\'étang de Biguglia (réserve naturelle régionale), sa biodiversité (flamants roses, oiseaux migrateurs), la qualité de l\'eau et les initiatives de préservation. Les naturalistes locaux y partagent régulièrement leurs observations.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForumBigugliaPage() {
  const { posts, total } = await fetchRecentPosts();

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',              url: '/' },
    { name: `Forum de ${GEO.city}`, url: '/forum-biguglia' },
  ]);
  const faq        = faqSchema(FAQ);
  const collection = collectionPageSchema({
    name:        `Forum des habitants de ${GEO.city}`,
    description: `Échanges, questions et entraide entre habitants de ${GEO.city}, ${GEO.department}. Forum modéré et bienveillant.`,
    url:         '/forum-biguglia',
  });

  // DiscussionForumPosting principal
  const discussionSchema = {
    '@context':  'https://schema.org',
    '@type':     'DiscussionForumPosting',
    name:        `Forum des habitants de ${GEO.city}`,
    url:         `${SITE_URL}/forum-biguglia`,
    description: `Échanges entre habitants de ${GEO.city}, ${GEO.department}. Questions pratiques, vie locale, entraide, nature et étang de Biguglia.`,
    dateCreated: '2023-01-01',
    inLanguage:  'fr',
    about: {
      '@type':        'Place',
      name:           GEO.city,
      addressCountry: GEO.countryCode,
      addressRegion:  GEO.department,
    },
    publisher: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
  };

  // JSON-LD individuel pour chaque post récent
  const postSchemas = posts.slice(0, 3).map(p =>
    forumPostingSchema({
      name:        p.title,
      url:         `/forum/${p.id}`,
      dateCreated: p.created_at ?? new Date().toISOString(),
    })
  );

  // ItemList discussions récentes
  const postListSchema = posts.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Discussions récentes sur le forum de ${GEO.city}`,
    url:             `${SITE_URL}/forum-biguglia`,
    numberOfItems:   total,
    itemListElement: posts.map((p, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      p.title,
      url:       `${SITE_URL}/forum/${p.id}`,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      <JsonLd data={discussionSchema} />
      {postSchemas.map((s, i) => <JsonLd key={i} data={s} />)}
      {postListSchema && <JsonLd data={postListSchema} />}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Forum de {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <MapPin className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-bold">
              {total > 0 ? `${total} discussions actives` : 'Forum local'} · {GEO.city} · {GEO.postalCode}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Forum des habitants<br />
            <span className="text-violet-300">de Biguglia</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Échangez avec vos voisins de {GEO.city} : posez vos questions sur la vie locale,
            partagez des conseils, recommandez des artisans, discutez de l'étang et signalez
            des informations utiles au village.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: total > 0 ? `${total}` : '—',                    label: 'Discussions' },
              { value: Object.keys(FORUM_CATEGORIES).length.toString(), label: 'Catégories' },
              { value: '0 €',                                            label: 'Accès gratuit' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/forum"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-md">
              Accéder au forum <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/forum?action=new"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              Créer un sujet
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            CATÉGORIES DU FORUM
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Catégories du forum de {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur une catégorie pour accéder aux discussions de vos voisins sur ce thème.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(FORUM_CATEGORIES).map(([key, cat]) => (
              <Link key={key} href={`/forum?categorie=${key}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-violet-200 transition-all flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">{cat.emoji}</span>
                  <p className="font-bold text-gray-900 text-xs">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SUJETS PHARES PAR CATÉGORIE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Les catégories les plus actives à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Des centaines d'échanges entre habitants sur ces thèmes — rejoignez la conversation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOPIC_SPOTLIGHTS.map(topic => (
              <Link key={topic.category} href={topic.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{topic.emoji}</span>
                    <h3 className="font-black text-gray-900 text-sm">{topic.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{topic.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {topic.examples.map(ex => (
                      <span key={ex} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {ex}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-violet-600 mt-auto">
                    Lire les discussions <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — sujets phares
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Le forum de {GEO.city} : un espace de confiance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                Le forum de Biguglia Connect est le lieu d'échange privilégié des habitants de la commune.
                Les sujets les plus populaires traitent de la <strong>vie pratique quotidienne</strong> :
                recommandations d'artisans fiables, signalement de problèmes de voirie, informations sur
                les arrêtés municipaux et les chantiers en cours.
              </p>
              <p>
                Les catégories <strong>"Entraide"</strong> et <strong>"Vie locale"</strong> rassemblent
                les demandes de coups de main, les partages de bonnes adresses (commerçants, médecins,
                restaurants) et les alertes de voisinage. Un espace bienveillant, modéré par notre équipe.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Forum & étang de Biguglia :</strong> la catégorie "Nature" est particulièrement
                active. Les habitants échangent sur la faune de l'étang (réserve naturelle régionale),
                les sorties naturalistes, la qualité de l'eau et les initiatives de préservation.
                Un lien fort entre la communauté et son environnement exceptionnel.
              </p>
              <p>
                <strong>Charte de bonne conduite :</strong> le forum est modéré par l'équipe Biguglia Connect.
                Bienveillance, respect et utilité sont les trois piliers. Les discussions restent indexables
                par les moteurs de recherche — votre question peut aider d'autres habitants.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/forum?action=new',          label: '+ Créer un sujet' },
              { href: '/forum?categorie=entraide',  label: '🤝 Entraide locale' },
              { href: '/forum?categorie=nature',    label: '🌿 Étang & nature' },
              { href: '/forum?categorie=travaux',   label: '🔧 Artisans & travaux' },
              { href: '/coups-de-main',             label: '🙏 Coups de main' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            DISCUSSIONS RÉCENTES (live)
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">
              Discussions récentes à {GEO.city}
            </h2>
            <Link href="/forum"
              className="flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:text-violet-700">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map(post => {
                const cat = FORUM_CATEGORIES[post.category ?? 'autre'] ?? FORUM_CATEGORIES.autre;
                return (
                  <Link key={post.id} href={`/forum/${post.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4">
                      <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{post.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                            {cat.label}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      {(post.reply_count ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.reply_count}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <span className="text-4xl mb-4 block">💬</span>
              <h3 className="font-black text-gray-900 mb-2">Lancez la discussion</h3>
              <p className="text-gray-500 text-sm mb-4">
                Soyez le premier à poser une question ou partager une info utile pour les habitants de {GEO.city}.
              </p>
              <Link href="/forum"
                className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-all">
                Accéder au forum <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            AVANTAGES DU FORUM
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🤝', title: 'Entraide de voisinage',  desc: 'Demandez et offrez de l\'aide à vos voisins de Biguglia — déménagement, garde d\'animaux, dépannage.' },
            { emoji: '📢', title: 'Infos de proximité',     desc: 'Travaux, coupures d\'eau, alertes, bonnes adresses — restez informé de tout ce qui se passe au village.' },
            { emoji: '💡', title: 'Conseils locaux',        desc: 'Recommandations d\'artisans, bonnes adresses de commerçants, astuces pratiques pour vivre à Biguglia.' },
          ].map(b => (
            <div key={b.title} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
              <span className="text-2xl flex-shrink-0">{b.emoji}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            LIENS CONTEXTUELS — catégories forum & ressources
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Accès direct — Catégories & ressources liées
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Naviguez directement vers les catégories du forum et les pages de contenu associées.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Catégories du forum</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/forum?categorie=vie_locale', label: '🏘️ Vie locale' },
                  { href: '/forum?categorie=travaux',    label: '🔧 Travaux & artisans' },
                  { href: '/forum?categorie=entraide',   label: '🤝 Entraide' },
                  { href: '/forum?categorie=nature',     label: '🌿 Étang & nature' },
                  { href: '/forum?categorie=loisirs',    label: '🎉 Loisirs' },
                  { href: '/forum?categorie=securite',   label: '🔒 Sécurité' },
                  { href: '/forum?categorie=annonces',   label: '📢 Annonces forum' },
                  { href: '/forum?action=new',           label: '+ Nouveau sujet' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-all">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Ressources directement liées</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/artisans-biguglia',         label: '🔧 Artisans recommandés' },
                  { href: '/artisans/metier/plomberie', label: '🚿 Plombiers Biguglia' },
                  { href: '/artisans/metier/electricite',label: '⚡ Électriciens Biguglia' },
                  { href: '/coups-de-main',             label: '🙏 Coups de main' },
                  { href: '/annonces-biguglia',         label: '📦 Petites annonces' },
                  { href: '/perdu-trouve',              label: '🔍 Objets perdus' },
                  { href: '/evenements-biguglia',       label: '🎉 Événements locaux' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ enrichie (7 questions)
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Questions fréquentes — Forum de {GEO.city}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden group"
                open={i === 0}
              >
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                  <h3 className="font-bold text-gray-900 text-sm pr-4">{item.q}</h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAILLAGE INTERNE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Explorez d'autres espaces de la communauté
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/coups-de-main',         emoji: '🤝', title: 'Coups de main',              desc: 'Donnez ou demandez de l\'aide concrète à vos voisins' },
              { href: '/communaute',             emoji: '🏘️', title: 'Communauté Biguglia',        desc: 'Membres actifs, badges et contributions' },
              { href: '/evenements-biguglia',   emoji: '🎉', title: 'Événements à Biguglia',      desc: 'SC Biguglia & agenda local complet' },
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations à Biguglia',   desc: 'Clubs et vie associative locale' },
              { href: '/artisans-biguglia',     emoji: '🔧', title: 'Artisans vérifiés',          desc: 'Recommandations de voisins vérifiées' },
              { href: '/annonces-biguglia',     emoji: '📦', title: 'Petites annonces',           desc: 'Achat, vente, dons entre voisins' },
              { href: '/services-biguglia',     emoji: '🛠️', title: 'Services locaux',            desc: 'Prestataires vérifiés à Biguglia' },
              { href: '/emploi-biguglia',       emoji: '💼', title: 'Emploi local',               desc: 'Offres et candidatures à Biguglia' },
            ].map(link => (
              <Link key={link.href} href={link.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4">
                  <span className="text-xl">{link.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{link.title}</p>
                    <p className="text-xs text-gray-500">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA — REJOINDRE LA CONVERSATION
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <p className="text-3xl mb-3">💬</p>
            <h2 className="text-xl font-black mb-2">
              Rejoignez la conversation
            </h2>
            <p className="text-white/75 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Créez votre compte gratuit et rejoignez les {total > 0 ? `${total}+` : ''} discussions
              des habitants de {GEO.city}. Posez vos questions, partagez vos expériences et participez
              activement à la vie du village.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/forum"
                className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-lg">
                Accéder au forum <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/forum?action=new"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
                Créer mon premier sujet
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

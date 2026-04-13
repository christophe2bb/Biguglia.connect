/**
 * Route /forum-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO pour les recherches "forum Biguglia", "discussion Biguglia",
 * "forum village Corse", "habitants Biguglia".
 *
 * Architecture : SSR + JSON-LD BreadcrumbList + FAQPage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, ChevronRight, MapPin, ArrowRight, Users, Heart, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Forum de Biguglia — Discussion & Entraide entre Habitants (Corse)',
  description: 'Le forum des habitants de Biguglia : questions pratiques, vie locale, coups de main, actualités du village. Échangez avec vos voisins de Biguglia, Haute-Corse.',
  keywords: [
    'forum Biguglia', 'discussion Biguglia', 'forum village Corse',
    'entraide Biguglia', 'vie locale Biguglia', 'forum Haute-Corse',
    'habitants Biguglia', 'questions Biguglia', 'communauté Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/forum-biguglia` },
  openGraph: {
    title:       'Forum de Biguglia — Discussion & Entraide Locale',
    description: 'Posez vos questions, partagez vos conseils et échangez avec les habitants de Biguglia.',
    url:         `${SITE_URL}/forum-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Forum des habitants de Biguglia' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface PostRow {
  id:           string;
  title:        string;
  category:     string | null;
  created_at:   string | null;
  reply_count:  number | null;
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
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const FORUM_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vie_locale:      { label: 'Vie locale',     emoji: '🏘️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  travaux:         { label: 'Travaux',        emoji: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  entraide:        { label: 'Entraide',       emoji: '🤝', color: 'bg-green-50 text-green-700 border-green-200' },
  nature:          { label: 'Nature',         emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  loisirs:         { label: 'Loisirs',        emoji: '🎉', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  securite:        { label: 'Sécurité',       emoji: '🔒', color: 'bg-red-50 text-red-700 border-red-200' },
  annonces:        { label: 'Annonces',       emoji: '📢', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autre:           { label: 'Autre',          emoji: '💬', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment participer au forum de Biguglia ?',
    a: 'Créez un compte gratuit sur Biguglia Connect et accédez au forum. Vous pouvez créer des sujets, répondre aux messages et interagir avec vos voisins directement depuis votre profil.',
  },
  {
    q: 'Quels sujets peut-on aborder sur le forum de Biguglia ?',
    a: 'Tout ce qui touche à la vie locale : questions pratiques sur le village, entraide entre voisins, partage d\'informations sur les travaux, événements, alertes locales, conseils et recommandations.',
  },
  {
    q: 'Le forum est-il modéré ?',
    a: 'Oui, le forum est modéré par l\'équipe de Biguglia Connect. Les règles sont simples : bienveillance, respect et utilité. Les messages hors sujet ou irrespectueux sont supprimés.',
  },
  {
    q: 'Peut-on rester anonyme sur le forum de Biguglia ?',
    a: 'Un compte est nécessaire pour poster, mais vous choisissez le nom affiché publiquement. Votre adresse email reste confidentielle et n\'est jamais affichée publiquement.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForumBigugliaPage() {
  const { posts, total } = await fetchRecentPosts();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                     url: '/' },
    { name: `Forum de ${GEO.city}`,        url: '/forum-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  const discussionListSchema = {
    '@context':  'https://schema.org',
    '@type':     'DiscussionForumPosting',
    name:        `Forum des habitants de ${GEO.city}`,
    url:         `${SITE_URL}/forum-biguglia`,
    description: `Échanges entre habitants de ${GEO.city}, ${GEO.department}. Questions, entraide, vie locale.`,
    about: {
      '@type':        'Place',
      name:           GEO.city,
      addressCountry: GEO.countryCode,
      addressRegion:  GEO.department,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={discussionListSchema} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Forum de {GEO.city}</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">💬</span>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/90 text-xs font-bold">{GEO.city} · {GEO.department} · {GEO.iso}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Forum des Habitants de {GEO.city}
              </h1>
            </div>
          </div>

          <p className="text-white/75 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
            Échangez avec vos voisins de {GEO.city} : posez vos questions sur la vie locale,
            partagez des conseils, demandez de l'aide ou signalez des informations utiles au village.
            {total > 0 ? ` ${total} discussions actives.` : ''}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/forum"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-md">
              Accéder au forum <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/forum?action=new"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-all">
              Créer un sujet
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ══════════════════════════════════════════
            CATÉGORIES DU FORUM
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Catégories du forum de {GEO.city}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(FORUM_CATEGORIES).map(([key, cat]) => (
              <Link key={key} href={`/forum?categorie=${key}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">{cat.emoji}</span>
                  <p className="font-bold text-gray-900 text-xs">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            DISCUSSIONS RÉCENTES
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
            AVANTAGES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '🤝', title: 'Entraide de voisinage',  desc: 'Demandez et offrez de l\'aide à vos voisins de Biguglia directement sur le forum.' },
            { emoji: '📢', title: 'Infos de proximité',     desc: 'Travaux, coupures d\'eau, alertes, bonnes adresses… restez informé de tout ce qui se passe au village.' },
            { emoji: '💡', title: 'Conseils locaux',        desc: 'Bonnes adresses, recommandations d\'artisans, astuces d\'habitants expérimentés.' },
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
            MAILLAGE INTERNE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">
            Explorez d'autres espaces de la communauté
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/coups-de-main',        emoji: '🤝', title: 'Coups de main',               desc: 'Donnez ou demandez de l\'aide concrète à vos voisins' },
              { href: '/communaute',            emoji: '🏘️', title: 'Communauté Biguglia',         desc: 'Membres actifs, badges et contributions de la communauté' },
              { href: '/evenements-biguglia',   emoji: '🎉', title: 'Événements à Biguglia',       desc: 'Agenda des activités et sorties locales' },
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations à Biguglia',    desc: 'Clubs, bénévolat et vie associative locale' },
            ].map(link => (
              <Link key={link.href} href={link.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4">
                  <span className="text-2xl">{link.emoji}</span>
                  <div>
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
            FAQ
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
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
            CTA
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
              Créez votre compte gratuit et rejoignez les habitants de {GEO.city} sur le forum.
              Posez vos questions, partagez vos expériences et participez à la vie du village.
            </p>
            <Link href="/forum"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-violet-50 transition-all shadow-lg">
              Accéder au forum <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}

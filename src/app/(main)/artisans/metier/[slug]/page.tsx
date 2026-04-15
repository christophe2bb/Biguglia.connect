/**
 * Route /artisans/metier/[slug]
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO par métier artisan — ex : /artisans/metier/plomberie
 *
 * Architecture :
 *   • generateStaticParams → génère toutes les pages au build (SSG)
 *   • generateMetadata     → title/description uniques par métier
 *   • Page SSR             → fetch artisans filtrés depuis Supabase
 *   • JSON-LD              → LocalBusiness + BreadcrumbList + FAQPage
 *
 * Objectif SEO : capturer les recherches "plombier Biguglia",
 *   "électricien Biguglia", "maçon Haute-Corse", etc.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, Shield, CheckCircle, ArrowRight, MapPin, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { TRADE_META_MAP, ALL_TRADE_SLUGS, GEO, type TradeMeta } from '@/lib/seo/local-data';
import Avatar from '@/components/ui/Avatar';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── Static generation ────────────────────────────────────────────────────────

export function generateStaticParams() {
  return ALL_TRADE_SLUGS.map(slug => ({ slug }));
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const trade = TRADE_META_MAP[slug];
  if (!trade) return { title: 'Artisan introuvable' };

  return {
    title:       trade.title,
    description: trade.description,
    keywords: [
      `${trade.name.toLowerCase()} Biguglia`,
      `${trade.name.toLowerCase()} Haute-Corse`,
      `${trade.name.toLowerCase()} Corse`,
      `artisan ${slug} Biguglia`,
      `${slug} vérifié Biguglia`,
    ],
    alternates: { canonical: `${SITE_URL}/artisans/metier/${slug}` },
    openGraph: {
      title:       trade.title,
      description: trade.description,
      url:         `${SITE_URL}/artisans/metier/${slug}`,
      images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630 }],
      type:        'website',
    },
  };
}

// ─── Données artisans depuis Supabase ─────────────────────────────────────────

interface ArtisanRow {
  id:            string;
  full_name:     string;
  avatar_url:    string | null;
  business_name: string | null;
  avg_rating:    number | null;
  review_count:  number | null;
  city:          string | null;
  trade_slug:    string | null;
  trade_name:    string | null;
  artisan_type:  string | null;
}

async function fetchArtisansByTrade(tradeSlug: string): Promise<ArtisanRow[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('artisan_profiles')
      .select(`
        id,
        business_name,
        artisan_type,
        city,
        avg_rating,
        review_count,
        profile:profiles!artisan_profiles_user_id_fkey(id, full_name, avatar_url),
        trade_category:trade_categories!artisan_profiles_trade_category_id_fkey(name, slug)
      `)
      .eq('status', 'verified')
      .eq('trade_category.slug', tradeSlug)
      .not('trade_category', 'is', null)
      .order('avg_rating', { ascending: false })
      .limit(12);

    if (!data) return [];

    return data
      .filter(row => row.trade_category !== null)
      .map((row) => {
        // Supabase returns joined rows as objects or arrays
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        const cat     = Array.isArray(row.trade_category) ? row.trade_category[0] : row.trade_category;
        return {
          id:            profile?.id ?? row.id,
          full_name:     profile?.full_name ?? 'Artisan',
          avatar_url:    profile?.avatar_url ?? null,
          business_name: row.business_name,
          avg_rating:    row.avg_rating,
          review_count:  row.review_count,
          city:          row.city,
          trade_slug:    cat?.slug ?? tradeSlug,
          trade_name:    cat?.name ?? null,
          artisan_type:  row.artisan_type,
        };
      });
  } catch {
    return [];
  }
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-xs font-bold text-amber-600">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count} avis)</span>
    </div>
  );
}

function ArtisanCard({ artisan }: { artisan: ArtisanRow }) {
  const displayName = artisan.business_name ?? artisan.full_name;
  return (
    <Link href={`/artisans/${artisan.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all h-full flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={artisan.avatar_url} name={displayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{displayName}</p>
            {artisan.city && (
              <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3" />{artisan.city}
              </p>
            )}
          </div>
        </div>
        {(artisan.avg_rating ?? 0) > 0 ? (
          <StarRow rating={artisan.avg_rating!} count={artisan.review_count ?? 0} />
        ) : (
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Artisan vérifié
          </p>
        )}
        <div className="mt-auto flex items-center gap-1 text-xs font-bold text-brand-600">
          Voir le profil <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(trade: TradeMeta, artisans: ArtisanRow[]) {
  const pageUrl = `${SITE_URL}/artisans/metier/${trade.slug}`;

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',  url: '/' },
    { name: 'Artisans', url: '/artisans' },
    { name: trade.h1,   url: `/artisans/metier/${trade.slug}` },
  ]);

  const faq = faqSchema(trade.faq);

  const itemList = artisans.length > 0 ? {
    '@context':     'https://schema.org',
    '@type':        'ItemList',
    name:           `${trade.namePlural} à ${GEO.city}`,
    url:            pageUrl,
    numberOfItems:  artisans.length,
    itemListElement: artisans.map((a, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      url:        `${SITE_URL}/artisans/${a.id}`,
      name:       a.business_name ?? a.full_name,
    })),
  } : null;

  return { breadcrumb, faq, itemList };
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function ArtisanTradePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const trade = TRADE_META_MAP[slug];
  if (!trade) notFound();

  const artisans = await fetchArtisansByTrade(slug);
  const { breadcrumb, faq, itemList } = buildJsonLd(trade, artisans);

  // Pages métiers liées (maillage interne)
  const relatedTrades = trade.relatedSlugs
    .map(s => TRADE_META_MAP[s])
    .filter(Boolean) as TradeMeta[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {itemList && <JsonLd data={itemList} />}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/artisans" className="hover:text-white transition-colors">Artisans</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">{trade.h1}</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{trade.emoji}</span>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white/90 text-xs font-bold">{GEO.city} · {GEO.department} · {GEO.iso}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {trade.h1}
              </h1>
            </div>
          </div>

          <p className="text-white/75 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
            {trade.intro}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/artisans"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-md">
              Voir tous les artisans <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-all">
              Déposer une demande
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ══════════════════════════════════════════
            TRUST BADGES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Shield,       emoji: '🛡️', title: 'Vérifiés manuellement',   desc: 'SIRET, assurance RC Pro et pièce d\'identité contrôlés' },
            { icon: Star,         emoji: '⭐', title: 'Avis authentiques',        desc: 'Évaluations laissées par de vrais clients du village' },
            { icon: CheckCircle,  emoji: '✅', title: 'Contact direct',           desc: 'Échangez directement sans intermédiaire ni commission' },
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
            LISTE ARTISANS
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">
              {artisans.length > 0
                ? `${artisans.length} ${trade.namePlural} à ${GEO.city}`
                : `${trade.namePlural} à ${GEO.city}`}
            </h2>
            <Link href={`/artisans?categorie=${slug}`}
              className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {artisans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artisans.map(a => <ArtisanCard key={a.id} artisan={a} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <span className="text-4xl mb-4 block">{trade.emoji}</span>
              <h3 className="font-black text-gray-900 mb-2">
                Pas encore de {trade.namePlural.toLowerCase()} référencés
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Vous êtes {trade.name.toLowerCase()} à {GEO.city} ? Rejoignez Biguglia Connect et soyez visible localement.
              </p>
              <Link href="/inscription/artisan-profil"
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-brand-700 transition-all">
                Créer mon profil artisan
              </Link>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            FAQ LOCALE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Questions fréquentes — {trade.namePlural} à {GEO.city}
          </h2>
          <div className="space-y-4">
            {trade.faq.map((item, i) => (
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
            MAILLAGE INTERNE — métiers liés
        ══════════════════════════════════════════ */}
        {relatedTrades.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4">
              Autres artisans à {GEO.city}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedTrades.map(rt => (
                <Link key={rt.slug} href={`/artisans/metier/${rt.slug}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3">
                    <span className="text-2xl">{rt.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{rt.h1}</p>
                      <p className="text-xs text-gray-500">{rt.namePlural} vérifiés</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════
            CTA INSCRIPTION ARTISAN
        ══════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <p className="text-3xl mb-3">{trade.emoji}</p>
            <h2 className="text-xl font-black mb-2">
              Vous êtes {trade.name.toLowerCase()} à {GEO.city} ?
            </h2>
            <p className="text-white/75 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Créez votre profil gratuit sur Biguglia Connect et soyez trouvé par les habitants qui cherchent un {trade.name.toLowerCase()} de confiance.
            </p>
            <Link href="/inscription/artisan-profil"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-xl text-sm hover:bg-brand-50 transition-all shadow-lg">
              Créer mon profil artisan gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}

/**
 * Route /emploi-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO d'entrée pour les recherches "emploi Biguglia",
 * "travail Biguglia", "recrutement Haute-Corse".
 *
 * Architecture SSR : données réelles Supabase + JSON-LD complet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ChevronRight, MapPin, ArrowRight, Clock, Users, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, jobPostingSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Emploi à Biguglia — Offres & Recrutement Local en Haute-Corse',
  description:
    'Offres d\'emploi à Biguglia et en Haute-Corse : CDI, CDD, saisonnier, extra. Postulez directement aux employeurs locaux ou déposez votre CV. Recrutement sans intermédiaire.',
  keywords: [
    'emploi Biguglia', 'travail Biguglia', 'recrutement Biguglia',
    'offre emploi Haute-Corse', 'CDI Biguglia', 'CDD Corse',
    'job Biguglia', 'annonce emploi Corse', 'cherche emploi Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/emploi-biguglia` },
  openGraph: {
    title:       'Emploi à Biguglia — Offres & Recrutement Local',
    description: 'CDI, CDD, saisonnier à Biguglia. Postulez aux employeurs locaux sans intermédiaire.',
    url:         `${SITE_URL}/emploi-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630 }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface JobOffer { id: string; title: string; contract_type: string | null; published_at: string | null; }
interface JobDemand { id: string; title: string; contract_type: string | null; published_at: string | null; }

async function fetchRecentJobs(): Promise<{ offers: JobOffer[]; demands: JobDemand[]; totalOffers: number; totalDemands: number }> {
  try {
    const supabase = createClient();
    const [{ data: offers, count: totalOffers }, { data: demands, count: totalDemands }] = await Promise.all([
      supabase.from('job_offers')
        .select('id, title, contract_type, published_at', { count: 'exact' })
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(4),
      supabase.from('job_demands')
        .select('id, title, contract_type, published_at', { count: 'exact' })
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(4),
    ]);
    return {
      offers:       (offers ?? []) as JobOffer[],
      demands:      (demands ?? []) as JobDemand[],
      totalOffers:  totalOffers ?? 0,
      totalDemands: totalDemands ?? 0,
    };
  } catch {
    return { offers: [], demands: [], totalOffers: 0, totalDemands: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  if (diff < 7) return `Il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', interim: 'Intérim',
  saisonnier: 'Saisonnier', stage: 'Stage', freelance: 'Freelance',
  alternance: 'Alternance', extra: 'Extra',
};

const FAQ = [
  { q: 'Comment trouver un emploi à Biguglia ?', a: 'Biguglia Connect centralise toutes les offres d\'emploi locales à Biguglia et en Haute-Corse. Parcourez les annonces, filtrez par type de contrat et postulez directement auprès des employeurs.' },
  { q: 'Quels types de contrats sont proposés à Biguglia ?', a: 'CDI, CDD, emploi saisonnier (tourisme, agriculture), extra, stage, alternance et missions ponctuelles. Le tissu économique local comprend le commerce, l\'artisanat, la restauration et les services.' },
  { q: 'Comment publier une offre d\'emploi à Biguglia ?', a: 'Créez un compte sur Biguglia Connect et déposez votre offre gratuitement. Elle sera visible par tous les habitants et candidats locaux.' },
  { q: 'Les candidats de Biguglia peuvent-ils déposer un CV ?', a: 'Oui, les candidats peuvent publier leur profil de recherche d\'emploi ("demande d\'emploi") sur Biguglia Connect et être contactés directement par les employeurs locaux.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EmploiBigugliaPage() {
  const { offers, demands, totalOffers, totalDemands } = await fetchRecentJobs();

  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Emploi à ${GEO.city}`, url: '/emploi-biguglia' },
  ]);
  const faq = faqSchema(FAQ);

  // JSON-LD JobPosting aggregation
  const jobListSchema = offers.length > 0 ? {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name:       `Offres d'emploi à ${GEO.city}`,
    url:        `${SITE_URL}/emploi-biguglia`,
    numberOfItems: totalOffers,
    itemListElement: offers.map((o, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      url:        `${SITE_URL}/emploi/offres/${o.id}`,
      name:       o.title,
    })),
  } : null;

  // JSON-LD JobPosting individuels (max 3 pour les rich snippets Google)
  const jobPostingSchemas = offers.slice(0, 3).map(o =>
    jobPostingSchema({
      title:        o.title,
      description:  `Offre d'emploi à ${GEO.city} — ${o.title}. Contactez l'employeur directement sur Biguglia Connect.`,
      url:          `/emploi/offres/${o.id}`,
      datePosted:   o.published_at ?? new Date().toISOString(),
      contractType: o.contract_type ?? undefined,
      city:         GEO.city,
    }),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {jobListSchema && <JsonLd data={jobListSchema} />}
      {jobPostingSchemas.map((schema, i) => <JsonLd key={i} data={schema} />)}

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-cyan-700 via-cyan-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Emploi à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" />
            <span className="text-white/90 text-xs font-bold">
              {totalOffers > 0 ? `${totalOffers} offres actives` : 'Recrutement local'} · {GEO.city}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Emploi à Biguglia<br />
            <span className="text-cyan-300">Recrutement local</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Trouvez un emploi à Biguglia ou recrutez localement.
            CDI, CDD, saisonnier, extra — toutes les annonces du bassin de Haute-Corse.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/emploi/offres"
              className="inline-flex items-center gap-2 bg-white text-cyan-800 font-black px-6 py-3 rounded-xl text-sm hover:bg-cyan-50 transition-all shadow-md">
              💼 Voir les offres d'emploi <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/emploi/demandes"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-all">
              🙋 Candidats disponibles
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* ── STATS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: '💼', value: totalOffers > 0 ? `${totalOffers}` : '—',  label: 'Offres d\'emploi actives',  color: 'bg-cyan-500' },
            { emoji: '🙋', value: totalDemands > 0 ? `${totalDemands}` : '—', label: 'Candidats disponibles',    color: 'bg-purple-500' },
            { emoji: '🏡', value: GEO.city,                                    label: 'Emploi 100 % local',       color: 'bg-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 text-white text-xl ${s.color}`}>{s.emoji}</div>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── DERNIÈRES OFFRES ── */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-600" /> Dernières offres d'emploi
              </h2>
              <Link href="/emploi/offres"
                className="flex items-center gap-1 text-sm font-bold text-cyan-600 hover:text-cyan-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map(o => (
                <Link key={o.id} href={`/emploi/offres/${o.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all h-full">
                    <p className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{o.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.contract_type && (
                        <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-full">
                          {CONTRACT_LABELS[o.contract_type] ?? o.contract_type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(o.published_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CANDIDATS ── */}
        {demands.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Candidats disponibles
              </h2>
              <Link href="/emploi/demandes"
                className="flex items-center gap-1 text-sm font-bold text-purple-600 hover:text-purple-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demands.map(d => (
                <Link key={d.id} href={`/emploi/demandes/${d.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all h-full">
                    <p className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{d.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.contract_type && (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                          {CONTRACT_LABELS[d.contract_type] ?? d.contract_type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(d.published_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── PUBLIER ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl p-6 text-white">
            <p className="text-2xl mb-2">💼</p>
            <h3 className="font-black text-lg mb-1">Vous recrutez ?</h3>
            <p className="text-white/75 text-sm mb-4 leading-relaxed">Publiez votre offre d'emploi gratuitement. Visible par tous les habitants de Biguglia.</p>
            <Link href="/emploi/offres/publier"
              className="inline-flex items-center gap-2 bg-white text-cyan-700 font-black px-4 py-2 rounded-xl text-sm hover:bg-cyan-50 transition-all">
              Publier une offre <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
            <p className="text-2xl mb-2">🙋</p>
            <h3 className="font-black text-lg mb-1">Vous cherchez un emploi ?</h3>
            <p className="text-white/75 text-sm mb-4 leading-relaxed">Déposez votre profil et soyez contacté par les employeurs locaux de Biguglia.</p>
            <Link href="/emploi/demandes/publier"
              className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-4 py-2 rounded-xl text-sm hover:bg-purple-50 transition-all">
              Déposer mon CV <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-5">
            Questions fréquentes — Emploi à {GEO.city}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group" open={i === 0}>
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

        {/* ── MAILLAGE ── */}
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">Autres ressources à {GEO.city}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/services-biguglia',     emoji: '🔧', title: 'Services & Artisans',  desc: 'Trouvez un artisan local' },
              { href: '/evenements-biguglia',   emoji: '🎉', title: 'Événements',            desc: 'Agenda de Biguglia' },
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations',         desc: 'Clubs et vie associative' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3">
                  <span className="text-xl">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{l.title}</p>
                    <p className="text-xs text-gray-500">{l.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

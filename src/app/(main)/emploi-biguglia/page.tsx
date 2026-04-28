/**
 * Route /emploi-biguglia
 * ─────────────────────────────────────────────────────────────────────────────
 * Page SEO d'entrée pour les recherches "emploi Biguglia",
 * "travail Biguglia", "recrutement Haute-Corse".
 *
 * Architecture SSR : données réelles Supabase + JSON-LD complet
 * (BreadcrumbList + FAQPage + JobPosting + Occupation + ItemList).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ChevronRight, MapPin, ArrowRight, Clock, Users, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JsonLd, breadcrumbSchema, faqSchema, jobPostingSchema, occupationSchema, collectionPageSchema } from '@/components/seo/JsonLd';
import { GEO } from '@/lib/seo/local-data';
import { CONTRACT_LABELS, JOB_SECTORS, FAQ } from './_data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

/** Formate une date ISO en date courte lisible (ex. "12 janv. 2026") */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export const metadata: Metadata = {
  title: 'Emploi à Biguglia — Offres & Recrutement Local en Haute-Corse (2B)',
  description:
    'Offres d\'emploi à Biguglia et en Haute-Corse : CDI, CDD, saisonnier, extra, alternance. Postulez directement aux employeurs locaux ou déposez votre CV. Recrutement gratuit et sans intermédiaire à Biguglia (20620).',
  keywords: [
    'emploi Biguglia', 'travail Biguglia', 'recrutement Biguglia',
    'offre emploi Haute-Corse', 'CDI Biguglia', 'CDD Corse',
    'job Biguglia', 'annonce emploi Corse', 'cherche emploi Biguglia',
    'saisonnier Biguglia', 'alternance Biguglia', 'emploi 20620',
    'recrutement Haute-Corse 2B', 'travailler Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/emploi-biguglia` },
  openGraph: {
    title:       'Emploi à Biguglia — Offres & Recrutement Local (Haute-Corse)',
    description: 'CDI, CDD, saisonnier, alternance à Biguglia. Postulez directement aux employeurs locaux sans intermédiaire.',
    url:         `${SITE_URL}/emploi-biguglia`,
    images:      [{ url: `${SITE_URL}/images/biguglia-hero.jpg`, width: 1200, height: 630, alt: 'Emploi et recrutement à Biguglia, Haute-Corse' }],
    type:        'website',
  },
};

// ─── Données live ─────────────────────────────────────────────────────────────

interface JobOffer  { id: string; title: string; contract_type: string | null; published_at: string | null; }
interface JobDemand { id: string; title: string; contract_type: string | null; published_at: string | null; }

async function fetchRecentJobs(): Promise<{ offers: JobOffer[]; demands: JobDemand[]; totalOffers: number; totalDemands: number }> {
  try {
    const supabase = await createClient();
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
      offers:       (offers  ?? []) as JobOffer[],
      demands:      (demands ?? []) as JobDemand[],
      totalOffers:  totalOffers  ?? 0,
      totalDemands: totalDemands ?? 0,
    };
  } catch {
    return { offers: [], demands: [], totalOffers: 0, totalDemands: 0 };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EmploiBigugliaPage() {
  const { offers, demands, totalOffers, totalDemands } = await fetchRecentJobs();

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const breadcrumb   = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: `Emploi à ${GEO.city}`, url: '/emploi-biguglia' },
  ]);
  const faq          = faqSchema(FAQ);
  const collection   = collectionPageSchema({
    name:        `Emploi & Recrutement à ${GEO.city}`,
    description: `Offres d'emploi et profils de candidats à ${GEO.city}, ${GEO.department}. CDI, CDD, saisonnier, alternance.`,
    url:         '/emploi-biguglia',
  });

  // Occupation schemas — top secteurs
  const occupationSchemas = JOB_SECTORS.map(s =>
    occupationSchema({ name: s.title, description: s.desc, url: s.href })
  );

  // ItemList offres
  const jobListSchema = offers.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Offres d'emploi à ${GEO.city}`,
    url:             `${SITE_URL}/emploi-biguglia`,
    numberOfItems:   totalOffers,
    itemListElement: offers.map((o, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      url:       `${SITE_URL}/emploi/offres/${o.id}`,
      name:      o.title,
    })),
  } : null;

  // JobPosting individuels (max 3)
  const jobPostingSchemas = offers.slice(0, 3).map(o =>
    jobPostingSchema({
      title:        o.title,
      description:  `Offre d'emploi à ${GEO.city} — ${o.title}. Contactez l'employeur directement sur Biguglia Connect.`,
      url:          `/emploi/offres/${o.id}`,
      datePosted:   o.published_at ?? new Date().toISOString(),
      contractType: o.contract_type ?? undefined,
      city:         GEO.city,
    })
  );

  // ItemList demandes
  const demandListSchema = demands.length > 0 ? {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            `Candidats disponibles à ${GEO.city}`,
    url:             `${SITE_URL}/emploi-biguglia`,
    numberOfItems:   totalDemands,
    itemListElement: demands.map((d, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      d.title,
      url:       `${SITE_URL}/emploi/demandes/${d.id}`,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── JSON-LD ── */}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={collection} />
      {occupationSchemas.map((s, i) => <JsonLd key={i} data={s} />)}
      {jobListSchema    && <JsonLd data={jobListSchema} />}
      {demandListSchema && <JsonLd data={demandListSchema} />}
      {jobPostingSchemas.map((schema, i) => <JsonLd key={`jp-${i}`} data={schema} />)}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-cyan-700 via-cyan-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] bg-dot-grid-md" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-6" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/90">Emploi à {GEO.city}</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-5">
            <MapPin className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-bold">
              {totalOffers > 0 ? `${totalOffers} offres actives` : 'Recrutement local'} · {GEO.city} · {GEO.postalCode}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Emploi à Biguglia<br />
            <span className="text-cyan-300">Recrutement local</span>
          </h1>
          <p className="text-white/75 text-lg max-w-2xl leading-relaxed mb-6">
            Trouvez un emploi à Biguglia ou recrutez localement.
            CDI, CDD, saisonnier, alternance — toutes les annonces du bassin de Haute-Corse,
            directement entre employeurs et candidats locaux.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mb-8">
            {[
              { value: totalOffers  > 0 ? `${totalOffers}`  : '—', label: 'Offres d\'emploi' },
              { value: totalDemands > 0 ? `${totalDemands}` : '—', label: 'Candidats' },
              { value: '100 %',                                      label: 'Local & gratuit' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/emploi/offres"
              className="inline-flex items-center gap-2 bg-white text-cyan-800 font-black px-6 py-3 rounded-xl text-sm hover:bg-cyan-50 transition-colors shadow-md">
              💼 Voir les offres d&apos;emploi <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/emploi/demandes"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
              🙋 Candidats disponibles
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════
            ÉDITO LOCAL — économie de Biguglia
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Le marché du travail à {GEO.city} et en Haute-Corse
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                L&apos;économie de Biguglia est portée par plusieurs secteurs clés. La <strong>zone commerciale
                de Lucciana</strong> — l&apos;une des plus importantes de Haute-Corse — génère de nombreux postes
                dans le commerce, la distribution et la logistique. La croissance résidentielle soutient
                une forte demande dans le <strong>BTP</strong> : maçonnerie, plomberie, électricité,
                menuiserie et peinture.
              </p>
              <p>
                La proximité de l&apos;<strong>aéroport Napoléon Bonaparte de Bastia-Poretta</strong> favorise
                les activités touristiques et les emplois saisonniers (mai–septembre) dans l&apos;hôtellerie,
                la restauration et les loisirs. Le maraîchage de la plaine orientale offre aussi des emplois
                agricoles temporaires.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Atouts pour les chercheurs d&apos;emploi :</strong> Biguglia se situe à 8 km de Bastia
                (préfecture de Haute-Corse), ce qui ouvre l&apos;accès à un bassin d&apos;emploi élargi sans quitter
                la commune. Les transports en commun (lignes de bus) permettent de rejoindre Bastia,
                Borgo et Lucciana facilement.
              </p>
              <p>
                <strong>Conseil candidats :</strong> créez votre profil sur Biguglia Connect, précisez vos
                compétences et votre disponibilité (temps plein, mi-temps, saisonnier) et laissez les
                employeurs locaux vous contacter directement. Aucune commission, aucun intermédiaire.
              </p>
            </div>
          </div>
          {/* Garanties */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { emoji: '🆓', title: '100 % gratuit',        desc: 'Dépôt d\'offres et de CV entièrement gratuit pour tous.' },
              { emoji: '⚡', title: 'Contact direct',        desc: 'Employeurs et candidats communiquent sans intermédiaire.' },
              { emoji: '📍', title: 'Emploi local',          desc: 'Uniquement des offres de Biguglia et du bassin de Haute-Corse.' },
            ].map(g => (
              <div key={g.title} className="flex items-start gap-3 bg-cyan-50 rounded-2xl border border-cyan-100 p-4">
                <span className="text-xl flex-shrink-0">{g.emoji}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{g.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {[
              { href: '/emploi/offres',          label: '💼 Voir toutes les offres' },
              { href: '/emploi/demandes',         label: '🙋 Candidats disponibles' },
              { href: '/artisans-biguglia',       label: '🔧 Artisans — BTP Biguglia' },
              { href: '/services-biguglia',       label: '🛠️ Services locaux' },
              { href: '/forum-biguglia',          label: '💬 Forum : conseils carrière' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTEURS QUI RECRUTENT
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Secteurs qui recrutent à {GEO.city}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur un secteur pour voir les offres et profils disponibles à Biguglia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {JOB_SECTORS.map(sector => (
              <Link key={sector.slug} href={sector.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-cyan-200 hover:-translate-y-0.5 transition-[color,border-color,box-shadow,transform] h-full flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{sector.emoji}</span>
                    <h3 className="font-black text-gray-900 text-sm">{sector.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{sector.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 mt-auto">
                    Voir les offres <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            DERNIÈRES OFFRES
        ══════════════════════════════════════════ */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-600" /> Dernières offres d&apos;emploi à {GEO.city}
              </h2>
              <Link href="/emploi/offres"
                className="flex items-center gap-1 text-sm font-bold text-cyan-600 hover:text-cyan-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map(o => (
                <Link key={o.id} href={`/emploi/offres/${o.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-colors h-full">
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

        {/* ══════════════════════════════════════════
            CANDIDATS
        ══════════════════════════════════════════ */}
        {demands.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Candidats disponibles à {GEO.city}
              </h2>
              <Link href="/emploi/demandes"
                className="flex items-center gap-1 text-sm font-bold text-purple-600 hover:text-purple-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demands.map(d => (
                <Link key={d.id} href={`/emploi/demandes/${d.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-colors h-full">
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

        {/* ══════════════════════════════════════════
            RESSOURCES EMPLOI LOCALES
        ══════════════════════════════════════════ */}
        <section className="bg-cyan-50 rounded-3xl border border-cyan-100 p-6 sm:p-8">
          <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-600" /> Ressources emploi à Biguglia et en Haute-Corse
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600 leading-relaxed">
            <div className="space-y-3">
              <p>
                <strong>France Travail Bastia</strong> — l\&apos;agence la plus proche de Biguglia (8 km).
                Inscription, indemnisation, offres d\&apos;emploi et formations. Accessible en bus depuis
                Biguglia. Site officiel : <span className="text-cyan-600 font-semibold">francetravail.fr</span>.
              </p>
              <p>
                <strong>Chambre des Métiers et de l\&apos;Artisanat de Haute-Corse</strong> — répertoire des
                entreprises artisanales, formations professionnelles, apprentissage et aides à la création
                d\&apos;entreprise. Idéal pour les métiers du BTP et des services.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong>AFPA et GRETA de Haute-Corse</strong> — formations professionnelles
                continues (présentiel et à distance) dans les secteurs du BTP, de la restauration,
                des services à la personne et de la logistique. Financements possibles via France Travail
                ou le Compte Personnel de Formation (CPF).
              </p>
              <p>
                <strong>Mission Locale Haute-Corse</strong> — accompagnement des jeunes de 16 à 25 ans
                dans leur insertion professionnelle. Aide à la recherche d\&apos;emploi, accès à la formation
                et dispositifs spécifiques (CIVIS, garantie jeunes) accessibles depuis Biguglia.
              </p>
            </div>
          </div>
          <div className="mt-5 p-4 bg-white rounded-2xl border border-cyan-100">
            <p className="text-xs text-gray-500 font-semibold mb-2">💡 Conseil Biguglia Connect</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Complétez vos démarches officielles par votre profil sur Biguglia Connect :
              des PME locales et des artisans de Biguglia y publient des offres non déposées
              ailleurs. Contact direct, réponse rapide, zéro commission.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PUBLIER OFFRE / CV
        ══════════════════════════════════════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl p-6 text-white">
            <p className="text-2xl mb-2">💼</p>
            <h3 className="font-black text-lg mb-1">Vous recrutez à {GEO.city} ?</h3>
            <p className="text-white/75 text-sm mb-4 leading-relaxed">Publiez votre offre d&apos;emploi gratuitement. Visible par tous les habitants de Biguglia et des communes voisines.</p>
            <Link href="/emploi/publier"
              className="inline-flex items-center gap-2 bg-white text-cyan-700 font-black px-4 py-2 rounded-xl text-sm hover:bg-cyan-50 transition-colors">
              Publier une offre <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
            <p className="text-2xl mb-2">🙋</p>
            <h3 className="font-black text-lg mb-1">Vous cherchez un emploi ?</h3>
            <p className="text-white/75 text-sm mb-4 leading-relaxed">Déposez votre profil et soyez contacté par les employeurs locaux de Biguglia — sans CV papier ni intermédiaire.</p>
            <Link href="/emploi/demandes/publier"
              className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-4 py-2 rounded-xl text-sm hover:bg-purple-50 transition-colors">
              Déposer mon profil <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LIENS CONTEXTUELS — secteurs & sous-pages liées
        ══════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Secteurs, offres et profils — Accès direct
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Naviguez directement vers les sous-catégories d&apos;emploi et les ressources locales associées.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Par type de contrat</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/emploi/offres?type=cdi',        label: '📋 CDI à Biguglia' },
                  { href: '/emploi/offres?type=cdd',        label: '📄 CDD à Biguglia' },
                  { href: '/emploi/offres?type=saisonnier', label: '☀️ Saisonniers' },
                  { href: '/emploi/offres?type=alternance', label: '🎓 Alternance' },
                  { href: '/emploi/offres?type=extra',      label: '⚡ Extras & extras' },
                  { href: '/emploi/demandes',               label: '🙋 Candidats disponibles' },
                  { href: '/emploi/publier',         label: '+ Publier une offre' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-700 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-cyan-100 transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Contenus locaux associés</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/artisans-biguglia',              label: '🔧 Artisans BTP Biguglia' },
                  { href: '/services-biguglia',              label: '⚙️ Services locaux' },
                  { href: '/associations-biguglia',          label: '🏛️ Bénévolat & associations' },
                  { href: '/forum?categorie=travaux',        label: '💬 Forum Travaux' },
                  { href: '/forum?categorie=vie_locale',     label: '🏘️ Forum Vie locale' },
                  { href: '/communaute',                     label: '🏘️ Communauté Biguglia' },
                  { href: '/annonces-biguglia',              label: '📦 Petites annonces' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors">
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

        {/* ══════════════════════════════════════════
            MAILLAGE INTERNE
        ══════════════════════════════════════════ */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Autres ressources locales à {GEO.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/services-biguglia',     emoji: '🔧', title: 'Services & Artisans',   desc: 'Trouvez un artisan — BTP Biguglia' },
              { href: '/artisans-biguglia',     emoji: '🏗️', title: 'Artisans vérifiés',     desc: 'Profils & contacts directs' },
              { href: '/evenements-biguglia',   emoji: '🎉', title: 'Événements',             desc: 'Agenda complet de Biguglia' },
              { href: '/associations-biguglia', emoji: '🏛️', title: 'Associations',           desc: 'Clubs & bénévolat local' },
              { href: '/forum-biguglia',        emoji: '💬', title: 'Forum des habitants',    desc: 'Conseils carrière & entraide' },
              { href: '/annonces-biguglia',     emoji: '📦', title: 'Petites annonces',       desc: 'Achat, vente, dons entre voisins' },
              { href: '/coups-de-main',         emoji: '🤝', title: 'Coups de main',          desc: 'Entraide et petits services' },
              { href: '/communaute',            emoji: '🏘️', title: 'Communauté',             desc: 'Membres actifs de Biguglia' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-colors flex items-center gap-3">
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

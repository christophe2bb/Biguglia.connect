/**
 * Page : /communaute — Dynamique communautaire de Biguglia Connect
 *
 * Architecture SSR : fetches côté serveur → composant client pour interactivité.
 * Sections :
 *   • Hero + stats globales (vivantes)
 *   • Artisans les mieux notés (qualité > quantité)
 *   • Derniers coups de main résolus
 *   • Guide des badges (transparent, lisible)
 *   • CTA rejoindre la communauté
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield, Star, Heart, Users, Trophy, Sparkles,
  ArrowRight, CheckCircle, Calendar, MessageSquare, Handshake,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import {
  fetchCommunityStats,
  fetchTopArtisans,
  fetchRecentHelpers,
  fetchActiveMembersSpotlight,
  fetchRecentEvents,
} from '@/services/community/queries';
import { BADGE_CONFIG } from '@/lib/trust';
import type { BadgeCode } from '@/lib/trust';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Communauté Biguglia Connect — Membres, Badges & Entraide Locale',
  description: 'Découvrez les membres actifs de Biguglia Connect : artisans vérifiés, voisins solidaires, contributeurs locaux. Système de badges transparent basé sur la qualité, pas la quantité.',
  alternates: { canonical: `${SITE_URL}/communaute` },
  openGraph: {
    title: 'Communauté Biguglia Connect',
    description: 'Membres actifs, artisans vérifiés, badges de confiance et entraide locale.',
    url: `${SITE_URL}/communaute`,
  },
};

// ─── Badge Pill ───────────────────────────────────────────────────────────────

function BadgePill({ code }: { code: string }) {
  const cfg = BADGE_CONFIG[code as BadgeCode];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-current/15 ${cfg.bg} ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Stat bloc ────────────────────────────────────────────────────────────────

function StatBlock({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: number | string; label: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function CommunautePage() {
  // Fetch en parallèle
  const [stats, artisans, helpers, members, events] = await Promise.allSettled([
    fetchCommunityStats(),
    fetchTopArtisans(6),
    fetchRecentHelpers(6),
    fetchActiveMembersSpotlight(8),
    fetchRecentEvents(4),
  ]);

  const st = stats.status === 'fulfilled' ? stats.value : { totalMembers: 0, totalHelps: 0, totalEvents: 0, totalListings: 0, totalForumTopics: 0, activeThisWeek: 0 };
  const ar = artisans.status === 'fulfilled' ? artisans.value : [];
  const he = helpers.status === 'fulfilled' ? helpers.value : [];
  const me = members.status === 'fulfilled' ? members.value : [];
  const _ev = events.status === 'fulfilled' ? events.value : [];

  // Badges à expliquer (par famille)
  const badgeFamilies: Array<{
    title: string;
    emoji: string;
    description: string;
    codes: BadgeCode[];
  }> = [
    {
      title: 'Confiance & Vérification',
      emoji: '🛡️',
      description: 'Basés sur la vérification de l\'identité et l\'ancienneté du compte.',
      codes: ['admin_validated', 'email_verified', 'phone_verified', 'veteran', 'profile_complete'],
    },
    {
      title: 'Qualité & Réputation',
      emoji: '⭐',
      description: 'Obtenus grâce aux avis reçus et aux interactions réussies.',
      codes: ['top_rated', 'trusted_member', 'reliable_profile', 'fast_responder'],
    },
    {
      title: 'Contribution locale',
      emoji: '🌍',
      description: 'Récompensent la participation active et utile à la communauté.',
      codes: ['local_contributor', 'solidarity_neighbor', 'active_organizer', 'active_member'],
    },
    {
      title: 'Excellence communautaire',
      emoji: '🏛️',
      description: 'Badges rares pour les membres les plus engagés et fiables sur le long terme.',
      codes: ['community_pillar', 'welcome_ambassador', 'reliable_helper', 'reliable_vendor'],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-5 py-2 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-bold">
              {st.totalMembers > 0 ? `${st.totalMembers} membres actifs` : 'Communauté vivante'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            La communauté<br />
            <span className="text-orange-300">Biguglia Connect</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Artisans vérifiés, voisins solidaires, organisateurs actifs.
            Chaque membre contribue à rendre Biguglia plus vivante.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/inscription"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-black px-6 py-3 rounded-2xl hover:bg-brand-50 transition-all shadow-lg text-sm">
              <Sparkles className="w-4 h-4" />
              Rejoindre gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/artisans"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white/90 font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition-all text-sm">
              Voir les artisans
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS GLOBALES
      ══════════════════════════════════════════════════════ */}
      {st.totalMembers > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBlock icon={Users}        value={st.totalMembers}    label="Membres"        color="bg-brand-500" />
            <StatBlock icon={Heart}        value={st.totalHelps}      label="Aides résolues"  color="bg-emerald-500" />
            <StatBlock icon={MessageSquare} value={st.totalForumTopics} label="Discussions"    color="bg-sky-500" />
            <StatBlock icon={Calendar}     value={st.totalEvents}     label="Événements"     color="bg-violet-500" />
          </div>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ══════════════════════════════════════════════════════
            ARTISANS DE CONFIANCE
        ══════════════════════════════════════════════════════ */}
        {ar.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-black text-gray-900">Artisans de confiance</h2>
                </div>
                <p className="text-sm text-gray-500">Vérifiés manuellement · Avis réels · Engagement local</p>
              </div>
              <Link href="/artisans"
                className="flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700">
                Voir tous <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ar.map(artisan => (
                <Link key={artisan.id} href={`/artisans/${artisan.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all hover:-translate-y-0.5 group h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar src={artisan.avatar_url} name={artisan.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {artisan.business_name ?? artisan.full_name}
                        </p>
                        {artisan.trade_name && (
                          <p className="text-xs text-gray-500">{artisan.trade_name}</p>
                        )}
                      </div>
                    </div>

                    {artisan.avg_rating > 0 ? (
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(artisan.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-amber-600">{artisan.avg_rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({artisan.review_count} avis)</span>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold mb-2">✅ Artisan vérifié</p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {artisan.badges.slice(0, 2).map(b => <BadgePill key={b} code={b} />)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            COUPS DE MAIN RÉSOLUS
        ══════════════════════════════════════════════════════ */}
        {he.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Handshake className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-black text-gray-900">Derniers coups de main résolus</h2>
                </div>
                <p className="text-sm text-gray-500">Des voisins qui ont demandé de l&apos;aide — et l&apos;ont reçue</p>
              </div>
              <Link href="/coups-de-main"
                className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {he.map((helper, i) => {
                const date = new Date(helper.solved_at);
                const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
                const when = diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? 'hier' : `il y a ${diffDays}j`;
                return (
                  <div key={helper.id}
                    className={`flex items-start gap-4 p-4 ${i < he.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{helper.title}</p>
                      {helper.author && (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar src={helper.author.avatar_url} name={helper.author.full_name} size="xs" />
                          <p className="text-xs text-gray-500">
                            Résolu par <span className="font-semibold text-emerald-700">{helper.author.full_name}</span>
                            <span className="mx-1">·</span>{when}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            MEMBRES ACTIFS
        ══════════════════════════════════════════════════════ */}
        {me.length > 0 && (
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-sky-500" />
                <h2 className="text-xl font-black text-gray-900">Membres de la communauté</h2>
              </div>
              <p className="text-sm text-gray-500">Ceux qui font vivre Biguglia Connect au quotidien</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {me.map(member => (
                <div key={member.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center gap-2">
                  <Avatar src={member.avatar_url} name={member.full_name} size="lg" />
                  <p className="font-bold text-gray-900 text-sm">{member.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {member.role === 'artisan_verified' ? '🔧 Artisan vérifié' :
                     member.role === 'moderator' ? '🛡️ Modérateur' : '🏡 Habitant'}
                  </p>
                  {member.badge_codes.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {member.badge_codes.slice(0, 2).map(b => <BadgePill key={b} code={b} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            GUIDE DES BADGES — TRANSPARENT, LISIBLE
        ══════════════════════════════════════════════════════ */}
        <section>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 mb-3">
              <Shield className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-black text-brand-700">Système de badges transparent</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Comment fonctionnent les badges ?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
              Les badges récompensent la <strong>qualité</strong>, pas la quantité.
              Ils sont attribués automatiquement par le système ou manuellement par l&apos;équipe.
              <br />Critères clairs, zéro mystère.
            </p>
          </div>

          {/* Principes clés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { emoji: '✅', title: 'Qualité avant quantité', desc: 'On valorise des aides concrètes et des avis positifs, pas le nombre de publications.' },
              { emoji: '🔍', title: 'Critères transparents', desc: 'Chaque badge a une description claire. Vous savez exactement comment l\'obtenir.' },
              { emoji: '⚖️', title: 'Attribution équitable', desc: 'Le système calcule automatiquement sans favoritisme. Les badges admin sont clairement marqués.' },
            ].map(p => (
              <div key={p.emoji} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="text-2xl mb-2">{p.emoji}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Familles de badges */}
          <div className="space-y-6">
            {badgeFamilies.map(family => (
              <div key={family.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{family.emoji}</span>
                    <div>
                      <h3 className="font-black text-gray-900 text-sm">{family.title}</h3>
                      <p className="text-xs text-gray-500">{family.description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {family.codes.map(code => {
                    const cfg = BADGE_CONFIG[code];
                    if (!cfg) return null;
                    return (
                      <div key={code} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} border-current/10`}>
                        <span className="text-lg flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                        <div>
                          <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cfg.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-orange-700 rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <div className="text-4xl mb-4">🏘️</div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Faites partie de la communauté
            </h2>
            <p className="text-white/80 text-sm max-w-lg mx-auto leading-relaxed mb-6">
              Chaque membre qui participe rend Biguglia plus vivante.
              Votre contribution — même petite — compte vraiment.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/inscription"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-black px-8 py-3 rounded-2xl hover:bg-brand-50 transition-all shadow-lg text-sm">
                <Sparkles className="w-4 h-4" />
                Rejoindre gratuitement
              </Link>
              <Link href="/coups-de-main"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition-all text-sm">
                <Heart className="w-4 h-4" />
                Offrir un coup de main
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

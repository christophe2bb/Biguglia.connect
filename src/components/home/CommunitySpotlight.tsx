// ─────────────────────────────────────────────────────────────────────────────
// CommunitySpotlight — Section communautaire de la page d'accueil
// Affiche : artisans top notés · derniers coups de main · membres actifs · stats
//
// Architecture : Server Component pur — props passées depuis la page SSR.
// Aucun appel Supabase ici, aucun 'use client'.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ArrowRight, Star, Heart, Users, MessageSquare, Trophy, Handshake, Calendar } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type {
  CommunityStats,
  SpotlightArtisan,
  SpotlightHelper,
  SpotlightMember,
  SpotlightEvent,
} from '@/services/community/queries';
import { BADGE_CONFIG } from '@/lib/trust';
import type { BadgeCode } from '@/lib/trust';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommunitySpotlightProps {
  stats:    CommunityStats;
  artisans: SpotlightArtisan[];
  helpers:  SpotlightHelper[];
  members:  SpotlightMember[];
  events:   SpotlightEvent[];
}

// ─── Badge mini ───────────────────────────────────────────────────────────────

function TinyBadge({ code }: { code: string }) {
  const cfg = BADGE_CONFIG[code as BadgeCode];
  if (!cfg) return null;
  return (
    <span
      title={cfg.description}
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-current/15 ${cfg.bg} ${cfg.color}`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Stat Counter ─────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label, color }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-lg font-black text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Artisan Card ─────────────────────────────────────────────────────────────

function ArtisanCard({ artisan }: { artisan: SpotlightArtisan }) {
  return (
    <Link href={`/artisans/${artisan.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-[color,border-color,box-shadow,transform] hover:-translate-y-0.5 group">
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={artisan.avatar_url} name={artisan.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">
              {artisan.business_name ?? artisan.full_name}
            </p>
            {artisan.trade_name && (
              <p className="text-xs text-gray-500 truncate">{artisan.trade_name}</p>
            )}
          </div>
        </div>

        {/* Rating */}
        {artisan.avg_rating > 0 ? (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-3 h-3 ${s <= Math.round(artisan.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
            <span className="text-xs font-bold text-amber-600">{artisan.avg_rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({artisan.review_count})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs text-emerald-600 font-semibold">✅ Artisan vérifié</span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {artisan.badges.slice(0, 2).map(b => <TinyBadge key={b} code={b} />)}
        </div>
      </div>
    </Link>
  );
}

// ─── Helper Row ───────────────────────────────────────────────────────────────

function HelperRow({ helper }: { helper: SpotlightHelper }) {
  const date = new Date(helper.solved_at);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const when = diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? 'hier' : `il y a ${diffDays}j`;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <Heart className="w-3.5 h-3.5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{helper.title}</p>
        {helper.author && (
          <p className="text-xs text-gray-500 mt-0.5">
            Résolu par <span className="font-semibold text-emerald-700">{helper.author.full_name}</span> · {when}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Member Avatar Row ────────────────────────────────────────────────────────

function MemberRow({ member }: { member: SpotlightMember }) {
  const roleLabel =
    member.role === 'artisan_verified' ? '🔧 Artisan vérifié' :
    member.role === 'moderator'        ? '🛡️ Modérateur' :
                                         '🏡 Habitant';
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
      <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{member.full_name}</p>
        <p className="text-xs text-gray-500">{roleLabel}</p>
      </div>
      {member.badge_codes.slice(0, 1).map(b => <TinyBadge key={b} code={b} />)}
    </div>
  );
}

// ─── Event Mini Card ──────────────────────────────────────────────────────────

function EventMini({ event }: { event: SpotlightEvent }) {
  const dateObj = new Date(event.event_date);
  const dayNum  = dateObj.getDate();
  const month   = dateObj.toLocaleDateString('fr-FR', { month: 'short' });

  return (
    <Link href={`/evenements/${event.id}`}>
      <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors group">
        <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-violet-500 uppercase">{month}</span>
          <span className="text-sm font-black text-violet-700 leading-none">{dayNum}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
            {event.title}
          </p>
          {event.location && (
            <p className="text-xs text-gray-500 truncate">{event.location}</p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CommunitySpotlight({
  stats, artisans, helpers, members, events,
}: CommunitySpotlightProps) {
  // N'afficher la section que si on a du contenu
  const hasContent = artisans.length > 0 || helpers.length > 0 || members.length > 0;
  if (!hasContent && stats.totalMembers === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* ── En-tête de section ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-emerald-700">Communauté vivante</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            Vos voisins qui font vivre Biguglia
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Artisans de confiance, entraide locale, événements portés par la communauté.
          </p>
        </div>
        <Link href="/communaute/artisans"
          className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
          Voir tout <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Stats globales ── */}
      {stats.totalMembers > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatPill icon={Users}        value={stats.totalMembers}    label="Membres"            color="bg-brand-500" />
          <StatPill icon={Heart}        value={stats.totalHelps}      label="Aides résolues"     color="bg-emerald-500" />
          <StatPill icon={MessageSquare} value={stats.totalForumTopics} label="Discussions"      color="bg-sky-500" />
          <StatPill icon={Calendar}     value={stats.totalEvents}     label="Événements"         color="bg-violet-500" />
        </div>
      )}

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne 1 — Artisans top notés */}
        {artisans.length > 0 && (
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Artisans de confiance</h3>
            </div>
            <div className="space-y-2">
              {artisans.slice(0, 3).map(a => <ArtisanCard key={a.id} artisan={a} />)}
            </div>
            <Link href="/artisans"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors">
              Voir tous les artisans <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Colonne 2 — Coups de main résolus + Membres */}
        <div className={artisans.length > 0 ? 'lg:col-span-1' : 'lg:col-span-2'}>

          {/* Coups de main */}
          {helpers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Derniers coups de main</h3>
                </div>
                <Link href="/coups-de-main" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Voir <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                {helpers.slice(0, 4).map(h => <HelperRow key={h.id} helper={h} />)}
              </div>
            </div>
          )}

          {/* Membres actifs */}
          {members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Membres récents</h3>
              </div>
              <div>
                {members.slice(0, 4).map(m => <MemberRow key={m.id} member={m} />)}
              </div>
            </div>
          )}
        </div>

        {/* Colonne 3 — Événements + CTA communauté */}
        <div className={artisans.length > 0 ? 'lg:col-span-1' : 'lg:col-span-1'}>

          {/* Événements à venir */}
          {events.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">À venir</h3>
                </div>
                <Link href="/evenements" className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                  Agenda <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                {events.map(e => <EventMini key={e.id} event={e} />)}
              </div>
            </div>
          )}

          {/* CTA rejoindre la communauté */}
          <div className="bg-gradient-to-br from-brand-600 to-orange-600 rounded-2xl p-5 text-white">
            <div className="text-2xl mb-2">🏘️</div>
            <h3 className="font-black text-lg leading-tight mb-1">Faites partie de la communauté</h3>
            <p className="text-white/80 text-xs leading-relaxed mb-4">
              Votre participation rend Biguglia plus vivante pour tout le monde.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/inscription"
                className="flex items-center justify-center gap-2 bg-white text-brand-700 font-black text-sm px-4 py-2.5 rounded-xl hover:bg-brand-50 transition-colors">
                Rejoindre gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/communaute/artisans"
                className="flex items-center justify-center gap-2 text-white/90 border border-white/30 font-semibold text-xs px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                Explorer la communauté
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

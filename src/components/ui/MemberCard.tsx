import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, Star, ExternalLink, Wrench, Search } from 'lucide-react';

export interface ThemeMember {
  id: string;            // membership id
  user_id: string;
  joined_at: string;
  profile: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
  theme_profile?: {
    bio?: string | null;
    tags?: string[] | null;
    level?: string | null;
    looking_for?: string | null;
    offering?: string | null;
    location_zone?: string | null;
  } | null;
}

interface MemberCardProps {
  member: ThemeMember;
  currentUserId?: string | null;
  /** themeSlug est utilisé comme sourceId pour isoler les conversations par thème */
  themeSlug: string;
  themeLabel: string;
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  'débutant':      { bg: 'bg-sky-50',    text: 'text-sky-700',    icon: '🌱' },
  'intermédiaire': { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: '⚡' },
  'avancé':        { bg: 'bg-violet-50', text: 'text-violet-700', icon: '🔥' },
  'expert':        { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: '🏆' },
};

export default function MemberCard({
  member,
  currentUserId,
  themeSlug,
  themeLabel,
}: MemberCardProps) {
  const profile = member.profile;
  const tp = member.theme_profile;
  const name = profile?.full_name ?? 'Membre';
  const isMe = currentUserId === member.user_id;

  const levelKey = (tp?.level ?? '').toLowerCase();
  const levelStyle = LEVEL_STYLES[levelKey] ?? null;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-2xl border shadow-sm flex flex-col gap-0 overflow-hidden',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        isMe
          ? 'border-brand-300 ring-2 ring-brand-200'
          : 'border-gray-100 hover:border-gray-200',
      )}
    >
      {/* Top colour stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 group-hover:from-teal-500 group-hover:to-sky-500 transition-colors" />

      <div className="p-4 flex flex-col gap-3">
        {/* Header : avatar + name + badges */}
        <div className="flex items-start gap-3">
          <Link href={`/profil/${member.user_id}`} className="flex-shrink-0">
            <Avatar
              src={profile?.avatar_url}
              name={name}
              size="lg"
              className="ring-2 ring-white shadow-sm group-hover:ring-brand-200 transition"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <Link href={`/profil/${member.user_id}`} className="hover:text-brand-700 transition min-w-0">
                <p className="font-bold text-gray-900 truncate leading-tight">{name}</p>
              </Link>
              {isMe && (
                <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-1">
                  Vous
                </span>
              )}
            </div>

            {/* Level badge */}
            {levelStyle && tp?.level && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1',
                levelStyle.bg, levelStyle.text
              )}>
                {levelStyle.icon} {tp.level}
              </span>
            )}

            {!levelStyle && tp?.level && (
              <p className="text-xs text-purple-600 font-medium flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3" />
                {tp.level}
              </p>
            )}

            {/* Join date */}
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              Membre depuis {formatJoinDate(member.joined_at)}
            </p>
          </div>
        </div>

        {/* Bio */}
        {tp?.bio && (
          <p className="text-sm text-gray-600 line-clamp-2 italic bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
            &ldquo;{tp.bio}&rdquo;
          </p>
        )}

        {/* Tags */}
        {tp?.tags && tp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tp.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full transition cursor-default"
              >
                #{tag}
              </span>
            ))}
            {tp.tags.length > 4 && (
              <span className="text-[11px] text-gray-400 px-1 py-0.5">
                +{tp.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Offer / Looking-for pills */}
        {(tp?.offering || tp?.looking_for) && (
          <div className="space-y-1.5">
            {tp?.offering && (
              <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1.5 leading-snug">
                <Wrench className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{tp.offering}</span>
              </div>
            )}
            {tp?.looking_for && (
              <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-1.5 leading-snug">
                <Search className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{tp.looking_for}</span>
              </div>
            )}
          </div>
        )}

        {/* Location zone */}
        {tp?.location_zone && (
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {tp.location_zone}
          </p>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-50 flex gap-2 mt-auto">
          <Link
            href={`/profil/${member.user_id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Profil
          </Link>
          {!isMe && (
            <ContactButton
              sourceType="community"
              sourceId={themeSlug}
              sourceTitle={`Communauté ${themeLabel}`}
              ownerId={member.user_id}
              userId={currentUserId ?? undefined}
              size="sm"
              ctaLabel="Message"
              prefillMsg={`👋 Bonjour ! Je vous contacte depuis la communauté ${themeLabel}.`}
              className="flex-1 justify-center"
            />
          )}
        </div>
      </div>
    </div>
  );
}

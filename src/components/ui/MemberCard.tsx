'use client';

import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, Star } from 'lucide-react';

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
  themeSlug: string;
  themeLabel: string;
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

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

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3',
      'hover:shadow-md hover:border-brand-200 transition-all',
      isMe && 'ring-2 ring-brand-300'
    )}>
      {/* Header: avatar + nom */}
      <div className="flex items-start gap-3">
        <Avatar src={profile?.avatar_url} name={name} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          {tp?.level && (
            <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              {tp.level}
            </p>
          )}
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            Membre depuis {formatJoinDate(member.joined_at)}
          </p>
        </div>
        {isMe && (
          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
            Vous
          </span>
        )}
      </div>

      {/* Bio */}
      {tp?.bio && (
        <p className="text-sm text-gray-600 line-clamp-2 italic">"{tp.bio}"</p>
      )}

      {/* Tags */}
      {tp?.tags && tp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tp.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
          {tp.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{tp.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Offre / Cherche */}
      <div className="space-y-1">
        {tp?.offering && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 line-clamp-1">
            💚 Offre : {tp.offering}
          </p>
        )}
        {tp?.looking_for && (
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1 line-clamp-1">
            🔍 Cherche : {tp.looking_for}
          </p>
        )}
      </div>

      {/* Zone */}
      {tp?.location_zone && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {tp.location_zone}
        </p>
      )}

      {/* Action: contacter */}
      {!isMe && (
        <div className="pt-1 border-t border-gray-50">
          <ContactButton
            sourceType="general"
            sourceId={null}
            sourceTitle={`${themeLabel} — ${name}`}
            ownerId={member.user_id}
            userId={currentUserId ?? undefined}
            size="sm"
            ctaLabel="Envoyer un message"
            className="w-full justify-center"
          />
        </div>
      )}
    </div>
  );
}

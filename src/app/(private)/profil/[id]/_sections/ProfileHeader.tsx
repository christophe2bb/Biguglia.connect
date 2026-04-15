'use client';

import Link from 'next/link';
import { ArrowLeft, MapPin, Shield, CheckCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';
import { UserRatingBadge } from '@/components/ui/RatingWidget';
import { TrustScoreMini, useTrustData } from '@/components/ui/TrustScore';
import { ROLE_LABELS } from '@/lib/utils';
import { type PublicProfile, memberSince } from '../_types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: PublicProfile;
  isMe: boolean;
  meId?: string;
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileHeader({ profile, isMe, meId, onBack }: Props) {
  const { stats: trustStats, badges: trustBadges } = useTrustData(profile.id);

  return (
    <div className="bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500 text-white">
      {/* Back button row */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>

      {/* Identity row */}
      <div className="max-w-3xl mx-auto px-4 pb-8 pt-2">
        <div className="flex items-end gap-5">

          {/* Avatar + role badge overlay */}
          <div className="relative shrink-0">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name || profile.email || '?'}
              size="xl"
              className="ring-4 ring-white/40 shadow-lg"
            />
            {profile.role === 'admin' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow">
                <Shield className="w-3.5 h-3.5 text-yellow-900" />
              </div>
            )}
            {profile.role === 'artisan_verified' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow">
                <CheckCircle className="w-3.5 h-3.5 text-green-900" />
              </div>
            )}
          </div>

          {/* Name, location, role badges, trust */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">
              {profile.full_name || 'Utilisateur'}
            </h1>
            {profile.city && (
              <p className="flex items-center gap-1 text-white/80 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {profile.city}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs">
                Membre depuis {memberSince(profile.created_at)}
              </span>
              {profile.status === 'suspended' && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/80 text-xs font-semibold">
                  Suspendu
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <UserRatingBadge userId={profile.id} />
              <TrustScoreMini
                profile={profile}
                stats={trustStats}
                badges={trustBadges}
                className="text-white/90 bg-white/10"
              />
            </div>
          </div>

          {/* CTA */}
          {!isMe && meId && (
            <ContactButton
              sourceType="general"
              sourceId={profile.id}
              sourceTitle={profile.full_name ?? 'Membre'}
              ownerId={profile.id}
              userId={meId}
              ctaLabel="Message"
              prefillMsg={`Bonjour ${profile.full_name?.split(' ')[0] ?? ''}, je vous contacte via Biguglia Connect.`}
              className="shrink-0"
            />
          )}
          {isMe && (
            <Link
              href="/profil"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
            >
              Modifier mon profil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

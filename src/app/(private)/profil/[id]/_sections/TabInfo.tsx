'use client';

import Link from 'next/link';
import { Mail, Phone, Calendar, MapPin, Star, PartyPopper, ExternalLink } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import { ROLE_LABELS } from '@/lib/utils';
import { type PublicProfile, formatDate } from '../_types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: PublicProfile;
  totalEvents: number;
  upcomingCount: number;
  isMe: boolean;
  canSeeContact: boolean;
  meId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TabInfo({
  profile,
  totalEvents,
  upcomingCount,
  isMe,
  canSeeContact,
  meId,
}: Props) {
  return (
    <div className="space-y-4">

      {/* Bio */}
      {profile.bio && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-sm mb-2">À propos</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Contact details — visible to self or admin only */}
      {canSeeContact && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Coordonnées</h2>
          {profile.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${profile.email}`} className="hover:text-purple-600 transition-colors">
                {profile.email}
              </a>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${profile.phone}`} className="hover:text-purple-600 transition-colors">
                {profile.phone}
              </a>
            </div>
          )}
          {!profile.email && !profile.phone && (
            <p className="text-gray-400 text-sm">Aucune coordonnée renseignée.</p>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-purple-600">{totalEvents}</div>
          <div className="text-xs text-gray-500 mt-0.5">Événements organisés</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-pink-600">{upcomingCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">À venir</div>
        </div>
      </div>

      {/* Member info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-700 text-sm mb-3">Informations</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Membre depuis
            </span>
            <span className="font-medium text-gray-700">{formatDate(profile.created_at)}</span>
          </div>
          {profile.city && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Localisation
              </span>
              <span className="font-medium text-gray-700">{profile.city}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Star className="w-4 h-4" /> Rôle
            </span>
            <span className="font-medium text-gray-700">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* See also links */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-700 text-sm mb-3">Voir aussi</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/communaute/evenements/membre/${profile.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-xs font-semibold hover:bg-pink-100 transition-colors"
          >
            <PartyPopper className="w-3.5 h-3.5" /> Profil Événements
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
          {!isMe && meId && (
            <ContactButton
              sourceType="general"
              sourceId={profile.id}
              sourceTitle={profile.full_name ?? 'Membre'}
              ownerId={profile.id}
              userId={meId}
              ctaLabel="Envoyer un message"
              prefillMsg={`Bonjour ${profile.full_name?.split(' ')[0] ?? ''}, je vous contacte via Biguglia Connect.`}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

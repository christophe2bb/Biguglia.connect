'use client';

import Link from 'next/link';
import { ChevronRight, Flag, User } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { computeTrustScore } from '@/lib/moderation';
import { Section } from './Section';
import type { QueueDetail, AuthorStats } from '../_types';

interface Props {
  item: QueueDetail;
  authorStats: AuthorStats | null;
}

export function AuthorPanel({ item, authorStats }: Props) {
  const trust = computeTrustScore({
    created_at:        item.author?.created_at || new Date().toISOString(),
    role:              item.author?.role || 'resident',
    avatar_url:        item.author?.avatar_url,
    phone:             item.author?.phone,
    publication_count: item.author?.publication_count,
    reports_received:  item.author?.reports_received,
    trust_level:       item.author?.trust_level,
  });

  const reportsCount = item.author?.reports_received ?? 0;

  return (
    <Section title="Profil auteur" icon={User}>
      <div className="space-y-4">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3">
          <Avatar
            src={item.author?.avatar_url}
            name={item.author?.full_name || '?'}
            size="md"
          />
          <div>
            <p className="font-semibold text-gray-900">
              {item.author?.full_name || 'Inconnu'}
            </p>
            <p className="text-xs text-gray-500">
              Membre depuis{' '}
              {item.author?.created_at
                ? new Date(item.author.created_at).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year:  'numeric',
                  })
                : '?'}
            </p>
          </div>
        </div>

        {/* Score de confiance */}
        <div className={`rounded-xl border p-3 ${trust.bg} border-${trust.color.split('-')[1]}-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-bold ${trust.color}`}>
              {trust.emoji} {trust.label}
            </span>
            <span className={`text-lg font-black ${trust.color}`}>{trust.score}/100</span>
          </div>
          <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full bg-current rounded-full" style={{ width: `${trust.score}%` }} />
          </div>
          <div className="mt-2 space-y-0.5">
            {trust.badges.slice(0, 3).map((b, i) => (
              <p key={i} className={`text-[10px] ${trust.color} opacity-80`}>{b}</p>
            ))}
          </div>
        </div>

        {/* Stats publications */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Publications', value: authorStats?.total   ?? item.author?.publication_count ?? 0, alert: false },
            { label: 'En attente',   value: authorStats?.pending ?? 0,  alert: false },
            { label: 'Refusées',     value: authorStats?.refused ?? 0,  alert: (authorStats?.refused ?? 0) > 2 },
          ].map(({ label, value, alert }) => (
            <div
              key={label}
              className={`text-center p-2 rounded-xl border ${
                alert ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <p className={`text-lg font-black ${alert ? 'text-red-700' : 'text-gray-900'}`}>
                {value}
              </p>
              <p className="text-[10px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Signalements */}
        {reportsCount > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
            <Flag className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-700">
              {reportsCount} signalement{reportsCount > 1 ? 's' : ''} reçu{reportsCount > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Lien profil admin */}
        <Link
          href="/admin/utilisateurs"
          className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
        >
          <span>Voir le profil complet</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </Section>
  );
}

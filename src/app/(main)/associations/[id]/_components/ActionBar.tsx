'use client';

import Link from 'next/link';
import { Calendar, MessageSquare } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import { getCtaLabel } from '../_config';
import type { Association } from '../_types';

type Props = {
  asso: Association;
  userId: string | undefined;
};

/**
 * Sticky action bar shown to non-author visitors.
 * Renders the primary CTA, optional secondary CTAs, and links to Events/Forum.
 */
export function ActionBar({ asso, userId }: Props) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center justify-between">

        {/* Contact buttons */}
        <div className="flex flex-wrap gap-2">
          <ContactButton
            sourceType="association"
            sourceId={asso.id}
            sourceTitle={asso.name}
            ownerId={asso.author_id}
            userId={userId}
            size="sm"
            ctaLabel={getCtaLabel(asso.pub_type)}
          />

          {(asso.is_accepting_members || asso.needs.includes('Nouveaux adhérents')) &&
            asso.pub_type !== 'adherents' && (
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={userId}
                size="sm"
                ctaLabel="👥 Rejoindre"
              />
            )}

          {(asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')) &&
            asso.pub_type !== 'benevoles' && (
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={userId}
                size="sm"
                ctaLabel="🙋 Je veux aider"
              />
            )}
        </div>

        {/* Quick navigation links */}
        <div className="flex gap-2">
          <Link
            href={`/evenements?q=${encodeURIComponent(asso.name)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Événements
          </Link>
          <Link
            href={`/forum?q=${encodeURIComponent(asso.name)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Forum
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BadgeCheck, Calendar, Shield, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import type { CollectionItem } from '@/lib/collectionneurs-config';

interface Props {
  author: NonNullable<CollectionItem['author']>;
  showContact?: boolean;
}

export function SellerTrustBlock({ author, showContact }: Props) {
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_user_id', author.id)
        .eq('moderation_status', 'visible');
      if (data && data.length > 0) {
        const avg = data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
        setStats({ avg: Math.round(avg * 10) / 10, count: data.length });
      }
    };
    load();
  }, [author.id, supabase]);

  const memberSince = author.created_at
    ? new Date(author.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" /> Vendeur / Membre
      </h3>

      {/* Avatar + nom */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/profil/${author.id}`}>
          <Avatar src={author.avatar_url} name={author.full_name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profil/${author.id}`}
            className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {author.full_name}
          </Link>
          {memberSince && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Membre depuis {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* Stats confiance */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats && stats.count > 0 ? (
          <div className="text-center p-2 bg-amber-50 rounded-xl">
            <div className="text-lg font-black text-amber-700">{stats.avg}⭐</div>
            <div className="text-xs text-gray-500">{stats.count} avis</div>
          </div>
        ) : (
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-400">Nouveau</div>
            <div className="text-xs text-gray-400">membre</div>
          </div>
        )}
        <div className="text-center p-2 bg-blue-50 rounded-xl">
          <div className="text-sm font-bold text-blue-700">Actif</div>
          <div className="text-xs text-gray-500">sur Biguglia</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
          <BadgeCheck className="w-3 h-3" /> E-mail vérifié
        </span>
        {stats && stats.count >= 5 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3" /> Vendeur actif
          </span>
        )}
      </div>

      {showContact && (
        <Link
          href={`/profil/${author.id}`}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
        >
          Voir le profil public →
        </Link>
      )}
    </div>
  );
}

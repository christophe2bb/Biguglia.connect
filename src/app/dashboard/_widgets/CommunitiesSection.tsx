'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { COMMUNITY_THEMES } from '../_constants';

interface Props { userId: string }

export default function CommunitiesSection({ userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [memberships, setMemberships] = useState<Array<{
    theme_slug: string; joined_at: string; status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('theme_memberships')
          .select('theme_slug, joined_at, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('joined_at', { ascending: false });
        setMemberships(data ?? []);
      } catch { /* silently ignore */ }
      setLoading(false);
    };
    load();
  }, [userId, supabase]);

  if (loading) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mes communautés</span>
          {memberships.length > 0 && (
            <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {memberships.length}
            </span>
          )}
        </div>
        <Link href="/communaute/collectionneurs" className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1">
          Explorer <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {memberships.length === 0 ? (
        /* CTA — join first community */
        <div className="bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏘️</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Rejoignez des communautés thématiques</p>
            <p className="text-xs text-gray-500 mt-0.5">Collectionneurs, Promenades, Événements, Associations…</p>
          </div>
          <Link
            href="/communaute/collectionneurs"
            className="flex-shrink-0 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-colors"
          >
            Découvrir
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {memberships.map((m) => {
            const conf = COMMUNITY_THEMES[m.theme_slug];
            if (!conf) return null;
            return (
              <Link key={m.theme_slug} href={`/communaute/${m.theme_slug}`}>
                <div className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 text-center',
                  conf.bg, conf.border
                )}>
                  <span className="text-2xl">{conf.emoji}</span>
                  <span className={cn('text-xs font-bold', conf.color)}>{conf.label}</span>
                  <span className="text-[10px] text-gray-400">
                    depuis {new Date(m.joined_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </Link>
            );
          })}
          {/* CTA to join more */}
          <Link href="/communaute/promenades">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center hover:bg-gray-100 transition-colors group">
              <span className="text-2xl opacity-40 group-hover:opacity-70 transition">+</span>
              <span className="text-xs font-bold text-gray-400">Rejoindre</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

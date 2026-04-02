'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CommunityJoinButtonProps {
  themeSlug: string;
  userId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onJoined?: () => void;
  onLeft?: () => void;
  className?: string;
}

export default function CommunityJoinButton({
  themeSlug,
  userId,
  size = 'md',
  onJoined,
  onLeft,
  className,
}: CommunityJoinButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('theme_memberships')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .eq('theme_slug', themeSlug)
      .eq('status', 'active')
      .then(({ count }) => {
        setIsMember((count ?? 0) > 0);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, themeSlug]);

  const sizeClasses = {
    sm:  'px-3 py-1.5 text-xs gap-1.5',
    md:  'px-4 py-2   text-sm gap-2',
    lg:  'px-5 py-2.5 text-base gap-2',
  };

  // Non connecté → redirection connexion
  if (!userId) {
    return (
      <button
        onClick={() => router.push('/connexion')}
        className={cn(
          'inline-flex items-center font-semibold rounded-xl border transition-all',
          'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-sm',
          sizeClasses[size],
          className
        )}
      >
        <UserPlus className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        Rejoindre
      </button>
    );
  }

  if (loading) {
    return (
      <div className={cn('inline-flex items-center text-gray-400', sizeClasses[size])}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('theme_memberships').insert({
        user_id: userId,
        theme_slug: themeSlug,
        status: 'active',
        visibility: 'public',
        allow_messages: true,
      });
      if (error && error.code !== '23505') throw error; // 23505 = déjà membre
      setIsMember(true);
      toast.success('Vous avez rejoint la communauté !');
      onJoined?.();
    } catch {
      toast.error('Impossible de rejoindre la communauté.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('theme_memberships')
        .delete()
        .eq('user_id', userId)
        .eq('theme_slug', themeSlug);
      if (error) throw error;
      setIsMember(false);
      toast.success('Vous avez quitté la communauté.');
      onLeft?.();
    } catch {
      toast.error('Impossible de quitter la communauté.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isMember) {
    return (
      <button
        onClick={handleLeave}
        disabled={submitting}
        className={cn(
          'inline-flex items-center font-semibold rounded-xl border transition-all group',
          'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
          sizeClasses[size],
          className
        )}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Users className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'group-hover:hidden')} />
            <UserMinus className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'hidden group-hover:block')} />
          </>
        )}
        <span className="group-hover:hidden">Membre ✓</span>
        <span className="hidden group-hover:inline">Quitter</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={submitting}
      className={cn(
        'inline-flex items-center font-semibold rounded-xl border transition-all shadow-sm',
        'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 active:scale-95',
        sizeClasses[size],
        className
      )}
    >
      {submitting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
      Rejoindre
    </button>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { REACTION_EMOJIS } from '../_config';

interface Props {
  targetId:      string;
  targetType:    'topic' | 'reply';
  currentUserId?: string;
}

export function ReactionPanel({ targetId, targetType, currentUserId }: Props) {
  const [reactions,  setReactions]  = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showPanel,  setShowPanel]  = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Load reactions ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const field = targetType === 'topic' ? 'topic_id' : 'reply_id';
      const { data } = await supabase
        .from('forum_reactions').select('emoji, user_id').eq(field, targetId);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((r: { emoji: string; user_id: string }) => {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (currentUserId && r.user_id === currentUserId) setMyReaction(r.emoji);
        });
        setReactions(counts);
      }
    };
    load();
  }, [targetId, targetType, currentUserId]);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleReaction = async (emoji: string) => {
    if (!currentUserId) { toast.error('Connectez-vous pour réagir'); return; }
    const supabase = createClient();
    const field = targetType === 'topic' ? 'topic_id' : 'reply_id';

    if (myReaction === emoji) {
      await supabase.from('forum_reactions').delete()
        .eq(field, targetId).eq('user_id', currentUserId).eq('emoji', emoji);
      setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 1) - 1) }));
      setMyReaction(null);
    } else {
      if (myReaction) {
        await supabase.from('forum_reactions').delete()
          .eq(field, targetId).eq('user_id', currentUserId).eq('emoji', myReaction);
        setReactions(prev => ({ ...prev, [myReaction]: Math.max(0, (prev[myReaction] || 1) - 1) }));
      }
      await supabase.from('forum_reactions').insert({ [field]: targetId, user_id: currentUserId, emoji });
      setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
      setMyReaction(emoji);
    }
    setShowPanel(false);
  };

  const topReactions = Object.entries(reactions)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-1 flex-wrap">
        {topReactions.map(([emoji, count]) => (
          <button key={emoji} onClick={() => toggleReaction(emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
              myReaction === emoji
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}>
            <span>{emoji}</span><span>{count}</span>
          </button>
        ))}
        <button onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
          <span>😊</span><span>+</span>
        </button>
      </div>

      {showPanel && (
        <div className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 flex gap-1 z-20">
          {REACTION_EMOJIS.map(r => (
            <button key={r.emoji} onClick={() => toggleReaction(r.emoji)} title={r.label}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-gray-100 transition-colors ${
                myReaction === r.emoji ? 'bg-brand-100 ring-2 ring-brand-300' : ''
              }`}>
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

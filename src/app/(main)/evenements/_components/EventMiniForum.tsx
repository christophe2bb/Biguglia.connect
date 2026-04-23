'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { EventComment } from '../_types';

interface Props {
  eventId: string;
  userId?: string;
  catColor: string;
  catBg: string;
  catBorder: string;
}

export default function EventMiniForum({ eventId, userId, catColor, catBg, catBorder }: Props) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [open, setOpen]           = useState(false);
  const [comments, setComments]   = useState<EventComment[]>([]);
  const [loading, setLoading]     = useState(false);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [count, setCount]         = useState<number | null>(null);
  const [tableOk, setTableOk]     = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('event_comments').select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) { setTableOk(false); }
        else { setTableOk(true); setCount(c ?? 0); }
      });
    return () => { cancelled = true; };
  }, [eventId, supabase]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_comments')
      .select('id, content, created_at, author:profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (!error) {
      setComments((data ?? []) as EventComment[]);
      setCount((data ?? []).length);
    }
    setLoading(false);
  }, [eventId, supabase]);

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from('event_comments')
      .insert({ event_id: eventId, author_id: userId, content: text.trim() });
    if (!error) { setText(''); await fetchComments(); }
    setSending(false);
  };

  if (tableOk === false) return null;

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      <button
        onClick={() => {
          const w = !open;
          setOpen(w);
          if (w) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
        }}
        className={cn(
          'flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg w-full transition-colors',
          open ? `${catBg} ${catColor} border ${catBorder}` : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
        )}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Discussion</span>
        {count !== null && count > 0 && (
          <span className={cn('text-xs font-black px-1.5 py-0.5 rounded-full', open ? 'bg-white/70' : 'bg-gray-200 text-gray-600')}>
            {count}
          </span>
        )}
        <span className="ml-auto text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2 italic">
              Soyez le premier à démarrer la discussion !
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white btn-gradient-violet-pink"
                  >
                    {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-xs font-bold text-gray-700 leading-tight">
                      {c.author?.full_name ?? 'Anonyme'}
                      <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userId ? (
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Votre message… (Entrée pour envoyer)"
                rows={2}
                className={cn(
                  'flex-1 text-xs rounded-lg border px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-colors bg-white text-gray-700 placeholder-gray-400',
                  catBorder,
                )}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className={cn(
                  'p-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40',
                  catBg, catColor, `border ${catBorder}`, 'hover:opacity-80',
                )}
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <Link href="/connexion" className="text-xs text-center text-purple-600 font-semibold py-1 hover:underline block">
              Connectez-vous pour participer →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

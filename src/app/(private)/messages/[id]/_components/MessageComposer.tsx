'use client';
/**
 * MessageComposer
 * Zone de saisie + bouton envoi + réponses rapides contextuelles.
 * Gère aussi les raccourcis clavier (Entrée pour envoyer).
 */

import { useState } from 'react';
import { Send, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getQuickReplies } from '../_utils';

interface MessageComposerProps {
  relatedType: string | null;
  sending: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onSend: (text: string) => void;
}

export function MessageComposer({
  relatedType, sending, inputRef, onSend,
}: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const handleSend = (text?: string) => {
    const content = (text ?? value).trim();
    if (!content || sending) return;
    if (!text) setValue('');
    setShowQuickReplies(false);
    onSend(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies = getQuickReplies(relatedType);

  return (
    <div>
      {/* Réponses rapides */}
      {showQuickReplies && (
        <div className="flex flex-wrap gap-1.5 mb-2 pb-1 overflow-x-auto">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              className="flex-shrink-0 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold hover:bg-brand-100 transition-colors border border-brand-200"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Barre de saisie */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        {/* Toggle réponses rapides */}
        <button
          onClick={() => setShowQuickReplies(v => !v)}
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
            showQuickReplies
              ? 'bg-brand-100 text-brand-600'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
          )}
          title="Réponses rapides"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Input */}
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              relatedType && relatedType !== 'general'
                ? 'Posez une question ou proposez quelque chose…'
                : 'Écrivez votre message…'
            }
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            disabled={sending}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
          />
          {sending && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
        </div>

        {/* Bouton envoi */}
        <button
          onClick={() => handleSend()}
          disabled={!value.trim() || sending}
          className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

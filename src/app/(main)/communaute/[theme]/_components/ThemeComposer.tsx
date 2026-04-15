'use client';

import { Loader2, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface ThemeComposerProps {
  avatarUrl?: string | null;
  fullName: string;
  newMessage: string;
  sendingMsg: boolean;
  onMessageChange: (v: string) => void;
  onSend: () => void;
}

export default function ThemeComposer({
  avatarUrl,
  fullName,
  newMessage,
  sendingMsg,
  onMessageChange,
  onSend,
}: ThemeComposerProps) {
  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
      <div className="flex gap-2">
        <Avatar src={avatarUrl} name={fullName} size="sm" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Partagez avec la communauté… (Entrée pour envoyer)"
            rows={2}
            maxLength={500}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim() || sendingMsg}
            className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
          >
            {sendingMsg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 ml-9">
        {newMessage.length}/500 · Shift+Entrée pour sauter une ligne
      </p>
    </div>
  );
}

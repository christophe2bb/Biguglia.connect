'use client';

import { useState, useRef, useEffect } from 'react';
import { Flag, X, Loader2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Link from 'next/link';

export type ReportTargetType =
  | 'user'
  | 'post'
  | 'listing'
  | 'equipment'
  | 'message'
  | 'event'
  | 'promenade'
  | 'outing'
  | 'association'
  | 'lost_found'
  | 'collection_item'
  | 'help_request';

const REPORT_REASONS: { value: string; label: string; emoji: string }[] = [
  { value: 'fake',       label: 'Fausse annonce / fake',       emoji: '🤥' },
  { value: 'spam',       label: 'Spam ou contenu répété',       emoji: '📢' },
  { value: 'insulte',    label: 'Insulte / propos irrespectueux', emoji: '😡' },
  { value: 'arnaque',    label: 'Arnaque / tentative de fraude', emoji: '⚠️' },
  { value: 'interdit',   label: 'Contenu interdit / illégal',   emoji: '🚫' },
  { value: 'hors_sujet', label: 'Hors sujet / mauvaise catégorie', emoji: '📂' },
  { value: 'autre',      label: 'Autre raison',                 emoji: '💬' },
];

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Texte court décrivant ce qui est signalé (pour l'admin) */
  targetTitle?: string;
  /** Variante d'affichage */
  variant?: 'icon' | 'text' | 'mini';
  className?: string;
}

export default function ReportButton({
  targetType,
  targetId,
  targetTitle = '',
  variant = 'icon',
  className = '',
}: ReportButtonProps) {
  const { profile } = useAuthStore();
  const supabase = createClient();
  const [open, setOpen]         = useState(false);
  const [reason, setReason]     = useState('');
  const [detail, setDetail]     = useState('');
  const [sending, setSending]   = useState(false);
  const [done, setDone]         = useState(false);
  const panelRef                = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSubmit = async () => {
    if (!profile) { toast.error('Connectez-vous pour signaler'); return; }
    if (!reason)  { toast.error('Choisissez une raison');       return; }

    setSending(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id:  profile.id,
      target_type:  targetType,
      target_id:    targetId,
      target_title: targetTitle.slice(0, 200),
      reason,
      description:  detail.trim() || null,
      status:       'pending',
    });

    if (error) {
      // Doublon = déjà signalé
      if (error.code === '23505') toast.success('⚠️ Vous avez déjà signalé ce contenu');
      else toast.error('Erreur : ' + error.message);
    } else {
      toast.success('✅ Signalement envoyé — merci !', { duration: 3000 });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setReason(''); setDetail(''); }, 1500);
    }
    setSending(false);
  };

  const trigger = (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); if (!profile) { toast.error('Connectez-vous'); return; } setOpen(v => !v); }}
      title="Signaler ce contenu"
      className={`
        transition-all
        ${variant === 'icon'
          ? 'p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50'
          : variant === 'mini'
          ? 'flex items-center gap-1 text-xs text-gray-400 hover:text-red-500'
          : 'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
        }
        ${className}
      `}
    >
      <Flag className={variant === 'icon' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {variant !== 'icon' && <span>Signaler</span>}
    </button>
  );

  if (!profile) {
    return (
      <Link href="/connexion" title="Signaler" className={`p-1.5 rounded-lg text-gray-300 hover:text-red-400 transition-all ${className}`}>
        <Flag className="w-3.5 h-3.5" />
      </Link>
    );
  }

  return (
    <div className="relative inline-block" ref={panelRef}>
      {trigger}

      {open && (
        <div className="absolute right-0 top-8 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-700">Signaler ce contenu</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="px-4 py-6 text-center">
              <span className="text-3xl">✅</span>
              <p className="mt-2 font-bold text-emerald-700 text-sm">Merci pour votre signalement !</p>
              <p className="text-xs text-gray-400 mt-1">Notre équipe va examiner ce contenu.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Raisons */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Raison du signalement *</p>
                <div className="space-y-1">
                  {REPORT_REASONS.map(r => (
                    <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="w-4 h-4 text-red-500 border-gray-300 focus:ring-red-400"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {r.emoji} {r.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Détail optionnel */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Précisions (optionnel)</p>
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Décrivez le problème en quelques mots…"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              {/* Bouton */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!reason || sending}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Envoyer le signalement
              </button>

              <p className="text-xs text-gray-400 text-center">
                Les signalements abusifs peuvent entraîner une suspension de compte.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

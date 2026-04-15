'use client';

import { Shield, ChevronRight, Check, Loader2 } from 'lucide-react';
import { HandHeart } from 'lucide-react';
import HelpContact from './HelpContact';
import type { HelpRequest } from '../_types';

type Props = {
  item: HelpRequest;
  isAuthor: boolean;
  isActive: boolean;
  userId?: string;
  helping: boolean;
  alreadyHelping: boolean;
  onCanHelp: () => void;
  onStatusChange: (status: string) => void;
};

export default function HelpSidebar({
  item, isAuthor, isActive, userId,
  helping, alreadyHelping, onCanHelp, onStatusChange,
}: Props) {
  return (
    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-5">

      {/* ── Actions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-black text-gray-800">Actions</h3>

        {/* Je peux aider (demande / échange) */}
        {!isAuthor && isActive && item.help_type !== 'offre' && (
          <button type="button" onClick={onCanHelp} disabled={helping || alreadyHelping}
            className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl text-sm transition-all ${
              alreadyHelping
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            } disabled:opacity-60`}>
            {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {alreadyHelping ? 'Aide proposée ✓' : 'Je peux aider'}
          </button>
        )}

        {/* Je suis intéressé (offre) */}
        {!isAuthor && isActive && item.help_type === 'offre' && (
          <button type="button" onClick={onCanHelp} disabled={helping || alreadyHelping}
            className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl text-sm transition-all ${
              alreadyHelping
                ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-60`}>
            {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHeart className="w-4 h-4" />}
            {alreadyHelping ? 'Intérêt envoyé ✓' : 'Je suis intéressé'}
          </button>
        )}

        {/* Gestion auteur */}
        {isAuthor && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold">Gérer mon annonce</p>
            {isActive && (
              <>
                <button type="button" onClick={() => onStatusChange('in_progress')}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all font-semibold">
                  ⚡ Passer en cours
                </button>
                <button type="button" onClick={() => onStatusChange('paused')}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all font-semibold">
                  ⏸ Mettre en pause
                </button>
                <button type="button" onClick={() => onStatusChange('resolved')}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all font-semibold">
                  ✅ Marquer résolu
                </button>
                <button type="button" onClick={() => onStatusChange('closed')}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all font-semibold">
                  ✖ Fermer l&apos;annonce
                </button>
              </>
            )}
            {(item.status === 'paused' || item.status === 'closed') && (
              <button type="button" onClick={() => onStatusChange('active')}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all font-semibold">
                ▶️ Réactiver l&apos;annonce
              </button>
            )}
            {item.status === 'resolved' && (
              <button type="button" onClick={() => onStatusChange('archived')}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all font-semibold">
                📦 Archiver
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Rappels sécurité ── */}
      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-black text-amber-800">Rappels sécurité</h3>
        </div>
        <ul className="space-y-2 text-xs text-amber-700">
          {[
            'Rencontrez-vous en lieu public quand possible',
            "Ne versez pas d'argent sans confiance établie",
            'Préférez la messagerie pour les premiers échanges',
            'Signalez tout comportement suspect',
          ].map(tip => (
            <li key={tip} className="flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />{tip}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Contact ── */}
      <HelpContact item={item} isAuthor={isAuthor} isActive={isActive} userId={userId} />

    </aside>
  );
}

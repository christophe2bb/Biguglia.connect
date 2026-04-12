/**
 * SectionTrust — Confiance & Réputation (correctif + script complet).
 */

'use client';

import { Copy, Check } from 'lucide-react';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

export function SectionTrust({ copied, copy }: Props) {
  return (
    <>
      {/* ── Section divider ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-yellow-500/40" />
        <span className="text-yellow-400 font-black text-sm tracking-widest uppercase px-2">⭐ Confiance &amp; Réputation</span>
        <div className="flex-1 h-px bg-yellow-500/40" />
      </div>

      {/* ── ÉTAPE 1 — Correctif ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border-2 border-yellow-400">
        <div className="flex items-center justify-between px-5 py-4 bg-yellow-900/40">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-gray-900 text-xs font-black px-2 py-0.5 rounded-full mb-1.5">
              ÉTAPE 1 — À EXÉCUTER EN PREMIER
            </div>
            <h3 className="text-white font-bold text-base">⚡ Correctif Confiance — trust_profile_stats &amp; profile_badges</h3>
            <p className="text-yellow-300 text-xs mt-0.5 font-semibold">
              Si &quot;Stats de confiance&quot; ou &quot;Badges profil&quot; sont rouges dans le diagnostic → exécutez CE script
            </p>
            <p className="text-yellow-400 text-xs mt-1">
              Crée trust_interactions · reviews · trust_profile_stats · profile_badges · Idempotent
            </p>
          </div>
          <button
            onClick={() => copy('trustFix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('trustFix') ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
            }`}
          >
            {copied('trustFix')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Correctif Confiance</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-yellow-200 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.trustFix}</pre>
        </div>
      </div>

      {/* ── ÉTAPE 2 — Script complet ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-amber-500/30">
        <div className="flex items-center justify-between px-5 py-4 bg-amber-900/20">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-700 text-amber-200 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5">
              ÉTAPE 2 — Script complet (optionnel si étape 1 suffit)
            </div>
            <h3 className="text-white font-bold text-base">⭐ Confiance &amp; Réputation v2.0 — Script complet</h3>
            <p className="text-amber-300 text-xs mt-0.5">
              trust_interactions · reviews · review_tags · trust_profile_stats · profile_badges
            </p>
            <p className="text-amber-400 text-xs mt-1">
              5 tables · 8 triggers · RLS complète · Anti-abus (no self-review) · Stats auto-calculées
            </p>
          </div>
          <button
            onClick={() => copy('trust')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('trust') ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {copied('trust')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Confiance</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-amber-200 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.trust}</pre>
        </div>
      </div>
    </>
  );
}

/**
 * SectionEvents — Événements (tables de base + cycle de vie + correctif contrainte) + Collectionneurs v2.
 */

'use client';

'use client';

import { Copy, Check } from 'lucide-react';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

export function SectionEvents({ copied, copy }: Props) {
  return (
    <>
      {/* ── Section divider ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-emerald-500/40" />
        <span className="text-emerald-400 font-black text-sm tracking-widest uppercase px-2">🎉 Événements</span>
        <div className="flex-1 h-px bg-emerald-500/40" />
      </div>

      {/* ── ÉTAPE 1 — Tables de base ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border-2 border-emerald-400">
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-900/40">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-400 text-gray-900 text-xs font-black px-2 py-0.5 rounded-full mb-1.5">
              ÉTAPE 1 — À EXÉCUTER EN PREMIER
            </div>
            <h3 className="text-white font-bold text-base">🎉 Événements — Tables de base (events + event_participants)</h3>
            <p className="text-emerald-300 text-xs mt-0.5 font-semibold">
              Si &quot;Événements locaux&quot; ou &quot;Participations&quot; sont rouges → exécutez CE script
            </p>
            <p className="text-emerald-400 text-xs mt-1">
              Crée events, event_participants, event_status_history — idempotent (sûr à relancer)
            </p>
          </div>
          <button
            onClick={() => copy('eventsBase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('eventsBase') ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-gray-900 hover:bg-emerald-400'
            }`}
          >
            {copied('eventsBase')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Événements Base</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.eventsBase}</pre>
        </div>
      </div>

      {/* ── ÉTAPE 2 — Cycle de vie ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-purple-500/30">
        <div className="flex items-center justify-between px-5 py-4 bg-purple-900/30">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-purple-700 text-purple-200 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5">
              ÉTAPE 2 — Script cycle de vie enrichi (optionnel)
            </div>
            <h3 className="text-white font-bold text-base">🎉 Cycle de vie Événements</h3>
            <p className="text-purple-300 text-xs mt-0.5">
              Statuts français · tables enrichies · historique · triggers · RLS · vue organisateur
            </p>
            <p className="text-purple-400 text-xs mt-1">
              6 tables · triggers · RLS complète · vue résumé organisateur · Phase MVP communautés
            </p>
          </div>
          <button
            onClick={() => copy('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('events') ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-white hover:bg-purple-800'
            }`}
          >
            {copied('events')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Cycle de vie</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.events}</pre>
        </div>
      </div>

      {/* ── Correctif contrainte status ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-red-500/50">
        <div className="flex items-center justify-between px-5 py-4 bg-red-900/30">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-red-700 text-red-200 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5">
              CORRECTIF SPÉCIFIQUE — Seulement si l&apos;erreur ci-dessous apparaît
            </div>
            <h3 className="text-white font-bold text-base">🚨 Correctif Événements — Contrainte status</h3>
            <p className="text-red-300 text-xs mt-0.5 font-semibold">
              Exécutez CE SCRIPT seulement si vous obtenez l&apos;erreur :
            </p>
            <p className="text-red-200 text-xs font-mono mt-0.5 bg-red-900/40 px-2 py-0.5 rounded">
              violates check constraint &quot;local_events_status_check&quot;
            </p>
            <p className="text-red-400 text-xs mt-1">
              Supprime l&apos;ancienne contrainte, migre les statuts legacy → français
            </p>
          </div>
          <button
            onClick={() => copy('eventFix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('eventFix') ? 'bg-emerald-500 text-white' : 'bg-red-700 text-white hover:bg-red-800'
            }`}
          >
            {copied('eventFix')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Correctif Contrainte</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-72">
          <pre className="text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.eventFix}</pre>
        </div>
      </div>

      {/* ── Collectionneurs v2.0 Premium ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-amber-500/30">
        <div className="flex items-center justify-between px-5 py-4 bg-amber-900/20">
          <div>
            <h3 className="text-white font-bold text-base">🏆 Collectionneurs v2.0 Premium</h3>
            <p className="text-amber-300 text-xs mt-0.5">
              collection_items enrichi · photos (is_cover, sort_order) · favoris · offres · vues · RLS
            </p>
            <p className="text-amber-400 text-xs mt-1">
              ALTER TABLE idempotent · 20+ colonnes · photos v2 · 3 nouvelles tables · triggers · indexes
            </p>
          </div>
          <button
            onClick={() => copy('collectV2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copied('collectV2') ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {copied('collectV2')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Collectionneurs v2</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-amber-200 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.collectV2}</pre>
        </div>
      </div>
    </>
  );
}

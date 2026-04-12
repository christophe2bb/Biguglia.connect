/**
 * SectionLostFound — Profils publics + Perdu/Trouvé (historique, matches, extras) + Rappel J-1 + Secteurs + Forum.
 */

'use client';

import { MessageSquare, Copy, Check } from 'lucide-react';

interface Props {
  copiedProfilPublic: boolean; onCopyProfilPublic: () => void; PROFIL_PUBLIC_SQL: string;
  copiedLfHistory: boolean;    onCopyLfHistory: () => void;    LF_HISTORY_SQL: string;
  copiedLfMatches: boolean;    onCopyLfMatches: () => void;    LF_MATCHES_SQL: string;
  copiedLfExtras: boolean;     onCopyLfExtras: () => void;     LF_EXTRAS_SQL: string;
  copiedReminder: boolean;     onCopyReminder: () => void;     REMINDER_SQL: string;
  copiedSectors: boolean;      onCopySectors: () => void;      SECTORS_SQL: string;
  copiedForumV2: boolean;      onCopyForumV2: () => void;      FORUM_V2_SQL: string;
}

export function SectionLostFound({
  copiedProfilPublic, onCopyProfilPublic, PROFIL_PUBLIC_SQL,
  copiedLfHistory, onCopyLfHistory, LF_HISTORY_SQL,
  copiedLfMatches, onCopyLfMatches, LF_MATCHES_SQL,
  copiedLfExtras, onCopyLfExtras, LF_EXTRAS_SQL,
  copiedReminder, onCopyReminder, REMINDER_SQL,
  copiedSectors, onCopySectors, SECTORS_SQL,
  copiedForumV2, onCopyForumV2, FORUM_V2_SQL,
}: Props) {
  return (
    <>
      {/* ── Fix RLS Profils publics ── */}
      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700">
          <span className="text-2xl">👤</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Fix RLS — Profils publics</h3>
            <p className="text-xs text-blue-200 mt-0.5">
              Corrige l&apos;erreur <strong>&quot;Profil introuvable&quot;</strong> sur{' '}
              <code className="bg-blue-900 px-1 rounded">/profil/[id]</code>.
              S&apos;assure que la politique RLS <code className="bg-blue-900 px-1 rounded">SELECT USING (true)</code> est active.
            </p>
          </div>
          <button
            onClick={onCopyProfilPublic}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedProfilPublic ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {copiedProfilPublic
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Fix Profils</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">{PROFIL_PUBLIC_SQL}</pre>
        </div>
      </div>

      {/* ── LF Historique statuts ── */}
      <div className="bg-white rounded-2xl border border-teal-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-600">
          <span className="text-2xl">🔍</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Perdu/Trouvé — Historique de statuts</h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Table <code className="bg-white/20 px-1 rounded">lf_status_history</code> — trace tous les changements de statut.
              À exécuter après le bloc principal Perdu/Trouvé.
            </p>
          </div>
          <button
            onClick={onCopyLfHistory}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedLfHistory ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-400'
            }`}
          >
            {copiedLfHistory
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Historique statuts</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-teal-300 font-mono leading-relaxed whitespace-pre-wrap">{LF_HISTORY_SQL}</pre>
        </div>
      </div>

      {/* ── LF Matches ── */}
      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Perdu/Trouvé — Correspondances (matches)</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Table <code className="bg-white/20 px-1 rounded">lf_matches</code> — stocke les correspondances automatiques entre objets perdus et trouvés.
            </p>
          </div>
          <button
            onClick={onCopyLfMatches}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedLfMatches ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            {copiedLfMatches
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL lf_matches</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">{LF_MATCHES_SQL}</pre>
        </div>
      </div>

      {/* ── LF Extras ── */}
      <div className="bg-white rounded-2xl border border-violet-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-600">
          <span className="text-2xl">🔐</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Perdu/Trouvé — Extras (visibility_type + archivage auto)</h3>
            <p className="text-xs text-violet-100 mt-0.5">
              Ajoute <code className="bg-white/20 px-1 rounded">visibility_type</code> sur{' '}
              <code className="bg-white/20 px-1 rounded">lf_photos</code>{' '}
              et la fonction <code className="bg-white/20 px-1 rounded">archive_expired_lost_found()</code> planifiable en pg_cron.
            </p>
          </div>
          <button
            onClick={onCopyLfExtras}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedLfExtras ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white hover:bg-violet-400'
            }`}
          >
            {copiedLfExtras
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Extras P/T</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-violet-300 font-mono leading-relaxed whitespace-pre-wrap">{LF_EXTRAS_SQL}</pre>
        </div>
      </div>

      {/* ── Rappel J-1 Matériel ── */}
      <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-600 to-amber-600">
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Rappel retour J-1 — Matériel</h3>
            <p className="text-xs text-orange-100 mt-0.5">
              Fonction PostgreSQL + pg_cron pour notifier emprunteur &amp; propriétaire la veille de la date de retour prévue.
            </p>
          </div>
          <button
            onClick={onCopyReminder}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedReminder ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {copiedReminder
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Rappel J-1</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-orange-300 font-mono leading-relaxed whitespace-pre-wrap">{REMINDER_SQL}</pre>
        </div>
      </div>

      {/* ── Secteurs transversaux ── */}
      <div className="bg-white rounded-2xl border border-teal-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-600">
          <span className="text-2xl">🗺️</span>
          <div className="flex-1">
            <h3 className="font-bold text-white">Couche territoriale — Secteurs transversaux</h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Crée la table <code className="bg-white/20 px-1 rounded">sectors</code> avec les 6 secteurs de Biguglia,
              ajoute <code className="bg-white/20 px-1 rounded">sector_id</code> sur tous les modules
              et une vue <code className="bg-white/20 px-1 rounded">sector_stats</code>.
            </p>
          </div>
          <button
            onClick={onCopySectors}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedSectors ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-400'
            }`}
          >
            {copiedSectors
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Secteurs</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-teal-300 font-mono leading-relaxed whitespace-pre-wrap">{SECTORS_SQL}</pre>
        </div>
      </div>

      {/* ── Forum local v2 ── */}
      <div className="mt-6 bg-gray-900 rounded-2xl overflow-hidden border border-indigo-700">
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-900/60 border-b border-indigo-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-300" />
            <span className="text-sm font-semibold text-indigo-200">Forum local v2 — Secteurs, Topics, Réponses, Réactions, Signalements</span>
          </div>
          <button
            onClick={onCopyForumV2}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedForumV2 ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {copiedForumV2
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Forum v2</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">{FORUM_V2_SQL}</pre>
        </div>
      </div>
    </>
  );
}

/**
 * SectionTableStatus — diagnostic de présence des tables + SQL principal.
 */

'use client';

'use client';

import { CheckCircle, XCircle, Copy, Check, Database, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { TABLES_TO_CHECK } from '../_config';
import type { TableStatus } from '../_types';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  checking:     boolean;
  tables:       TableStatus[];
  allOk:        boolean;
  missingCount: number;
  onRefresh:    () => void;
  copied:       (key: SqlKey) => boolean;
  copy:         (key: SqlKey) => void;
}

export function SectionTableStatus({
  checking, tables, allOk, missingCount,
  onRefresh, copied, copy,
}: Props) {
  return (
    <>
      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Database className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Migration base de données</h1>
          <p className="text-gray-500 text-sm">Vérification et installation des tables thèmes</p>
        </div>
      </div>

      {/* ── Statut global ── */}
      {checking ? (
        <div className="bg-white rounded-2xl border p-8 flex items-center justify-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-gray-500">Vérification en cours…</span>
        </div>
      ) : allOk ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3 mb-6">
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">✅ Toutes les tables sont présentes</p>
            <p className="text-emerald-700 text-sm">Les 3 thèmes sont opérationnels.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3 mb-6">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-base">
              {missingCount} table{missingCount > 1 ? 's' : ''} manquante{missingCount > 1 ? 's' : ''} — migration requise
            </p>
            <p className="text-red-700 text-sm mt-1">
              Copiez le SQL ci-dessous et exécutez-le dans votre projet Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ── Tableau état des tables ── */}
      <div className="bg-white rounded-2xl border shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">État des tables</h2>
          <button
            onClick={onRefresh}
            disabled={checking}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
        <div className="divide-y">
          {TABLES_TO_CHECK.map((t) => {
            const s = tables.find((r) => r.name === t.name);
            return (
              <div key={t.name} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{t.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{t.theme}</span>
                </div>
                {!s ? (
                  <span className="text-gray-400 text-sm">—</span>
                ) : s.exists ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" /> OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                    <XCircle className="w-4 h-4" /> Manquante
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bloc SQL principal ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Instructions :</strong>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              <li>Cliquez <strong>Copier le SQL</strong> ci-dessous</li>
              <li>Ouvrez <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">supabase.com</a> → votre projet → <strong>SQL Editor</strong></li>
              <li>Cliquez <strong>New query</strong>, collez (<kbd>Ctrl+V</kbd>), puis cliquez <strong>Run</strong></li>
              <li>Revenez ici et cliquez <strong>Actualiser</strong></li>
            </ol>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">
            SQL complet — promenades + collectionneurs + événements + NOTIFY
          </p>
          <button
            onClick={() => copy('main')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow ${
              copied('main') ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied('main')
              ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier le SQL</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
            {SQL_MAP.main}
          </pre>
        </div>
      </div>

      {/* ── Bandeau NOTIFY ── */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="font-bold text-orange-800 text-sm">
              Tables présentes mais erreur &quot;Could not find the table&quot; ?
            </p>
            <p className="text-orange-700 text-xs mt-0.5">
              PostgREST n&apos;a pas rechargé son cache après la migration.
              Exécutez cette commande dans Supabase SQL Editor :
            </p>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3 font-mono text-sm text-green-400">
          <code>NOTIFY pgrst, &apos;reload schema&apos;;</code>
          <button
            onClick={() => copy('notify')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              copied('notify') ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {copied('notify')
              ? <><Check className="w-3 h-3" /> Copié !</>
              : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
      </div>
    </>
  );
}

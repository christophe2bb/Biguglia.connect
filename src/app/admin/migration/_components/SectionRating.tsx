/**
 * SectionRating — Notation universelle (avis & étoiles) + Échanges confirmés + Interactions.
 */

'use client';

import { Star, CheckCheck, Activity, Copy, Check } from 'lucide-react';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

function SqlPanel({
  sqlKey, copied, copy, label, color,
}: {
  sqlKey: SqlKey;
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
  label: string;
  color: string;
}) {
  return (
    <>
      <button
        onClick={() => copy(sqlKey)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
          copied(sqlKey) ? 'bg-emerald-500 text-white' : `${color} text-white`
        }`}
      >
        {copied(sqlKey)
          ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
          : <><Copy className="w-4 h-4" /> {label}</>
        }
      </button>
      <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
        <pre className="text-xs text-amber-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP[sqlKey]}</pre>
      </div>
    </>
  );
}

export function SectionRating({ copied, copy }: Props) {
  return (
    <>
      {/* ── Notation universelle ── */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <Star className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Notation universelle — Avis &amp; Étoiles</h2>
          <p className="text-gray-500 text-sm">Notes 1-5 étoiles + mini-sondages sur toutes les rubriques</p>
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⭐</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">À exécuter pour activer les avis sur toutes les rubriques</p>
            <p className="text-amber-700 text-xs mt-1">
              Crée la table <code className="bg-amber-100 px-1 rounded">item_ratings</code> avec mini-sondages contextuels par rubrique.
            </p>
          </div>
        </div>
        <SqlPanel sqlKey="rating" copied={copied} copy={copy} label="Copier le SQL Notation" color="bg-amber-600 hover:bg-amber-700" />
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-amber-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL, allez sur Supabase → SQL Editor → New query, collez et cliquez Run</li>
            <li>La table <code className="bg-amber-100 px-1 rounded">item_ratings</code> sera créée avec RLS</li>
            <li>Les avis apparaîtront automatiquement sur toutes les rubriques</li>
          </ol>
        </div>
      </div>

      {/* ── Échanges confirmés ── */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <CheckCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Échanges confirmés — Avis vérifiés</h2>
          <p className="text-gray-500 text-sm">Ajoute le suivi d&apos;échange sur les conversations pour débloquer les avis</p>
        </div>
      </div>

      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🤝</span>
          <div>
            <p className="font-bold text-emerald-800 text-sm">À exécuter pour activer les avis vérifiés</p>
            <p className="text-emerald-700 text-xs mt-1">
              Ajoute <code className="bg-emerald-100 px-1 rounded">exchange_status</code> sur{' '}
              <code className="bg-emerald-100 px-1 rounded">conversations</code>.
              Un avis n&apos;est possible que si les 2 parties ont confirmé la fin de l&apos;échange.
            </p>
          </div>
        </div>
        <button
          onClick={() => copy('exchange')}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copied('exchange') ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {copied('exchange')
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Échanges confirmés</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.exchange}</pre>
        </div>
      </div>

      {/* ── Suivi des interactions ── */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Activity className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Suivi des interactions — Cycle de vie complet</h2>
          <p className="text-gray-500 text-sm">Table centrale pour tracer chaque échange de la demande à l&apos;avis</p>
        </div>
      </div>

      <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🔄</span>
          <div>
            <p className="font-bold text-indigo-800 text-sm">À exécuter pour activer le suivi complet des interactions</p>
            <p className="text-indigo-700 text-xs mt-1">
              Crée la table <code className="bg-indigo-100 px-1 rounded">interactions</code> avec cycle de vie complet
              (requested → accepted → in_progress → done).
              Inclut les fonctions <code className="bg-indigo-100 px-1 rounded">add_interaction_history</code> et{' '}
              <code className="bg-indigo-100 px-1 rounded">confirm_interaction_done</code>.
            </p>
          </div>
        </div>
        <button
          onClick={() => copy('interaction')}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copied('interaction') ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied('interaction')
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Interactions</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.interaction}</pre>
        </div>
        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-xs text-indigo-800 font-bold">📋 Ce que cela active :</p>
          <ul className="text-xs text-indigo-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>Boutons &quot;Je suis intéressé&quot;, &quot;Je peux aider&quot;, &quot;Je réserve&quot; sur toutes les rubriques</li>
            <li>Centre de suivi &quot;Mes échanges&quot; avec filtres</li>
            <li>Déblocage automatique des avis quand les 2 parties confirment</li>
          </ul>
        </div>
      </div>
    </>
  );
}

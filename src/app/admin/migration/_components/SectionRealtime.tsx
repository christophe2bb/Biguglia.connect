/**
 * SectionRealtime — Realtime messages & notifications SQL.
 */

'use client';

import { Zap, Copy, Check } from 'lucide-react';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

export function SectionRealtime({ copied, copy }: Props) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <Zap className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Realtime — Messages &amp; Notifications</h2>
          <p className="text-gray-500 text-sm">Active les notifications et messages instantanés</p>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="font-bold text-red-800 text-sm">
              À exécuter si les messages ou notifications n&apos;arrivent pas en temps réel
            </p>
            <p className="text-red-700 text-xs mt-1">
              Sans cette migration, Supabase ne diffuse pas les nouveaux messages ni les notifications.
              Les tables doivent être ajoutées à la publication{' '}
              <code className="bg-red-100 px-1 rounded">supabase_realtime</code>.
            </p>
          </div>
        </div>
        <button
          onClick={() => copy('realtime')}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copied('realtime') ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {copied('realtime')
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Realtime</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
            {SQL_MAP.realtime}
          </pre>
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-amber-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez sur <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></li>
            <li>Cliquez <strong>New query</strong>, collez et cliquez <strong>Run</strong></li>
            <li>La dernière requête doit retourner <strong>4 lignes</strong> (messages, notifications, conversation_participants, conversations)</li>
            <li>Ce script corrige aussi les policies RLS pour que Realtime fonctionne</li>
            <li>Activez aussi : <strong>Database → Replication → supabase_realtime</strong> → vérifiez que les 4 tables sont cochées</li>
          </ol>
        </div>
      </div>
    </>
  );
}

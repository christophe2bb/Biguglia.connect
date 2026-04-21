/**
 * SectionAdminLogs — Script SQL de création de la table admin_action_logs.
 *
 * Affiche le SQL complet (table + index + RLS) à exécuter dans Supabase
 * pour activer la traçabilité des actions admin.
 */

'use client';

'use client';

import { ClipboardList, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';

interface Props {
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

export function SectionAdminLogs({ copied, copy }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-700">
        <ClipboardList className="w-5 h-5 text-slate-300" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white">📋 Traçabilité admin — <code className="text-slate-300 font-mono text-sm">admin_action_logs</code></h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Journal immuable de toutes les mutations sensibles réalisées par les admins et modérateurs.
          </p>
        </div>
        <Link
          href="/admin/logs"
          className="flex items-center gap-1.5 text-xs font-semibold bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          Voir les logs <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Description + copy button */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Ce script crée :</p>
            <ul className="space-y-0.5 text-xs list-disc list-inside text-gray-500">
              <li>Table <code className="bg-gray-100 px-1 rounded">admin_action_logs</code> avec 8 colonnes</li>
              <li>4 index optimisés (actor_id, action, created_at, target)</li>
              <li>RLS activée — lecture réservée aux admins/modérateurs</li>
              <li>Pas de policy INSERT publique — logs immuables côté navigateur</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Actions tracées automatiquement :</p>
            <ul className="space-y-0.5 text-xs list-disc list-inside text-gray-500">
              <li>Statut &amp; rôle utilisateur, suppression compte</li>
              <li>Reset mot de passe</li>
              <li>Approbation / refus artisan</li>
              <li>Décisions de modération, niveau de confiance</li>
              <li>Modération contenu (statut, fermeture, épinglage)</li>
              <li>Modération avis, attribution badge</li>
              <li>Statut signalement, suspension depuis signalement</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => copy('adminLogs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              copied('adminLogs')
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {copied('adminLogs')
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL admin_action_logs</>}
          </button>
          <p className="text-xs text-gray-400">
            À exécuter <strong>une seule fois</strong> dans Supabase &gt; SQL Editor
          </p>
        </div>
      </div>

      {/* SQL preview */}
      <div className="p-4 bg-gray-950 overflow-auto max-h-96">
        <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
          {SQL_MAP.adminLogs}
        </pre>
      </div>
    </div>
  );
}

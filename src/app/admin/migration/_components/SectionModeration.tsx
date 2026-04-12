/**
 * SectionModeration — Correctif moderation_queue + SQL Modération + Cycle de vie matériel + Sorties.
 */

'use client';

import { Shield, Copy, Check } from 'lucide-react';

interface Props {
  copiedModFix: boolean;     onCopyModFix: () => void;     MODERATION_FIX_SQL: string;
  copiedModeration: boolean; onCopyModeration: () => void; MODERATION_SQL: string;
  copiedEquipment: boolean;  onCopyEquipment: () => void;  EQUIPMENT_LIFECYCLE_SQL: string;
  copiedOutings: boolean;    onCopyOutings: () => void;    OUTINGS_LIFECYCLE_SQL: string;
  copiedRoleFix: boolean;    onCopyRoleFix: () => void;    USER_ROLE_FIX_SQL: string;
}

export function SectionModeration({
  copiedModFix, onCopyModFix, MODERATION_FIX_SQL,
  copiedModeration, onCopyModeration, MODERATION_SQL,
  copiedEquipment, onCopyEquipment, EQUIPMENT_LIFECYCLE_SQL,
  copiedOutings, onCopyOutings, OUTINGS_LIFECYCLE_SQL,
  copiedRoleFix, onCopyRoleFix, USER_ROLE_FIX_SQL,
}: Props) {
  return (
    <>
      {/* ── Correctif moderation_queue ── */}
      <div className="bg-white rounded-2xl border border-red-300 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-red-700 to-orange-700">
          <Shield className="w-5 h-5 text-red-200" />
          <div>
            <h3 className="font-bold text-white">⚠️ CORRECTIF — Erreur &quot;submitted_at&quot;</h3>
            <p className="text-xs text-red-200 mt-0.5">
              Si vous avez eu l&apos;erreur{' '}
              <code className="bg-red-900 px-1 rounded">column &quot;submitted_at&quot; does not exist</code>,
              exécutez CE script EN PREMIER dans Supabase, puis le script complet ci-dessous.
            </p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between border-b border-red-100">
          <p className="text-sm text-gray-600">
            Corrige les colonnes manquantes sur <code className="text-xs bg-gray-100 px-1 rounded">moderation_queue</code> et recrée la vue KPI.
          </p>
          <button
            onClick={onCopyModFix}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              copiedModFix ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {copiedModFix
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Correctif</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-64">
          <pre className="text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap">{MODERATION_FIX_SQL}</pre>
        </div>
      </div>

      {/* ── Modération centralisée ── */}
      <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-purple-900 to-indigo-900">
          <Shield className="w-5 h-5 text-purple-300" />
          <div>
            <h3 className="font-bold text-white">SQL Modération centralisée</h3>
            <p className="text-xs text-purple-300 mt-0.5">
              File de modération, historique d&apos;audit, niveaux de confiance, RLS complet.
            </p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between border-b border-purple-100">
          <p className="text-sm text-gray-600">
            Crée <code className="text-xs bg-gray-100 px-1 rounded">moderation_queue</code>,{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">moderation_history</code>,
            colonnes <code className="text-xs bg-gray-100 px-1 rounded">trust_level</code> et vue KPI.
          </p>
          <button
            onClick={onCopyModeration}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              copiedModeration ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-white hover:bg-purple-800'
            }`}
          >
            {copiedModeration
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Modération</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap">{MODERATION_SQL}</pre>
        </div>
      </div>

      {/* ── Cycle de vie matériel ── */}
      <div className="bg-white rounded-2xl border border-teal-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-800 to-cyan-800">
          <span className="text-2xl">🔧</span>
          <div>
            <h3 className="font-bold text-white">SQL Cycle de vie du matériel</h3>
            <p className="text-xs text-teal-200 mt-0.5">
              Tables <code className="bg-teal-900 px-1 rounded">equipment_requests</code>,{' '}
              <code className="bg-teal-900 px-1 rounded">equipment_loans</code>,{' '}
              <code className="bg-teal-900 px-1 rounded">equipment_status_history</code>,
              vue <code className="bg-teal-900 px-1 rounded">equipment_owner_summary</code>, triggers, RLS.
            </p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between border-b border-teal-100">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Ajoute le cycle de vie complet : disponible → réservé → prêté → rendu → archivé</p>
            <p className="text-xs text-gray-400">Nouvelles tables, statuts enrichis, historique, RLS propriétaire/emprunteur</p>
          </div>
          <button
            onClick={onCopyEquipment}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedEquipment ? 'bg-emerald-500 text-white' : 'bg-teal-700 text-white hover:bg-teal-800'
            }`}
          >
            {copiedEquipment
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Matériel</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-teal-300 font-mono leading-relaxed whitespace-pre-wrap">{EQUIPMENT_LIFECYCLE_SQL}</pre>
        </div>
      </div>

      {/* ── Sorties groupées ── */}
      <div className="rounded-2xl border border-emerald-200 overflow-hidden">
        <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold flex items-center gap-2">🥾 SQL Cycle de vie Sorties groupées</h3>
            <p className="text-xs text-emerald-200 mt-0.5">Statuts français · outing_status_history · participants enrichis · RLS · triggers</p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between border-b border-emerald-100">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Migre les statuts vers le français : ouverte, complete, terminee, annulee, archivee</p>
            <p className="text-xs text-gray-400">Nouveaux champs, historique statuts, participation enrichie, vue organisateur</p>
          </div>
          <button
            onClick={onCopyOutings}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedOutings ? 'bg-emerald-500 text-white' : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            {copiedOutings
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Sorties</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">{OUTINGS_LIFECYCLE_SQL}</pre>
        </div>
      </div>

      {/* ── Correctif user_role enum ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-orange-500/50">
        <div className="flex items-center justify-between px-5 py-4 bg-orange-900/30">
          <div>
            <h3 className="text-white font-bold text-base">🔧 Correctif Enum user_role — &quot;moderateur&quot; invalide</h3>
            <p className="text-orange-300 text-xs mt-0.5 font-semibold">
              Exécutez CE SCRIPT EN PREMIER si vous obtenez l&apos;erreur :
            </p>
            <p className="text-orange-200 text-xs font-mono mt-0.5 bg-orange-900/40 px-2 py-0.5 rounded">
              invalid input value for enum user_role: &quot;moderateur&quot;
            </p>
            <p className="text-orange-400 text-xs mt-1">
              Ajoute &apos;moderator&apos; à l&apos;enum, migre les lignes &apos;moderateur&apos; → &apos;moderator&apos;
            </p>
          </div>
          <button
            onClick={onCopyRoleFix}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-4 flex-shrink-0 ${
              copiedRoleFix ? 'bg-emerald-500 text-white' : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {copiedRoleFix
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Correctif</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-72">
          <pre className="text-xs text-orange-300 font-mono leading-relaxed whitespace-pre-wrap">{USER_ROLE_FIX_SQL}</pre>
        </div>
      </div>
    </>
  );
}

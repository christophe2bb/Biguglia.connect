/**
 * SectionMessaging — Fix messagerie (BLOC 1/2) + Messagerie universelle + Statuts enrichis + Recherche globale.
 */

'use client';

import { AlertTriangle, MessageSquare, Tag, Search, Info, Copy, Check } from 'lucide-react';

interface Props {
  // Conv fix blocs
  copiedConvFix1: boolean;  onCopyConvFix1: () => void;  CONV_FIX_BLOC1: string;
  copiedConvFix2: boolean;  onCopyConvFix2: () => void;  CONV_FIX_BLOC2: string;
  // Messaging
  copiedMessaging: boolean; onCopyMessaging: () => void; MESSAGING_SQL: string;
  // Status
  copiedStatus: boolean;    onCopyStatus: () => void;    STATUS_SQL: string;
  // Search
  copiedSearch: boolean;    onCopySearch: () => void;    SEARCH_SQL: string;
}

export function SectionMessaging({
  copiedConvFix1, onCopyConvFix1, CONV_FIX_BLOC1,
  copiedConvFix2, onCopyConvFix2, CONV_FIX_BLOC2,
  copiedMessaging, onCopyMessaging, MESSAGING_SQL,
  copiedStatus, onCopyStatus, STATUS_SQL,
  copiedSearch, onCopySearch, SEARCH_SQL,
}: Props) {
  return (
    <>
      {/* ── Fix messagerie ── */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-red-100 rounded-2xl">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">🔴 Fix messagerie — À exécuter si le bouton &quot;Message privé&quot; affiche une erreur</h2>
          <p className="text-gray-500 text-sm">Corrige le CHECK constraint sur related_type + RLS conversations/messages/participants</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-5 mb-4">
        <p className="font-black text-red-900 text-base mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          Si vous voyez « Contrainte related_type — exécutez BLOC 1 » : exécutez les 2 blocs ci-dessous
        </p>
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2.5 bg-white/70 rounded-xl p-3">
            <span className="w-6 h-6 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="text-sm font-bold text-red-900">BLOC 1 — Ajouter les valeurs ENUM <code className="bg-red-100 px-1 rounded">related_type</code></p>
              <p className="text-xs text-red-700 mt-0.5">Coller <strong>seul</strong> dans un <strong>nouvel onglet</strong> Supabase → SQL Editor → Run</p>
              <p className="text-xs text-red-600 mt-0.5 font-medium">⚠️ Doit être exécuté SEUL — hors transaction</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 rounded-xl p-3">
            <span className="w-6 h-6 bg-orange-600 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-sm font-bold text-orange-900">BLOC 2 — CHECK constraint + RLS + fonction RPC</p>
              <p className="text-xs text-orange-700 mt-0.5">Coller dans un <strong>autre onglet</strong> Supabase → SQL Editor → Run (après BLOC 1)</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 text-xs text-amber-800 font-medium">
          💡 <strong>Pourquoi 2 blocs séparés ?</strong> PostgreSQL interdit <code>ALTER TYPE ADD VALUE</code> dans une transaction.
        </div>
      </div>

      {/* BLOC 1 */}
      <div className="bg-white rounded-2xl border-2 border-red-400 shadow-md overflow-hidden mb-4">
        <div className="px-5 py-4 bg-red-600 flex items-center justify-between gap-3">
          <div className="text-white">
            <p className="text-base font-black flex items-center gap-2">
              <span className="w-7 h-7 bg-white text-red-600 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">1</span>
              BLOC 1 — Ajouter les valeurs ENUM <code className="bg-red-500 px-1.5 py-0.5 rounded text-sm">related_type</code>
            </p>
            <p className="text-xs text-red-100 mt-1 ml-9">⚠️ À coller <strong>SEUL</strong> dans un <strong>nouvel onglet</strong> SQL Editor → Run</p>
          </div>
          <button onClick={onCopyConvFix1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow flex-shrink-0 ${
              copiedConvFix1 ? 'bg-emerald-400 text-white' : 'bg-white text-red-700 hover:bg-red-50'
            }`}>
            {copiedConvFix1
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier BLOC 1</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-60">
          <pre className="text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap">{CONV_FIX_BLOC1}</pre>
        </div>
      </div>

      {/* BLOC 2 */}
      <div className="bg-white rounded-2xl border-2 border-orange-400 shadow-md overflow-hidden mb-6">
        <div className="px-5 py-4 bg-orange-500 flex items-center justify-between gap-3">
          <div className="text-white">
            <p className="text-base font-black flex items-center gap-2">
              <span className="w-7 h-7 bg-white text-orange-600 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">2</span>
              BLOC 2 — CHECK constraint + RLS + fonction RPC
            </p>
            <p className="text-xs text-orange-100 mt-1 ml-9">À coller dans un <strong>autre onglet</strong> SQL Editor → Run — <strong>après le BLOC 1</strong></p>
          </div>
          <button onClick={onCopyConvFix2}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow flex-shrink-0 ${
              copiedConvFix2 ? 'bg-emerald-400 text-white' : 'bg-white text-orange-700 hover:bg-orange-50'
            }`}>
            {copiedConvFix2
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier BLOC 2</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-60">
          <pre className="text-xs text-orange-200 font-mono leading-relaxed whitespace-pre-wrap">{CONV_FIX_BLOC2}</pre>
        </div>
      </div>

      {/* ── Messagerie universelle ── */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <MessageSquare className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Messagerie universelle — Enrichissement des conversations</h2>
          <p className="text-gray-500 text-sm">Ajoute les colonnes de contexte, statut, et la table message_attachments</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex-1 mb-5">
          <h3 className="font-bold text-gray-900 mb-1">Colonnes ajoutées</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li><code>conversations.source_title</code> — titre du contenu lié</li>
            <li><code>conversations.source_image</code> — image du contenu</li>
            <li><code>conversations.status</code> — active / archived / blocked</li>
            <li><code>messages.message_type</code> — text / system / image / file</li>
            <li>Table <code>message_attachments</code> (pièces jointes)</li>
          </ul>
        </div>
        <button
          onClick={onCopyMessaging}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedMessaging ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copiedMessaging
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Messagerie universelle</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">{MESSAGING_SQL}</pre>
        </div>
      </div>

      {/* ── Statuts enrichis ── */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-violet-100 rounded-2xl">
          <Tag className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Statuts enrichis</h2>
          <p className="text-gray-500 text-sm">Ajoute status_changed_at, expiration_date et statuts manquants — compatible ENUM et TEXT CHECK</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
            <Info className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-800">
              <p className="font-bold mb-1">Ce SQL enrichit les tables existantes (compatible ENUM et TEXT CHECK) :</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Ajoute <code>&apos;reserved&apos;</code> et <code>&apos;expired&apos;</code> aux annonces</li>
                <li>Ajoute colonne <code>status</code> sur equipment_items</li>
                <li>Ajoute <code>status_changed_at</code>, <code>expiration_date</code> sur toutes les tables</li>
                <li>Crée les triggers auto-update de <code>status_changed_at</code></li>
              </ul>
            </div>
          </div>
          <button
            onClick={onCopyStatus}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all mb-3 ${
              copiedStatus ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {copiedStatus
              ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
              : <><Copy className="w-4 h-4" /> Copier le SQL Statuts enrichis</>
            }
          </button>
          <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-violet-300 font-mono leading-relaxed whitespace-pre-wrap">{STATUS_SQL}</pre>
          </div>
          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 bg-gray-50 rounded-xl p-3 mt-3">
            <li>Copiez le SQL ci-dessus et allez dans Supabase → SQL Editor → New query</li>
            <li>Collez et exécutez</li>
            <li>Les statuts <strong>reserved</strong>, <strong>expired</strong> seront disponibles sur les annonces</li>
          </ol>
        </div>
      </div>

      {/* ── Recherche globale ── */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-violet-100 rounded-2xl">
          <Search className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Recherche globale (Full-Text)</h2>
          <p className="text-gray-500 text-sm">Index GIN pour accélérer la recherche dans toutes les rubriques</p>
        </div>
      </div>

      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🔍</span>
          <div>
            <p className="font-bold text-violet-800 text-sm">SQL optionnel — Améliore les performances de recherche</p>
            <p className="text-violet-700 text-xs mt-1">
              Ajoute des colonnes <code className="bg-violet-100 px-1 rounded">search_vector</code> (tsvector) et des index GIN sur 8 tables.
              La recherche fonctionne sans ce SQL (via ILIKE), mais ce SQL la rend 10× plus rapide.
            </p>
          </div>
        </div>
        <button
          onClick={onCopySearch}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
            copiedSearch ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {copiedSearch
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Recherche globale</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-violet-300 font-mono leading-relaxed whitespace-pre-wrap">{SEARCH_SQL}</pre>
        </div>
      </div>
    </>
  );
}

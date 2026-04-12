/**
 * SectionStorage — diagnostic du bucket "photos" + SQL Storage/Artisan/Community/RLS.
 */

'use client';

import {
  HardDrive, RefreshCw, Loader2, CheckCircle, XCircle,
  AlertTriangle, ImageIcon, Upload, Wrench, MessageSquare,
  Users, Shield, Eye,
} from 'lucide-react';
import type { StorageDiag } from '../_types';
import type { SqlKey } from '../_hooks/useMigration';
import { SQL_MAP } from '../_hooks/useMigration';
import { CopyBlock } from './CopyBlock';

interface Props {
  // Storage diagnostic
  storageDiag: StorageDiag;
  checkingStorage: boolean;
  testingUpload: boolean;
  onCheckStorage: () => void;
  onTestUpload: (_file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  // Copy API
  copied: (key: SqlKey) => boolean;
  copy:   (key: SqlKey) => void;
}

export function SectionStorage({
  storageDiag, checkingStorage, testingUpload,
  onCheckStorage, onTestUpload, fileInputRef,
  copied, copy,
}: Props) {
  return (
    <>
      {/* ── Section header ── */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <HardDrive className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Stockage des photos (Storage)</h2>
          <p className="text-gray-500 text-sm">Diagnostic du bucket &quot;photos&quot; et des permissions d&apos;upload</p>
        </div>
      </div>

      {/* ── Bucket diagnostic panel ── */}
      <div className="bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" /> État du bucket &quot;photos&quot;
          </h3>
          <button onClick={onCheckStorage} disabled={checkingStorage}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${checkingStorage ? 'animate-spin' : ''}`} /> Tester
          </button>
        </div>

        {checkingStorage ? (
          <div className="p-8 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-gray-500 text-sm">Diagnostic en cours…</span>
          </div>
        ) : storageDiag.bucketExists === null ? (
          <div className="p-6 text-center text-gray-400 text-sm">Cliquez &quot;Tester&quot; pour lancer le diagnostic</div>
        ) : (
          <div className="divide-y">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Bucket &quot;photos&quot; existe</span>
              {storageDiag.bucketExists
                ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> Oui</span>
                : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Non — À créer</span>}
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Bucket public (URLs accessibles)</span>
              {storageDiag.bucketPublic === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.bucketPublic
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> Oui</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Non — Photos invisibles !</span>}
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Lecture des fichiers autorisée</span>
              {storageDiag.canRead === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.canRead
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> OK</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Bloquée</span>}
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Upload de fichiers autorisé</span>
              {storageDiag.canUpload === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.canUpload
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> OK</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Bloqué → appliquer SQL Storage</span>}
            </div>
            {storageDiag.error && (
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-800 font-mono break-all font-semibold">ℹ️ Détail : {storageDiag.error}</p>
                <p className="text-xs text-amber-700 mt-1">→ Copiez et exécutez le <strong>SQL Storage</strong> ci-dessous dans Supabase SQL Editor.</p>
              </div>
            )}
          </div>
        )}

        {/* Real upload test */}
        <div className="px-5 py-4 bg-gray-50 border-t">
          <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Test d&apos;upload réel (choisissez une image)
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && onTestUpload(e.target.files[0])}
              className="text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
            />
            {testingUpload && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Ce test uploade et supprime immédiatement un fichier — aucune donnée conservée.</p>
        </div>
      </div>

      {/* ── Storage status banners ── */}
      {storageDiag.bucketExists === false && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-sm">🚨 Bucket &quot;photos&quot; manquant — Les photos ne peuvent pas être sauvegardées !</p>
            <p className="text-red-700 text-xs mt-1">Exécutez le SQL ci-dessous dans Supabase pour créer le bucket et les permissions.</p>
          </div>
        </div>
      )}
      {storageDiag.canUpload === false && storageDiag.bucketExists === true && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">⚠️ Bucket présent mais upload bloqué</p>
            <p className="text-amber-700 text-xs mt-1">
              {storageDiag.error?.includes('mime type')
                ? '→ Le bucket existe mais les policies RLS bloquent l\'upload. Exécutez le SQL Storage ci-dessous.'
                : '→ Policies RLS manquantes ou incorrectes. Exécutez le SQL Storage ci-dessous.'}
            </p>
            {storageDiag.error && (
              <p className="text-amber-600 text-xs mt-1 font-mono bg-amber-100 px-2 py-1 rounded">{storageDiag.error}</p>
            )}
          </div>
        </div>
      )}
      {storageDiag.canUpload === true && storageDiag.bucketPublic === true && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="font-bold text-emerald-800 text-sm">✅ Storage opérationnel — Les photos peuvent être uploadées et affichées.</p>
        </div>
      )}

      {/* ── SQL Artisan ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
          <Wrench className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <strong>SQL Artisans — Colonnes documents &amp; vérification</strong>
            <p className="text-xs mt-1 text-orange-700">Ajoute les colonnes manquantes à <code>artisan_profiles</code>.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Ajoute : artisan_type, doc_kbis_url, doc_insurance_url, doc_id_url, rejection_reason, is_featured + bucket documents</p>
          <CopyBlock sql={SQL_MAP.artisan} copied={copied('artisan')} onCopy={() => copy('artisan')} label="Copier SQL Artisans" color="orange" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.artisan}</pre>
        </div>
      </div>

      {/* ── SQL Collection Comments ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800">
            <strong>SQL Discussion — Commentaires sur articles de collection</strong>
            <p className="text-xs mt-1 text-rose-700">Active les discussions publiques sur chaque carte Collectionneurs.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Table collection_item_comments + policies RLS</p>
          <CopyBlock sql={SQL_MAP.collectionComments} copied={copied('collectionComments')} onCopy={() => copy('collectionComments')} label="Copier SQL Discussion Collection" color="red" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.collectionComments}</pre>
        </div>
      </div>

      {/* ── SQL Communautés ── */}
      <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 flex items-start gap-3">
          <Users className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-violet-800">
            <strong>🌐 SQL Communautés thématiques — Adhésions + Mini-profils</strong>
            <p className="text-xs mt-1 text-violet-700">Tables <code>theme_memberships</code> + <code>theme_profiles</code> + RLS.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">2 tables · RLS complète · index performances · Phase 1 MVP communautés</p>
          <CopyBlock sql={SQL_MAP.community} copied={copied('community')} onCopy={() => copy('community')} label="Copier SQL Communautés" color="violet" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-violet-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.community}</pre>
        </div>
      </div>

      {/* ── SQL Discussions communautaires ── */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <strong>💬 SQL Discussions communautaires — Forum public thématique</strong>
            <p className="text-xs mt-1 text-indigo-700">
              Tables <code>theme_discussions</code> + <code>theme_discussion_likes</code> + trigger likes + RLS.
              <br />⚠️ À exécuter <strong>APRÈS</strong> le SQL Communautés.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">2 tables · trigger compteur likes · RLS · index performances · Phase 2 communautés</p>
          <CopyBlock sql={SQL_MAP.discussions} copied={copied('discussions')} onCopy={() => copy('discussions')} label="Copier SQL Discussions" color="indigo" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.discussions}</pre>
        </div>
      </div>

      {/* ── SQL RLS Statuts ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-purple-50 border-b border-purple-100 flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900">
            <strong>🔐 RLS Statuts — Politiques + SECURITY DEFINER + Historique</strong>
            <p className="text-xs mt-1 text-purple-700">
              À exécuter <strong>après</strong> le SQL &quot;Statuts enrichis&quot;. Ajoute :<br />
              • Fonctions <code>change_*_status()</code> SECURITY DEFINER<br />
              • Politiques RLS UPDATE restreintes<br />
              • Table <code>status_history</code> + triggers d&apos;audit
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">4 fonctions SECURITY DEFINER · 6 politiques RLS · table status_history · 6 triggers audit</p>
          <CopyBlock sql={SQL_MAP.rls} copied={copied('rls')} onCopy={() => copy('rls')} label="Copier SQL RLS Statuts" color="violet" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-72">
          <pre className="text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.rls}</pre>
        </div>
      </div>

      {/* ── SQL Bucket ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>SQL Storage — Bucket &quot;photos&quot; + Policies RLS</strong>
            <p className="text-xs mt-1 text-blue-700">À exécuter <strong>une seule fois</strong> dans Supabase → SQL Editor si les photos ne s&apos;affichent pas.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Crée le bucket public + 4 policies (SELECT, INSERT, UPDATE, DELETE)</p>
          <CopyBlock sql={SQL_MAP.bucket} copied={copied('bucket')} onCopy={() => copy('bucket')} label="Copier SQL Storage" color="blue" />
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-64">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MAP.bucket}</pre>
        </div>
      </div>
    </>
  );
}

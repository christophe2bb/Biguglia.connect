'use client';

/**
 * Admin — File de modération centralisée
 *
 * Liste toutes les publications en attente de validation avec filtres
 * avancés, indicateurs de risque et actions rapides.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Clock, CheckCircle, XCircle, AlertTriangle, Filter,
  Search, RefreshCw, Eye, ChevronRight, ArrowLeft, Zap,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, Users, Flag, BarChart3, TrendingUp,
  AlertCircle, Info, Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import ModerationBadge from '@/components/ui/ModerationBadge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import toast from 'react-hot-toast';
import { formatRelative } from '@/lib/utils';
import {
  CONTENT_TYPE_LABELS, TRUST_LEVEL_CONFIG,
  type ModerationStatus, type ContentType, type TrustLevel,
} from '@/lib/moderation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QueueItem {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_title: string;
  content_excerpt: string;
  content_photos: string[];
  author_id: string;
  author_trust: TrustLevel;
  status: ModerationStatus;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completeness: number;
  validation_errors: { field: string; label?: string; message: string; weight: number }[];
  reviewed_by?: string;
  reviewed_at?: string;
  decision?: string;
  refusal_reason?: string;
  correction_reason?: string;
  moderator_note?: string;
  resubmit_count: number;
  submitted_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    created_at: string;
    publication_count?: number;
    reports_received?: number;
    trust_level?: string;
  };
}

interface KPIData {
  total: number;
  pending: number;
  published: number;
  refused: number;
  correction: number;
  archived: number;
  avg_review_hours: number | null;
  high_risk: number;
  new_authors: number;
  last_24h: number;
}

// ─── Config contenu ───────────────────────────────────────────────────────────
const CONTENT_ICONS: Record<ContentType, React.ElementType> = {
  listing:         Package,
  equipment:       Wrench,
  help_request:    Heart,
  outing:          Footprints,
  event:           Calendar,
  lost_found:      MapPin,
  collection_item: Star,
  association:     Handshake,
  forum_post:      BookOpen,
};

const RISK_CONFIG = {
  low:      { label: 'Faible',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🟢' },
  medium:   { label: 'Modéré',    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '🟡' },
  high:     { label: 'Élevé',     color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  emoji: '🟠' },
  critical: { label: 'Critique',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '🔴' },
};

// ─── Composant KPI Card ───────────────────────────────────────────────────────
function KPICard({ label, value, emoji, color, subtext, highlight }: {
  label: string; value: number | string; emoji: string;
  color: string; subtext?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
          {subtext && <p className="text-[10px] text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        <span className="text-2xl opacity-80">{emoji}</span>
      </div>
    </div>
  );
}

// ─── Composant ligne de file ──────────────────────────────────────────────────
function QueueRow({ item, onQuickDecision }: {
  item: QueueItem;
  onQuickDecision: (id: string, decision: 'accepter' | 'refuser') => void;
}) {
  const ContentIcon = CONTENT_ICONS[item.content_type] || Flag;
  const contentMeta = CONTENT_TYPE_LABELS[item.content_type];
  const risk = RISK_CONFIG[item.risk_level || 'low'];
  const trustCfg = TRUST_LEVEL_CONFIG[item.author_trust || 'nouveau'];

  const isUrgent = item.risk_level === 'critical' || item.risk_level === 'high';
  const isNew = item.author?.created_at
    ? (Date.now() - new Date(item.author.created_at).getTime()) < 7 * 24 * 3600 * 1000
    : false;

  return (
    <div className={`bg-white rounded-2xl border transition-all hover:shadow-sm ${
      isUrgent ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
    }`}>
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {/* Indicateur risque + type */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:w-16 sm:flex-shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${risk.bg} border ${risk.border}`}>
            <ContentIcon className={`w-5 h-5 ${risk.color}`} />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${risk.color}`}>
            {risk.emoji} {risk.label}
          </span>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
              {contentMeta?.emoji} {contentMeta?.label}
            </span>
            {item.resubmit_count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                🔄 {item.resubmit_count}e soumission
              </span>
            )}
            {isNew && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                🌱 Nouveau membre
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {item.content_title || '(Sans titre)'}
          </h3>
          {item.content_excerpt && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.content_excerpt}</p>
          )}

          {/* Erreurs de validation */}
          {item.validation_errors && item.validation_errors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.validation_errors.slice(0, 3).map((err, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                  ⚠ {err.label || err.field}
                </span>
              ))}
              {item.validation_errors.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  +{item.validation_errors.length - 3} autres
                </span>
              )}
            </div>
          )}

          {/* Auteur + date */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Avatar
                src={item.author?.avatar_url}
                name={item.author?.full_name || '?'}
                size="xs"
              />
              <span className="text-xs text-gray-600 font-medium">
                {item.author?.full_name || 'Inconnu'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${trustCfg.color} ${trustCfg.bg} ${trustCfg.border}`}>
                {trustCfg.emoji} {trustCfg.label}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {formatRelative(item.submitted_at)}
            </span>
          </div>
        </div>

        {/* Complétude */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2 sm:flex-shrink-0">
          <div className="text-center">
            <div className={`text-lg font-black ${
              item.completeness >= 80 ? 'text-emerald-600' :
              item.completeness >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>{item.completeness}%</div>
            <div className="text-[10px] text-gray-400">complétude</div>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  item.completeness >= 80 ? 'bg-emerald-400' :
                  item.completeness >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${item.completeness}%` }}
              />
            </div>
          </div>

          {/* Statut badge */}
          <ModerationBadge status={item.status} size="xs" showDot />

          {/* Actions rapides */}
          {item.status === 'en_attente_validation' && (
            <div className="flex gap-1">
              <button
                onClick={() => onQuickDecision(item.id, 'accepter')}
                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                title="Accepter"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onQuickDecision(item.id, 'refuser')}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                title="Refuser"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Lien détail */}
          <Link
            href={`/admin/moderation/${item.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Examiner
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function ModerationQueueContent() {
  const { profile, isModerator } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems]           = useState<QueueItem[]>([]);
  const [kpi, setKpi]               = useState<KPIData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filtres
  const [filterStatus, setFilterStatus]     = useState<string>('en_attente_validation');
  const [filterType, setFilterType]         = useState<string>('all');
  const [filterRisk, setFilterRisk]         = useState<string>('all');
  const [filterTrust, setFilterTrust]       = useState<string>('all');
  const [filterNewMember, setFilterNewMember] = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [sortBy, setSortBy]                 = useState<'submitted_at' | 'risk_score'>('submitted_at');

  // Redirection si non modérateur
  useEffect(() => {
    if (profile && !isModerator()) {
      router.push('/admin');
    }
  }, [profile, isModerator, router]);

  // Chargement KPI
  const fetchKPI = useCallback(async () => {
    const { data } = await supabase.from('moderation_kpi').select('*').single();
    if (data) {
      setKpi({
        total: Number(data.total) || 0,
        pending: Number(data.pending) || 0,
        published: Number(data.published) || 0,
        refused: Number(data.refused) || 0,
        correction: Number(data.correction) || 0,
        archived: Number(data.archived) || 0,
        avg_review_hours: data.avg_review_hours ? Number(data.avg_review_hours) : null,
        high_risk: Number(data.high_risk) || 0,
        new_authors: Number(data.new_authors) || 0,
        last_24h: Number(data.last_24h) || 0,
      });
    }
  }, [supabase]);

  // Chargement file
  const fetchItems = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('moderation_queue')
      .select(`
        *,
        author:profiles!moderation_queue_author_id_fkey(
          id, full_name, avatar_url, created_at,
          publication_count, reports_received, trust_level
        )
      `)
      .order(sortBy, { ascending: sortBy === 'risk_score' ? false : true });

    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    if (filterType   !== 'all') q = q.eq('content_type', filterType);
    if (filterRisk   !== 'all') q = q.eq('risk_level', filterRisk);
    if (filterTrust  !== 'all') q = q.eq('author_trust', filterTrust);
    if (searchQuery.trim())     q = q.ilike('content_title', `%${searchQuery.trim()}%`);

    const { data, error } = await q.limit(100);
    if (error) { console.error(error); }

    let results = (data || []) as QueueItem[];

    // Filtre nouveau membre côté client
    if (filterNewMember) {
      const threshold = Date.now() - 7 * 24 * 3600 * 1000;
      results = results.filter(item =>
        item.author?.created_at && new Date(item.author.created_at).getTime() > threshold
      );
    }

    setItems(results);
    setLoading(false);
  }, [supabase, filterStatus, filterType, filterRisk, filterTrust, filterNewMember, searchQuery, sortBy]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchKPI(); }, [fetchKPI]);

  // Décision rapide
  const handleQuickDecision = async (queueId: string, decision: 'accepter' | 'refuser') => {
    if (!profile) return;
    setProcessing(queueId);

    const newStatus = decision === 'accepter' ? 'publie' : 'refuse';
    const defaultReason = decision === 'refuser' ? 'manque_informations' : undefined;

    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: newStatus,
        decision,
        refusal_reason: defaultReason,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (error) {
      toast.error('Erreur lors de la décision');
    } else {
      toast.success(decision === 'accepter' ? '✅ Publication acceptée' : '❌ Publication refusée');
      fetchItems();
      fetchKPI();
    }
    setProcessing(null);
  };

  const pendingCount = kpi?.pending ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                File de modération
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 text-sm">Validation centralisée — toutes les publications</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchItems(); fetchKPI(); }}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <Link
            href="/admin/moderation/stats"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <KPICard label="En attente"    value={kpi?.pending ?? '—'}    emoji="⏳" color="text-amber-600"   highlight={(kpi?.pending ?? 0) > 0} />
        <KPICard label="Haut risque"   value={kpi?.high_risk ?? '—'}  emoji="⚠️" color="text-orange-600"  highlight={(kpi?.high_risk ?? 0) > 0} />
        <KPICard label="Publiées"      value={kpi?.published ?? '—'}  emoji="✅" color="text-emerald-600" />
        <KPICard label="Refusées"      value={kpi?.refused ?? '—'}    emoji="❌" color="text-red-600" />
        <KPICard
          label="Délai moyen"
          value={kpi?.avg_review_hours != null ? `${kpi.avg_review_hours.toFixed(1)}h` : '—'}
          emoji="⏱️"
          color="text-indigo-600"
          subtext="objectif < 24h"
        />
      </div>

      {/* Bannière alertes */}
      {(kpi?.high_risk ?? 0) > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">
              {kpi?.high_risk} publication{(kpi?.high_risk ?? 0) > 1 ? 's' : ''} à risque élevé nécessite{(kpi?.high_risk ?? 0) > 1 ? 'nt' : ''} une attention prioritaire
            </p>
          </div>
          <button
            onClick={() => { setFilterRisk('high'); setFilterStatus('en_attente_validation'); }}
            className="text-xs font-bold text-orange-700 hover:text-orange-900 underline"
          >
            Filtrer
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher titre, auteur…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Statut */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous statuts</option>
            <option value="en_attente_validation">⏳ En attente</option>
            <option value="a_corriger">✏️ À corriger</option>
            <option value="publie">✅ Publiées</option>
            <option value="refuse">❌ Refusées</option>
            <option value="brouillon">📝 Brouillons</option>
            <option value="archive">📦 Archivées</option>
            <option value="supprime_moderation">🗑️ Supprimées</option>
          </select>

          {/* Type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous types</option>
            {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, typeof CONTENT_TYPE_LABELS[ContentType]][]).map(([key, val]) => (
              <option key={key} value={key}>{val.emoji} {val.label}</option>
            ))}
          </select>

          {/* Risque */}
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous risques</option>
            <option value="critical">🔴 Critique</option>
            <option value="high">🟠 Élevé</option>
            <option value="medium">🟡 Modéré</option>
            <option value="low">🟢 Faible</option>
          </select>

          {/* Confiance auteur */}
          <select
            value={filterTrust}
            onChange={e => setFilterTrust(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous niveaux</option>
            <option value="nouveau">🌱 Nouveau</option>
            <option value="surveille">⚠️ Surveillé</option>
            <option value="fiable">✅ Fiable</option>
            <option value="de_confiance">🏆 De confiance</option>
          </select>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="submitted_at">Plus récent</option>
            <option value="risk_score">Plus risqué</option>
          </select>

          {/* Nouveaux membres */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterNewMember}
              onChange={e => setFilterNewMember(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-300"
            />
            🌱 Nouveaux membres
          </label>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">File vide</h3>
          <p className="text-gray-500 text-sm">
            {filterStatus === 'en_attente_validation'
              ? 'Aucune publication en attente de validation. ✓'
              : 'Aucun résultat pour ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{items.length}</span> publication{items.length > 1 ? 's' : ''}
            </p>
            {processing && (
              <div className="flex items-center gap-2 text-sm text-brand-600">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                Traitement…
              </div>
            )}
          </div>
          {items.map(item => (
            <QueueRow
              key={item.id}
              item={item}
              onQuickDecision={handleQuickDecision}
            />
          ))}
        </div>
      )}

      {/* Info bas de page */}
      <div className="mt-8 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Objectifs de traitement</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Contenu standard : <strong>{'<'}24h</strong> · Contenu sensible / haut risque : <strong>quelques heures</strong> · Les auteurs sont notifiés automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <ProtectedPage adminOnly>
      <ModerationQueueContent />
    </ProtectedPage>
  );
}

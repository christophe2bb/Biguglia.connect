'use client';

/**
 * ModerationDrawer — Panneau latéral détail d'un item de modération (lazy-loaded).
 *
 * Affiché quand l'admin clique sur "Examiner" depuis QueueRow.
 * Chargé en lazy via dynamic() depuis page.tsx pour ne pas peser sur le bundle initial.
 *
 * Délègue la décision à onQuickDecision et redirige vers /admin/moderation/[id]
 * pour l'examen complet.
 *
 * Usage:
 *   const ModerationDrawer = dynamic(() => import('./_components/ModerationDrawer'));
 */

import { useEffect } from 'react';
import Link from 'next/link';
import {
  X, CheckCircle, XCircle, Eye,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, Flag, Star, ExternalLink,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ModerationBadge from '@/components/ui/ModerationBadge';
import { formatRelative } from '@/lib/utils';
import {
  CONTENT_TYPE_LABELS, TRUST_LEVEL_CONFIG,
  type ModerationStatus, type ContentType, type TrustLevel,
} from '@/lib/moderation';
import type { QueueItem as ApiQueueItem } from '@/app/api/admin/moderation/queue/route';

type QueueItem = ApiQueueItem & {
  author_trust: TrustLevel;
  status: ModerationStatus;
  content_type: ContentType;
};

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
  low:      { label: 'Faible',   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🟢' },
  medium:   { label: 'Modéré',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '🟡' },
  high:     { label: 'Élevé',    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  emoji: '🟠' },
  critical: { label: 'Critique', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '🔴' },
};

interface ModerationDrawerProps {
  item: QueueItem;
  processing: boolean;
  onClose: () => void;
  onQuickDecision: (id: string, decision: 'accepter' | 'refuser') => void;
}

export default function ModerationDrawer({
  item, processing, onClose, onQuickDecision,
}: ModerationDrawerProps) {
  const ContentIcon = CONTENT_ICONS[item.content_type] || Flag;
  const contentMeta = CONTENT_TYPE_LABELS[item.content_type];
  const risk        = RISK_CONFIG[item.risk_level || 'low'];
  const trustCfg    = TRUST_LEVEL_CONFIG[item.author_trust || 'nouveau'];

  const isNew = item.author?.created_at
    ? (Date.now() - new Date(item.author.created_at).getTime()) < 7 * 24 * 3600 * 1000
    : false;

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panneau */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* En-tête */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${risk.bg} border ${risk.border}`}>
            <ContentIcon className={`w-5 h-5 ${risk.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
                {risk.emoji} {risk.label}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
                {contentMeta?.emoji} {contentMeta?.label}
              </span>
              {isNew && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  🌱 Nouveau membre
                </span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 truncate text-sm">
              {item.content_title || '(Sans titre)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Extrait */}
          {item.content_excerpt && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Extrait</h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100">
                {item.content_excerpt}
              </p>
            </section>
          )}

          {/* Auteur */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Auteur</h3>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <Avatar src={item.author?.avatar_url} name={item.author?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{item.author?.full_name || 'Inconnu'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${trustCfg.color} ${trustCfg.bg} ${trustCfg.border}`}>
                    {trustCfg.emoji} {trustCfg.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Soumis {formatRelative(item.submitted_at)}
                  {item.resubmit_count > 0 && (
                    <span className="ml-2 text-indigo-600 font-medium">
                      🔄 {item.resubmit_count}e soumission
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Erreurs de validation */}
          {item.validation_errors && item.validation_errors.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Points de vigilance</h3>
              <div className="space-y-1">
                {item.validation_errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100">
                    ⚠ <span>{err.label || err.field}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Complétude */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Complétude</h3>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className={`text-3xl font-black mb-1 ${
                item.completeness >= 80 ? 'text-emerald-600' :
                item.completeness >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>{item.completeness}%</div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.completeness >= 80 ? 'bg-emerald-400' :
                    item.completeness >= 50 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${item.completeness}%` }}
                />
              </div>
            </div>
          </section>

          {/* Statut actuel */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Statut actuel</h3>
            <ModerationBadge status={item.status} size="md" showDot showSublabel />
          </section>
        </div>

        {/* Pied fixe : actions */}
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-3">
          {item.status === 'en_attente_validation' && (
            <div className="flex gap-2">
              <button
                onClick={() => { onQuickDecision(item.id, 'refuser'); onClose(); }}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" /> Refuser
              </button>
              <button
                onClick={() => { onQuickDecision(item.id, 'accepter'); onClose(); }}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {processing
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle className="w-4 h-4" />
                }
                Accepter
              </button>
            </div>
          )}
          <Link
            href={`/admin/moderation/${item.id}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Examiner en détail
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>
      </aside>
    </>
  );
}

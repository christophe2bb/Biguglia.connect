'use client';

import Link from 'next/link';
import { Pencil, Trash2, Printer } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import ReportButton from '@/components/ui/ReportButton';
import { STATUS_CONFIG, ALLOWED_TRANSITIONS } from '../_config';
import type { LFItem, LFStatus, ShareMode } from '../_types';

type Props = {
  item: LFItem;
  isAuthor: boolean;
  canEdit: boolean;
  isActive: boolean;
  transitioning: boolean;
  userId: string | undefined;
  onStatusChange: (s: LFStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onShare: (mode: ShareMode) => void;
  onPrint: () => void;
};

export function ActionsPanel({
  item, isAuthor, canEdit, isActive, transitioning,
  userId, onStatusChange, onDelete, onShare, onPrint,
}: Props) {
  const transitions = ALLOWED_TRANSITIONS[item.status] ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:hidden">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</p>
      <div className="flex flex-wrap gap-2">

        {/* Visitor CTA */}
        {!isAuthor && isActive && (
          <ContactButton
            sourceType="lost_found"
            sourceId={item.id}
            sourceTitle={item.title}
            ownerId={item.author_id}
            userId={userId}
            size="md"
            ctaLabel={item.type === 'trouve' ? "C'est le mien" : "J'ai une info"}
            prefillMsg={
              item.type === 'trouve'
                ? `Bonjour, l'objet "${item.title}" trouvé à ${item.location_area} pourrait m'appartenir.`
                : `Bonjour, j'ai peut-être une information concernant votre "${item.title}" perdu à ${item.location_area}.`
            }
          />
        )}

        {/* Status transitions (canEdit only) */}
        {canEdit && transitions.map(t => {
          const tCfg = STATUS_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => onStatusChange(t)}
              disabled={transitioning}
              className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}
            >
              {tCfg.icon} → {tCfg.label}
            </button>
          );
        })}

        {/* Share buttons */}
        <button
          onClick={() => onShare('sms')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
        >
          💬 SMS
        </button>
        <button
          onClick={() => onShare('email')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
        >
          📧 Email
        </button>
        <button
          onClick={() => onShare('copy')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
        >
          🔗 Copier le lien
        </button>
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
        >
          <Printer className="w-4 h-4" /> Imprimer
        </button>

        {/* Edit / archive (canEdit only) */}
        {canEdit && (
          <>
            <Link
              href={`/perdu-trouve?edit=${item.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
            >
              <Pencil className="w-4 h-4" /> Modifier
            </Link>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Archiver
            </button>
          </>
        )}

        {/* Report (visitors only) */}
        {!isAuthor && (
          <ReportButton
            targetType="lost_found"
            targetId={item.id}
            targetTitle={item.title}
            variant="mini"
          />
        )}
      </div>
    </div>
  );
}

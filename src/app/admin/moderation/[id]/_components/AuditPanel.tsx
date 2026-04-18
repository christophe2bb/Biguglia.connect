

import Link from 'next/link';
import { ArrowLeft, Clock, Eye } from 'lucide-react';
import { Section } from './Section';
import type { QueueDetail } from '../_types';

interface Props {
  item: QueueDetail;
  contentUrl: string;
}

export function AuditPanel({ item, contentUrl }: Props) {
  const rows = [
    { label: 'Créé le',       value: new Date(item.created_at).toLocaleString('fr-FR') },
    { label: 'Soumis le',     value: new Date(item.submitted_at).toLocaleString('fr-FR') },
    { label: 'Resoumissions', value: String(item.resubmit_count) },
    { label: 'ID file',       value: `${item.id.slice(0, 8)}…` },
    { label: 'ID contenu',    value: `${item.content_id?.slice(0, 8)}…` },
  ];

  return (
    <>
      <Section title="Informations d'audit" icon={Clock}>
        <div className="space-y-2 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">
                {value}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Navigation rapide */}
      <div className="flex gap-2">
        <Link
          href="/admin/moderation"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> File
        </Link>
        <Link
          href={contentUrl}
          target="_blank"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm transition-colors"
        >
          <Eye className="w-4 h-4" /> Voir
        </Link>
      </div>
    </>
  );
}

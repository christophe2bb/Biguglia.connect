

import { STATUS_CONFIG } from '../_constants';
import type { LFStatus } from '../_types';

interface Props {
  status: LFStatus;
  size?: 'xs' | 'sm' | 'md';
}

export default function LFStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.perdu;
  const sz =
    size === 'xs' ? 'text-[10px] px-1.5 py-0.5' :
    size === 'md' ? 'text-sm px-3 py-1.5' :
                    'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.icon} {cfg.label}
    </span>
  );
}

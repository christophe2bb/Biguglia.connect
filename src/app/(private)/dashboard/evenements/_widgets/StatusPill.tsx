

import { EVENT_STATUS_CONFIG, type EventStatus } from '@/lib/events';

export default function StatusPill({ status }: { status: string }) {
  const cfg = EVENT_STATUS_CONFIG[status as EventStatus];
  if (!cfg) return <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

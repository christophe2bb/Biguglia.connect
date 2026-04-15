'use client';

// ─── StatusManagerCDM ─────────────────────────────────────────────────────────

type Props = {
  status: string;
  onStatusChange: (s: string) => void;
  onResolve: () => void;
  onPause: () => void;
};

export default function StatusManagerCDM({ status, onStatusChange, onResolve, onPause }: Props) {
  const actions: { label: string; statusKey: string; color: string }[] = [];

  if (status === 'active') {
    actions.push({ label: '⚡ En cours',   statusKey: 'in_progress', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' });
    actions.push({ label: '⏸ Pause',      statusKey: 'paused',      color: 'text-amber-600 bg-amber-50 border-amber-200' });
    actions.push({ label: '✅ Résolu',    statusKey: 'resolved',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' });
    actions.push({ label: '✖ Fermer',    statusKey: 'closed',      color: 'text-gray-500 bg-gray-50 border-gray-200' });
  } else if (status === 'in_progress') {
    actions.push({ label: '⏸ Pause',      statusKey: 'paused',      color: 'text-amber-600 bg-amber-50 border-amber-200' });
    actions.push({ label: '✅ Résolu',    statusKey: 'resolved',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' });
    actions.push({ label: '✖ Fermer',    statusKey: 'closed',      color: 'text-gray-500 bg-gray-50 border-gray-200' });
  } else if (status === 'paused') {
    actions.push({ label: '▶️ Réactiver', statusKey: 'active',      color: 'text-orange-600 bg-orange-50 border-orange-200' });
    actions.push({ label: '✅ Résolu',    statusKey: 'resolved',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' });
  } else if (status === 'resolved' || status === 'closed') {
    actions.push({ label: '🔄 Réouvrir', statusKey: 'active',      color: 'text-orange-600 bg-orange-50 border-orange-200' });
    actions.push({ label: '📦 Archiver', statusKey: 'archived',    color: 'text-gray-500 bg-gray-50 border-gray-200' });
  } else if (status === 'archived') {
    actions.push({ label: '🔄 Restaurer', statusKey: 'active',     color: 'text-orange-600 bg-orange-50 border-orange-200' });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {actions.map(a => (
        <button
          key={a.statusKey}
          type="button"
          onClick={() => {
            if (a.statusKey === 'resolved') onResolve();
            else if (a.statusKey === 'paused' || a.statusKey === 'active') onPause();
            else onStatusChange(a.statusKey);
          }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${a.color}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

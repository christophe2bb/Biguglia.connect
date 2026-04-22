

import { type LFItem } from './types';

interface Props {
  items: LFItem[];
}

export default function ActivityChart({ items }: Props) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return {
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const perdus = months.map(m => items.filter(it => it.type === 'perdu' && it.created_at.startsWith(m.key)).length);
  const trouves = months.map(m => items.filter(it => it.type === 'trouve' && it.created_at.startsWith(m.key)).length);
  const maxVal = Math.max(...perdus, ...trouves, 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24 mb-2">
        {months.map((m, i) => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex flex-col-reverse gap-0.5">
              <div
                className="w-full bg-orange-400 rounded-t transition-colors"
                style={{ height: `${Math.max((perdus[i] / maxVal) * 80, perdus[i] > 0 ? 4 : 0)}px` }}
                title={`${perdus[i]} perdu(s)`}
              />
              <div
                className="w-full bg-emerald-400 rounded-t transition-colors"
                style={{ height: `${Math.max((trouves[i] / maxVal) * 80, trouves[i] > 0 ? 4 : 0)}px` }}
                title={`${trouves[i]} trouvé(s)`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {months.map(m => (
          <div key={m.key} className="flex-1 text-center text-[9px] text-gray-400 truncate">{m.label}</div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Perdus</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Trouvés</span>
      </div>
    </div>
  );
}

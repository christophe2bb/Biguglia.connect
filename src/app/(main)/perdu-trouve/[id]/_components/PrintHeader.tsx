import { CATEGORIES } from '../_config';
import type { LFItem } from '../_types';

type Props = { item: LFItem };

/** Shown only when printing (hidden on screen via print:block / hidden). */
export function PrintHeader({ item }: Props) {
  return (
    <div className="hidden print:block p-6 border-b border-gray-300 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Biguglia Connect — Perdu / Trouvé</p>
          <h1 className="text-2xl font-black text-gray-900">{item.title}</h1>
          <p className="text-sm text-gray-500">
            {item.type === 'perdu' ? 'Objet perdu' : 'Objet trouvé'}
            {' · '}
            {CATEGORIES[item.category] ?? item.category}
            {' · '}
            {item.location_area}
            {' · '}
            {item.lost_date}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Fiche #{item.id.slice(0, 8)}</p>
          <p>Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { ConfirmModal } from '../_config';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import { useEquipment } from '../_hooks/useEquipment';
import type { ConfirmTarget } from '../_types';

const AVAIL_OPTIONS = [
  { value: '',            label: 'Tous'           },
  { value: 'available',   label: 'Disponibles'    },
  { value: 'unavailable', label: 'Indisponibles'  },
];

export default function EquipmentTab() {
  const {
    items, loading,
    search, setSearch,
    availFilter, setAvailFilter,
    fetchEquipment, deleteItem, toggleAvail,
  } = useEquipment();

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'équipement"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.label}" ?`}
        onConfirm={() => { if (confirm) { deleteItem(confirm.id); setConfirm(null); } }}
        onCancel={() => setConfirm(null)}
      />

      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher titre, propriétaire..."
        selectValue={availFilter}
        onSelectChange={setAvailFilter}
        selectOptions={AVAIL_OPTIONS}
        onRefresh={fetchEquipment}
        count={items.length}
        countLabel={`équipement${items.length !== 1 ? 's' : ''}`}
      />

      <ContentTable loading={loading} empty={items.length === 0} emptyMessage="Aucun équipement trouvé">
        {items.map(equip => (
          <div
            key={equip.id}
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${!equip.is_available ? 'opacity-70' : ''}`}
          >
            <Avatar src={equip.owner?.avatar_url} name={equip.owner?.full_name || '?'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-semibold text-gray-900 text-sm truncate">{equip.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  equip.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {equip.is_available ? 'Disponible' : 'Indisponible'}
                </span>
                {equip.category && <span className="text-xs text-gray-400">{equip.category.icon} {equip.category.name}</span>}

              </div>
              <div className="text-xs text-gray-500">
                Par <span className="font-medium">{equip.owner?.full_name || equip.owner?.email}</span>
                {' · '}{formatRelative(equip.created_at)}
                {equip.condition && <span className="text-gray-400"> · État : {equip.condition}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => toggleAvail(equip.id, equip.is_available)}
                className={`p-1.5 rounded-lg transition-colors ${
                  equip.is_available ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'
                }`}
                title={equip.is_available ? 'Marquer indisponible' : 'Marquer disponible'}
              >
                {equip.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setConfirm({ id: equip.id, label: equip.title })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </ContentTable>
    </div>
  );
}

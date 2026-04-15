'use client';

import { useRouter } from 'next/navigation';
import { Plus, Wrench, Archive } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useState } from 'react';
import EquipmentItemCard, { type EquipmentWithRequests } from './EquipmentItemCard';
import { type EquipmentStatus } from '@/lib/equipment';

interface Props {
  activeItems: EquipmentWithRequests[];
  archivedItems: EquipmentWithRequests[];
  actionLoading: string | null;
  onStatusChange: (id: string, s: EquipmentStatus) => void;
  onDelete: (item: EquipmentWithRequests) => void;
  onDuplicate: (item: EquipmentWithRequests) => void;
}

export default function MaterielTab({
  activeItems, archivedItems, actionLoading, onStatusChange, onDelete, onDuplicate,
}: Props) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="space-y-4">
      {activeItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-2">Aucun matériel proposé</p>
          <Button onClick={() => router.push('/materiel/nouveau')}>
            <Plus className="w-4 h-4" /> Proposer du matériel
          </Button>
        </div>
      ) : (
        activeItems.map(item => (
          <EquipmentItemCard key={item.id} item={item}
            onStatusChange={onStatusChange} onDelete={onDelete}
            onDuplicate={onDuplicate}
            loading={actionLoading === item.id || actionLoading === `dup-${item.id}`} />
        ))
      )}

      {archivedItems.length > 0 && (
        <div className="pt-4">
          <button onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3">
            <Archive className="w-4 h-4" />
            {showArchived ? 'Masquer' : 'Afficher'} les archivés ({archivedItems.length})
          </button>
          {showArchived && archivedItems.map(item => (
            <EquipmentItemCard key={item.id} item={item}
              onStatusChange={onStatusChange}
              onDelete={onDelete} onDuplicate={onDuplicate}
              loading={actionLoading === item.id || actionLoading === `dup-${item.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

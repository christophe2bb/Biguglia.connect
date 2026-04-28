'use client';

import { useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { ConfirmModal } from '../_config';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import { useListings } from '../_hooks/useListings';
import type { ConfirmTarget } from '../_types';

const STATUS_OPTIONS = [
  { value: '',         label: 'Tous les statuts' },
  { value: 'active',   label: 'Actives'          },
  { value: 'inactive', label: 'Désactivées'      },
  { value: 'sold',     label: 'Vendues / Données' },
];

export default function ListingsTab() {
  const {
    items, loading,
    search, setSearch,
    statusFilter, setStatusFilter,
    fetchListings, deleteItem, toggleStatus,
  } = useListings();

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'annonce"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.label}" ?`}
        onConfirm={() => { if (confirm) { deleteItem(confirm.id); setConfirm(null); } }}
        onCancel={() => setConfirm(null)}
      />

      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher titre, auteur..."
        selectValue={statusFilter}
        onSelectChange={setStatusFilter}
        selectOptions={STATUS_OPTIONS}
        onRefresh={fetchListings}
        count={items.length}
        countLabel={`annonce${items.length !== 1 ? 's' : ''}`}
      />

      <ContentTable loading={loading} empty={items.length === 0} emptyMessage="Aucune annonce trouvée">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${item.status !== 'active' ? 'opacity-60' : ''}`}
          >
            <Avatar src={item.owner?.avatar_url} name={item.owner?.full_name || '?'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-semibold text-gray-900 text-sm truncate">{item.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.status === 'active' ? 'bg-green-100 text-green-700'
                  : item.status === 'sold'  ? 'bg-gray-100 text-gray-500'
                  :                           'bg-red-100 text-red-600'
                }`}>
                  {item.status === 'active' ? 'Active' : item.status === 'sold' ? 'Vendue' : 'Inactive'}
                </span>
                {item.category && <span className="text-xs text-gray-400">{item.category.icon} {item.category.name}</span>}
                <span className="text-xs text-gray-400">
                  {item.listing_type === 'free' ? '🎁 Gratuit'
                    : item.listing_type === 'wanted' ? '🔍 Recherché'
                    : item.listing_type === 'service' ? '👷 Service'
                    : item.price ? `${item.price} €` : ''}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Par <span className="font-medium">{item.owner?.full_name || item.owner?.email}</span>
                {' · '}{formatRelative(item.created_at)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => toggleStatus(item.id, item.status)}
                className={`p-1.5 rounded-lg transition-colors ${
                  item.status === 'active' ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'
                }`}
                title={item.status === 'active' ? 'Désactiver' : 'Réactiver'}
              >
                {item.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setConfirm({ id: item.id, label: item.title })}
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

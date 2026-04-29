'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react';
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
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.label}" ? Cette action est irréversible.`}
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
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-opacity ${
              item.status !== 'active' ? 'opacity-60 border-red-100' : 'border-gray-100'
            }`}
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
                  {item.status === 'active' ? 'Active' : item.status === 'sold' ? 'Vendue' : 'Bloquée'}
                </span>
                {item.category && (
                  <span className="text-xs text-gray-400">{item.category.icon} {item.category.name}</span>
                )}
                <span className="text-xs text-gray-400">
                  {item.listing_type === 'free'    ? '🎁 Gratuit'
                    : item.listing_type === 'wanted'  ? '🔍 Recherché'
                    : item.listing_type === 'service' ? '👷 Service'
                    : item.price ? `${item.price} €` : ''}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Par <span className="font-medium">{item.owner?.full_name || item.owner?.email}</span>
                {' · '}{formatRelative(item.created_at)}
              </div>
              {item.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Voir la page publique */}
              <Link
                href={`/annonces/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                title="Voir l'annonce (page publique)"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              {/* Bloquer / Réactiver */}
              {item.status !== 'sold' && (
                <button
                  onClick={() => toggleStatus(item.id, item.status)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.status === 'active'
                      ? 'hover:bg-red-50 text-red-500'
                      : 'hover:bg-green-50 text-green-600'
                  }`}
                  title={item.status === 'active' ? 'Bloquer l\'annonce' : 'Réactiver l\'annonce'}
                >
                  {item.status === 'active'
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              )}

              {/* Supprimer */}
              <button
                onClick={() => setConfirm({ id: item.id, label: item.title })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title="Supprimer définitivement"
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

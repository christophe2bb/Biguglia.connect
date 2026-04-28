'use client';

import { useState } from 'react';
import { Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { ConfirmModal } from '../_config';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import { useForumPosts } from '../_hooks/useForumPosts';
import type { ConfirmTarget } from '../_types';

const CLOSED_OPTIONS = [
  { value: '',       label: 'Tous'    },
  { value: 'open',   label: 'Ouverts' },
  { value: 'closed', label: 'Fermés'  },
];

export default function ForumTab() {
  const {
    items, loading,
    search, setSearch,
    closedFilter, setClosedFilter,
    fetchPosts, deleteItem, toggleClosed, togglePinned,
  } = useForumPosts();

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer le post"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${confirm?.label}" et tous ses commentaires ?`}
        onConfirm={() => { if (confirm) { deleteItem(confirm.id); setConfirm(null); } }}
        onCancel={() => setConfirm(null)}
      />

      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher titre, auteur..."
        selectValue={closedFilter}
        onSelectChange={setClosedFilter}
        selectOptions={CLOSED_OPTIONS}
        onRefresh={fetchPosts}
        count={items.length}
        countLabel={`post${items.length !== 1 ? 's' : ''}`}
      />

      <ContentTable loading={loading} empty={items.length === 0} emptyMessage="Aucun post trouvé">
        {items.map(post => (
          <div
            key={post.id}
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${post.is_closed ? 'opacity-70' : ''}`}
          >
            <Avatar src={post.author?.avatar_url} name={post.author?.full_name || '?'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {post.is_pinned && (
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                    📌 Épinglé
                  </span>
                )}
                <span className="font-semibold text-gray-900 text-sm truncate">{post.title}</span>
                {post.is_closed && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Fermé</span>
                )}
                {post.category && <span className="text-xs text-gray-400">{post.category.icon} {post.category.name}</span>}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />{post.views || 0} vues
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Par <span className="font-medium">{post.author?.full_name || post.author?.email}</span>
                {' · '}{formatRelative(post.created_at)}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{post.content}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => togglePinned(post.id, post.is_pinned)}
                className={`p-1.5 rounded-lg transition-colors ${post.is_pinned ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-100 text-gray-400'}`}
                title={post.is_pinned ? 'Désépingler' : 'Épingler'}
              >
                📌
              </button>
              <button
                onClick={() => toggleClosed(post.id, post.is_closed)}
                className={`p-1.5 rounded-lg transition-colors ${post.is_closed ? 'hover:bg-green-50 text-green-600' : 'hover:bg-amber-50 text-amber-600'}`}
                title={post.is_closed ? 'Rouvrir' : 'Fermer'}
              >
                {post.is_closed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setConfirm({ id: post.id, label: post.title })}
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2, CheckCircle, XCircle, Pin, ExternalLink } from 'lucide-react';
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
        message={`Supprimer définitivement "${confirm?.label}" et tous ses commentaires ? Cette action est irréversible.`}
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
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-opacity ${
              post.is_closed ? 'opacity-70 border-gray-200' : 'border-gray-100'
            }`}
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
                {post.category && (
                  <span className="text-xs text-gray-400">{post.category.icon} {post.category.name}</span>
                )}
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

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Voir le post (page publique) */}
              <Link
                href={`/forum/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                title="Voir le post (page publique)"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              {/* Épingler / Désépingler */}
              <button
                onClick={() => togglePinned(post.id, post.is_pinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  post.is_pinned
                    ? 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                    : 'hover:bg-gray-100 text-gray-400'
                }`}
                title={post.is_pinned ? 'Désépingler' : 'Épingler en haut'}
              >
                <Pin className="w-4 h-4" />
              </button>

              {/* Fermer / Rouvrir */}
              <button
                onClick={() => toggleClosed(post.id, post.is_closed)}
                className={`p-1.5 rounded-lg transition-colors ${
                  post.is_closed
                    ? 'hover:bg-green-50 text-green-600'
                    : 'hover:bg-amber-50 text-amber-600'
                }`}
                title={post.is_closed ? 'Rouvrir le post' : 'Fermer les réponses'}
              >
                {post.is_closed
                  ? <CheckCircle className="w-4 h-4" />
                  : <XCircle className="w-4 h-4" />
                }
              </button>

              {/* Supprimer */}
              <button
                onClick={() => setConfirm({ id: post.id, label: post.title })}
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

'use client';

import { ForumSector, ForumTopic } from '@/types';
import { MessageCircle, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopicCard } from './TopicCard';

interface Props {
  topics:             ForumTopic[];
  sectors:            ForumSector[];
  loading:            boolean;
  viewMode:           'list' | 'grid';
  activeFiltersCount: number;
  isAuthenticated:    boolean;
  clearFilters:       () => void;
}

// ─── Squelette de chargement ──────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-100 rounded-full w-16" />
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── État vide ────────────────────────────────────────────────────────────────
function EmptyState({ activeFiltersCount, isAuthenticated, clearFilters }: {
  activeFiltersCount: number;
  isAuthenticated: boolean;
  clearFilters: () => void;
}) {
  const router = useRouter();
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <MessageCircle className="w-8 h-8 text-violet-300" />
      </div>
      <p className="text-gray-600 font-bold mb-1 text-lg">
        {activeFiltersCount > 0 ? 'Aucun sujet pour ces filtres' : "Aucun sujet pour l'instant"}
      </p>
      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
        {activeFiltersCount > 0 ? 'Essayez d\'élargir vos critères ou changez de catégorie.' : 'Lancez la première discussion dans votre quartier !'}
      </p>
      {activeFiltersCount > 0 ? (
        <button onClick={clearFilters} className="inline-flex items-center gap-2 text-violet-600 font-bold text-sm bg-violet-50 px-5 py-2.5 rounded-xl border border-violet-200 hover:bg-violet-100 transition-colors">
          Effacer les filtres
        </button>
      ) : isAuthenticated ? (
        <button onClick={() => router.push('/forum/nouveau')}
          className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Créer le premier sujet
        </button>
      ) : (
        <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors shadow-sm">
          Se connecter pour contribuer
        </Link>
      )}
    </div>
  );
}

// ─── ForumFeed ────────────────────────────────────────────────────────────────
export function ForumFeed({ topics, sectors, loading, viewMode, activeFiltersCount, isAuthenticated, clearFilters }: Props) {
  if (loading) return <LoadingSkeleton />;

  if (topics.length === 0) {
    return <EmptyState activeFiltersCount={activeFiltersCount} isAuthenticated={isAuthenticated} clearFilters={clearFilters} />;
  }

  return (
    <>
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
        {topics.map(topic => (
          <TopicCard key={topic.id} topic={topic} sectors={sectors} />
        ))}
      </div>

      {/* CTA non connecté */}
      {!isAuthenticated && (
        <div className="mt-8 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-6 text-center">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-violet-500" />
          </div>
          <p className="text-violet-800 font-bold text-base mb-1">Rejoignez la conversation</p>
          <p className="text-violet-600 text-sm mb-4">Connectez-vous pour créer un sujet, répondre, réagir et suivre les discussions.</p>
          <Link href="/connexion">
            <button className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors shadow-sm">
              Se connecter
            </button>
          </Link>
        </div>
      )}
    </>
  );
}

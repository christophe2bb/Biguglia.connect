'use client';

import { RefObject } from 'react';
import Link from 'next/link';
import {
  Info, Loader2, MessageSquare, RefreshCw,
  Pin, ThumbsUp, Clock, Plus,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import ThemeComposer from './ThemeComposer';
import { formatTime } from '../_hooks/useThemePageData';
import type { Discussion, ThemeConfig } from '../_types';

interface ThemeDiscussionsProps {
  themeSlug: string;
  themeConfig: ThemeConfig;
  discussions: Discussion[];
  discLoading: boolean;
  discError: string | null;
  isMember: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  isLoggedIn: boolean;
  newMessage: string;
  sendingMsg: boolean;
  discussEndRef: RefObject<HTMLDivElement>;
  onRefresh: () => void;
  onLike: (disc: Discussion) => void;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  onJoined: () => void;
  onLeft: () => void;
}

export default function ThemeDiscussions({
  themeSlug,
  themeConfig,
  discussions,
  discLoading,
  discError,
  isMember,
  currentUserId,
  currentUserName = '',
  currentUserAvatar,
  isLoggedIn,
  newMessage,
  sendingMsg,
  discussEndRef,
  onRefresh,
  onLike,
  onMessageChange,
  onSend,
  onJoined,
  onLeft,
}: ThemeDiscussionsProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Not logged in banner */}
      {!isLoggedIn && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <Link href="/connexion" className="font-semibold underline">Connectez-vous</Link>{' '}
            et rejoignez la communauté pour participer aux discussions.
          </p>
        </div>
      )}

      {/* Logged in but not a member */}
      {isLoggedIn && !isMember && (
        <div
          className={`${themeConfig.accentBg} border ${themeConfig.borderColor} rounded-2xl p-4 flex items-center justify-between gap-3`}
        >
          <p className={`text-sm ${themeConfig.textColor} font-medium`}>
            Rejoignez la communauté pour participer aux discussions publiques.
          </p>
          <CommunityJoinButton
            themeSlug={themeSlug}
            userId={currentUserId}
            size="sm"
            onJoined={onJoined}
            onLeft={onLeft}
          />
        </div>
      )}

      {/* SQL missing warning */}
      {discError === 'sql_missing' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm text-amber-800 font-medium mb-1">Table discussions manquante</p>
          <p className="text-xs text-amber-600 mb-3">
            Exécutez le SQL « Discussions communautaires » dans Admin → Migration DB.
          </p>
          <Link href="/admin/migration" className="text-xs font-bold text-amber-700 underline">
            Admin → Migration DB →
          </Link>
        </div>
      )}

      {/* Discussion list */}
      {discLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Chargement des discussions…</span>
        </div>
      ) : (
        discError !== 'sql_missing' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Discussions publiques
              </h2>
              <button
                onClick={onRefresh}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${discLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Messages */}
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {discussions.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Aucune discussion pour l&apos;instant</p>
                  <p className="text-xs mt-1">Soyez le premier à lancer la conversation !</p>
                </div>
              ) : (
                discussions.map((disc) => (
                  <div
                    key={disc.id}
                    className={`px-5 py-4 flex gap-3 hover:bg-gray-50/50 transition ${
                      disc.is_pinned ? 'bg-amber-50/50 border-l-4 border-l-amber-300' : ''
                    }`}
                  >
                    <Avatar
                      src={disc.author?.avatar_url}
                      name={disc.author?.full_name ?? '?'}
                      size="sm"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {disc.author?.full_name ?? 'Membre'}
                        </span>
                        {disc.is_pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Pin className="w-2.5 h-2.5" /> Épinglé
                          </span>
                        )}
                        {disc.author_id === currentUserId && (
                          <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">
                            Vous
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-auto flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatTime(disc.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                        {disc.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => isLoggedIn && onLike(disc)}
                          disabled={!isLoggedIn}
                          className={`flex items-center gap-1 text-xs transition ${
                            disc.my_like
                              ? 'text-brand-600 font-semibold'
                              : 'text-gray-400 hover:text-brand-500'
                          } disabled:cursor-default`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {disc.likes_count > 0 && <span>{disc.likes_count}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={discussEndRef} />
            </div>

            {/* Composer (member only) */}
            {isLoggedIn && isMember && (
              <ThemeComposer
                avatarUrl={currentUserAvatar}
                fullName={currentUserName}
                newMessage={newMessage}
                sendingMsg={sendingMsg}
                onMessageChange={onMessageChange}
                onSend={onSend}
              />
            )}

            {/* CTA join if connected but not member */}
            {isLoggedIn && !isMember && discError !== 'sql_missing' && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-sm text-gray-500 mb-3">Rejoignez la communauté pour participer</p>
                <CommunityJoinButton
                  themeSlug={themeSlug}
                  userId={currentUserId}
                  size="sm"
                  onJoined={onJoined}
                  onLeft={onLeft}
                />
              </div>
            )}
          </div>
        )
      )}

      {/* CTA publish on theme page */}
      <div
        className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-4 flex items-center justify-between gap-3`}
      >
        <div>
          <p className={`text-sm font-semibold ${themeConfig.textColor}`}>
            Envie de publier du contenu ?
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Publiez une annonce, une sortie ou un événement sur la page {themeConfig.label}.
          </p>
        </div>
        <Link
          href={themeConfig.href}
          className={`flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} hover:shadow-sm transition whitespace-nowrap flex-shrink-0`}
        >
          <Plus className="w-4 h-4" />
          Publier
        </Link>
      </div>
    </div>
  );
}

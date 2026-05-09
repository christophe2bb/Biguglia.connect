'use client';

import { RefObject } from 'react';
import Link from 'next/link';
import {
  Info, Loader2, MessageSquare, RefreshCw,
  Pin, ThumbsUp, Clock, Plus, Sparkles, Lock,
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

      {/* ── Not logged in banner ─────────────────────────────────────────── */}
      {!isLoggedIn && (
        <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex items-start gap-4`}>
          <div className={`w-10 h-10 ${themeConfig.accentBg} rounded-xl flex items-center justify-center flex-shrink-0 border ${themeConfig.borderColor}`}>
            <Lock className={`w-5 h-5 ${themeConfig.textColor}`} />
          </div>
          <div>
            <p className={`font-semibold ${themeConfig.textColor} mb-0.5`}>Participez aux discussions</p>
            <p className="text-sm text-gray-600">
              <Link href="/connexion" className={`font-bold underline ${themeConfig.textColor}`}>Connectez-vous</Link>{' '}
              et rejoignez la communauté pour échanger avec les membres.
            </p>
          </div>
        </div>
      )}

      {/* ── Logged in but not a member ───────────────────────────────────── */}
      {isLoggedIn && !isMember && (
        <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{themeConfig.emoji}</span>
            <div>
              <p className={`font-semibold ${themeConfig.textColor} mb-0.5`}>Rejoignez pour participer</p>
              <p className="text-sm text-gray-600">
                Devenez membre pour poster dans les discussions publiques de cette communauté.
              </p>
            </div>
          </div>
          <CommunityJoinButton
            themeSlug={themeSlug}
            userId={currentUserId}
            size="sm"
            onJoined={onJoined}
            onLeft={onLeft}
          />
        </div>
      )}

      {/* ── SQL missing warning ──────────────────────────────────────────── */}
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

      {/* ── Discussion list ──────────────────────────────────────────────── */}
      {discLoading ? (
        /* Skeleton */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        discError !== 'sql_missing' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${themeConfig.accentBg} border ${themeConfig.borderColor} rounded-lg flex items-center justify-center`}>
                  <MessageSquare className={`w-4 h-4 ${themeConfig.textColor}`} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Discussions publiques</h2>
                  <p className="text-[11px] text-gray-400">
                    {discussions.length > 0
                      ? `${discussions.length} message${discussions.length > 1 ? 's' : ''}`
                      : 'Aucun message'}
                  </p>
                </div>
              </div>
              <button
                onClick={onRefresh}
                className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {discussions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className={`w-16 h-16 ${themeConfig.accentBg} border ${themeConfig.borderColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Sparkles className={`w-7 h-7 ${themeConfig.textColor} opacity-60`} />
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">Aucune discussion pour l&apos;instant</p>
                  <p className="text-sm text-gray-400">
                    {isMember
                      ? 'Lancez la première conversation !'
                      : 'Rejoignez la communauté pour démarrer la discussion.'}
                  </p>
                </div>
              ) : (
                discussions.map((disc) => {
                  const isMe = disc.author_id === currentUserId;
                  return (
                    <div
                      key={disc.id}
                      className={`
                        px-5 py-4 flex gap-3 transition-colors
                        ${disc.is_pinned
                          ? 'bg-amber-50/60 border-l-4 border-l-amber-400'
                          : isMe
                          ? `${themeConfig.accentBg}/30 border-l-2 ${themeConfig.borderColor}`
                          : 'hover:bg-gray-50/70'
                        }
                      `}
                    >
                      <Avatar
                        src={disc.author?.avatar_url}
                        name={disc.author?.full_name ?? '?'}
                        size="sm"
                        className="flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Author row */}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {disc.author?.full_name ?? 'Membre'}
                          </span>
                          {disc.is_pinned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              <Pin className="w-2.5 h-2.5" /> Épinglé
                            </span>
                          )}
                          {isMe && (
                            <span className={`text-[10px] ${themeConfig.accentBg} ${themeConfig.textColor} border ${themeConfig.borderColor} px-1.5 py-0.5 rounded-full font-medium`}>
                              Vous
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5 ml-auto flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatTime(disc.created_at)}
                          </span>
                        </div>

                        {/* Message bubble */}
                        <div className={`
                          text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words
                          bg-white rounded-xl px-3 py-2 border
                          ${disc.is_pinned ? 'border-amber-200' : 'border-gray-100'}
                          shadow-xs
                        `}>
                          {disc.content}
                        </div>

                        {/* Like button */}
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => isLoggedIn && onLike(disc)}
                            disabled={!isLoggedIn}
                            className={`flex items-center gap-1 text-xs transition-all rounded-full px-2 py-0.5 ${
                              disc.my_like
                                ? `${themeConfig.textColor} ${themeConfig.accentBg} font-semibold border ${themeConfig.borderColor}`
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            } disabled:cursor-default`}
                          >
                            <ThumbsUp className={`w-3 h-3 transition-transform ${disc.my_like ? 'scale-110' : ''}`} />
                            {disc.likes_count > 0 && (
                              <span>{disc.likes_count}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
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
              <div className="px-5 py-5 border-t border-gray-100 bg-gray-50/70 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Rejoignez la communauté pour participer aux discussions
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
          </div>
        )
      )}

      {/* ── CTA: publish on theme page ───────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${themeConfig.bgGradient} border ${themeConfig.borderColor} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{themeConfig.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${themeConfig.textColor}`}>
              Envie de publier du contenu ?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Publiez une annonce, une sortie ou du matériel sur la page <strong>{themeConfig.label}</strong>.
            </p>
          </div>
        </div>
        <Link
          href={themeConfig.href}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-sm font-semibold border ${themeConfig.borderColor} ${themeConfig.textColor} hover:shadow-md transition whitespace-nowrap flex-shrink-0`}
        >
          <Plus className="w-4 h-4" />
          Voir la page
        </Link>
      </div>
    </div>
  );
}

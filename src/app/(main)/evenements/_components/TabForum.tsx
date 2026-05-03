'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, AlertCircle, Plus, Loader2, X,
  MapPin, ArrowRight, Flame, Clock, Lock, Users,
  PenLine, Hash,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { SECTORS, SECTOR_COLORS, SECTOR_MAP } from '@/lib/sectors';
import Avatar from '@/components/ui/Avatar';
import type { ForumPost } from '../_types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getSector(id: string | null | undefined) {
  if (!id) return null;
  return SECTOR_MAP[id] ?? null;
}

/** Couleur d'accent gauche selon le nombre de réponses */
function postAccentColor(count: number): string {
  if (count === 0) return 'bg-gray-200';
  if (count < 3)  return 'bg-purple-300';
  if (count < 8)  return 'bg-purple-500';
  return 'bg-orange-400'; // très actif
}

/** Initiales de secours pour avatar */
function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Couleur de fond avatar déterministe */
const AVATAR_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Badge secteur coloré */
function SectorBadge({ sectorId }: { sectorId: string | null | undefined }) {
  const s = getSector(sectorId);
  if (!s) return null;
  const col = SECTOR_COLORS[s.color];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${col.bg} ${col.text} ${col.border}`}>
      <span>{s.icon}</span>
      {s.name}
    </span>
  );
}

/** Carte de post — version liste moderne */
function PostCard({ post }: { post: ForumPost }) {
  const replies    = post.comment_count ?? 0;
  const authorName = post.author?.full_name ?? 'Anonyme';
  const isHot      = replies >= 5;

  return (
    <Link
      href={`/forum/${post.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="flex">
        {/* Bande couleur gauche — indicateur d'activité */}
        <div className={`w-1 flex-shrink-0 ${postAccentColor(replies)} rounded-l-2xl`} />

        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start gap-3">

            {/* Avatar auteur */}
            <div className="flex-shrink-0 mt-0.5">
              {post.author?.avatar_url ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ring-2 ring-white shadow-sm ${avatarColor(authorName)}`}>
                  {initials(authorName)}
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              {/* Titre */}
              <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-purple-700 transition-colors line-clamp-2 mb-1">
                {isHot && <Flame className="inline w-3.5 h-3.5 text-orange-400 mr-1 -mt-0.5" />}
                {post.title}
              </h3>

              {/* Aperçu contenu */}
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">
                {post.content}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Auteur + date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600">{authorName}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelative(post.created_at)}
                  </span>
                </div>

                {/* Secteur */}
                {post.sector_id && <SectorBadge sectorId={post.sector_id} />}

                {/* Réponses */}
                <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  replies === 0
                    ? 'bg-gray-50 text-gray-400 border border-gray-100'
                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                }`}>
                  <MessageSquare className="w-3 h-3" />
                  {replies === 0 ? 'Aucune réponse' : `${replies} réponse${replies > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Flèche */}
            <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-purple-400 flex-shrink-0 mt-2 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Formulaire création de sujet — modal intégré */
function NewPostForm({
  profile,
  postForm,
  setPostForm,
  submittingPost,
  onSubmit,
  onClose,
}: {
  profile: { id: string };
  postForm: { title: string; content: string; sector_id: string };
  setPostForm: (fn: (f: { title: string; content: string; sector_id: string }) => { title: string; content: string; sector_id: string }) => void;
  submittingPost: boolean;
  onSubmit: (e: React.FormEvent, profileId: string) => void;
  onClose: () => void;
}) {
  const charTitle   = postForm.title.length;
  const charContent = postForm.content.length;

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden mb-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <PenLine className="w-4 h-4" />
          <span className="font-black text-sm">Nouveau sujet</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={e => onSubmit(e, profile.id)} className="p-5 space-y-4">

        {/* Titre */}
        <div>
          <label htmlFor="forum-title" className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-purple-400" /> Titre du sujet *
          </label>
          <input
            id="forum-title"
            type="text"
            placeholder="Ex : Qui organise la fête de la musique cette année ?"
            required
            maxLength={120}
            value={postForm.title}
            onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 placeholder:text-gray-300 transition"
          />
          <p className="text-[11px] text-gray-300 text-right mt-0.5">{charTitle}/120</p>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="forum-content" className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-purple-400" /> Votre message *
          </label>
          <textarea
            id="forum-content"
            placeholder="Décrivez votre question, proposition ou retour en détail…"
            required
            rows={5}
            maxLength={2000}
            value={postForm.content}
            onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 placeholder:text-gray-300 transition"
          />
          <p className="text-[11px] text-gray-300 text-right mt-0.5">{charContent}/2000</p>
        </div>

        {/* Sélecteur secteur */}
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-purple-400" /> Quartier concerné
            <span className="font-normal text-gray-300 normal-case tracking-normal">(optionnel)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPostForm(f => ({ ...f, sector_id: '' }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                !postForm.sector_id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              🗺️ Toute la ville
            </button>
            {SECTORS.map(s => {
              const col = SECTOR_COLORS[s.color];
              const active = postForm.sector_id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPostForm(f => ({ ...f, sector_id: f.sector_id === s.id ? '' : s.id }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? `${col.badgeSolid} border-transparent shadow-sm`
                      : `bg-white text-gray-500 border-gray-200 hover:${col.bg} hover:${col.text}`
                  }`}
                >
                  {s.icon} {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Règle de la section */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Ce forum est réservé aux sujets liés aux <strong>événements de Biguglia</strong>.
            Les hors-sujets seront retirés par la modération.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submittingPost || !postForm.title.trim() || !postForm.content.trim()}
            className="flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submittingPost
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</>
              : <><Plus className="w-3.5 h-3.5" /> Publier le sujet</>
            }
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200 font-semibold transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  loading: boolean;
  forumPosts: ForumPost[];
  forumCategoryId: string | null;
  showPostForm: boolean;
  setShowPostForm: (v: boolean) => void;
  postForm: { title: string; content: string; sector_id: string };
  setPostForm: (fn: (f: { title: string; content: string; sector_id: string }) => { title: string; content: string; sector_id: string }) => void;
  submittingPost: boolean;
  profile: { id: string } | null;
  onSubmit: (e: React.FormEvent, profileId: string) => void;
  sectorCounts: Record<string, number>;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TabForum({
  loading, forumPosts, forumCategoryId, showPostForm, setShowPostForm,
  postForm, setPostForm, submittingPost, profile, onSubmit,
  filterSector, setFilterSector,
}: Props) {

  const [localFilter, setLocalFilter] = useState<'all' | 'active' | 'unanswered'>('all');

  /* ── Filtrage secteur */
  const bySector = filterSector
    ? forumPosts.filter(p =>
        filterSector === 'ville' ? !p.sector_id : p.sector_id === filterSector
      )
    : forumPosts;

  /* ── Filtrage activité */
  const displayedPosts = localFilter === 'active'
    ? bySector.filter(p => (p.comment_count ?? 0) > 0)
    : localFilter === 'unanswered'
    ? bySector.filter(p => (p.comment_count ?? 0) === 0)
    : bySector;

  /* ── Stats */
  const totalPosts  = forumPosts.length;
  const activePosts = forumPosts.filter(p => (p.comment_count ?? 0) > 0).length;
  const hotPosts    = forumPosts.filter(p => (p.comment_count ?? 0) >= 5).length;

  /* ── Filtres secteur pills (dans la zone forum uniquement) */
  const postSectorCounts: Record<string, number> = {};
  forumPosts.forEach(p => {
    if (p.sector_id) postSectorCounts[p.sector_id] = (postSectorCounts[p.sector_id] || 0) + 1;
  });

  return (
    <div className="max-w-3xl">

      {/* ══ En-tête section ══════════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Forum événements
            </h2>
            <p className="text-sm text-gray-400 mt-0.5 max-w-sm">
              Questions, suggestions et retours sur les événements de Biguglia.
              {filterSector && filterSector !== 'ville' && (
                <span className="ml-1 text-purple-600 font-semibold">
                  · {getSector(filterSector)?.name}
                </span>
              )}
            </p>
          </div>

          {/* Bouton nouveau sujet */}
          {profile ? (
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-purple-700 transition-colors text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau sujet</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          ) : (
            <Link
              href="/connexion"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              <Lock className="w-3.5 h-3.5" /> Se connecter
            </Link>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Sujets',    value: totalPosts,  icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Actifs',    value: activePosts,  icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Populaires',value: hotPosts,     icon: Flame,        color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2.5 flex items-center gap-2`}>
              <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
              <div>
                <p className={`text-lg font-black leading-none ${s.color}`}>{s.value}</p>
                <p className={`text-[10px] font-semibold ${s.color} opacity-70`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtres secteur — pills compactes */}
        {forumPosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setFilterSector(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                !filterSector
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              🗺️ Tous ({forumPosts.length})
            </button>
            {SECTORS.filter(s => postSectorCounts[s.id]).map(s => {
              const col = SECTOR_COLORS[s.color];
              const active = filterSector === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFilterSector(active ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? `${col.badgeSolid} border-transparent shadow-sm`
                      : `bg-white ${col.text} ${col.border} hover:${col.bg}`
                  }`}
                >
                  {s.icon} {s.name} ({postSectorCounts[s.id]})
                </button>
              );
            })}
          </div>
        )}

        {/* Filtres activité */}
        {forumPosts.length > 0 && (
          <div className="flex gap-2">
            {([
              { id: 'all',        label: 'Tous',           icon: MessageSquare },
              { id: 'active',     label: 'Avec réponses',  icon: Users },
              { id: 'unanswered', label: 'Sans réponse',   icon: Clock },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setLocalFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  localFilter === f.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ Formulaire nouveau sujet ═════════════════════════════════════════ */}
      {showPostForm && profile && (
        <NewPostForm
          profile={profile}
          postForm={postForm}
          setPostForm={setPostForm}
          submittingPost={submittingPost}
          onSubmit={onSubmit}
          onClose={() => setShowPostForm(false)}
        />
      )}

      {/* ══ Invitation connexion si non connecté ════════════════════════════ */}
      {!profile && !showPostForm && (
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-5 mb-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Rejoignez la discussion</p>
            <p className="text-xs text-gray-500 mt-0.5">Connectez-vous pour poster un sujet ou répondre.</p>
          </div>
          <Link
            href="/connexion"
            className="flex-shrink-0 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-purple-700 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      )}

      {/* ══ États ════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-gray-400">Chargement des sujets…</p>
        </div>

      ) : !forumCategoryId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="font-bold text-amber-800 mb-1">Forum temporairement indisponible</p>
          <p className="text-amber-700 text-sm">La catégorie forum n&apos;est pas encore créée.</p>
        </div>

      ) : displayedPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-purple-300" />
          </div>
          <p className="font-bold text-gray-700 text-lg mb-1">
            {localFilter !== 'all'
              ? 'Aucun sujet pour ce filtre'
              : filterSector
              ? 'Aucun sujet pour ce quartier'
              : 'Pas encore de sujets'}
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {localFilter === 'unanswered' && displayedPosts.length === 0
              ? 'Tous les sujets ont des réponses 🎉'
              : 'Lancez la discussion sur les événements de Biguglia !'}
          </p>
          {profile && localFilter === 'all' && (
            <button
              onClick={() => setShowPostForm(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Créer le premier sujet
            </button>
          )}
        </div>

      ) : (
        /* ══ Liste des posts ══════════════════════════════════════════════ */
        <div className="space-y-3">

          {/* En-tête résultats */}
          <div className="flex items-center justify-between px-1 mb-1">
            <p className="text-xs text-gray-400 font-semibold">
              {displayedPosts.length} sujet{displayedPosts.length > 1 ? 's' : ''}
              {filterSector && filterSector !== 'ville' && (
                <span className="ml-1 text-purple-600">
                  · {getSector(filterSector)?.name}
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-300">Cliquez pour lire et répondre</p>
          </div>

          {displayedPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Forum réservé aux sujets sur les événements de Biguglia
            </p>
            {profile && (
              <button
                onClick={() => { setShowPostForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nouveau sujet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

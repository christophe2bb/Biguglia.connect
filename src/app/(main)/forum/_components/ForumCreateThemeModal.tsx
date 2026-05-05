'use client';

import { useState } from 'react';
import { X, Loader2, Check, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ForumCategory } from '@/types';

// ─── Emojis proposés ─────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  '💬','🏘️','🔧','🌿','🎉','⚠️','🤝','💡',
  '⭐','🚨','🛒','🎒','🌊','⛰️','🏡','🌾',
  '🐕','👨‍👩‍👧','📸','🚴','❓','🏖️','🗺️','📢',
  '🔑','🎭','🏫','🌻','🍕','⚽','🎵','🌙',
];

// Génère un slug depuis un label
function toSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

interface Props {
  profileId: string;
  categories: ForumCategory[];
  onClose: () => void;
  onCreated: () => void;
}

type Step = 'theme' | 'post';

export default function ForumCreateThemeModal({ profileId, categories, onClose, onCreated }: Props) {
  const supabase = createClient();

  // ── État étape 1 ────────────────────────────────────────────────────────────
  const [step,       setStep]       = useState<Step>('theme');
  const [label,      setLabel]      = useState('');
  const [emoji,      setEmoji]      = useState('💬');
  const [sub,        setSub]        = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');

  // ── État étape 2 ────────────────────────────────────────────────────────────
  const [postTitle,   setPostTitle]   = useState('');
  const [postContent, setPostContent] = useState('');

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const slug  = toSlug(label);
  const valid = label.trim().length >= 2 && slug.length >= 2 && !!categoryId;

  // ── Étape 1 → Étape 2 ───────────────────────────────────────────────────────
  const handleNext = () => {
    setError('');
    if (!categoryId) { setError('Veuillez choisir une catégorie.'); return; }
    if (!postTitle) setPostTitle(`Discussion : ${label.trim()}`);
    setStep('post');
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      setError('Titre et contenu sont requis.');
      return;
    }
    setSaving(true);
    setError('');

    // Tenter d'insérer dans forum_topics (schema V2)
    const { error: topicErr } = await supabase.from('forum_topics').insert({
      category_id: categoryId || null,
      author_id:   profileId,
      title:       postTitle.trim(),
      content:     postContent.trim(),
      status:      'ouvert',
    });

    if (topicErr) {
      // Fallback forum_posts (schema V1)
      const { error: postErr } = await supabase.from('forum_posts').insert({
        category_id: categoryId || null,
        author_id:   profileId,
        title:       postTitle.trim(),
        content:     postContent.trim(),
        theme:       slug,
        theme_label: label.trim(),
        theme_emoji: emoji,
        theme_sub:   sub.trim() || 'Discussion locale',
      });

      if (postErr) {
        setError(`Erreur : ${postErr.message}`);
        setSaving(false);
        return;
      }
    }

    toast.success(`🎉 Sujet « ${postTitle.trim()} » publié !`, { duration: 4000 });
    onCreated();
    setSaving(false);
  };

  const selectedCat = categories.find(c => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm">
                {step === 'theme' ? 'Créer un sujet thématique' : 'Rédiger le premier message'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {step === 'theme' ? 'Étape 1 sur 2 — Définir le sujet' : 'Étape 2 sur 2 — Lancer la discussion'}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Indicateur étapes ── */}
        <div className="flex border-b border-gray-100">
          {(['theme', 'post'] as Step[]).map((s, i) => (
            <div key={s} className={cn(
              'flex-1 py-2 text-center text-[11px] font-bold transition-colors',
              step === s
                ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50/50'
                : i === 0 ? 'text-emerald-500 bg-emerald-50/30' : 'text-gray-400'
            )}>
              {i === 0 ? (step === 'post' ? '✅ Sujet défini' : '1. Sujet') : '2. Message'}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* ════════════════════════════════════════════
              ÉTAPE 1 — Définir le sujet
          ════════════════════════════════════════════ */}
          {step === 'theme' && (
            <>
              {/* Aperçu en direct */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="text-2xl w-10 text-center">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-800 truncate">
                    {label.trim() || <span className="text-gray-300 font-normal italic">Nom du sujet…</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {selectedCat
                      ? <span>{selectedCat.icon} {selectedCat.name}</span>
                      : <span className="text-gray-300 italic">Catégorie…</span>}
                  </p>
                </div>
                {valid && (
                  <span className="text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    Prêt
                  </span>
                )}
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Catégorie <span className="text-red-400">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nom du sujet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Titre du sujet <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => { setLabel(e.target.value); setError(''); }}
                  placeholder="ex. BBQ de quartier, Travaux rue principale…"
                  maxLength={80}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  autoFocus
                />
              </div>

              {/* Description courte */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Sous-titre <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={sub}
                  onChange={e => setSub(e.target.value)}
                  placeholder="ex. Organisation de l'événement du 15 juillet"
                  maxLength={80}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Sélecteur emoji */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Icône</label>
                <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-gray-100 p-2 bg-gray-50">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        'text-xl rounded-lg p-1.5 transition-all hover:scale-110',
                        emoji === e ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'hover:bg-white'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={handleNext} disabled={!valid}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  Suivant →
                </button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════
              ÉTAPE 2 — Rédiger le message
          ════════════════════════════════════════════ */}
          {step === 'post' && (
            <>
              {/* Rappel du sujet */}
              <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs font-black text-violet-800">{label}</p>
                  <p className="text-[11px] text-violet-600">
                    {selectedCat?.icon} {selectedCat?.name}
                  </p>
                </div>
                <span className="ml-auto text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">
                  Nouveau
                </span>
              </div>

              {/* Explication */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Rédigez le message d'ouverture qui lancera la discussion dans la communauté.
                </p>
              </div>

              {/* Titre du post */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Titre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={e => { setPostTitle(e.target.value); setError(''); }}
                  placeholder="ex. Bienvenue dans ce nouveau sujet !"
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  autoFocus
                />
              </div>

              {/* Contenu */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={postContent}
                  onChange={e => { setPostContent(e.target.value); setError(''); }}
                  placeholder="Présentez le sujet à la communauté, expliquez l'objectif de cette discussion…"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setStep('theme'); setError(''); }}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">
                  ← Retour
                </button>
                <button type="button" onClick={handleSave}
                  disabled={!postTitle.trim() || !postContent.trim() || saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                    : <><Check className="w-4 h-4" /> Publier le sujet</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

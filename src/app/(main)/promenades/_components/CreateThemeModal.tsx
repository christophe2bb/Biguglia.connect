'use client';

import { useState } from 'react';
import { X, Loader2, Check, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// ─── Emojis proposés ─────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  '🌿','🗺️','⚠️','🐕','👨‍👩‍👧','📸','🚴','❓',
  '🦅','🌊','🏔️','🌅','🌸','🍄','🦋','🐦',
  '🌲','🏕️','🧭','🥾','🌻','🐾','🌾','🌈',
  '⛺','🛶','🎣','🏞️','🦎','🌙','🌟','🔥',
];

const RESERVED_SLUGS = ['general','itineraires','nature','alertes','chien','famille','photo','velo','questions'];

// Génère un slug depuis un label (ex. "Mon thème" → "mon-theme")
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
  /** ID du profil connecté — requis pour sauvegarder */
  profileId: string;
  /** ID de la catégorie forum "promenades" — pour insérer le post */
  forumCategoryId: string;
  onClose: () => void;
  /** Appelé après sauvegarde réussie */
  onCreated: (theme: { id: string; emoji: string; label: string; sub: string }) => void;
}

type Step = 'theme' | 'post';

export default function CreateThemeModal({ profileId, forumCategoryId, onClose, onCreated }: Props) {
  const supabase = createClient();

  // ── Étape 1 : définir le thème ──────────────────────────────────────────
  const [step,   setStep]   = useState<Step>('theme');
  const [label,  setLabel]  = useState('');
  const [emoji,  setEmoji]  = useState('🌿');
  const [sub,    setSub]    = useState('');

  // ── Étape 2 : premier sujet ─────────────────────────────────────────────
  const [postTitle,   setPostTitle]   = useState('');
  const [postContent, setPostContent] = useState('');

  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  const slug  = toSlug(label);
  const valid = label.trim().length >= 2 && slug.length >= 2;

  // ── Valider l'étape 1 → passer à l'étape 2 ─────────────────────────────
  const handleNext = () => {
    setError('');
    if (RESERVED_SLUGS.includes(slug)) {
      setError('Ce nom correspond à un thème système existant. Choisissez un autre nom.');
      return;
    }
    // Pré-remplir le titre du post avec le nom du thème
    if (!postTitle) setPostTitle(`Discussion : ${label.trim()}`);
    setStep('post');
  };

  // ── Sauvegarder : créer le post dans Supabase ────────────────────────────
  const handleSave = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      setError('Titre et contenu du premier sujet sont requis.');
      return;
    }
    setSaving(true);
    setError('');

    const { error: insertErr } = await supabase.from('forum_posts').insert({
      category_id: forumCategoryId,
      author_id:   profileId,
      title:       postTitle.trim(),
      content:     postContent.trim(),
      theme:       slug,
      // Métadonnées du thème custom — permettent la découverte riche après rechargement
      theme_label: label.trim(),
      theme_emoji: emoji,
      theme_sub:   sub.trim() || 'Thème personnalisé',
    });

    if (insertErr) {
      setError(`Erreur lors de la sauvegarde : ${insertErr.message}`);
      setSaving(false);
      return;
    }

    toast.success(`🎉 Thème « ${label.trim()} » créé et sujet publié !`, { duration: 4000 });
    onCreated({
      id:    slug,
      emoji,
      label: label.trim(),
      sub:   sub.trim() || 'Thème personnalisé',
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-sky-50 to-teal-50 border-b border-sky-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm">
                {step === 'theme' ? 'Créer un thème personnalisé' : 'Premier sujet du thème'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {step === 'theme'
                  ? 'Étape 1 sur 2 — Définir le thème'
                  : 'Étape 2 sur 2 — Lancer la discussion'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Indicateur d'étapes ── */}
        <div className="flex border-b border-gray-100">
          {(['theme', 'post'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                'flex-1 py-2 text-center text-[11px] font-bold transition-colors',
                step === s
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/50'
                  : i === 0
                    ? 'text-emerald-500 bg-emerald-50/30'
                    : 'text-gray-400'
              )}
            >
              {i === 0 ? (step === 'post' ? '✅ Thème défini' : '1. Thème') : '2. Premier sujet'}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* ══════════════════════════════════════════════════════
              ÉTAPE 1 — Définir le thème
          ══════════════════════════════════════════════════════ */}
          {step === 'theme' && (
            <>
              {/* Aperçu en direct */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="text-2xl w-10 text-center">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-800 truncate">
                    {label.trim() || <span className="text-gray-300 font-normal italic">Nom du thème…</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {sub.trim() || <span className="text-gray-300 italic">Description courte…</span>}
                  </p>
                </div>
                {valid && (
                  <span className="text-[10px] bg-sky-100 text-sky-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    Prêt
                  </span>
                )}
              </div>

              {/* Champ nom */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nom du thème <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => { setLabel(e.target.value); setError(''); }}
                  placeholder="ex. Ornithologie, Jogging, VTT débutant…"
                  maxLength={40}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  autoFocus
                />
                {label.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Identifiant : <code className="bg-gray-100 px-1 rounded font-mono">{slug || '…'}</code>
                  </p>
                )}
              </div>

              {/* Champ description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Description courte <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={sub}
                  onChange={e => setSub(e.target.value)}
                  placeholder="ex. Observation des oiseaux locaux"
                  maxLength={60}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              {/* Sélecteur emoji */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Icône</label>
                <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto rounded-xl border border-gray-100 p-2 bg-gray-50">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        'text-xl rounded-lg p-1.5 transition-all hover:scale-110',
                        emoji === e ? 'bg-sky-100 ring-2 ring-sky-400 scale-110' : 'hover:bg-white'
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  Suivant →
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              ÉTAPE 2 — Premier sujet
          ══════════════════════════════════════════════════════ */}
          {step === 'post' && (
            <>
              {/* Rappel du thème créé */}
              <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs font-black text-sky-800">{label}</p>
                  <p className="text-[11px] text-sky-600">{sub || 'Thème personnalisé'}</p>
                </div>
                <span className="ml-auto text-[10px] bg-sky-100 text-sky-600 font-bold px-2 py-0.5 rounded-full">
                  Nouveau
                </span>
              </div>

              {/* Explication */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Pour que votre thème soit <strong>visible sur la page</strong> et <strong>sauvegardé</strong>,
                  publiez un premier sujet maintenant. Il apparaîtra dans le widget « Explorer par thème ».
                </p>
              </div>

              {/* Titre du post */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Titre du sujet <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={e => { setPostTitle(e.target.value); setError(''); }}
                  placeholder="ex. Bienvenue dans ce nouveau thème !"
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  autoFocus
                />
              </div>

              {/* Contenu du post */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={postContent}
                  onChange={e => { setPostContent(e.target.value); setError(''); }}
                  placeholder="Présentez ce thème à la communauté, expliquez ce qu'on peut y discuter…"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                    : <><Check className="w-4 h-4" /> Créer & publier</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

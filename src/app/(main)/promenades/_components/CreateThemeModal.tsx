'use client';

import { useState } from 'react';
import { X, Loader2, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Emojis proposés ─────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  '🌿','🗺️','⚠️','🐕','👨‍👩‍👧','📸','🚴','❓',
  '🦅','🌊','🏔️','🌅','🌸','🍄','🦋','🐦',
  '🌲','🏕️','🧭','🥾','🌻','🐾','🌾','🌈',
  '⛺','🛶','🎣','🏞️','🦎','🌙','🌟','🔥',
];

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
  onClose: () => void;
  onCreated: (theme: { id: string; emoji: string; label: string; sub: string }) => void;
}

export default function CreateThemeModal({ onClose, onCreated }: Props) {
  const [label,    setLabel]    = useState('');
  const [emoji,    setEmoji]    = useState('🌿');
  const [sub,      setSub]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const slug = toSlug(label);
  const valid = label.trim().length >= 2 && slug.length >= 2;

  const handleCreate = async () => {
    if (!valid || saving) return;
    setError('');
    setSaving(true);

    // Slugs système réservés
    const reserved = ['general','itineraires','nature','alertes','chien','famille','photo','velo','questions'];
    if (reserved.includes(slug)) {
      setError('Ce nom est réservé à un thème système. Choisissez un autre nom.');
      setSaving(false);
      return;
    }

    // On crée le thème en mémoire (pas de table forum_themes en base pour l'instant)
    // → il sera persisté via forum_posts.theme lors de la création du prochain post
    const newTheme = {
      id:    slug,
      emoji,
      label: label.trim(),
      sub:   sub.trim() || 'Thème personnalisé',
    };

    // Petite pause pour le feedback visuel
    await new Promise(r => setTimeout(r, 300));
    onCreated(newTheme);
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
              <h3 className="font-black text-gray-900 text-sm">Créer un thème personnalisé</h3>
              <p className="text-[11px] text-gray-400">Il sera ajouté aux widgets de filtrage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Aperçu en direct ── */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="text-2xl w-10 text-center">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-800 truncate">
                {label.trim() || <span className="text-gray-300 font-normal">Nom du thème…</span>}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {sub.trim() || <span className="text-gray-300">Description courte…</span>}
              </p>
            </div>
            {valid && (
              <span className="text-[10px] bg-sky-100 text-sky-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                Prêt
              </span>
            )}
          </div>

          {/* ── Champ nom ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Nom du thème <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
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

          {/* ── Champ description ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Description courte <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={sub}
              onChange={e => setSub(e.target.value)}
              placeholder="ex. Observation des oiseaux"
              maxLength={60}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          {/* ── Sélecteur emoji ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Icône
            </label>
            <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto rounded-xl border border-gray-100 p-2 bg-gray-50">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'text-xl rounded-lg p-1.5 transition-all hover:scale-110',
                    emoji === e
                      ? 'bg-sky-100 ring-2 ring-sky-400 scale-110'
                      : 'hover:bg-white'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* ── Erreur ── */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!valid || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Check className="w-4 h-4" /> Créer le thème</>}
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Le thème sera utilisé lorsque vous publierez votre premier sujet avec ce thème.
          </p>
        </div>
      </div>
    </div>
  );
}

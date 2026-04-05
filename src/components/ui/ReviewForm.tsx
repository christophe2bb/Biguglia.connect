'use client';

/**
 * ReviewForm — Formulaire d'évaluation unifié Biguglia Connect
 *
 * Déclenché après une interaction réelle completed.
 * Dimensions adaptées au thème (listing, événement, matériel, etc.)
 * Format : note globale + dimensions optionnelles + tags + commentaire + recommandation
 */

import { useState } from 'react';
import {
  Star, ThumbsUp, ThumbsDown, Tag, MessageSquare,
  CheckCircle, XCircle, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  THEME_CONFIG,
  submitReview,
  type InteractionSourceType,
} from '@/lib/trust';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReviewFormProps {
  interactionId: string;
  sourceType: InteractionSourceType;
  sourceId: string;
  sourceTitle?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string | null;
  /** Callback après soumission réussie */
  onSuccess?: () => void;
  /** Callback annulation */
  onCancel?: () => void;
  /** Affichage compact (modal) ou pleine page */
  variant?: 'modal' | 'inline';
}

// ─── StarPicker ───────────────────────────────────────────────────────────────
function StarPicker({
  value, onChange, size = 'lg',
}: {
  value: number; onChange: (v: number) => void; size?: 'sm' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  const labels = ['', 'Mauvais', 'Passable', 'Correct', 'Bien', 'Excellent'];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star className={cn(
              sz, 'transition-colors',
              s <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-200 hover:text-amber-200',
            )} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-xs font-semibold text-amber-600 h-4">
          {labels[hover || value]}
        </span>
      )}
    </div>
  );
}

// ─── ReviewForm ───────────────────────────────────────────────────────────────
export default function ReviewForm({
  interactionId,
  sourceType,
  sourceId,
  sourceTitle,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  onSuccess,
  onCancel,
  variant = 'inline',
}: ReviewFormProps) {
  const cfg = THEME_CONFIG[sourceType];

  const [step, setStep] = useState<'rating' | 'details' | 'comment' | 'done'>(
    'rating'
  );
  const [rating, setRating] = useState(0);
  const [dims, setDims] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Choisissez une note'); return; }
    setSubmitting(true);
    const { success, error } = await submitReview({
      interactionId,
      targetUserId,
      sourceType,
      sourceId,
      rating,
      dimCommunication: dims['dim_communication'] ?? null,
      dimReliability: dims['dim_reliability'] ?? null,
      dimPunctuality: dims['dim_punctuality'] ?? null,
      dimQuality: dims['dim_quality'] ?? null,
      comment: comment.trim() || undefined,
      wouldRecommend: wouldRecommend ?? undefined,
      tags: Array.from(selectedTags),
    });
    setSubmitting(false);

    if (success) {
      setStep('done');
      toast.success('Avis soumis — merci !');
      setTimeout(() => onSuccess?.(), 1500);
    } else {
      toast.error(error || 'Erreur lors de la soumission');
    }
  };

  const wrapClass = variant === 'modal'
    ? 'bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-lg w-full'
    : 'bg-white rounded-2xl border border-gray-100 overflow-hidden';

  // ── Step: done ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className={cn(wrapClass, 'p-8 text-center')}>
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Avis enregistré !</h2>
        <p className="text-gray-500 text-sm">
          Merci pour votre contribution à la communauté Biguglia Connect.
        </p>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={targetUserAvatar} name={targetUserName} size="sm" />
            <div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">
                {cfg.emoji} Évaluer {cfg.revieweeLabel}
              </p>
              <h2 className="text-sm font-black text-gray-900">{targetUserName}</h2>
              {sourceTitle && (
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{sourceTitle}</p>
              )}
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Progress */}
        <div className="flex gap-1 mt-3">
          {(['rating', 'details', 'comment'] as const).map((s, i) => (
            <div key={s} className={cn(
              'flex-1 h-1 rounded-full transition-all',
              step === s || (['details', 'comment'].includes(step) && i === 0) || (step === 'comment' && i === 1)
                ? 'bg-amber-500'
                : i < ['rating', 'details', 'comment'].indexOf(step)
                  ? 'bg-amber-500'
                  : 'bg-amber-100',
            )} />
          ))}
        </div>
      </div>

      <div className="p-6">

        {/* ── Step 1: Note globale ──────────────────────────────────────────── */}
        {step === 'rating' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                Note globale pour votre expérience avec <strong>{targetUserName}</strong>
              </p>
              <StarPicker value={rating} onChange={setRating} size="lg" />
            </div>

            <button
              onClick={() => { if (rating > 0) setStep('details'); else toast.error('Choisissez une note'); }}
              disabled={rating === 0}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── Step 2: Dimensions ────────────────────────────────────────────── */}
        {step === 'details' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600 font-medium">
              Évaluation détaillée <span className="text-gray-400">(optionnel)</span>
            </p>

            {cfg.dimensions.map(dim => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{dim.emoji}</span>
                  <span className="text-sm font-semibold text-gray-700">{dim.label}</span>
                </div>
                <StarPicker
                  value={dims[dim.key] || 0}
                  onChange={v => setDims(d => ({ ...d, [dim.key]: v }))}
                  size="sm"
                />
              </div>
            ))}

            {/* Tags */}
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Points forts
              </p>
              <div className="flex flex-wrap gap-2">
                {cfg.tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                      selectedTags.has(tag)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('rating')} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                ← Retour
              </button>
              <button onClick={() => setStep('comment')} className="flex-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm px-6">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Commentaire & recommandation ──────────────────────────── */}
        {step === 'comment' && (
          <div className="space-y-5">
            {/* Recommandation */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Recommanderiez-vous {targetUserName} ?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all',
                    wouldRecommend === true
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-emerald-200',
                  )}
                >
                  <ThumbsUp className="w-4 h-4" /> Oui
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all',
                    wouldRecommend === false
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : 'border-gray-200 text-gray-500 hover:border-rose-200',
                  )}
                >
                  <ThumbsDown className="w-4 h-4" /> Non
                </button>
              </div>
            </div>

            {/* Commentaire */}
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Commentaire libre <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Décrivez votre expérience en quelques mots…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/1000</p>
            </div>

            {/* Récapitulatif */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('w-4 h-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                ))}
              </div>
              <span className="text-sm font-semibold text-amber-700">{rating}/5</span>
              {selectedTags.size > 0 && (
                <span className="text-xs text-amber-600">+ {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('details')} className="py-2.5 px-4 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                  : <><CheckCircle className="w-4 h-4" /> Soumettre l'avis</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ReviewPromptBanner ───────────────────────────────────────────────────────
/**
 * Bannière compacte affichée sur les dashboards / pages d'interaction
 * pour inciter à laisser un avis.
 */
interface ReviewPromptBannerProps {
  interactionId: string;
  sourceType: InteractionSourceType;
  sourceId: string;
  sourceTitle?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string | null;
  onDismiss?: () => void;
}

export function ReviewPromptBanner({
  interactionId,
  sourceType,
  sourceId,
  sourceTitle,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  onDismiss,
}: ReviewPromptBannerProps) {
  const [open, setOpen] = useState(false);
  const cfg = THEME_CONFIG[sourceType];

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <ReviewForm
          interactionId={interactionId}
          sourceType={sourceType}
          sourceId={sourceId}
          sourceTitle={sourceTitle}
          targetUserId={targetUserId}
          targetUserName={targetUserName}
          targetUserAvatar={targetUserAvatar}
          variant="modal"
          onSuccess={() => { setOpen(false); onDismiss?.(); }}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-2xl">{cfg.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">Évaluez votre expérience</p>
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            Votre avis sur <strong>{targetUserName}</strong> pour {cfg.label}
            {sourceTitle ? ` — ${sourceTitle}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <Star className="w-3.5 h-3.5" /> Évaluer
          </button>
          {onDismiss && (
            <button onClick={onDismiss} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

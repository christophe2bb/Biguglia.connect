'use client';

import { AlertTriangle, CheckCircle, Send, Shield, XCircle } from 'lucide-react';
import { REFUSAL_REASONS, CORRECTION_REASONS } from '@/lib/moderation';
import { Section } from './Section';
import type { DecisionKey } from '../_types';

interface Props {
  selectedDecision: DecisionKey | null;
  selectedReason: string;
  moderatorNote: string;
  processing: boolean;
  onSelectDecision: (d: DecisionKey | null) => void;
  onSelectReason: (r: string) => void;
  onNoteChange: (n: string) => void;
  onSubmit: () => void;
}

const DECISION_BUTTONS: {
  key: DecisionKey;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: 'accepter',            label: 'Accepter',    icon: CheckCircle,   color: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { key: 'demander_correction', label: 'Corrections', icon: AlertTriangle, color: 'border-amber-300   bg-amber-50   text-amber-700   hover:bg-amber-100'   },
  { key: 'refuser',             label: 'Refuser',     icon: XCircle,       color: 'border-red-300     bg-red-50     text-red-700     hover:bg-red-100'     },
];

const SUBMIT_COLOR: Record<DecisionKey, string> = {
  accepter:            'bg-emerald-600 hover:bg-emerald-700',
  refuser:             'bg-red-600     hover:bg-red-700',
  demander_correction: 'bg-amber-500   hover:bg-amber-600',
};

const SUBMIT_LABEL: Record<DecisionKey, string> = {
  accepter:            'Valider et publier',
  refuser:             'Confirmer le refus',
  demander_correction: 'Envoyer les corrections',
};

export function DecisionPanel({
  selectedDecision, selectedReason, moderatorNote,
  processing, onSelectDecision, onSelectReason, onNoteChange, onSubmit,
}: Props) {
  return (
    <Section title="Décision de modération" icon={Shield}>
      <div className="space-y-4">

        {/* Boutons d'action */}
        <div className="grid grid-cols-3 gap-3">
          {DECISION_BUTTONS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { onSelectDecision(key); onSelectReason(''); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-semibold text-sm transition-colors ${color} ${
                selectedDecision === key ? 'ring-2 ring-offset-1' : ''
              }`}
            >
              <Icon className="w-6 h-6" />
              {label}
            </button>
          ))}
        </div>

        {/* Motifs de refus */}
        {selectedDecision === 'refuser' && (
          <div>
            <p className="block text-sm font-semibold text-gray-700 mb-2">
              Motif de refus <span className="text-red-500">*</span>
            </p>
            <div className="space-y-1.5">
              {REFUSAL_REASONS.map(r => (
                <label
                  key={r.key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedReason === r.key
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio" name="refusal" value={r.key}
                    checked={selectedReason === r.key}
                    onChange={() => onSelectReason(r.key)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-800">{r.label}</span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    r.severity === 'high'   ? 'bg-red-100 text-red-700'     :
                    r.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                                              'bg-gray-100 text-gray-600'
                  }`}>{r.severity}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Motifs de correction */}
        {selectedDecision === 'demander_correction' && (
          <div>
            <p className="block text-sm font-semibold text-gray-700 mb-2">
              Correction demandée <span className="text-red-500">*</span>
            </p>
            <div className="space-y-1.5">
              {CORRECTION_REASONS.map(r => (
                <label
                  key={r.key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedReason === r.key
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio" name="correction" value={r.key}
                    checked={selectedReason === r.key}
                    onChange={() => onSelectReason(r.key)}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Note interne */}
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">
            Note interne <span className="text-gray-400 font-normal">(visible par l&apos;équipe uniquement)</span>
          </p>
          <textarea
            value={moderatorNote}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Observations, contexte, justification…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          />
        </div>

        {/* Bouton de validation */}
        {selectedDecision && (
          <button
            onClick={onSubmit}
            disabled={processing || (selectedDecision !== 'accepter' && !selectedReason)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors ${
              SUBMIT_COLOR[selectedDecision]
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {processing
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />
            }
            {processing ? 'Traitement…' : SUBMIT_LABEL[selectedDecision]}
          </button>
        )}
      </div>
    </Section>
  );
}

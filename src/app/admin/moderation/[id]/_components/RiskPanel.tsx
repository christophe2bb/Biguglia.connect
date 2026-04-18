

import { AlertCircle, BarChart3 } from 'lucide-react';
import { RISK_CONFIG } from '../_config';
import type { QueueDetail } from '../_types';

interface Props {
  item: QueueDetail;
}

export function RiskPanel({ item }: Props) {
  const risk = RISK_CONFIG[item.risk_level ?? 'low'];

  return (
    <div className={`rounded-2xl border p-4 ${risk.bg} ${risk.border}`}>
      {/* Score + label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-5 h-5 ${risk.color}`} />
          <span className={`font-semibold ${risk.color}`}>Analyse automatique</span>
        </div>
        <span className={`text-2xl font-black ${risk.color}`}>{item.risk_score}/100</span>
      </div>

      {/* Barre de risque */}
      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            item.risk_score >= 60 ? 'bg-red-500'    :
            item.risk_score >= 40 ? 'bg-orange-500' :
            item.risk_score >= 20 ? 'bg-amber-400'  : 'bg-emerald-400'
          }`}
          style={{ width: `${item.risk_score}%` }}
        />
      </div>

      {/* Erreurs de validation */}
      {item.validation_errors && item.validation_errors.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className={`text-xs font-semibold ${risk.color} opacity-80`}>Problèmes détectés :</p>
          {item.validation_errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${risk.color}`} />
              <span className={`text-xs ${risk.color}`}>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Barre de complétude */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-xs font-medium ${risk.color} opacity-80`}>Complétude :</span>
        <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full"
            style={{ width: `${item.completeness}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${risk.color}`}>{item.completeness}%</span>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE_CONFIG, type BadgeCode } from '@/lib/trust';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';

export default function BadgesTab() {
  const [badgeTarget,   setBadgeTarget]   = useState('');
  const [badgeCode,     setBadgeCode]     = useState<BadgeCode>('admin_validated');
  const [awardingBadge, setAwardingBadge] = useState(false);

  const awardBadge = async () => {
    if (!badgeTarget.trim()) { toast.error('ID utilisateur requis'); return; }
    setAwardingBadge(true);
    const res = await adminFetch(`/api/admin/confiance/${badgeTarget.trim()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'award_badge', badge_code: badgeCode }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error('Erreur: ' + (body.error ?? res.statusText));
    } else {
      toast.success('Badge attribué !');
      setBadgeTarget('');
    }
    setAwardingBadge(false);
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> Attribuer un badge manuellement
        </h2>
        <div className="space-y-4">
          <div>
            <p className="block text-xs font-bold text-gray-600 mb-1">ID utilisateur (UUID)</p>
            <input
              type="text"
              value={badgeTarget}
              onChange={e => setBadgeTarget(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <p className="block text-xs font-bold text-gray-600 mb-1">Badge</p>
            <select
              value={badgeCode}
              onChange={e => setBadgeCode(e.target.value as BadgeCode)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {Object.entries(BADGE_CONFIG).map(([code, cfg]) => (
                <option key={code} value={code}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={awardBadge}
            disabled={awardingBadge || !badgeTarget.trim()}
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {awardingBadge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Attribuer le badge
          </button>
        </div>
      </div>

      {/* Catalog */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-3">Catalogue des badges</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(BADGE_CONFIG).map(([code, cfg]) => (
            <div key={code} className={cn('flex items-start gap-2.5 p-3 rounded-xl border', cfg.bg, 'border-current/10')}>
              <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
              <div>
                <p className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{cfg.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

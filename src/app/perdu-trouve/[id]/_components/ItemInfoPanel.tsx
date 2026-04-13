import { MapPin, Clock, Phone, Mail, Shield, EyeOff } from 'lucide-react';
import { CATEGORIES, STATUS_CONFIG, normalizeStatus } from '../_config';
import type { LFItem } from '../_types';

// ── Inline StatusBadge (used only in this module) ─────────────────────────────
function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = STATUS_CONFIG[normalizeStatus(status)] ?? STATUS_CONFIG.perdu;
  const sz  = size === 'sm' ? 'text-xs px-2.5 py-0.5'
            : size === 'lg' ? 'text-base px-4 py-2'
            :                 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border} ${sz}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.icon} {cfg.label}
    </span>
  );
}

type Props = { item: LFItem };

export function ItemInfoPanel({ item }: Props) {
  const isSensitive = item.is_sensitive || ['portefeuille', 'document'].includes(item.category);
  const dateLabel   = new Date(item.lost_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:shadow-none print:border-gray-300">

      {/* Status & type badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge status={item.status} size="lg" />
        <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border ${
          item.type === 'perdu'
            ? 'bg-orange-50 text-orange-700 border-orange-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {CATEGORIES[item.category] ?? item.category}
        </span>
        {isSensitive && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
            <Shield className="w-3.5 h-3.5" /> Sensible
          </span>
        )}
      </div>

      <h1 className="text-2xl font-black text-gray-900 mb-3">{item.title}</h1>

      {/* Location + date */}
      <div className="flex flex-col gap-1.5 mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="font-medium">
            {item.location_area}{item.location_detail ? ` — ${item.location_detail}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>{dateLabel}{item.lost_time ? ` à ${item.lost_time}` : ''}</span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
      </div>

      {/* Object details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {item.color && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-medium">Couleur</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.color}</p>
          </div>
        )}
        {item.brand && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-medium">Marque / Modèle</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.brand}</p>
          </div>
        )}
        {item.distinctive_sign && (
          <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2">
            <p className="text-xs text-gray-400 font-medium">Signe distinctif</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.distinctive_sign}</p>
          </div>
        )}
      </div>

      {/* Extra info badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {item.sentimental_value && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200">💝 Valeur sentimentale</span>
        )}
        {item.declared_authorities && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">🏛️ Déclaré aux autorités</span>
        )}
        {item.deposited_at && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">📍 Déposé : {item.deposited_at}</span>
        )}
        {item.reward && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🏆 {item.reward}</span>
        )}
        {item.proof_required && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">🔒 Preuve de propriété requise</span>
        )}
      </div>

      {/* Contact section */}
      {!item.keep_secret ? (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</p>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-800">{item.contact_name}</p>
            {item.show_phone && item.contact_phone && (
              <a href={`tel:${item.contact_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Phone className="w-3.5 h-3.5" />{item.contact_phone}
              </a>
            )}
            {item.contact_email && (
              <a href={`mailto:${item.contact_email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Mail className="w-3.5 h-3.5" />{item.contact_email}
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-4 flex items-center gap-2 text-sm text-slate-500">
          <EyeOff className="w-4 h-4" />
          Certains détails sont confidentiels pour sécuriser la restitution.
        </div>
      )}
    </div>
  );
}

import { Calendar, Clock, MapPin, BookOpen } from 'lucide-react';
import type { Association } from '../_types';

type Props = { asso: Association };

export function ActivitiesPanel({ asso }: Props) {
  const hasContent =
    asso.activities.length > 0 ||
    asso.schedule         != null ||
    asso.frequency        != null ||
    asso.price_type       != null;

  const hasAccessibility =
    asso.pmr_accessible     ||
    asso.families_welcome   ||
    asso.animals_ok         ||
    asso.parking_nearby     ||
    asso.material_provided;

  if (!hasContent) return null;

  return (
    <div className="space-y-6">

      {/* ── Description complète ──────────────────────────────────────────── */}
      {asso.description_full && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-500" /> À propos
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {asso.description_full}
          </div>
        </div>
      )}

      {/* ── Activités & Infos pratiques ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" /> Activités & Infos pratiques
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {asso.activities.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Activités proposées</p>
              <div className="flex flex-wrap gap-1.5">
                {asso.activities.map(a => (
                  <span key={a} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {asso.public_target.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Public</p>
              <div className="flex flex-wrap gap-1.5">
                {asso.public_target.map(p => (
                  <span key={p} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{p}</span>
                ))}
                {asso.age_min != null && asso.age_max != null && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {asso.age_min}–{asso.age_max} ans
                  </span>
                )}
              </div>
            </div>
          )}

          {asso.schedule && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Horaires</p>
              <p className="text-sm text-gray-700 flex items-start gap-1.5">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                {asso.schedule}
              </p>
            </div>
          )}

          {asso.frequency && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Fréquence</p>
              <p className="text-sm text-gray-700">{asso.frequency}</p>
            </div>
          )}

          {asso.price_type && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Tarif</p>
              <p className="text-sm text-gray-700 font-semibold">
                {asso.price_type === 'gratuit'
                  ? '✅ Gratuit'
                  : asso.price_type === 'payant'
                    ? `💰 Payant${asso.price_detail ? ` — ${asso.price_detail}` : ''}`
                    : asso.price_type}
              </p>
            </div>
          )}

          {asso.location && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Lieu</p>
              <p className="text-sm text-gray-700 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                {asso.address ?? asso.location}
              </p>
            </div>
          )}
        </div>

        {/* Accessibility badges */}
        {hasAccessibility && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2">Équipements & accessibilité</p>
            <div className="flex flex-wrap gap-1.5">
              {asso.pmr_accessible    && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">♿ PMR</span>}
              {asso.families_welcome  && <span className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-semibold">👨‍👩‍👧 Familles</span>}
              {asso.animals_ok        && <span className="text-xs px-2.5 py-1 rounded-full bg-lime-50 text-lime-700 border border-lime-200 font-semibold">🐾 Animaux OK</span>}
              {asso.parking_nearby    && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-semibold">🅿️ Parking</span>}
              {asso.material_provided && <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">✅ Matériel fourni</span>}
              {asso.registration_required && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">📝 Inscription requise</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

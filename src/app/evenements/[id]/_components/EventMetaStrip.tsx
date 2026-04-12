'use client';

/**
 * EventMetaStrip — Bande de 4 méta-données : date, horaire, lieu, tarif.
 */

import { Calendar, Clock, MapPin, Euro } from 'lucide-react';
import { formatEventDate, formatEventTime, daysUntilLabel } from '@/lib/events';
import type { EventDetail } from '../_types';

interface Props {
  event: EventDetail;
}

export default function EventMetaStrip({ event }: Props) {
  const daysLabel = daysUntilLabel(event.event_date);

  const priceLabel =
    event.price_type === 'gratuit' ? 'Gratuit' :
    event.price_type === 'libre'   ? 'Prix libre' :
    event.price_amount             ? `${event.price_amount} €` : 'Payant';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Date */}
      <div className="flex items-start gap-2">
        <Calendar className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400 font-medium">Date</p>
          <p className="text-sm font-bold text-gray-900">
            {formatEventDate(event.event_date, false)}
          </p>
          {daysLabel && (
            <p className="text-xs text-purple-600 font-semibold">{daysLabel}</p>
          )}
        </div>
      </div>

      {/* Horaire */}
      <div className="flex items-start gap-2">
        <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400 font-medium">Horaire</p>
          <p className="text-sm font-bold text-gray-900">
            {formatEventTime(event.start_time)}
            {event.end_time ? ` → ${formatEventTime(event.end_time)}` : ''}
          </p>
        </div>
      </div>

      {/* Lieu */}
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400 font-medium">Lieu</p>
          <p className="text-sm font-bold text-gray-900 line-clamp-1">{event.location}</p>
          {event.location_detail && (
            <p className="text-xs text-gray-500">{event.location_detail}</p>
          )}
        </div>
      </div>

      {/* Tarif */}
      <div className="flex items-start gap-2">
        <Euro className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400 font-medium">Tarif</p>
          <p className="text-sm font-bold text-gray-900">{priceLabel}</p>
        </div>
      </div>
    </div>
  );
}

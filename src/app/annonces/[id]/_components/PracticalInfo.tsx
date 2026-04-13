import { Clock, PackageCheck, ArrowLeftRight } from 'lucide-react';
import type { ExtListing } from '../_types';

type Props = { listing: ExtListing };

export function PracticalInfo({ listing }: Props) {
  const { availability_window, pickup_notes, exchange_preferences } = listing;
  if (!availability_window && !pickup_notes && !exchange_preferences) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      <h2 className="font-bold text-gray-900 mb-1">Informations pratiques</h2>

      {availability_window && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-gray-700">Disponibilité : </span>
            {availability_window}
          </div>
        </div>
      )}

      {pickup_notes && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <PackageCheck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-gray-700">Remise / retrait : </span>
            {pickup_notes}
          </div>
        </div>
      )}

      {exchange_preferences && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <ArrowLeftRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-gray-700">Échange souhaité contre : </span>
            {exchange_preferences}
          </div>
        </div>
      )}
    </div>
  );
}

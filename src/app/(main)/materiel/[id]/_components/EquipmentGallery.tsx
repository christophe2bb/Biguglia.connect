

import { MapPin, Calendar } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';
import { CONDITION_LABELS, formatDate } from '@/lib/utils';
import { EQUIPMENT_STATUS_CONFIG } from '@/lib/equipment';
import type { EquipmentItemFull, EquipmentStatus } from '@/lib/equipment';

type Props = { item: EquipmentItemFull };

export default function EquipmentGallery({ item }: Props) {
  const rawPhotos = item.photos as Array<{ id: string; url: string; display_order?: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];

  return (
    <div className="space-y-4">
      {/* Photos */}
      {photos.length > 0 ? (
        <PhotoGallery photos={photos} title={item.title} mainHeight="h-72" />
      ) : (
        <div className="h-48 bg-gray-100 rounded-2xl flex items-center justify-center">
          <span className="text-6xl">
            {(item.category as { icon?: string })?.icon || '🔧'}
          </span>
        </div>
      )}

      {/* Titre & badges */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.icon} {cfg.label}
          </span>
          {item.is_free
            ? <Badge variant="success">Gratuit</Badge>
            : <Badge variant="default">{item.daily_rate}€/jour</Badge>}
          {item.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {(item.category as { icon?: string; name?: string }).icon}{' '}
              {(item.category as { name?: string }).name}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {item.pickup_location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />{item.pickup_location}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />{formatDate(item.created_at)}
          </div>
          {item.condition && (
            <span>{CONDITION_LABELS[item.condition] || item.condition}</span>
          )}
        </div>
      </div>
    </div>
  );
}

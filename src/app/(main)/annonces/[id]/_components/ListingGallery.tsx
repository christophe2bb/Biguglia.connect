import dynamic from 'next/dynamic';
import { toPhotoItems } from '@/components/ui/photo-utils';

// PhotoGallery (inclut lightbox) : lazy-load pour réduire le bundle initial
// La galerie est above-the-fold mais le code JS peut être différé (HTML = SSR)
const PhotoGallery = dynamic(
  () => import('@/components/ui/PhotoViewer').then(m => ({ default: m.PhotoGallery })),
  {
    ssr: false,
    loading: () => <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />,
  }
);

type Props = {
  photos: ReturnType<typeof toPhotoItems>;
  categoryIcon?: string;
  title: string;
};

export function ListingGallery({ photos, categoryIcon, title }: Props) {
  if (photos.length > 0) {
    return <PhotoGallery photos={photos} title={title} mainHeight="h-80" />;
  }

  return (
    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
      <span className="text-5xl opacity-30">{categoryIcon || '📦'}</span>
    </div>
  );
}

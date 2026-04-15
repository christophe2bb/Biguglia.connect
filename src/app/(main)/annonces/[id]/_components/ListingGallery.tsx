import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';

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

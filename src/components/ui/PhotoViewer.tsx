'use client';

/**
 * src/components/ui/PhotoViewer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel re-export — point d'entrée unique pour la visionneuse photo.
 *
 * Ce fichier était un monolithe de 673 lignes. Il est maintenant découpé en :
 *
 *   src/components/ui/photo/
 *   ├── use-focus-trap.ts          — hook focus trap WCAG 2.1 AA
 *   ├── PhotoLightbox.tsx          — lightbox plein écran (zoom, swipe, nav clavier)
 *   ├── PhotoGalleryComponent.tsx  — grille + miniatures + badge +N → ouvre Lightbox
 *   └── PhotoUploaderField.tsx     — zone upload avec drag-and-drop réordonnance
 *
 * Les types PhotoItem + toPhotoItems sont définis dans photo-utils.ts (sans
 * 'use client') pour être importables depuis les Server Components.
 *
 * Rétrocompatibilité : tous les importeurs existants utilisant
 *   import { PhotoViewer, PhotoGallery, PhotoUploaderField, … } from '@/components/ui/PhotoViewer'
 * continuent de fonctionner sans modification.
 */

// Types utilitaires (Server-Component safe)
export type { PhotoItem } from './photo-utils';
export { toPhotoItems } from './photo-utils';

// Hook focus trap
export { useFocusTrap } from './photo/use-focus-trap';

// Composants client
export { PhotoLightbox } from './photo/PhotoLightbox';
export type { PhotoLightboxProps } from './photo/PhotoLightbox';

// PhotoGallery — alias rétrocompatible de PhotoGalleryComponent
export { PhotoGalleryComponent as PhotoGallery } from './photo/PhotoGalleryComponent';

// PhotoUploaderField + type UploadedPhoto
export { PhotoUploaderField } from './photo/PhotoUploaderField';
export type { UploadedPhoto } from './photo/PhotoUploaderField';

// PhotoViewer — alias rétrocompatible de PhotoLightbox
// (l'ancien export s'appelait PhotoViewer, les importeurs l'utilisent encore)
export { PhotoLightbox as PhotoViewer } from './photo/PhotoLightbox';

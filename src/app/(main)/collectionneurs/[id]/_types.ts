/**
 * Types partagés – page détail collectionneurs /collectionneurs/[id]
 */

export interface SortedPhoto {
  url: string;
  is_cover?: boolean;
  sort_order?: number;
  image_url?: string;
  preview?: string;
}

export interface SimilarItemPhoto {
  url?: string | null;
  is_cover?: boolean;
}

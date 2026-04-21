'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toPhotoItems } from '@/components/ui/photo-utils';
import toast from 'react-hot-toast';
import type { Association } from '../_types';

const LS_KEY = 'biguglia_saved_assos';

export type UseAssociationDetailReturn = {
  asso: Association | null;
  allPhotos: ReturnType<typeof toPhotoItems>;
  coverPhoto: string | undefined;
  loading: boolean;
  error: string | null;
  saved: boolean;
  lightboxOpen: boolean;
  lightboxIdx: number;
  toggleSave: () => void;
  handleShare: () => void;
  openLightbox: (idx: number) => void;
  closeLightbox: () => void;
};

export function useAssociationDetail(
  id: string,
  initialItem?: Association,
): UseAssociationDetailReturn {
  const supabase = createClient();

  // Seed with server-provided data when available
  const [asso, setAsso]           = useState<Association | null>(initialItem ?? null);
  const [loading, setLoading]     = useState(!initialItem);
  const [error, setError]         = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);

  // ── Fetch association (only when no server data) ──────────────────────────
  useEffect(() => {
    if (initialItem || !id) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('associations')
        .select('*, author:profiles(full_name, avatar_url), photos:asso_photos(url, display_order)')
        .eq('id', id)
        .single();

      if (err || !data) {
        setError('Association introuvable.');
      } else {
        const enriched: Association = {
          ...data,
          public_target: Array.isArray(data.public_target) ? data.public_target : [],
          activities:    Array.isArray(data.activities)    ? data.activities    : [],
          tags:          Array.isArray(data.tags)          ? data.tags          : [],
          needs:         Array.isArray(data.needs)         ? data.needs         : [],
          photos: (data.photos ?? []).sort(
            (a: { display_order: number }, b: { display_order: number }) =>
              a.display_order - b.display_order,
          ),
        };
        setAsso(enriched);
      }
      setLoading(false);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load saved state from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
      setSaved(list.includes(id));
    } catch { /* ignore */ }
  }, [id]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const toggleSave = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
      const newList = saved ? list.filter(x => x !== id) : [...list, id];
      localStorage.setItem(LS_KEY, JSON.stringify(newList));
      setSaved(prev => !prev);
      toast.success(saved ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch { /* ignore */ }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: asso?.name ?? 'Association', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Lien copié !'));
    }
  };

  const openLightbox  = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);

  // ── Derived values ────────────────────────────────────────────────────────────
  const allPhotos  = toPhotoItems(asso?.photos ?? []);
  const coverPhoto = asso?.photos?.[0]?.url;

  return {
    asso, allPhotos, coverPhoto,
    loading, error,
    saved, lightboxOpen, lightboxIdx,
    toggleSave, handleShare, openLightbox, closeLightbox,
  };
}

'use client';
/**
 * ArtisanActions — Client Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Variants :
 *   'favorite' → bouton cœur (header de la fiche artisan)
 *   'gallery'  → galerie interactive avec miniatures cliquables
 *
 * Tout le reste de la page est rendu côté serveur.
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import type { ArtisanProfile } from '@/types';

type Variant = 'favorite' | 'gallery';

interface Props {
  artisan: ArtisanProfile;
  variant: Variant;
}

export default function ArtisanActions({ artisan, variant }: Props) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [isFavorite,   setIsFavorite]   = useState(false);
  const [activePhoto,  setActivePhoto]  = useState(0);

  const gallery = artisan.gallery as Array<{ id: string; url: string }> | undefined;

  // ── Check existing favorite ────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createClient();
    supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', profile.id)
      .eq('target_id', artisan.id)
      .eq('target_type', 'artisan')
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [profile?.id, artisan.id]);

  // ── Toggle favorite ────────────────────────────────────────────────────────
  const toggleFavorite = async () => {
    if (!profile) { router.push('/connexion'); return; }
    const supabase = createClient();
    if (isFavorite) {
      await supabase.from('user_favorites').delete()
        .eq('user_id', profile.id)
        .eq('target_id', artisan.id)
        .eq('target_type', 'artisan');
      setIsFavorite(false);
      toast.success('Retiré des favoris');
    } else {
      await supabase.from('user_favorites').insert({
        user_id: profile.id,
        target_id: artisan.id,
        target_type: 'artisan',
      });
      setIsFavorite(true);
      toast.success('Ajouté aux favoris');
    }
  };

  // ── VARIANT: favorite button ───────────────────────────────────────────────
  if (variant === 'favorite') {
    return (
      <button
        onClick={toggleFavorite}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-pressed={isFavorite}
        className="p-2 rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
      >
        <Heart
          className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          aria-hidden="true"
        />
      </button>
    );
  }

  // ── VARIANT: gallery with thumbnails ──────────────────────────────────────
  if (variant === 'gallery') {
    if (!gallery || gallery.length === 0) return null;
    return (
      <div className="bg-gray-100 rounded-2xl overflow-hidden">
        <div className="relative h-72">
          <Image
            src={gallery[activePhoto]?.url}
            alt="Réalisation"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {gallery.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setActivePhoto(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                  i === activePhoto ? 'border-brand-500' : 'border-transparent'
                }`}
              >
                <Image src={photo.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

'use client';
/**
 * ContextBanner
 * Bannière repliable affichant les métadonnées de la ressource liée à la
 * conversation (annonce, matériel, coup de main, etc.).
 * Charge les données de contexte de façon asynchrone selon le related_type.
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronUp, ChevronDown, ExternalLink, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CONTEXT_CONFIG } from '../_config';

interface ContextData {
  title: string;
  description?: string;
  photo?: string;
  price?: string;
  location?: string;
  status?: string;
}

interface ContextBannerProps {
  relatedType: string | null;
  relatedId: string | null;
  subject: string;
}

export function ContextBanner({ relatedType, relatedId, subject }: ContextBannerProps) {
  const [open, setOpen] = useState(true);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);

  const conf = relatedType ? CONTEXT_CONFIG[relatedType] : null;

  useEffect(() => {
    if (!relatedType || !relatedId || relatedType === 'general') return;
    setLoadingCtx(true);

    const supabase = createClient();

    const load = async () => {
      try {
        if (relatedType === 'listing') {
          const { data } = await supabase
            .from('listings')
            .select('title, description, price, location, listing_type, photos:listing_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.price != null ? (data.price === 0 ? 'Gratuit' : `${data.price} €`) : undefined,
              location: data.location,
              status: data.listing_type,
            });
          }
        } else if (relatedType === 'equipment') {
          const { data } = await supabase
            .from('equipment_items')
            .select('title, description, daily_rate, photos:equipment_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.daily_rate ? `${data.daily_rate} €/j` : 'Gratuit',
            });
          }
        } else if (relatedType === 'help_request') {
          const { data } = await supabase
            .from('help_requests')
            .select('title, description, category, urgency, location_city, photos:help_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location_city,
              status: data.urgency,
            });
          }
        } else if (relatedType === 'lost_found') {
          const { data } = await supabase
            .from('lost_found_items')
            .select('title, description, location_area, photos:lf_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location_area,
            });
          }
        } else if (relatedType === 'association') {
          const { data } = await supabase
            .from('associations')
            .select('name, description_short, location, photos:asso_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.name,
              description: (data.description_short as string | null)?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location,
            });
          }
        } else if (relatedType === 'collection_item') {
          const { data } = await supabase
            .from('collection_items')
            .select('title, description, price, photos:collection_item_photos(url)')
            .eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.price != null ? `${data.price} €` : undefined,
            });
          }
        } else if (relatedType === 'service_request') {
          const { data } = await supabase
            .from('service_requests')
            .select('title, description')
            .eq('id', relatedId).single();
          if (data) setContextData({ title: data.title, description: data.description?.slice(0, 120) });
        }
      } catch (e) {
        console.warn('[ContextBanner] load failed', e);
      } finally {
        setLoadingCtx(false);
      }
    };

    load();
  }, [relatedType, relatedId]);

  if (!conf || relatedType === 'general') return null;

  const CtxIcon = conf.icon;
  const href = relatedId ? conf.href(relatedId) : conf.href('');

  return (
    <div className={cn('rounded-2xl border mb-3 overflow-hidden', conf.bg, conf.border)}>
      {/* Barre titre repliable */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-left', conf.bg)}
      >
        <CtxIcon className={cn('w-4 h-4 flex-shrink-0', conf.color)} />
        <span className={cn('text-xs font-bold flex-1 truncate', conf.color)}>
          {conf.label} · {contextData?.title || subject}
        </span>
        {open
          ? <ChevronUp className={cn('w-3.5 h-3.5 flex-shrink-0', conf.color)} />
          : <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0', conf.color)} />
        }
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1">
          {loadingCtx ? (
            <div className="animate-pulse flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/60 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-white/60 rounded w-3/4" />
                <div className="h-3 bg-white/60 rounded w-1/2" />
              </div>
            </div>
          ) : contextData ? (
            <div className="flex gap-3">
              {contextData.photo ? (
                <Image
                  src={contextData.photo}
                  alt={contextData.title}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/50 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/50">
                  <CtxIcon className={cn('w-6 h-6', conf.color)} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-sm leading-tight truncate', conf.color)}>
                  {contextData.title}
                </p>
                {contextData.description && (
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {contextData.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {contextData.price && (
                    <span className={cn('text-xs font-black', conf.color)}>{contextData.price}</span>
                  )}
                  {contextData.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />{contextData.location}
                    </span>
                  )}
                  {contextData.status && (
                    <span className="text-xs text-gray-500 capitalize">{contextData.status}</span>
                  )}
                </div>
              </div>
              <Link
                href={href}
                className={cn(
                  'flex-shrink-0 self-center flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/80 border transition-all hover:bg-white',
                  conf.color, conf.border,
                )}
                target="_blank"
              >
                <ExternalLink className="w-3 h-3" /> Voir
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-semibold', conf.color)}>{subject}</span>
              <Link
                href={href}
                className={cn('flex items-center gap-1 text-xs font-bold hover:underline', conf.color)}
                target="_blank"
              >
                <ExternalLink className="w-3 h-3" /> Voir
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

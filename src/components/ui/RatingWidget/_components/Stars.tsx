'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarsProps {
  rating: number;
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md';
  onRate?: (r: number) => void;
}

export default function Stars({ rating, interactive = false, size = 'sm', onRate }: StarsProps) {
  const [hovered, setHovered] = useState(0);

  const sz      = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const display = interactive ? (hovered || rating) : rating;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            sz,
            'transition-all duration-100',
            i <= Math.round(display) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200',
            interactive && 'cursor-pointer hover:scale-110',
          )}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
}

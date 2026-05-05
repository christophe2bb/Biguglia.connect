import { cn, getInitials } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Tailles en px — doivent correspondre aux classes Tailwind ci-dessous
const sizePx: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const sizeClass: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const cls  = sizeClass[size];
  const px   = sizePx[size];

  if (src) {
    return (
      // Le conteneur a des dimensions fixes + overflow-hidden + flex-shrink-0
      // On N'utilise PAS fill pour éviter que l'image déborde hors du cercle
      <div
        className={cn(
          'relative rounded-full overflow-hidden flex-shrink-0 inline-flex',
          cls,
          className
        )}
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
      >
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full rounded-full"
          unoptimized={src.startsWith('blob:') || src.startsWith('data:')}
        />
      </div>
    );
  }

  // Fallback initiales
  const colors = [
    'bg-brand-100 text-brand-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0 inline-flex',
        colors[colorIndex],
        cls,
        className
      )}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      {getInitials(name)}
    </div>
  );
}

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'color' | 'white' | 'dark';
}

const sizes = {
  sm: { icon: 32, font: 'text-base' },
  md: { icon: 40, font: 'text-xl' },
  lg: { icon: 56, font: 'text-2xl' },
  xl: { icon: 80, font: 'text-4xl' },
};

export default function Logo({ size = 'md', showText = true, className, variant = 'color' }: LogoProps) {
  const { icon: iconSize, font } = sizes[size];

  const textColor = variant === 'white' ? 'text-white' : variant === 'dark' ? 'text-gray-900' : 'text-gray-900';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* SVG Logo Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ca5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="logoGradBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff5f0" />
            <stop offset="100%" stopColor="#ffedd5" />
          </linearGradient>
        </defs>

        {/* Rounded square background */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logoGradBg)" />
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logoGrad1)" opacity="0.9" />

        {/* House shape - stylized roof */}
        <path
          d="M24 10 L38 22 L38 38 L10 38 L10 22 Z"
          fill="white"
          fillOpacity="0.95"
        />
        {/* Roof triangle highlight */}
        <path
          d="M24 8 L40 21 L8 21 Z"
          fill="white"
          fillOpacity="0.4"
        />

        {/* Door */}
        <rect x="20" y="28" width="8" height="10" rx="2" fill="url(#logoGrad1)" />

        {/* Windows */}
        <rect x="12" y="25" width="6" height="5" rx="1" fill="url(#logoGrad2)" />
        <rect x="30" y="25" width="6" height="5" rx="1" fill="url(#logoGrad2)" />

        {/* Connection dots - symbolizing the network */}
        <circle cx="10" cy="42" r="2" fill="white" fillOpacity="0.8" />
        <circle cx="24" cy="44" r="2" fill="white" fillOpacity="0.8" />
        <circle cx="38" cy="42" r="2" fill="white" fillOpacity="0.8" />
        <line x1="10" y1="42" x2="24" y2="44" stroke="white" strokeOpacity="0.6" strokeWidth="1" />
        <line x1="24" y1="44" x2="38" y2="42" stroke="white" strokeOpacity="0.6" strokeWidth="1" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn(font, 'font-bold tracking-tight', textColor)}>
            <span className="text-brand-600">Biguglia</span>
            <span className={variant === 'white' ? 'text-white' : 'text-gray-700'}> Connect</span>
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-xs text-brand-500 font-medium tracking-widest uppercase">
              Corse 🌿
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Types partagés pour GlobalSearch ────────────────────────────────────────

export interface QuickResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  theme: string;
  themeLabel: string;
  themeColor: string;
  themeBg: string;
  icon: React.ReactNode;
  /** score de pertinence : nb de mots du query présents dans le titre */
  score?: number;
}

export interface GlobalSearchProps {
  /** Taille de la barre */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Placeholder customisé */
  placeholder?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Callback quand la recherche est lancée */
  onSearch?: (q: string) => void;
  /** Afficher les résultats en overlay (default true) */
  overlay?: boolean;
  /** Valeur initiale */
  initialValue?: string;
  /** Auto-focus */
  autoFocus?: boolean;
}

/** Mapping taille → classes Tailwind */
export type SizeKey = 'sm' | 'md' | 'lg' | 'xl';

export interface SizeTokens {
  input: string;
  icon: string;
  clearBtn: string;
  btn: string;
}

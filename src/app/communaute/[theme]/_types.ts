// ─── Types partagés pour la page communauté/[theme] ──────────────────────────

export type ThemeTab = 'membres' | 'discussions' | 'monprofil';

export interface ThemeConfig {
  label: string;
  emoji: string;
  bgGradient: string;
  headerBg: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
  href: string;
  description: string;
  icon: React.ElementType;
}

export interface Discussion {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  likes_count: number;
  author?: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
  my_like?: boolean;
}

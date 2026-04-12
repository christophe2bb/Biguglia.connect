/**
 * Backward-compatible re-export.
 * The implementation lives in src/components/ui/GlobalSearch/index.tsx.
 * All existing imports (`import GlobalSearch from '@/components/ui/GlobalSearch'`)
 * continue to resolve here thanks to Next.js / TypeScript module resolution.
 */
export { default, THEME_CONFIG, type ThemeKey } from './GlobalSearch/index';

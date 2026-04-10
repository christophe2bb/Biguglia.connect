import { createBrowserClient } from '@supabase/ssr';

/**
 * Nettoie une variable d'environnement : supprime les espaces, retours à la ligne
 * et autres caractères invisibles qui peuvent se glisser lors d'un copier-coller
 * dans les dashboards Vercel / Netlify / .env.local.
 *
 * Symptôme typique : NEXT_PUBLIC_SUPABASE_ANON_KEY contient un \n final →
 * la clé est transmise encodée %0A dans l'URL du WebSocket Supabase Realtime →
 * toutes les connexions WS échouent en boucle.
 */
function cleanEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`[Supabase] Variable d'environnement manquante : ${name}`);
  }
  const cleaned = value.trim();
  if (cleaned !== value) {
    console.warn(
      `[Supabase] ⚠️  ${name} contenait des espaces/sauts de ligne — nettoyé automatiquement.\n` +
      `Corrigez la variable dans votre dashboard Vercel / .env.local pour éviter ce warning.`
    );
  }
  return cleaned;
}

export function createClient() {
  return createBrowserClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL,      'NEXT_PUBLIC_SUPABASE_URL'),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
}

/**
 * src/app/admin/layout.tsx — Server Component
 *
 * Protection admin en deux couches :
 *  1. [Serveur] verifyAdminLayout() — valide JWT + rôle via service-role key (bypass RLS)
 *  2. [Client]  ProtectedPage adminOnly — vérifie rôle depuis profil rechargé
 *
 * Si la couche serveur échoue (getUser() timeout en Edge), la couche client prend le relais.
 * Si la couche client échoue (profil null), elle force un rechargement depuis Supabase.
 */

import { headers } from 'next/headers';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Lecture des headers pour forcer l'exécution dynamique côté serveur.
  // Sans cela, Next.js peut cacher le layout et skip la vérification auth.
  await headers();

  // Import dynamique pour éviter les erreurs de bundling côté client
  const { verifyAdminLayout } = await import('@/lib/supabase/admin-layout-guard');

  try {
    // Valide JWT + rôle. Lance redirect() si non autorisé.
    await verifyAdminLayout();
  } catch (err: unknown) {
    // verifyAdminLayout peut lancer une redirection (via next/navigation redirect())
    // qui est interceptée par Next.js. Toute autre erreur doit être re-lancée.
    // Les redirections Next.js ont un code spécial — on les laisse passer.
    const isRedirect =
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || err.message.includes('NEXT_REDIRECT'));

    if (isRedirect) throw err; // re-lancer pour que Next.js gère la redirection

    // Erreur inattendue (réseau, timeout Edge) → on laisse passer.
    // La couche client (ProtectedPage adminOnly) protègera la page.
    console.error('[AdminLayout] verifyAdminLayout error (non-redirect):', err);
  }

  return <>{children}</>;
}

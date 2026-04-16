/**
 * src/app/admin/layout.tsx — Server Component
 *
 * Layout pour toutes les pages /admin/*.
 *
 * Protection serveur forte (double couche) :
 * ──────────────────────────────────────────
 *  1. verifyAdminLayout() — exécuté côté serveur AVANT tout rendu :
 *       • auth.getUser()  → validation JWT réelle par Supabase (signature + expiration)
 *       • profiles.role   → chargé via service-role key (bypass RLS)
 *       • redirect('/connexion?next=/admin') si pas de session
 *       • redirect('/')                      si rôle ≠ admin / moderator
 *
 *  2. ProtectedPage (adminOnly) — dans chaque page /admin/* côté client :
 *       garde de secours (store Zustand) si le layout est contourné.
 *
 *  3. API routes admin (/api/admin/**) — getAdminUser(req) :
 *       vérification JWT + rôle sur chaque mutation.
 *
 * Un non-admin ne charge JAMAIS l'UI admin — redirection serveur pure.
 */

import type { Metadata } from 'next';
import AuthProvider from '@/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { verifyAdminLayout } from '@/lib/supabase/admin-layout-guard';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Bloque avant tout rendu : JWT validé + rôle vérifié côté serveur.
  // Lance une redirection Next.js si la condition n'est pas remplie.
  await verifyAdminLayout();

  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </AuthProvider>
  );
}

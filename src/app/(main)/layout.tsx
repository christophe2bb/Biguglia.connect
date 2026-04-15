/**
 * src/app/(main)/layout.tsx
 *
 * Shell applicatif pour toutes les pages publiques et authentifiées
 * qui affichent la Navbar et le Footer (accueil, annonces, artisans, forum…).
 *
 * Les routes exclues de ce groupe (et donc sans ce shell) :
 *   /admin       → layout propre passthrough + ProtectedPage côté client
 *   /connexion   → layout noindex, pas de Navbar
 *   /inscription → idem
 *   /mot-de-passe-oublie → idem
 *   /dashboard, /messages, /profil, /notifications, /mes-echanges
 *              → layout noindex ; Navbar héritée via AppShell séparé
 *
 * Le groupe (main) est invisible dans les URLs (Next.js route groups).
 */

import AuthProvider from '@/components/providers/AuthProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:   '#fff',
            color:        '#1f2937',
            border:       '1px solid #f3f4f6',
            borderRadius: '12px',
            boxShadow:    '0 10px 40px rgba(0,0,0,0.1)',
            fontSize:     '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}

/**
 * src/app/(private)/layout.tsx
 *
 * Shell pour les routes authentifiées qui ont besoin de la Navbar
 * mais pas du Footer public (dashboard, messages, profil, notifications, mes-echanges).
 *
 * Metadata noindex héritée individuellement par chaque sous-dossier.
 * Le groupe (private) est invisible dans les URLs.
 */

import AuthProvider from '@/components/providers/AuthProvider';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from 'react-hot-toast';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
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

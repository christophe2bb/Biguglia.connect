/**
 * src/app/(auth)/layout.tsx
 *
 * Shell minimal pour les pages d'authentification (connexion, inscription,
 * mot-de-passe-oublie). Fournit AuthProvider (pour détecter session existante
 * et rediriger) et Toaster (pour les messages d'erreur), sans Navbar ni Footer.
 *
 * Le groupe (auth) est invisible dans les URLs.
 */

import AuthProvider from '@/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
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

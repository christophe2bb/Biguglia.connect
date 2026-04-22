import type { Metadata } from 'next';

/**
 * Layout /associations/nouvelle
 * Empêche l'indexation Google du formulaire de création (page transactionnelle).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

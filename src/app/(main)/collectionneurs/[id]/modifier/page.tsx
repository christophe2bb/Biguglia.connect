import type { Metadata } from 'next';
import ModifierLoader from './ModifierLoader';

export const metadata: Metadata = {
  title: 'Modifier mon annonce | Biguglia Connect',
  robots: { index: false, follow: false },
};

export default function ModifierAnnoncePage() {
  return <ModifierLoader />;
}

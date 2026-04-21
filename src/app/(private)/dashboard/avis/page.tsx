import type { Metadata } from 'next';
import AvisLoader from './AvisLoader';

export const metadata: Metadata = {
  title: 'Mes avis | Biguglia Connect',
  robots: { index: false, follow: false },
};

export default function MesAvisPage() {
  return <AvisLoader />;
}

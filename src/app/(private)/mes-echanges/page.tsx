import type { Metadata } from 'next';
import MesEchangesClient from './MesEchangesClient';

export const metadata: Metadata = {
  title: 'Mes Échanges | Biguglia Connect',
  description: 'Gérez vos échanges et interactions avec la communauté.',
  robots: { index: false, follow: false },
};

export default function MesEchangesPage() {
  return <MesEchangesClient />;
}

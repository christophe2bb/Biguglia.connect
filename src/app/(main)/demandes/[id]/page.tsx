/**
 * Les demandes d'aide nécessitent une session. Une recherche publique sans
 * cookie ne peut pas récupérer l'objet en RLS et retourne toujours "introuvable".
 * Ne jamais publier de titres/descriptions/adresses de devis privés en SEO.
 */
import type { Metadata } from 'next';
import DemandeDetailClient from './DemandeDetailClient';

export const metadata: Metadata = {
  title: 'Détail d’une demande de service — Biguglia Connect',
  description: 'Consultez et répondez à une demande de service sur Biguglia Connect après connexion.',
  robots: { index: false, follow: false },
};

export default function DemandeDetailPage() {
  return <DemandeDetailClient />;
}

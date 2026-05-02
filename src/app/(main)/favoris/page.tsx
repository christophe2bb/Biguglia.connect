/**
 * /favoris — Page Mes Favoris
 *
 * Deux onglets :
 *   • Annonces  — IDs stockés en localStorage (annonces_favorites)
 *   • Artisans  — rangés en base (user_favorites, target_type='artisan')
 *
 * Rendu entièrement côté client (données dépendent du navigateur/auth).
 */

import type { Metadata } from 'next';
import FavorisClient from './_page.client';

export const metadata: Metadata = {
  title: 'Mes favoris — Biguglia Connect',
  description: 'Retrouvez toutes vos annonces et artisans sauvegardés en un seul endroit.',
  robots: 'noindex',
};

export default function FavorisPage() {
  return <FavorisClient />;
}

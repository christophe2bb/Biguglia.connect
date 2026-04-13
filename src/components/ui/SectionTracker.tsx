'use client';

/**
 * SectionTracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Composant invisible qui enregistre la visite d'une section dans localStorage.
 * À placer dans le layout ou la page client de chaque section importante.
 *
 * Usage :
 *   <SectionTracker section="emploi" />
 *
 * Cela incrémente le compteur bc_section_visits['emploi'] — utilisé par
 * user-interests.ts pour personnaliser le feed et la bannière d'accueil.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { trackSectionVisit } from '@/lib/user-interests';

interface SectionTrackerProps {
  /** Identifiant de la section (ex: 'emploi', 'forum', 'artisans') */
  section: string;
}

/**
 * Composant sans rendu visible — uniquement un effet de bord au montage.
 * Utilise useEffect pour n'appeler trackSectionVisit qu'une fois par visite de page.
 */
export default function SectionTracker({ section }: SectionTrackerProps) {
  useEffect(() => {
    trackSectionVisit(section);
    // Intentionnellement sans dépendances supplémentaires :
    // on veut tracker exactement une fois à l'affichage de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aucun rendu visuel — ce composant est purement fonctionnel
  return null;
}

/**
 * sectors.ts — Couche territoriale transversale Biguglia
 *
 * Source unique de vérité pour les secteurs de Biguglia.
 * Utilisé par tous les modules : Forum, Perdu/Trouvé, Coups de main,
 * Événements, Promenades, Associations, Collectionneurs, Matériel.
 */

export interface Sector {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: SectorColor;
  display_order: number;
  description?: string;
}

export type SectorColor = 'emerald' | 'blue' | 'amber' | 'green' | 'violet' | 'orange' | 'gray';

/** Niveau d'obligation selon le module */
export type SectorRequirement = 'required' | 'recommended' | 'optional' | 'special';

/** Règle par module */
export const SECTOR_MODULE_RULES: Record<string, SectorRequirement> = {
  forum:          'required',
  'perdu-trouve': 'required',
  'coups-de-main':'required',
  evenements:     'special',   // facultatif/multi-secteurs/toute la ville
  promenades:     'recommended',
  associations:   'recommended',
  collectionneurs:'recommended',
  materiel:       'recommended',
  annonces:       'recommended',
};

/** Liste canonique des secteurs */
export const SECTORS: Sector[] = [
  { id: 'les-collines', name: 'Les Collines',        slug: 'les-collines', icon: '⛰️', color: 'emerald', display_order: 1, description: 'Quartier résidentiel sur les hauteurs' },
  { id: 'figabruna',    name: 'Figabruna',            slug: 'figabruna',    icon: '🌊', color: 'blue',    display_order: 2, description: 'Secteur sud de Biguglia' },
  { id: 'village',      name: 'Village de Biguglia',  slug: 'village',      icon: '🏘️', color: 'amber',   display_order: 3, description: 'Cœur historique du village' },
  { id: 'casatorra',    name: 'Casatorra',             slug: 'casatorra',    icon: '🌿', color: 'green',   display_order: 4, description: 'Secteur Casatorra' },
  { id: 'ortale',       name: 'Ortale',                slug: 'ortale',       icon: '🏡', color: 'violet',  display_order: 5, description: 'Quartier Ortale' },
  { id: 'la-plaine',   name: 'La Plaine',             slug: 'la-plaine',    icon: '🌾', color: 'orange',  display_order: 6, description: 'Zone de la plaine et étang' },
];

/** Map id → Sector pour accès O(1) */
export const SECTOR_MAP: Record<string, Sector> = Object.fromEntries(
  SECTORS.map(s => [s.id, s])
);

/** Classes Tailwind par couleur */
export const SECTOR_COLORS: Record<SectorColor, {
  bg: string; text: string; border: string;
  badge: string; badgeSolid: string; ring: string;
}> = {
  emerald: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700', badgeSolid: 'bg-emerald-600 text-white',
    ring: 'ring-emerald-300',
  },
  blue: {
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700', badgeSolid: 'bg-blue-600 text-white',
    ring: 'ring-blue-300',
  },
  amber: {
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700', badgeSolid: 'bg-amber-600 text-white',
    ring: 'ring-amber-300',
  },
  green: {
    bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200',
    badge: 'bg-green-100 text-green-700', badgeSolid: 'bg-green-600 text-white',
    ring: 'ring-green-300',
  },
  violet: {
    bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700', badgeSolid: 'bg-violet-600 text-white',
    ring: 'ring-violet-300',
  },
  orange: {
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700', badgeSolid: 'bg-orange-600 text-white',
    ring: 'ring-orange-300',
  },
  gray: {
    bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600', badgeSolid: 'bg-gray-600 text-white',
    ring: 'ring-gray-300',
  },
};

/** Obtenir un secteur par id ou slug */
export function getSector(idOrSlug: string): Sector | undefined {
  return SECTORS.find(s => s.id === idOrSlug || s.slug === idOrSlug);
}

/** Badge classes pour un secteur donné */
export function sectorBadgeClass(sectorId: string | null | undefined): string {
  if (!sectorId) return SECTOR_COLORS.gray.badge;
  const sector = getSector(sectorId);
  return SECTOR_COLORS[sector?.color ?? 'gray'].badge;
}

/** Message de validation selon le niveau d'obligation */
export function getSectorValidationMessage(module: string): string | null {
  const rule = SECTOR_MODULE_RULES[module];
  if (rule === 'required') return 'Veuillez sélectionner un secteur pour continuer.';
  if (rule === 'recommended') return 'Nous vous recommandons de préciser le secteur pour une meilleure visibilité.';
  return null;
}

/** Vérifie si le secteur est valide pour un module obligatoire */
export function isSectorValid(sectorId: string | null | undefined, module: string): boolean {
  const rule = SECTOR_MODULE_RULES[module];
  if (rule === 'required') return !!sectorId && sectorId !== '';
  return true; // recommandé/facultatif → toujours valide
}

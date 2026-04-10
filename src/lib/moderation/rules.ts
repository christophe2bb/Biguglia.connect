/**
 * moderation/rules.ts
 * Règles de validation pré-publication par type de contenu.
 */
import type { ContentType } from './types';

export interface ValidationRule {
  field: string;
  label: string;
  check: (value: unknown, data?: Record<string, unknown>) => boolean;
  message: string;
  weight: number; // importance 1-3
}

const MIN_TITLE_LEN = 10;
const MIN_DESC_LEN  = 30;

const titleRule: ValidationRule = {
  field: 'title', label: 'Titre',
  check: v => typeof v === 'string' && v.trim().length >= MIN_TITLE_LEN,
  message: `Titre trop court (min ${MIN_TITLE_LEN} caractères)`,
  weight: 3,
};

const descRule: ValidationRule = {
  field: 'description', label: 'Description',
  check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN,
  message: `Description trop courte (min ${MIN_DESC_LEN} caractères)`,
  weight: 3,
};

const categoryRule: ValidationRule = {
  field: 'category', label: 'Catégorie',
  check: v => Boolean(v),
  message: 'Catégorie obligatoire',
  weight: 2,
};

export const VALIDATION_RULES: Record<ContentType, ValidationRule[]> = {
  listing: [
    titleRule,
    descRule,
    categoryRule,
    {
      field: 'price', label: 'Prix',
      check: v => v !== undefined && v !== null && v !== '',
      message: "Prix ou condition d'échange manquant",
      weight: 2,
    },
  ],

  equipment: [
    titleRule,
    descRule,
    categoryRule,
  ],

  help_request: [
    titleRule,
    descRule,
    {
      field: 'help_type', label: "Type d'aide",
      check: v => Boolean(v),
      message: "Type d'aide obligatoire (demande, offre ou échange)",
      weight: 2,
    },
    { ...categoryRule, weight: 1 },
  ],

  outing: [
    titleRule,
    { ...descRule, weight: 2 },
    {
      field: 'date', label: 'Date',
      check: v => Boolean(v),
      message: 'Date de promenade obligatoire',
      weight: 3,
    },
    {
      field: 'location', label: 'Lieu',
      check: v => typeof v === 'string' && v.trim().length > 3,
      message: 'Lieu de rendez-vous obligatoire',
      weight: 3,
    },
  ],

  event: [
    titleRule,
    { ...descRule, weight: 2 },
    {
      field: 'date', label: 'Date',
      check: v => Boolean(v),
      message: "Date de l'événement obligatoire",
      weight: 3,
    },
    {
      field: 'location', label: 'Lieu',
      check: v => typeof v === 'string' && v.trim().length > 3,
      message: 'Lieu obligatoire',
      weight: 3,
    },
  ],

  lost_found: [
    titleRule,
    {
      field: 'description', label: 'Description',
      check: v => typeof v === 'string' && v.trim().length >= 20,
      message: 'Description trop courte (min 20 caractères)',
      weight: 3,
    },
    {
      field: 'type', label: 'Type',
      check: v => v === 'perdu' || v === 'trouve',
      message: "Précisez si l'objet est perdu ou trouvé",
      weight: 3,
    },
    {
      field: 'location', label: 'Lieu',
      check: v => typeof v === 'string' && v.trim().length > 3,
      message: 'Lieu approximatif obligatoire',
      weight: 2,
    },
  ],

  collection_item: [
    titleRule,
    { ...descRule, weight: 2 },
    { ...categoryRule, message: 'Catégorie de collection obligatoire' },
  ],

  association: [
    {
      field: 'name', label: 'Nom',
      check: v => typeof v === 'string' && v.trim().length >= 5,
      message: 'Nom trop court (min 5 caractères)',
      weight: 3,
    },
    descRule,
    categoryRule,
  ],

  forum_post: [
    titleRule,
    {
      field: 'content', label: 'Contenu',
      check: v => typeof v === 'string' && v.trim().length >= MIN_DESC_LEN,
      message: `Contenu trop court (min ${MIN_DESC_LEN} caractères)`,
      weight: 3,
    },
  ],
};

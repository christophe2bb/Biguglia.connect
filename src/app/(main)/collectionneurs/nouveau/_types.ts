// ─── Types — Wizard création annonce collectionneurs ─────────────────────────

import type {
  CollectionMode,
  RarityLevel,
  ConditionLevel,
  CollectionCategory,
} from '@/lib/collectionneurs-config';

export type { CollectionMode, RarityLevel, ConditionLevel, CollectionCategory };

// ─── Photo locale (avant / après upload) ─────────────────────────────────────
export interface PhotoItem {
  file?: File;
  preview: string;
  url?: string;          // URL Supabase après upload
  is_cover: boolean;
  sort_order: number;
  uploading?: boolean;
  error?: string;
}

// ─── État du formulaire ───────────────────────────────────────────────────────
export interface CollectionneurFormData {
  // Étape 1 — Mode
  mode: CollectionMode;
  // Étape 2 — Catégorie
  category_id: string;
  subcategory: string;
  // Étape 3 — Objet
  title: string;
  description: string;
  condition: ConditionLevel;
  rarity_level: RarityLevel;
  year_period: string;
  brand: string;
  series_name: string;
  authenticity_declared: boolean;
  provenance: string;
  defects_noted: string;
  dimensions: string;
  material: string;
  price: string;
  exchange_expected: string;
  shipping_available: boolean;
  local_meetup_available: boolean;
  city: string;
  postal_code: string;
  sector_id: string;
  tags: string[];
  // Étape 4 — Photos
  photos: PhotoItem[];
}

// ─── Résultat de validation d'étape ──────────────────────────────────────────
export interface ValidationResult {
  ok: boolean;
  msg?: string;
}

// ─── Valeur de retour du hook ─────────────────────────────────────────────────
export interface UseCollectionneurFormReturn {
  // State
  step: number;
  form: CollectionneurFormData;
  categories: CollectionCategory[];
  tagInput: string;
  submitting: boolean;
  submitted: boolean;
  createdId: string | null;
  // Setters
  setStep: (s: number) => void;
  setTagInput: (v: string) => void;
  update: <K extends keyof CollectionneurFormData>(key: K, value: CollectionneurFormData[K]) => void;
  // Navigation
  canProceed: () => ValidationResult;
  goNext: () => void;
  goPrev: () => void;
  // Media
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFiles: (files: FileList | null) => Promise<void>;
  removePhoto: (idx: number) => void;
  setCover: (idx: number) => void;
  // Actions
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
}

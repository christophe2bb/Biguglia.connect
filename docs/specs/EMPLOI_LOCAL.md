# Spécifications Techniques — Module Emploi Local

**Version**: 1.0  
**Date**: 2026-04-09  
**Statut**: Spécifications techniques détaillées  
**Base**: Cahier des charges produit validé

---

## 1. Vue d'ensemble technique

### 1.1 Objectif
Implémenter le module **Emploi Local** dans Biguglia Connect avec une architecture propre, scalable et cohérente avec l'existant.

### 1.2 Principes architecturaux
- **Services-first**: Toute logique métier dans des services dédiés
- **SSR-compatible**: Pages principales en Server-Side Rendering
- **Type-safe**: Types stricts TypeScript partout
- **Validations centralisées**: Aucune validation dispersée dans l'UI
- **Intégration native**: Compatible Maison vivante dès le départ
- **Extensible**: Architecture préparée pour phases futures

### 1.3 Stack technique
- **Framework**: Next.js 14 (App Router)
- **Base de données**: Supabase PostgreSQL
- **Types**: TypeScript strict
- **UI**: React Server Components + Client Components
- **Validation**: Zod schemas
- **Styling**: Tailwind CSS

---

## 2. Architecture des dossiers

```
src/
├── services/
│   └── jobs/
│       ├── types.ts                    # Types métier emploi
│       ├── validations.ts              # Schemas Zod
│       ├── constants.ts                # Constantes (contrats, secteurs, etc.)
│       ├── mappers.ts                  # Transformation données
│       ├── scoring.ts                  # Algorithmes de pertinence
│       ├── queries.ts                  # Requêtes DB réutilisables
│       ├── publish-offer.ts            # Publication offre
│       ├── publish-demand.ts           # Publication demande
│       ├── get-jobs-feed.ts            # Liste offres/demandes
│       ├── get-job-detail.ts           # Détail offre/demande
│       └── search.ts                   # Recherche et filtrage
│
├── app/
│   └── emploi/
│       ├── page.tsx                    # Hub principal emploi
│       ├── offres/
│       │   ├── page.tsx                # Liste offres
│       │   ├── [id]/
│       │   │   └── page.tsx            # Détail offre
│       │   └── publier/
│       │       └── page.tsx            # Publier offre
│       └── demandes/
│           ├── page.tsx                # Liste demandes
│           ├── [id]/
│           │   └── page.tsx            # Détail demande
│           └── publier/
│               └── page.tsx            # Publier demande
│
└── components/
    └── jobs/
        ├── JobOfferCard.tsx            # Carte offre
        ├── JobDemandCard.tsx           # Carte demande
        ├── JobFilters.tsx              # Filtres recherche
        ├── JobSearchBar.tsx            # Barre recherche
        ├── JobDetailHeader.tsx         # En-tête détail
        ├── JobEssentialInfo.tsx        # Bloc "Essentiel"
        ├── JobDescription.tsx          # Bloc description
        ├── JobContactBox.tsx           # Bloc contact/candidature
        ├── PublishJobOfferWizard.tsx   # Wizard publication offre
        ├── PublishJobDemandWizard.tsx  # Wizard publication demande
        └── JobEmptyState.tsx           # États vides
```

---

## 3. Modèle de données

### 3.1 Table `job_offers`

```sql
CREATE TABLE IF NOT EXISTS job_offers (
  -- Identifiants
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Informations principales
  title TEXT NOT NULL,
  job_category TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  
  -- Localisation
  location_label TEXT NOT NULL,
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  
  -- Temporalité
  start_date DATE,
  start_date_flexible BOOLEAN DEFAULT false,
  end_date DATE,
  duration_label TEXT,
  
  -- Volume de travail
  hours_per_week NUMERIC(5,2),
  work_schedule TEXT,
  schedule_details TEXT,
  
  -- Rémunération
  salary_min NUMERIC(10,2),
  salary_max NUMERIC(10,2),
  salary_period TEXT,
  salary_visible BOOLEAN DEFAULT true,
  salary_comment TEXT,
  
  -- Profil recherché
  experience_level TEXT,
  permit_required BOOLEAN DEFAULT false,
  permit_type TEXT,
  mobility_required BOOLEAN DEFAULT false,
  languages TEXT[],
  skills TEXT[],
  
  -- Conditions spécifiques
  housing_provided BOOLEAN DEFAULT false,
  housing_details TEXT,
  urgent BOOLEAN DEFAULT false,
  positions_count INTEGER DEFAULT 1,
  remote_mode TEXT DEFAULT 'none',
  
  -- Contenu
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  
  -- Candidature
  application_mode TEXT NOT NULL DEFAULT 'message',
  application_email TEXT,
  application_url TEXT,
  application_phone TEXT,
  application_instructions TEXT,
  
  -- État
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  
  -- Scores
  freshness_score NUMERIC(3,2) DEFAULT 1.0,
  completeness_score NUMERIC(3,2) DEFAULT 0.0,
  relevance_score NUMERIC(3,2) DEFAULT 0.0,
  
  -- Modération
  moderation_status TEXT DEFAULT 'pending',
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES profiles(id),
  
  -- Métadonnées
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT valid_contract_type CHECK (contract_type IN ('cdi', 'cdd', 'saisonnier', 'mission', 'extra', 'remplacement', 'alternance', 'stage', 'interim', 'freelance')),
  CONSTRAINT valid_employment_type CHECK (employment_type IN ('temps_plein', 'temps_partiel', 'flexible')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'filled', 'suspended', 'expired', 'rejected')),
  CONSTRAINT valid_moderation CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  CONSTRAINT valid_remote_mode CHECK (remote_mode IN ('none', 'partial', 'full')),
  CONSTRAINT valid_experience CHECK (experience_level IN ('debutant', 'premiere_experience', 'confirme', 'experimente', 'aucune'))
);

-- Index pour performance
CREATE INDEX idx_job_offers_status ON job_offers(status);
CREATE INDEX idx_job_offers_published_at ON job_offers(published_at DESC);
CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX idx_job_offers_sector ON job_offers(sector_id);
CREATE INDEX idx_job_offers_contract ON job_offers(contract_type);
CREATE INDEX idx_job_offers_category ON job_offers(job_category);
CREATE INDEX idx_job_offers_urgent ON job_offers(urgent) WHERE urgent = true;
CREATE INDEX idx_job_offers_search ON job_offers USING gin(to_tsvector('french', title || ' ' || short_description));

-- RLS Policies
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_offers_select_published" ON job_offers
  FOR SELECT USING (
    status = 'published' 
    AND moderation_status = 'approved'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "job_offers_select_own" ON job_offers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "job_offers_insert" ON job_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "job_offers_update_own" ON job_offers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "job_offers_delete_own" ON job_offers
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.2 Table `job_demands`

```sql
CREATE TABLE IF NOT EXISTS job_demands (
  -- Identifiants
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Informations principales
  title TEXT NOT NULL,
  job_category TEXT NOT NULL,
  desired_contract_types TEXT[] NOT NULL,
  desired_employment_types TEXT[] NOT NULL,
  
  -- Localisation
  location_label TEXT NOT NULL,
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL,
  mobility_radius INTEGER,
  mobility_mode TEXT,
  
  -- Disponibilité
  availability_type TEXT NOT NULL,
  available_from DATE,
  availability_comment TEXT,
  
  -- Profil
  experience_level TEXT,
  has_permit BOOLEAN DEFAULT false,
  permit_types TEXT[],
  languages TEXT[],
  skills TEXT[],
  
  -- Préférences
  hours_preference TEXT,
  preferred_schedule TEXT,
  schedule_constraints TEXT,
  salary_expectation_min NUMERIC(10,2),
  salary_expectation_max NUMERIC(10,2),
  salary_expectation_comment TEXT,
  
  -- Contenu
  short_description TEXT NOT NULL,
  profile_description TEXT NOT NULL,
  experience_summary TEXT,
  
  -- Documents
  cv_url TEXT,
  portfolio_url TEXT,
  
  -- Contact
  contact_mode TEXT NOT NULL DEFAULT 'message',
  contact_email TEXT,
  contact_phone TEXT,
  
  -- État
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  found_at TIMESTAMPTZ,
  
  -- Scores
  freshness_score NUMERIC(3,2) DEFAULT 1.0,
  completeness_score NUMERIC(3,2) DEFAULT 0.0,
  
  -- Modération
  moderation_status TEXT DEFAULT 'pending',
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES profiles(id),
  
  -- Métadonnées
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT valid_availability CHECK (availability_type IN ('immediate', 'week', 'month', 'date', 'flexible')),
  CONSTRAINT valid_status_demand CHECK (status IN ('draft', 'active', 'paused', 'found', 'expired', 'rejected')),
  CONSTRAINT valid_moderation_demand CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))
);

-- Index
CREATE INDEX idx_job_demands_status ON job_demands(status);
CREATE INDEX idx_job_demands_published_at ON job_demands(published_at DESC);
CREATE INDEX idx_job_demands_user_id ON job_demands(user_id);
CREATE INDEX idx_job_demands_sector ON job_demands(sector_id);
CREATE INDEX idx_job_demands_category ON job_demands(job_category);
CREATE INDEX idx_job_demands_available ON job_demands(availability_type, available_from);

-- RLS
ALTER TABLE job_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_demands_select_published" ON job_demands
  FOR SELECT USING (
    status = 'active'
    AND moderation_status = 'approved'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "job_demands_select_own" ON job_demands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "job_demands_insert" ON job_demands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "job_demands_update_own" ON job_demands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "job_demands_delete_own" ON job_demands
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.3 Table `job_contacts`

```sql
CREATE TABLE IF NOT EXISTS job_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Référence
  offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES job_demands(id) ON DELETE CASCADE,
  
  -- Acteurs
  sender_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenu
  message TEXT NOT NULL,
  attachment_url TEXT,
  
  -- État
  status TEXT DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT one_reference CHECK (
    (offer_id IS NOT NULL AND demand_id IS NULL) OR
    (offer_id IS NULL AND demand_id IS NOT NULL)
  ),
  CONSTRAINT valid_contact_status CHECK (status IN ('sent', 'read', 'replied', 'archived'))
);

-- Index
CREATE INDEX idx_job_contacts_offer ON job_contacts(offer_id);
CREATE INDEX idx_job_contacts_demand ON job_contacts(demand_id);
CREATE INDEX idx_job_contacts_sender ON job_contacts(sender_user_id);
CREATE INDEX idx_job_contacts_receiver ON job_contacts(receiver_user_id);

-- RLS
ALTER TABLE job_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_contacts_select" ON job_contacts
  FOR SELECT USING (
    auth.uid() = sender_user_id OR auth.uid() = receiver_user_id
  );

CREATE POLICY "job_contacts_insert" ON job_contacts
  FOR INSERT WITH CHECK (auth.uid() = sender_user_id);
```

---

## 4. Types TypeScript

### 4.1 Fichier `src/services/jobs/types.ts`

```typescript
// ─── Types de base ────────────────────────────────────────────────────────

export type ContractType = 
  | 'cdi'
  | 'cdd'
  | 'saisonnier'
  | 'mission'
  | 'extra'
  | 'remplacement'
  | 'alternance'
  | 'stage'
  | 'interim'
  | 'freelance';

export type EmploymentType = 
  | 'temps_plein'
  | 'temps_partiel'
  | 'flexible';

export type JobCategory = 
  | 'restauration'
  | 'hotellerie'
  | 'commerce'
  | 'artisanat'
  | 'batiment'
  | 'services_personne'
  | 'administratif'
  | 'logistique'
  | 'nettoyage'
  | 'transport'
  | 'sante'
  | 'animation'
  | 'petite_enfance'
  | 'association'
  | 'evenementiel'
  | 'agriculture'
  | 'autre';

export type ExperienceLevel = 
  | 'debutant'
  | 'premiere_experience'
  | 'confirme'
  | 'experimente'
  | 'aucune';

export type JobOfferStatus = 
  | 'draft'
  | 'published'
  | 'filled'
  | 'suspended'
  | 'expired'
  | 'rejected';

export type JobDemandStatus = 
  | 'draft'
  | 'active'
  | 'paused'
  | 'found'
  | 'expired'
  | 'rejected';

export type ModerationStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged';

export type AvailabilityType = 
  | 'immediate'
  | 'week'
  | 'month'
  | 'date'
  | 'flexible';

export type RemoteMode = 
  | 'none'
  | 'partial'
  | 'full';

export type SalaryPeriod = 
  | 'hour'
  | 'month'
  | 'year'
  | 'mission';

export type ApplicationMode = 
  | 'message'
  | 'email'
  | 'url'
  | 'phone'
  | 'mixed';

// ─── Interface JobOffer ───────────────────────────────────────────────────

export interface JobOffer {
  // Identifiants
  id: string;
  user_id: string;
  organization_id: string | null;
  slug: string;

  // Informations principales
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;

  // Localisation
  location_label: string;
  sector_id: string | null;
  latitude: number | null;
  longitude: number | null;

  // Temporalité
  start_date: string | null;
  start_date_flexible: boolean;
  end_date: string | null;
  duration_label: string | null;

  // Volume de travail
  hours_per_week: number | null;
  work_schedule: string | null;
  schedule_details: string | null;

  // Rémunération
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod | null;
  salary_visible: boolean;
  salary_comment: string | null;

  // Profil recherché
  experience_level: ExperienceLevel | null;
  permit_required: boolean;
  permit_type: string | null;
  mobility_required: boolean;
  languages: string[] | null;
  skills: string[] | null;

  // Conditions spécifiques
  housing_provided: boolean;
  housing_details: string | null;
  urgent: boolean;
  positions_count: number;
  remote_mode: RemoteMode;

  // Contenu
  short_description: string;
  full_description: string;
  requirements: string | null;
  benefits: string | null;

  // Candidature
  application_mode: ApplicationMode;
  application_email: string | null;
  application_url: string | null;
  application_phone: string | null;
  application_instructions: string | null;

  // État
  status: JobOfferStatus;
  published_at: string | null;
  expires_at: string | null;
  filled_at: string | null;

  // Scores
  freshness_score: number;
  completeness_score: number;
  relevance_score: number;

  // Modération
  moderation_status: ModerationStatus;
  moderation_notes: string | null;
  moderated_at: string | null;
  moderated_by: string | null;

  // Métadonnées
  views_count: number;
  contacts_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Interface JobDemand ──────────────────────────────────────────────────

export interface JobDemand {
  // Identifiants
  id: string;
  user_id: string;
  slug: string;

  // Informations principales
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[];
  desired_employment_types: EmploymentType[];

  // Localisation
  location_label: string;
  sector_id: string | null;
  mobility_radius: number | null;
  mobility_mode: string | null;

  // Disponibilité
  availability_type: AvailabilityType;
  available_from: string | null;
  availability_comment: string | null;

  // Profil
  experience_level: ExperienceLevel | null;
  has_permit: boolean;
  permit_types: string[] | null;
  languages: string[] | null;
  skills: string[] | null;

  // Préférences
  hours_preference: string | null;
  preferred_schedule: string | null;
  schedule_constraints: string | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_expectation_comment: string | null;

  // Contenu
  short_description: string;
  profile_description: string;
  experience_summary: string | null;

  // Documents
  cv_url: string | null;
  portfolio_url: string | null;

  // Contact
  contact_mode: ApplicationMode;
  contact_email: string | null;
  contact_phone: string | null;

  // État
  status: JobDemandStatus;
  published_at: string | null;
  expires_at: string | null;
  found_at: string | null;

  // Scores
  freshness_score: number;
  completeness_score: number;

  // Modération
  moderation_status: ModerationStatus;
  moderation_notes: string | null;
  moderated_at: string | null;
  moderated_by: string | null;

  // Métadonnées
  views_count: number;
  contacts_count: number;
  created_at: string;
  updated_at: string;
}

// ─── JobContact ───────────────────────────────────────────────────────────

export interface JobContact {
  id: string;
  offer_id: string | null;
  demand_id: string | null;
  sender_user_id: string;
  receiver_user_id: string;
  message: string;
  attachment_url: string | null;
  status: 'sent' | 'read' | 'replied' | 'archived';
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
}

// ─── Types enrichis pour l'affichage ──────────────────────────────────────

export interface JobOfferWithProfile extends JobOffer {
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  sector: {
    id: string;
    name: string;
    icon: string;
  } | null;
}

export interface JobDemandWithProfile extends JobDemand {
  candidate: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  sector: {
    id: string;
    name: string;
    icon: string;
  } | null;
}

// ─── Types pour filtres et recherche ──────────────────────────────────────

export interface JobSearchFilters {
  query?: string;
  contract_types?: ContractType[];
  employment_types?: EmploymentType[];
  categories?: JobCategory[];
  sectors?: string[];
  experience_levels?: ExperienceLevel[];
  urgent_only?: boolean;
  remote_mode?: RemoteMode[];
  salary_min?: number;
  start_date_from?: string;
  start_date_to?: string;
  availability?: AvailabilityType[];
  has_housing?: boolean;
  sort?: 'recent' | 'proximity' | 'relevance' | 'salary' | 'start_date';
  limit?: number;
  offset?: number;
}

export interface JobSearchResult {
  items: (JobOfferWithProfile | JobDemandWithProfile)[];
  total: number;
  has_more: boolean;
  filters_applied: JobSearchFilters;
}
```

---

## 5. Constantes

### 5.1 Fichier `src/services/jobs/constants.ts`

```typescript
import { ContractType, JobCategory, ExperienceLevel, EmploymentType } from './types';

// ─── Labels des types de contrat ─────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, { label: string; short: string; color: string }> = {
  cdi: { label: 'CDI', short: 'CDI', color: 'emerald' },
  cdd: { label: 'CDD', short: 'CDD', color: 'blue' },
  saisonnier: { label: 'Saisonnier', short: 'Saison', color: 'amber' },
  mission: { label: 'Mission', short: 'Mission', color: 'purple' },
  extra: { label: 'Extra', short: 'Extra', color: 'pink' },
  remplacement: { label: 'Remplacement', short: 'Rempla', color: 'orange' },
  alternance: { label: 'Alternance', short: 'Altern', color: 'indigo' },
  stage: { label: 'Stage', short: 'Stage', color: 'cyan' },
  interim: { label: 'Intérim', short: 'Intér', color: 'violet' },
  freelance: { label: 'Freelance', short: 'Free', color: 'teal' },
};

// ─── Labels des catégories métier ────────────────────────────────────────

export const JOB_CATEGORY_LABELS: Record<JobCategory, { label: string; icon: string; color: string }> = {
  restauration: { label: 'Restauration', icon: '🍽️', color: 'orange' },
  hotellerie: { label: 'Hôtellerie', icon: '🏨', color: 'blue' },
  commerce: { label: 'Commerce', icon: '🛒', color: 'green' },
  artisanat: { label: 'Artisanat', icon: '🔨', color: 'amber' },
  batiment: { label: 'Bâtiment', icon: '🏗️', color: 'stone' },
  services_personne: { label: 'Services à la personne', icon: '🤝', color: 'pink' },
  administratif: { label: 'Administratif', icon: '📄', color: 'gray' },
  logistique: { label: 'Logistique', icon: '📦', color: 'indigo' },
  nettoyage: { label: 'Nettoyage', icon: '🧹', color: 'cyan' },
  transport: { label: 'Transport', icon: '🚗', color: 'violet' },
  sante: { label: 'Santé', icon: '⚕️', color: 'red' },
  animation: { label: 'Animation', icon: '🎭', color: 'purple' },
  petite_enfance: { label: 'Petite enfance', icon: '👶', color: 'pink' },
  association: { label: 'Association', icon: '🏛️', color: 'blue' },
  evenementiel: { label: 'Événementiel', icon: '🎉', color: 'purple' },
  agriculture: { label: 'Agriculture', icon: '🌾', color: 'green' },
  autre: { label: 'Autre', icon: '💼', color: 'gray' },
};

// ─── Labels des niveaux d'expérience ─────────────────────────────────────

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  debutant: 'Débutant accepté',
  premiere_experience: 'Première expérience',
  confirme: 'Confirmé',
  experimente: 'Expérimenté',
  aucune: 'Aucune exigence',
};

// ─── Labels temps de travail ─────────────────────────────────────────────

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  temps_plein: 'Temps plein',
  temps_partiel: 'Temps partiel',
  flexible: 'Flexible',
};

// ─── Contraintes de validation ───────────────────────────────────────────

export const VALIDATION_CONSTRAINTS = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 100,
  SHORT_DESC_MIN_LENGTH: 50,
  SHORT_DESC_MAX_LENGTH: 300,
  FULL_DESC_MIN_LENGTH: 100,
  FULL_DESC_MAX_LENGTH: 5000,
  POSITIONS_MAX: 50,
  HOURS_PER_WEEK_MAX: 80,
  SALARY_MAX: 999999,
  SKILLS_MAX: 20,
  LANGUAGES_MAX: 10,
};

// ─── Durées par défaut ────────────────────────────────────────────────────

export const DEFAULT_EXPIRY_DAYS = {
  offer: 60,
  demand: 90,
};

// ─── Poids pour le scoring ────────────────────────────────────────────────

export const SCORING_WEIGHTS = {
  freshness: 0.3,
  completeness: 0.25,
  proximity: 0.2,
  urgency: 0.15,
  relevance: 0.1,
};
```

---

## 6. Validations Zod

### 6.1 Fichier `src/services/jobs/validations.ts`

```typescript
import { z } from 'zod';
import { VALIDATION_CONSTRAINTS } from './constants';

// ─── Schéma de base pour une offre ────────────────────────────────────────

export const jobOfferSchema = z.object({
  // Informations principales (obligatoires)
  title: z.string()
    .min(VALIDATION_CONSTRAINTS.TITLE_MIN_LENGTH, 'Le titre est trop court')
    .max(VALIDATION_CONSTRAINTS.TITLE_MAX_LENGTH, 'Le titre est trop long'),
  
  job_category: z.enum([
    'restauration', 'hotellerie', 'commerce', 'artisanat', 'batiment',
    'services_personne', 'administratif', 'logistique', 'nettoyage',
    'transport', 'sante', 'animation', 'petite_enfance', 'association',
    'evenementiel', 'agriculture', 'autre'
  ], { required_error: 'Catégorie obligatoire' }),
  
  contract_type: z.enum([
    'cdi', 'cdd', 'saisonnier', 'mission', 'extra', 'remplacement',
    'alternance', 'stage', 'interim', 'freelance'
  ], { required_error: 'Type de contrat obligatoire' }),
  
  employment_type: z.enum(['temps_plein', 'temps_partiel', 'flexible'], {
    required_error: 'Volume de travail obligatoire'
  }),
  
  location_label: z.string().min(3, 'Lieu obligatoire'),
  sector_id: z.string().nullable().optional(),
  
  short_description: z.string()
    .min(VALIDATION_CONSTRAINTS.SHORT_DESC_MIN_LENGTH, 'Description trop courte')
    .max(VALIDATION_CONSTRAINTS.SHORT_DESC_MAX_LENGTH, 'Description trop longue'),
  
  full_description: z.string()
    .min(VALIDATION_CONSTRAINTS.FULL_DESC_MIN_LENGTH, 'Description détaillée trop courte')
    .max(VALIDATION_CONSTRAINTS.FULL_DESC_MAX_LENGTH, 'Description trop longue'),
  
  // Champs recommandés
  start_date: z.string().nullable().optional(),
  start_date_flexible: z.boolean().default(false),
  end_date: z.string().nullable().optional(),
  duration_label: z.string().nullable().optional(),
  
  hours_per_week: z.number()
    .min(1)
    .max(VALIDATION_CONSTRAINTS.HOURS_PER_WEEK_MAX)
    .nullable()
    .optional(),
  
  work_schedule: z.string().nullable().optional(),
  schedule_details: z.string().nullable().optional(),
  
  salary_min: z.number().min(0).max(VALIDATION_CONSTRAINTS.SALARY_MAX).nullable().optional(),
  salary_max: z.number().min(0).max(VALIDATION_CONSTRAINTS.SALARY_MAX).nullable().optional(),
  salary_period: z.enum(['hour', 'month', 'year', 'mission']).nullable().optional(),
  salary_visible: z.boolean().default(true),
  salary_comment: z.string().nullable().optional(),
  
  experience_level: z.enum([
    'debutant', 'premiere_experience', 'confirme', 'experimente', 'aucune'
  ]).nullable().optional(),
  
  permit_required: z.boolean().default(false),
  permit_type: z.string().nullable().optional(),
  mobility_required: z.boolean().default(false),
  
  languages: z.array(z.string())
    .max(VALIDATION_CONSTRAINTS.LANGUAGES_MAX)
    .nullable()
    .optional(),
  
  skills: z.array(z.string())
    .max(VALIDATION_CONSTRAINTS.SKILLS_MAX)
    .nullable()
    .optional(),
  
  housing_provided: z.boolean().default(false),
  housing_details: z.string().nullable().optional(),
  
  urgent: z.boolean().default(false),
  
  positions_count: z.number()
    .min(1)
    .max(VALIDATION_CONSTRAINTS.POSITIONS_MAX)
    .default(1),
  
  remote_mode: z.enum(['none', 'partial', 'full']).default('none'),
  
  requirements: z.string().nullable().optional(),
  benefits: z.string().nullable().optional(),
  
  // Candidature
  application_mode: z.enum(['message', 'email', 'url', 'phone', 'mixed']).default('message'),
  application_email: z.string().email().nullable().optional(),
  application_url: z.string().url().nullable().optional(),
  application_phone: z.string().nullable().optional(),
  application_instructions: z.string().nullable().optional(),
})
.refine(
  (data) => {
    // Si salaire renseigné, période obligatoire
    if ((data.salary_min || data.salary_max) && !data.salary_period) {
      return false;
    }
    return true;
  },
  { message: 'La période de rémunération est obligatoire si salaire renseigné', path: ['salary_period'] }
)
.refine(
  (data) => {
    // Si salary_max, doit être > salary_min
    if (data.salary_min && data.salary_max && data.salary_max < data.salary_min) {
      return false;
    }
    return true;
  },
  { message: 'Le salaire maximum doit être supérieur au minimum', path: ['salary_max'] }
)
.refine(
  (data) => {
    // Si logement fourni, détails recommandés
    if (data.housing_provided && !data.housing_details) {
      // Non bloquant, juste un warning
    }
    return true;
  }
);

// ─── Schéma pour une demande d'emploi ─────────────────────────────────────

export const jobDemandSchema = z.object({
  title: z.string()
    .min(VALIDATION_CONSTRAINTS.TITLE_MIN_LENGTH)
    .max(VALIDATION_CONSTRAINTS.TITLE_MAX_LENGTH),
  
  job_category: z.enum([
    'restauration', 'hotellerie', 'commerce', 'artisanat', 'batiment',
    'services_personne', 'administratif', 'logistique', 'nettoyage',
    'transport', 'sante', 'animation', 'petite_enfance', 'association',
    'evenementiel', 'agriculture', 'autre'
  ]),
  
  desired_contract_types: z.array(z.enum([
    'cdi', 'cdd', 'saisonnier', 'mission', 'extra', 'remplacement',
    'alternance', 'stage', 'interim', 'freelance'
  ])).min(1, 'Au moins un type de contrat requis'),
  
  desired_employment_types: z.array(z.enum(['temps_plein', 'temps_partiel', 'flexible']))
    .min(1, 'Au moins un volume de travail requis'),
  
  location_label: z.string().min(3),
  sector_id: z.string().nullable().optional(),
  mobility_radius: z.number().min(0).max(100).nullable().optional(),
  mobility_mode: z.string().nullable().optional(),
  
  availability_type: z.enum(['immediate', 'week', 'month', 'date', 'flexible']),
  available_from: z.string().nullable().optional(),
  availability_comment: z.string().nullable().optional(),
  
  short_description: z.string()
    .min(VALIDATION_CONSTRAINTS.SHORT_DESC_MIN_LENGTH)
    .max(VALIDATION_CONSTRAINTS.SHORT_DESC_MAX_LENGTH),
  
  profile_description: z.string()
    .min(VALIDATION_CONSTRAINTS.FULL_DESC_MIN_LENGTH)
    .max(VALIDATION_CONSTRAINTS.FULL_DESC_MAX_LENGTH),
  
  experience_summary: z.string().nullable().optional(),
  
  experience_level: z.enum([
    'debutant', 'premiere_experience', 'confirme', 'experimente', 'aucune'
  ]).nullable().optional(),
  
  has_permit: z.boolean().default(false),
  permit_types: z.array(z.string()).nullable().optional(),
  
  languages: z.array(z.string())
    .max(VALIDATION_CONSTRAINTS.LANGUAGES_MAX)
    .nullable()
    .optional(),
  
  skills: z.array(z.string())
    .max(VALIDATION_CONSTRAINTS.SKILLS_MAX)
    .nullable()
    .optional(),
  
  hours_preference: z.string().nullable().optional(),
  preferred_schedule: z.string().nullable().optional(),
  schedule_constraints: z.string().nullable().optional(),
  
  salary_expectation_min: z.number().min(0).nullable().optional(),
  salary_expectation_max: z.number().min(0).nullable().optional(),
  salary_expectation_comment: z.string().nullable().optional(),
  
  cv_url: z.string().url().nullable().optional(),
  portfolio_url: z.string().url().nullable().optional(),
  
  contact_mode: z.enum(['message', 'email', 'phone', 'mixed']).default('message'),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
});

// ─── Schéma pour un contact/candidature ──────────────────────────────────

export const jobContactSchema = z.object({
  offer_id: z.string().uuid().nullable().optional(),
  demand_id: z.string().uuid().nullable().optional(),
  message: z.string().min(20, 'Message trop court').max(2000, 'Message trop long'),
  attachment_url: z.string().url().nullable().optional(),
})
.refine(
  (data) => (data.offer_id && !data.demand_id) || (!data.offer_id && data.demand_id),
  { message: 'Offre ou demande requise, pas les deux', path: ['offer_id'] }
);

// ─── Types inférés ────────────────────────────────────────────────────────

export type JobOfferInput = z.infer<typeof jobOfferSchema>;
export type JobDemandInput = z.infer<typeof jobDemandSchema>;
export type JobContactInput = z.infer<typeof jobContactSchema>;
```

---

## 7. Prochaines étapes

Ce document sera complété avec:

1. **Mappers et transformations** (Phase 1)
2. **Algorithmes de scoring** (Phase 3)
3. **Services de publication** (Phase 2)
4. **Services de recherche et filtrage** (Phase 2)
5. **Intégration Maison vivante** (Phase 3)
6. **Composants UI** (Phase 2)
7. **Pages et routing** (Phase 2)

---

**Statut**: Spécifications de base complètes  
**Prêt pour**: Validation et début d'implémentation Phase 1
# Spécifications Techniques Complètes — Module Emploi Local

**Ce document complète SPECS_EMPLOI_LOCAL.md avec les sections 7 à 15**

---

## 7. Mappers et transformations

### 7.1 Fichier `src/services/jobs/mappers.ts`

```typescript
import { JobOffer, JobDemand, JobOfferWithProfile, JobDemandWithProfile } from './types';
import { HomeFeedItem } from '@/services/home/types';
import { SECTORS } from '@/lib/sectors';
import { CONTRACT_TYPE_LABELS, JOB_CATEGORY_LABELS } from './constants';

// ─── Mapper: JobOffer → JobOfferWithProfile ──────────────────────────────

export async function enrichJobOffer(
  offer: JobOffer,
  supabase: any
): Promise<JobOfferWithProfile> {
  // Récupérer le profil auteur
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role')
    .eq('id', offer.user_id)
    .single();

  // Récupérer l'organisation si applicable
  let organization = null;
  if (offer.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('id', offer.organization_id)
      .single();
    organization = org;
  }

  // Récupérer le secteur
  const sector = offer.sector_id ? SECTORS.find(s => s.id === offer.sector_id) : null;

  return {
    ...offer,
    author: {
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatar_url,
      is_verified: profile.role === 'verified' || profile.role === 'admin',
    },
    organization,
    sector: sector ? {
      id: sector.id,
      name: sector.name,
      icon: sector.icon,
    } : null,
  };
}

// ─── Mapper: JobDemand → JobDemandWithProfile ────────────────────────────

export async function enrichJobDemand(
  demand: JobDemand,
  supabase: any
): Promise<JobDemandWithProfile> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', demand.user_id)
    .single();

  const sector = demand.sector_id ? SECTORS.find(s => s.id === demand.sector_id) : null;

  return {
    ...demand,
    candidate: {
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatar_url,
    },
    sector: sector ? {
      id: sector.id,
      name: sector.name,
      icon: sector.icon,
    } : null,
  };
}

// ─── Mapper: JobOffer → HomeFeedItem ──────────────────────────────────────

export function jobOfferToHomeFeedItem(offer: JobOfferWithProfile): HomeFeedItem {
  const contractLabel = CONTRACT_TYPE_LABELS[offer.contract_type];
  const categoryLabel = JOB_CATEGORY_LABELS[offer.job_category];

  return {
    id: offer.id,
    type: 'job_offer',
    title: offer.title,
    content: offer.short_description,
    author: offer.author,
    created_at: offer.created_at,
    updated_at: offer.updated_at,
    href: `/emploi/offres/${offer.slug}`,
    
    metadata: {
      contract_type: {
        label: contractLabel.label,
        color: contractLabel.color,
      },
      category: {
        label: categoryLabel.label,
        icon: categoryLabel.icon,
      },
      location: offer.location_label,
      sector: offer.sector,
      start_date: offer.start_date,
      urgent: offer.urgent,
      salary: offer.salary_visible && offer.salary_min ? {
        min: offer.salary_min,
        max: offer.salary_max,
        period: offer.salary_period,
      } : null,
      employment_type: offer.employment_type,
    },
    
    score: offer.relevance_score,
    freshness: offer.freshness_score,
    
    tags: [
      contractLabel.short,
      categoryLabel.label,
      offer.urgent ? 'Urgent' : null,
      offer.housing_provided ? 'Logement' : null,
    ].filter(Boolean),
    
    image_url: offer.organization?.logo_url || null,
    
    stats: {
      views: offer.views_count,
      contacts: offer.contacts_count,
    },
  };
}

// ─── Mapper: JobDemand → HomeFeedItem ─────────────────────────────────────

export function jobDemandToHomeFeedItem(demand: JobDemandWithProfile): HomeFeedItem {
  const categoryLabel = JOB_CATEGORY_LABELS[demand.job_category];
  const contractLabels = demand.desired_contract_types
    .map(ct => CONTRACT_TYPE_LABELS[ct].short)
    .join(', ');

  return {
    id: demand.id,
    type: 'job_demand',
    title: demand.title,
    content: demand.short_description,
    author: demand.candidate,
    created_at: demand.created_at,
    updated_at: demand.updated_at,
    href: `/emploi/demandes/${demand.slug}`,
    
    metadata: {
      contract_types: demand.desired_contract_types,
      category: {
        label: categoryLabel.label,
        icon: categoryLabel.icon,
      },
      location: demand.location_label,
      sector: demand.sector,
      availability: demand.availability_type,
      available_from: demand.available_from,
      experience_level: demand.experience_level,
    },
    
    score: 0.5,
    freshness: demand.freshness_score,
    
    tags: [
      contractLabels,
      categoryLabel.label,
      demand.availability_type === 'immediate' ? 'Disponible' : null,
    ].filter(Boolean),
    
    image_url: demand.candidate.avatar_url,
    
    stats: {
      views: demand.views_count,
      contacts: demand.contacts_count,
    },
  };
}

// ─── Mapper batch pour le feed ────────────────────────────────────────────

export function jobOffersToHomeFeedItems(offers: JobOfferWithProfile[]): HomeFeedItem[] {
  return offers.map(jobOfferToHomeFeedItem);
}

export function jobDemandsToHomeFeedItems(demands: JobDemandWithProfile[]): HomeFeedItem[] {
  return demands.map(jobDemandToHomeFeedItem);
}

// ─── Helper: Génération de slug ───────────────────────────────────────────

export function generateJobSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${slug}-${id.slice(0, 8)}`;
}

// ─── Helper: Calcul de distance ───────────────────────────────────────────

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

## 8. Algorithmes de scoring

### 8.1 Fichier `src/services/jobs/scoring.ts`

```typescript
import { JobOffer, JobDemand } from './types';
import { SCORING_WEIGHTS, VALIDATION_CONSTRAINTS } from './constants';

// ─── Score de complétude pour une offre ──────────────────────────────────

export function calculateOfferCompletenessScore(offer: Partial<JobOffer>): number {
  let score = 0;
  let maxScore = 0;

  // Champs obligatoires (20 points chacun)
  const required = [
    'title', 'job_category', 'contract_type', 'employment_type',
    'location_label', 'short_description', 'full_description'
  ];
  required.forEach(field => {
    maxScore += 20;
    if (offer[field as keyof typeof offer]) score += 20;
  });

  // Champs fortement recommandés (10 points chacun)
  const recommended = [
    'start_date', 'salary_min', 'work_schedule', 'experience_level',
    'application_mode'
  ];
  recommended.forEach(field => {
    maxScore += 10;
    if (offer[field as keyof typeof offer]) score += 10;
  });

  // Champs optionnels bonus (5 points chacun)
  const optional = [
    'end_date', 'duration_label', 'hours_per_week', 'requirements',
    'benefits', 'skills', 'languages'
  ];
  optional.forEach(field => {
    maxScore += 5;
    if (offer[field as keyof typeof offer]) score += 5;
  });

  // Bonus qualité de description
  if (offer.full_description && offer.full_description.length >= 300) {
    score += 10;
  }
  maxScore += 10;

  // Bonus salaire visible
  if (offer.salary_visible && offer.salary_min) {
    score += 15;
  }
  maxScore += 15;

  return Math.min(1, score / maxScore);
}

// ─── Score de complétude pour une demande ────────────────────────────────

export function calculateDemandCompletenessScore(demand: Partial<JobDemand>): number {
  let score = 0;
  let maxScore = 0;

  // Champs obligatoires
  const required = [
    'title', 'job_category', 'desired_contract_types', 'location_label',
    'availability_type', 'short_description', 'profile_description'
  ];
  required.forEach(field => {
    maxScore += 20;
    if (demand[field as keyof typeof demand]) score += 20;
  });

  // Champs recommandés
  const recommended = [
    'experience_level', 'skills', 'available_from', 'mobility_radius'
  ];
  recommended.forEach(field => {
    maxScore += 10;
    if (demand[field as keyof typeof demand]) score += 10;
  });

  // Bonus
  if (demand.profile_description && demand.profile_description.length >= 200) {
    score += 10;
  }
  maxScore += 10;

  if (demand.experience_summary) {
    score += 10;
  }
  maxScore += 10;

  if (demand.cv_url) {
    score += 15;
  }
  maxScore += 15;

  return Math.min(1, score / maxScore);
}

// ─── Score de fraîcheur ───────────────────────────────────────────────────

export function calculateFreshnessScore(publishedAt: string): number {
  const now = new Date();
  const published = new Date(publishedAt);
  const ageInDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 1) return 1.0;
  if (ageInDays < 3) return 0.9;
  if (ageInDays < 7) return 0.8;
  if (ageInDays < 14) return 0.7;
  if (ageInDays < 30) return 0.5;
  if (ageInDays < 45) return 0.3;
  return 0.1;
}

// ─── Score de pertinence global ──────────────────────────────────────────

export function calculateOfferRelevanceScore(
  offer: JobOffer,
  options: {
    userLat?: number;
    userLon?: number;
    userPreferences?: any;
  } = {}
): number {
  let score = 0;

  // Fraîcheur
  const freshnessScore = offer.freshness_score || calculateFreshnessScore(offer.published_at || offer.created_at);
  score += freshnessScore * SCORING_WEIGHTS.freshness;

  // Complétude
  const completenessScore = offer.completeness_score || calculateOfferCompletenessScore(offer);
  score += completenessScore * SCORING_WEIGHTS.completeness;

  // Proximité (si coordonnées disponibles)
  if (options.userLat && options.userLon && offer.latitude && offer.longitude) {
    const distance = calculateDistance(
      options.userLat,
      options.userLon,
      offer.latitude,
      offer.longitude
    );
    const proximityScore = Math.max(0, 1 - (distance / 50)); // 50km max
    score += proximityScore * SCORING_WEIGHTS.proximity;
  } else {
    score += 0.5 * SCORING_WEIGHTS.proximity; // Score neutre si pas de coords
  }

  // Urgence
  if (offer.urgent) {
    score += 1.0 * SCORING_WEIGHTS.urgency;
  }

  // Pertinence métier (si préférences utilisateur)
  if (options.userPreferences) {
    // TODO: implémenter matching avec préférences
    score += 0.5 * SCORING_WEIGHTS.relevance;
  } else {
    score += 0.5 * SCORING_WEIGHTS.relevance;
  }

  return Math.min(1, score);
}

// ─── Helper pour calculer distance ────────────────────────────────────────

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

## 9. Services de requêtes

### 9.1 Fichier `src/services/jobs/queries.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JobOffer, JobDemand, JobSearchFilters } from './types';

// ─── Récupérer une offre par ID ou slug ──────────────────────────────────

export async function getJobOfferBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<JobOffer | null> {
  const { data, error } = await supabase
    .from('job_offers')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('moderation_status', 'approved')
    .single();

  if (error || !data) return null;
  return data as JobOffer;
}

// ─── Récupérer une demande par slug ──────────────────────────────────────

export async function getJobDemandBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<JobDemand | null> {
  const { data, error } = await supabase
    .from('job_demands')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('moderation_status', 'approved')
    .single();

  if (error || !data) return null;
  return data as JobDemand;
}

// ─── Lister les offres avec filtres ──────────────────────────────────────

export async function searchJobOffers(
  supabase: SupabaseClient,
  filters: JobSearchFilters = {}
): Promise<{ items: JobOffer[]; total: number }> {
  let query = supabase
    .from('job_offers')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .eq('moderation_status', 'approved')
    .gte('expires_at', new Date().toISOString());

  // Filtres
  if (filters.contract_types?.length) {
    query = query.in('contract_type', filters.contract_types);
  }

  if (filters.categories?.length) {
    query = query.in('job_category', filters.categories);
  }

  if (filters.sectors?.length) {
    query = query.in('sector_id', filters.sectors);
  }

  if (filters.urgent_only) {
    query = query.eq('urgent', true);
  }

  if (filters.salary_min) {
    query = query.gte('salary_min', filters.salary_min);
  }

  if (filters.has_housing) {
    query = query.eq('housing_provided', true);
  }

  // Tri
  switch (filters.sort) {
    case 'recent':
      query = query.order('published_at', { ascending: false });
      break;
    case 'start_date':
      query = query.order('start_date', { ascending: true, nullsFirst: false });
      break;
    case 'relevance':
      query = query.order('relevance_score', { ascending: false });
      break;
    default:
      query = query.order('published_at', { ascending: false });
  }

  // Pagination
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error searching offers:', error);
    return { items: [], total: 0 };
  }

  return {
    items: (data as JobOffer[]) || [],
    total: count || 0,
  };
}

// ─── Lister les demandes avec filtres ────────────────────────────────────

export async function searchJobDemands(
  supabase: SupabaseClient,
  filters: JobSearchFilters = {}
): Promise<{ items: JobDemand[]; total: number }> {
  let query = supabase
    .from('job_demands')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .eq('moderation_status', 'approved')
    .gte('expires_at', new Date().toISOString());

  // Filtres similaires aux offres
  if (filters.categories?.length) {
    query = query.in('job_category', filters.categories);
  }

  if (filters.sectors?.length) {
    query = query.in('sector_id', filters.sectors);
  }

  if (filters.availability?.length) {
    query = query.in('availability_type', filters.availability);
  }

  // Tri
  query = query.order('published_at', { ascending: false });

  // Pagination
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error searching demands:', error);
    return { items: [], total: 0 };
  }

  return {
    items: (data as JobDemand[]) || [],
    total: count || 0,
  };
}

// ─── Incrémenter le compteur de vues ─────────────────────────────────────

export async function incrementOfferViews(
  supabase: SupabaseClient,
  offerId: string
): Promise<void> {
  await supabase.rpc('increment_offer_views', { offer_id: offerId });
}

export async function incrementDemandViews(
  supabase: SupabaseClient,
  demandId: string
): Promise<void> {
  await supabase.rpc('increment_demand_views', { demand_id: demandId });
}
```

---

## 10. Services de publication

### 10.1 Fichier `src/services/jobs/publish-offer.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JobOfferInput, jobOfferSchema } from './validations';
import { generateJobSlug } from './mappers';
import { calculateOfferCompletenessScore, calculateFreshnessScore } from './scoring';
import { DEFAULT_EXPIRY_DAYS } from './constants';

export async function publishJobOffer(
  supabase: SupabaseClient,
  userId: string,
  input: JobOfferInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Validation
  const validation = jobOfferSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const validatedData = validation.data;

  // Génération du slug temporaire
  const tempId = crypto.randomUUID();
  const slug = generateJobSlug(validatedData.title, tempId);

  // Calcul des scores
  const completenessScore = calculateOfferCompletenessScore(validatedData);
  const freshnessScore = 1.0;

  // Date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS.offer);

  // Insertion
  const { data, error } = await supabase
    .from('job_offers')
    .insert({
      ...validatedData,
      user_id: userId,
      slug,
      status: 'published',
      moderation_status: 'approved', // Auto-approved pour V1
      published_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      completeness_score: completenessScore,
      freshness_score: freshnessScore,
    })
    .select()
    .single();

  if (error) {
    console.error('Error publishing offer:', error);
    return {
      success: false,
      error: 'Erreur lors de la publication',
    };
  }

  return {
    success: true,
    data,
  };
}

// ─── Mettre à jour une offre ──────────────────────────────────────────────

export async function updateJobOffer(
  supabase: SupabaseClient,
  userId: string,
  offerId: string,
  input: Partial<JobOfferInput>
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Vérifier propriétaire
  const { data: existing } = await supabase
    .from('job_offers')
    .select('user_id')
    .eq('id', offerId)
    .single();

  if (!existing || existing.user_id !== userId) {
    return { success: false, error: 'Non autorisé' };
  }

  // Recalculer score
  const completenessScore = calculateOfferCompletenessScore(input);

  const { data, error } = await supabase
    .from('job_offers')
    .update({
      ...input,
      completeness_score: completenessScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  return { success: true, data };
}
```

### 10.2 Fichier `src/services/jobs/publish-demand.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JobDemandInput, jobDemandSchema } from './validations';
import { generateJobSlug } from './mappers';
import { calculateDemandCompletenessScore, calculateFreshnessScore } from './scoring';
import { DEFAULT_EXPIRY_DAYS } from './constants';

export async function publishJobDemand(
  supabase: SupabaseClient,
  userId: string,
  input: JobDemandInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  const validation = jobDemandSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const validatedData = validation.data;
  const tempId = crypto.randomUUID();
  const slug = generateJobSlug(validatedData.title, tempId);
  const completenessScore = calculateDemandCompletenessScore(validatedData);
  const freshnessScore = 1.0;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS.demand);

  const { data, error } = await supabase
    .from('job_demands')
    .insert({
      ...validatedData,
      user_id: userId,
      slug,
      status: 'active',
      moderation_status: 'approved',
      published_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      completeness_score: completenessScore,
      freshness_score: freshnessScore,
    })
    .select()
    .single();

  if (error) {
    console.error('Error publishing demand:', error);
    return {
      success: false,
      error: 'Erreur lors de la publication',
    };
  }

  return {
    success: true,
    data,
  };
}
```

---

## 11. Intégration Maison vivante

### 11.1 Modification de `src/services/home/mappers.ts`

```typescript
// Ajouter ces imports
import { jobOffersToHomeFeedItems, jobDemandsToHomeFeedItems } from '@/services/jobs/mappers';
import { enrichJobOffer, enrichJobDemand } from '@/services/jobs/mappers';

// Ajouter cette fonction d'intégration
export async function getJobsForHomeFeed(
  supabase: any,
  userId: string | null,
  limit: number = 5
): Promise<HomeFeedItem[]> {
  const items: HomeFeedItem[] = [];

  // Récupérer offres urgentes et récentes
  const { data: offers } = await supabase
    .from('job_offers')
    .select('*')
    .eq('status', 'published')
    .eq('moderation_status', 'approved')
    .gte('expires_at', new Date().toISOString())
    .or('urgent.eq.true,published_at.gte.' + new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('urgent', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (offers) {
    const enrichedOffers = await Promise.all(
      offers.map(o => enrichJobOffer(o, supabase))
    );
    items.push(...jobOffersToHomeFeedItems(enrichedOffers));
  }

  // Récupérer quelques demandes récentes
  const { data: demands } = await supabase
    .from('job_demands')
    .select('*')
    .eq('status', 'active')
    .eq('moderation_status', 'approved')
    .gte('expires_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(Math.floor(limit / 2));

  if (demands) {
    const enrichedDemands = await Promise.all(
      demands.map(d => enrichJobDemand(d, supabase))
    );
    items.push(...jobDemandsToHomeFeedItems(enrichedDemands));
  }

  return items;
}
```

---

## 12. Plan d'implémentation détaillé

### Phase 1 — Fondation (2-3 jours)

**Jour 1 : Base de données et types**
- ✅ Créer migration SQL complète (tables + RLS + indexes)
- ✅ Créer `src/services/jobs/types.ts`
- ✅ Créer `src/services/jobs/constants.ts`
- ✅ Créer `src/services/jobs/validations.ts`
- ✅ Tester validations Zod

**Jour 2 : Services core**
- ✅ Créer `src/services/jobs/mappers.ts`
- ✅ Créer `src/services/jobs/scoring.ts`
- ✅ Créer `src/services/jobs/queries.ts`
- ✅ Créer `src/services/jobs/publish-offer.ts`
- ✅ Créer `src/services/jobs/publish-demand.ts`

**Jour 3 : Intégration**
- ✅ Modifier `src/services/home/mappers.ts` pour jobs
- ✅ Tests unitaires des services
- ✅ Validation complète Phase 1

### Phase 2 — Publication et consultation (3-4 jours)

**Jour 4-5 : Composants de base**
- Créer `JobOfferCard.tsx`
- Créer `JobDemandCard.tsx`
- Créer `JobFilters.tsx`
- Créer `JobSearchBar.tsx`
- Créer `JobEmptyState.tsx`

**Jour 6 : Pages de liste**
- Créer `/emploi/page.tsx` (hub)
- Créer `/emploi/offres/page.tsx`
- Créer `/emploi/demandes/page.tsx`
- Implémenter recherche et filtres

**Jour 7 : Pages de détail**
- Créer `/emploi/offres/[slug]/page.tsx`
- Créer composants détail (header, info, contact)
- Créer `/emploi/demandes/[slug]/page.tsx`

**Jour 8 : Publication**
- Créer wizard publication offre
- Créer wizard publication demande
- Formulaires multi-étapes
- Preview avant publication

### Phase 3 — Pertinence et engagement (2-3 jours)

**Jour 9-10 : Scoring et tri**
- Implémenter calcul scores temps réel
- Améliorer tri et classement
- Intégrer jobs dans fil Maison vivante
- Tests scoring

**Jour 11 : Contact et interactions**
- Système de contact/candidature
- Intégration messagerie
- Compteurs (vues, contacts)

### Phase 4 — Fidélisation (2 jours)

**Jour 12-13 :**
- Favoris offres/demandes
- Système de suivi
- Alertes basiques
- Mon espace emploi

### Phase 5 — Polish et optimisation (1-2 jours)

**Jour 14-15 :**
- SEO et metadata
- Performance et caching
- Tests end-to-end
- Documentation utilisateur

**Total estimé : 12-15 jours de développement**

---

## 13. Estimation de complexité

### Complexité technique

**Éléments simples** (30%):
- Types TypeScript
- Constantes
- Composants de base (cartes)
- Pages de liste simples

**Éléments moyens** (50%):
- Validations Zod complexes
- Mappers avec enrichissement
- Services de requêtes avec filtres
- Formulaires multi-étapes
- Intégration Maison vivante

**Éléments complexes** (20%):
- Algorithmes de scoring
- Recherche full-text
- Système de pertinence
- Gestion états et modération
- Tests et optimisations

### Risques identifiés

1. **Performance des requêtes** avec beaucoup de filtres
   - Mitigation : Index bien pensés, pagination stricte

2. **Qualité des données** (annonces floues)
   - Mitigation : Validations strictes, scores de complétude

3. **Adoption utilisateur**
   - Mitigation : Intégration native, UX simple

4. **Modération** du contenu
   - Mitigation : Auto-modération V1, outils admin V2

---

## 14. Checklist de validation

### Avant chaque phase

- [ ] Spécifications claires
- [ ] Types définis
- [ ] Services testables
- [ ] Architecture revue

### Avant mise en production

- [ ] Tests unitaires passent
- [ ] Tests e2e critiques passent
- [ ] Performance validée (<2s chargement)
- [ ] SEO configuré
- [ ] RLS policies testées
- [ ] Modération fonctionnelle
- [ ] Documentation complète
- [ ] Rollback plan prêt

---

## 15. Métriques de succès

### Métriques d'adoption

- Nombre d'offres publiées / semaine
- Nombre de demandes publiées / semaine
- Ratio offres/demandes actives
- Taux d'offres bien renseignées (>70% complétude)
- Taux de demandes avec CV/expérience

### Métriques d'engagement

- Taux d'ouverture des offres
- Taux de contact par offre
- Temps moyen avant premier contact
- Nombre de recherches / utilisateur
- Taux de retour (repeat usage)

### Métriques de qualité

- Score moyen de complétude
- % offres avec salaire renseigné
- % offres avec date de début
- Taux de modération (rejets)
- Satisfaction utilisateur (feedback)

### Métriques business (futur)

- Taux de conversion gratuit → payant
- Revenus par offre sponsorisée
- LTV recruteur
- CAC (coût acquisition)

---

**Document complété**  
**Prêt pour implémentation Phase 1**

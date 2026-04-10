/**
 * Requêtes Supabase pour les demandes d'emploi
 */

import { createClient } from '@/lib/supabase/server';

export interface DemandFilters {
  query?: string;
  categories?: string[];
  contractTypes?: string[];
  sectorId?: string;
  availabilityType?: string;
  page?: number;
  sortBy?: string;
}

export interface JobDemandRow {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  job_category: string;
  contract_types: string[];
  short_description: string;
  profile_description?: string;
  location_label: string;
  location_city?: string;
  sector_id?: string;
  availability_type: string;
  available_from?: string;
  experience_level?: string;
  salary_expectation_min?: number;
  salary_expectation_max?: number;
  has_driving_license?: boolean;
  contact_email?: string;
  contact_phone?: string;
  cv_url?: string;
  completeness_score: number;
  freshness_score: number;
  views_count: number;
  status: string;
  published_at: string;
  created_at: string;
}

const PAGE_SIZE = 12;

export async function getJobDemands(filters: DemandFilters = {}): Promise<{
  demands: JobDemandRow[];
  total: number;
  page: number;
  limit: number;
}> {
  const supabase = createClient();
  const page  = filters.page ?? 1;
  const from  = (page - 1) * PAGE_SIZE;
  const to    = from + PAGE_SIZE - 1;

  let query = supabase
    .from('job_demands')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .range(from, to);

  if (filters.query) {
    query = query.or(
      `title.ilike.%${filters.query}%,short_description.ilike.%${filters.query}%`
    );
  }
  if (filters.categories?.length) {
    query = query.in('job_category', filters.categories);
  }
  if (filters.sectorId) {
    query = query.eq('sector_id', filters.sectorId);
  }
  if (filters.availabilityType) {
    query = query.eq('availability_type', filters.availabilityType);
  }

  switch (filters.sortBy) {
    case 'completeness_desc':
      query = query.order('completeness_score', { ascending: false });
      break;
    case 'date_asc':
      query = query.order('published_at', { ascending: true });
      break;
    default:
      query = query.order('published_at', { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[getJobDemands]', error.message);
    return { demands: [], total: 0, page, limit: PAGE_SIZE };
  }

  return {
    demands: (data as JobDemandRow[]) ?? [],
    total:   count ?? 0,
    page,
    limit:   PAGE_SIZE,
  };
}

export async function getJobDemandBySlug(slug: string): Promise<JobDemandRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_demands')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as JobDemandRow;
}

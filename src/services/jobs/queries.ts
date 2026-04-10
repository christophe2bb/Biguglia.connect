/**
 * Module Emploi Local - Services de requêtes
 * Version 1.0 - 2026-04-09
 * 
 * Services pour récupérer offres et demandes d'emploi depuis Supabase
 */

import { createClient } from '@/lib/supabase/server';
import type {
  JobOffer,
  JobDemand,
  JobOfferSearchResult,
  JobDemandSearchResult,
  JobOfferFilters,
  JobDemandFilters,
  JobUserProfile,
} from '@/types/jobs';
import { calculateFreshnessScore } from './scoring';

// ============================================================================
// GET JOB OFFERS (with filters)
// ============================================================================

export async function getJobOffers(
  filters?: Partial<JobOfferFilters>
): Promise<{
  offers: JobOfferSearchResult[];
  total: number;
  page: number;
  limit: number;
}> {
  const supabase = createClient();

  // Build query
  let query = supabase
    .from('job_offers')
    .select(
      `
      *,
      author:profiles!job_offers_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'published');

  // Apply filters
  if (filters?.query) {
    query = query.ilike('title', `%${filters.query}%`);
  }

  if (filters?.categories && filters.categories.length > 0) {
    query = query.in('job_category', filters.categories);
  }

  if (filters?.contractTypes && filters.contractTypes.length > 0) {
    query = query.in('contract_type', filters.contractTypes);
  }

  if (filters?.employmentTypes && filters.employmentTypes.length > 0) {
    query = query.in('employment_type', filters.employmentTypes);
  }

  if (filters?.sectorId) {
    query = query.eq('sector_id', filters.sectorId);
  }

  if (filters?.experienceLevels && filters.experienceLevels.length > 0) {
    query = query.in('experience_level', filters.experienceLevels);
  }

  if (filters?.salaryMin) {
    query = query.gte('salary_range_min', filters.salaryMin);
  }

  if (filters?.requiresLicense !== undefined) {
    query = query.eq('has_driving_license', filters.requiresLicense);
  }

  if (filters?.requiresVehicle !== undefined) {
    query = query.eq('requires_vehicle', filters.requiresVehicle);
  }

  if (filters?.providesHousing !== undefined) {
    query = query.eq('provides_housing', filters.providesHousing);
  }

  if (filters?.providesRemote !== undefined) {
    query = query.eq('is_remote_possible', filters.providesRemote);
  }

  if (filters?.isUrgent !== undefined) {
    query = query.eq('is_urgent', filters.isUrgent);
  }

  // Sorting
  const sortBy = filters?.sortBy || 'date_desc';
  switch (sortBy) {
    case 'date_desc':
      query = query.order('published_at', { ascending: false });
      break;
    case 'date_asc':
      query = query.order('published_at', { ascending: true });
      break;
    case 'salary_desc':
      query = query.order('salary_range_max', { ascending: false, nullsFirst: false });
      break;
    case 'salary_asc':
      query = query.order('salary_range_min', { ascending: true, nullsFirst: false });
      break;
    case 'completeness_desc':
      query = query.order('completeness_score', { ascending: false });
      break;
    default:
      query = query.order('published_at', { ascending: false });
  }

  // Pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching job offers:', error);
    return { offers: [], total: 0, page, limit };
  }

  // Transform to SearchResult with enriched data
  const offers: JobOfferSearchResult[] = (data || []).map((offer: any) => ({
    ...offer,
    author_profile: offer.author ? {
      id: offer.author.id,
      display_name: offer.author.display_name,
      avatar_url: offer.author.avatar_url,
      is_verified: offer.author.is_verified,
      created_at: offer.author.created_at,
    } : undefined,
    freshness_score: offer.published_at
      ? calculateFreshnessScore(offer.published_at)
      : 0,
  }));

  return {
    offers,
    total: count || 0,
    page,
    limit,
  };
}

// ============================================================================
// GET SINGLE JOB OFFER BY SLUG
// ============================================================================

export async function getJobOfferBySlug(
  slug: string
): Promise<JobOfferSearchResult | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_offers')
    .select(
      `
      *,
      author:profiles!job_offers_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    // Table manquante (migration SQL pas encore exécutée) → ne pas 404
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
      console.warn('[queries] Table job_offers introuvable — migration SQL en attente.');
      return null;
    }
    console.error('Error fetching job offer:', error);
    return null;
  }
  if (!data) return null;

  return {
    ...data,
    author_profile: data.author ? {
      id: data.author.id,
      display_name: data.author.display_name,
      avatar_url: data.author.avatar_url,
      is_verified: data.author.is_verified,
      created_at: data.author.created_at,
    } : undefined,
    freshness_score: data.published_at
      ? calculateFreshnessScore(data.published_at)
      : 0,
  };
}

// ============================================================================
// GET JOB DEMANDS (with filters)
// ============================================================================

export async function getJobDemands(
  filters?: Partial<JobDemandFilters>
): Promise<{
  demands: JobDemandSearchResult[];
  total: number;
  page: number;
  limit: number;
}> {
  const supabase = createClient();

  // Build query
  let query = supabase
    .from('job_demands')
    .select(
      `
      *,
      author:profiles!job_demands_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'published');

  // Apply filters
  if (filters?.query) {
    query = query.ilike('title', `%${filters.query}%`);
  }

  if (filters?.categories && filters.categories.length > 0) {
    query = query.in('job_category', filters.categories);
  }

  if (filters?.sectorId) {
    query = query.eq('sector_id', filters.sectorId);
  }

  if (filters?.experienceLevels && filters.experienceLevels.length > 0) {
    query = query.in('experience_level', filters.experienceLevels);
  }

  if (filters?.isUrgent !== undefined) {
    query = query.eq('is_urgent', filters.isUrgent);
  }

  if (filters?.hasLicense !== undefined) {
    query = query.eq('has_driving_license', filters.hasLicense);
  }

  if (filters?.hasVehicle !== undefined) {
    query = query.eq('has_vehicle', filters.hasVehicle);
  }

  // Sorting
  const sortBy = filters?.sortBy || 'date_desc';
  switch (sortBy) {
    case 'date_desc':
      query = query.order('published_at', { ascending: false });
      break;
    case 'date_asc':
      query = query.order('published_at', { ascending: true });
      break;
    case 'experience_desc':
      query = query.order('experience_years', { ascending: false, nullsFirst: false });
      break;
    case 'completeness_desc':
      query = query.order('completeness_score', { ascending: false });
      break;
    default:
      query = query.order('published_at', { ascending: false });
  }

  // Pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching job demands:', error);
    return { demands: [], total: 0, page, limit };
  }

  // Transform to SearchResult
  const demands: JobDemandSearchResult[] = (data || []).map((demand: any) => ({
    ...demand,
    author_profile: demand.author ? {
      id: demand.author.id,
      display_name: demand.author.display_name,
      avatar_url: demand.author.avatar_url,
      is_verified: demand.author.is_verified,
      created_at: demand.author.created_at,
    } : undefined,
    freshness_score: demand.published_at
      ? calculateFreshnessScore(demand.published_at)
      : 0,
  }));

  return {
    demands,
    total: count || 0,
    page,
    limit,
  };
}

// ============================================================================
// GET SINGLE JOB DEMAND BY SLUG
// ============================================================================

export async function getJobDemandBySlug(
  slug: string
): Promise<JobDemandSearchResult | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_demands')
    .select(
      `
      *,
      author:profiles!job_demands_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `
    )
    .eq('slug', slug)
    .in('status', ['published', 'active'])
    .single();

  if (error) {
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
      console.warn('[queries] Table job_demands introuvable — migration SQL en attente.');
      return null;
    }
    console.error('Error fetching job demand:', error);
    return null;
  }
  if (!data) return null;

  return {
    ...data,
    author_profile: data.author ? {
      id: data.author.id,
      display_name: data.author.display_name,
      avatar_url: data.author.avatar_url,
      is_verified: data.author.is_verified,
      created_at: data.author.created_at,
    } : undefined,
    freshness_score: data.published_at
      ? calculateFreshnessScore(data.published_at)
      : 0,
  };
}

// ============================================================================
// GET RECENT JOB OFFERS (for Home feed)
// ============================================================================

export async function getRecentJobOffers(
  limit: number = 5,
  sectorId?: string
): Promise<JobOfferSearchResult[]> {
  const supabase = createClient();

  let query = supabase
    .from('job_offers')
    .select(
      `
      *,
      author:profiles!job_offers_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  // Filter by sector if provided
  if (sectorId) {
    query = query.eq('sector_id', sectorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent job offers:', error);
    return [];
  }

  return (data || []).map((offer: any) => ({
    ...offer,
    author_profile: offer.author ? {
      id: offer.author.id,
      display_name: offer.author.display_name,
      avatar_url: offer.author.avatar_url,
      is_verified: offer.author.is_verified,
      created_at: offer.author.created_at,
    } : undefined,
    freshness_score: offer.published_at
      ? calculateFreshnessScore(offer.published_at)
      : 0,
  }));
}

// ============================================================================
// GET RECENT JOB DEMANDS (for Home feed)
// ============================================================================

export async function getRecentJobDemands(
  limit: number = 5,
  sectorId?: string
): Promise<JobDemandSearchResult[]> {
  const supabase = createClient();

  let query = supabase
    .from('job_demands')
    .select(
      `
      *,
      author:profiles!job_demands_user_id_fkey (
        id,
        display_name,
        avatar_url,
        is_verified,
        created_at
      )
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (sectorId) {
    query = query.eq('sector_id', sectorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent job demands:', error);
    return [];
  }

  return (data || []).map((demand: any) => ({
    ...demand,
    author_profile: demand.author ? {
      id: demand.author.id,
      display_name: demand.author.display_name,
      avatar_url: demand.author.avatar_url,
      is_verified: demand.author.is_verified,
      created_at: demand.author.created_at,
    } : undefined,
    freshness_score: demand.published_at
      ? calculateFreshnessScore(demand.published_at)
      : 0,
  }));
}

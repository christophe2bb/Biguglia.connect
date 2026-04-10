/**
 * Module Emploi Local - Services de requêtes
 * Version 1.0 - 2026-04-09
 * 
 * Services pour récupérer offres et demandes d'emploi depuis Supabase
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
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

  // Build query — sans jointure pour compatibilité RLS maximale
  let query = supabase
    .from('job_offers')
    .select('*', { count: 'exact' })
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
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
      console.warn('[queries] Table job_offers introuvable — migration SQL en attente.');
      return { offers: [], total: 0, page, limit };
    }
    console.error('Error fetching job offers:', error);
    return { offers: [], total: 0, page, limit };
  }

  // Transform to SearchResult
  const offers: JobOfferSearchResult[] = (data || []).map((offer: any) => ({
    ...offer,
    author_profile: undefined,
    freshness_score: offer.published_at ? calculateFreshnessScore(offer.published_at) : 0,
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

  // Passe 1 : SELECT * sans jointure, sans filtre status strict
  // (la RLS se charge du filtre — évite le double-filtre qui peut bloquer)
  const { data: data2, error: error2 } = await supabase
    .from('job_offers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error2) {
    const msg2 = (error2 as { message?: string }).message ?? '';
    if (msg2.includes('relation') || msg2.includes('does not exist') || msg2.includes('42P01')) {
      console.warn('[queries] Table job_offers introuvable — migration SQL en attente.');
      return null;
    }
    // PGRST116 = 0 lignes (not found) — annonce vraiment absente
    if ((error2 as {code?:string}).code === 'PGRST116') {
      console.warn('[queries] Offre introuvable pour slug:', slug);
      return null;
    }
    console.error('[queries] getJobOfferBySlug error:', msg2, error2);
    return null;
  }
  if (!data2) return null;

  // On n'affiche que les offres publiées (double vérification côté app)
  if (data2.status !== 'published') return null;

  // Passe 2 (optionnelle) : tenter la jointure author
  const { data, error } = await supabase
    .from('job_offers')
    .select(
      `*,
      author:profiles!user_id (
        id, display_name, avatar_url, is_verified, created_at
      )`
    )
    .eq('slug', slug)
    .single();

  // Si la jointure échoue → on utilise data2 sans profil auteur
  const base = (!error && data) ? data : data2;
  const authorData = (!error && data && (data as any).author) ? (data as any).author : null;

  return {
    ...base,
    author_profile: authorData ? {
      id: authorData.id,
      display_name: authorData.display_name,
      avatar_url: authorData.avatar_url,
      is_verified: authorData.is_verified,
      created_at: authorData.created_at,
    } : undefined,
    freshness_score: base.published_at ? calculateFreshnessScore(base.published_at) : 0,
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

  // Build query — sans jointure pour compatibilité RLS maximale
  let query = supabase
    .from('job_demands')
    .select('*', { count: 'exact' })
    .in('status', ['active', 'published']);

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
    const msg2 = (error as { message?: string }).message ?? '';
    if (msg2.includes('relation') || msg2.includes('does not exist') || msg2.includes('42P01')) {
      console.warn('[queries] Table job_demands introuvable — migration SQL en attente.');
      return { demands: [], total: 0, page, limit };
    }
    console.error('Error fetching job demands:', error);
    return { demands: [], total: 0, page, limit };
  }

  // Transform to SearchResult
  const demands: JobDemandSearchResult[] = (data || []).map((demand: any) => ({
    ...demand,
    author_profile: undefined,
    freshness_score: demand.published_at ? calculateFreshnessScore(demand.published_at) : 0,
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

  // Tentative 1 : avec jointure author
  const { data, error } = await supabase
    .from('job_demands')
    .select(
      `*,
      author:profiles!user_id (
        id, display_name, avatar_url, is_verified, created_at
      )`
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
    // Jointure author échoue → retenter sans jointure
    console.warn('[queries] Jointure author demand échouée, tentative sans jointure:', msg);
    const { data: data2, error: error2 } = await supabase
      .from('job_demands')
      .select('*')
      .eq('slug', slug)
      .in('status', ['published', 'active'])
      .single();
    if (error2 || !data2) {
      console.error('[queries] getJobDemandBySlug fallback error:', error2);
      return null;
    }
    return {
      ...data2,
      author_profile: undefined,
      freshness_score: data2.published_at ? calculateFreshnessScore(data2.published_at) : 0,
    };
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
    freshness_score: data.published_at ? calculateFreshnessScore(data.published_at) : 0,
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

  // Sans jointure profiles pour compatibilité RLS maximale
  let query = supabase
    .from('job_offers')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (sectorId) {
    query = query.eq('sector_id', sectorId);
  }

  const { data, error } = await query;

  if (error) {
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
      return [];
    }
    console.error('Error fetching recent job offers:', error);
    return [];
  }

  return (data || []).map((offer: any) => ({
    ...offer,
    author_profile: undefined,
    freshness_score: offer.published_at ? calculateFreshnessScore(offer.published_at) : 0,
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

  // Sans jointure profiles pour compatibilité RLS maximale
  // Note : job_demands peut avoir status 'active' ou 'published'
  let query = supabase
    .from('job_demands')
    .select('*')
    .in('status', ['active', 'published'])
    .order('published_at', { ascending: false })
    .limit(limit);

  if (sectorId) {
    query = query.eq('sector_id', sectorId);
  }

  const { data, error } = await query;

  if (error) {
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
      return [];
    }
    console.error('Error fetching recent job demands:', error);
    return [];
  }

  return (data || []).map((demand: any) => ({
    ...demand,
    author_profile: undefined,
    freshness_score: demand.published_at ? calculateFreshnessScore(demand.published_at) : 0,
  }));
}

// ============================================================================
// CHECK OWNERSHIP — vérifie si l'utilisateur connecté est propriétaire
// ============================================================================

/**
 * Retourne true si l'utilisateur actuellement connecté est le créateur
 * de l'offre ou de la demande identifiée par son slug.
 * Utilise le client serveur (cookies session) → fiable même sans RLS sur user_id.
 */
export async function checkJobOwnership(
  table: 'job_offers' | 'job_demands',
  slug: string
): Promise<boolean> {
  try {
    // 1. Récupérer l'utilisateur connecté (client normal avec cookies de session)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 2. Vérifier la propriété via le client ADMIN (service role = bypass RLS total)
    //    → lit user_id sans aucune restriction RLS
    const admin = createAdminClient();
    const { data, error } = await admin
      .from(table)
      .select('user_id')
      .eq('slug', slug)
      .single();

    if (error || !data) return false;

    return (data as any).user_id === user.id;
  } catch {
    return false;
  }
}

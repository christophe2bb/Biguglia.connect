import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, createPublicClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createPublicClientMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(callback: T) => callback,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
  createPublicClient: createPublicClientMock,
}));

import { fetchActiveMembersSpotlight, fetchCommunityStats, fetchRecentEvents, fetchRecentHelpers, fetchTopArtisans } from '@/services/community/queries';
import { getHomeFeed } from '@/services/home/feed';

type QueryResult = { data: unknown[]; error: null };

class QueryBuilder implements PromiseLike<QueryResult> {
  select(..._args: unknown[]) { return this; }
  eq(..._args: unknown[]) { return this; }
  neq(..._args: unknown[]) { return this; }
  gte(..._args: unknown[]) { return this; }
  lte(..._args: unknown[]) { return this; }
  not(..._args: unknown[]) { return this; }
  in(..._args: unknown[]) { return this; }
  order(..._args: unknown[]) { return this; }
  limit(..._args: unknown[]) { return this; }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected);
  }
}

const publicClient = { from: vi.fn(() => new QueryBuilder()) };

describe('données publiques mises en cache', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    createPublicClientMock.mockReset().mockReturnValue(publicClient);
    publicClient.from.mockClear();
  });

  it('charge le feed anonyme sans accéder aux cookies de la requête', async () => {
    const result = await getHomeFeed();

    expect(result.hasContent).toBe(false);
    expect(createPublicClientMock).toHaveBeenCalledOnce();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(publicClient.from).toHaveBeenCalledTimes(8);
  });

  it('conserve le client de session pour un feed personnalisé', async () => {
    createClientMock.mockResolvedValue(publicClient);

    await getHomeFeed('user-123');

    expect(createClientMock).toHaveBeenCalledOnce();
    expect(createPublicClientMock).not.toHaveBeenCalled();
    expect(publicClient.from).toHaveBeenCalledTimes(8);
  });

  it('charge tous les modules communautaires via un client public compatible avec le cache', async () => {
    await Promise.all([
      fetchCommunityStats(),
      fetchTopArtisans(),
      fetchRecentHelpers(),
      fetchActiveMembersSpotlight(),
      fetchRecentEvents(),
    ]);

    expect(createPublicClientMock).toHaveBeenCalledTimes(5);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

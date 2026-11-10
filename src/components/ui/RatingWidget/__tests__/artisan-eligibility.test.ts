import { describe, expect, it, vi } from 'vitest';
import { checkEligibility } from '../_eligibility';

function mockSupabase(data: boolean | null, error: { code: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

describe('éligibilité aux avis artisan', () => {
  const user = '00000000-0000-0000-0000-000000000111';
  const artisan = '00000000-0000-0000-0000-000000000222';
  const profile = '00000000-0000-0000-0000-000000000333';

  it('autorise seulement quand Supabase valide un échange réel', async () => {
    const { client, rpc } = mockSupabase(true);
    await expect(checkEligibility(client, 'artisan', artisan, user, profile)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('can_rate_item', {
      p_target_type: 'artisan', p_target_id: artisan,
    });
  });

  it('refuse une personne sans échange et une erreur réseau', async () => {
    const absent = mockSupabase(false);
    await expect(checkEligibility(absent.client, 'artisan', artisan, user, profile)).resolves.toBe(false);
    const failed = mockSupabase(null, { code: 'XX000' });
    await expect(checkEligibility(failed.client, 'artisan', artisan, user, profile)).resolves.toBe(false);
  });

  it('refuse un artisan qui souhaite se noter lui-même', async () => {
    const { client, rpc } = mockSupabase(true);
    await expect(checkEligibility(client, 'artisan', artisan, user, user)).resolves.toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

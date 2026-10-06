import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthTimeoutError, withAuthTimeout } from './with-timeout';

describe('bounded authentication calls', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('releases a call that never settles and clears its timer', async () => {
    const result = withAuthTimeout(() => new Promise<never>(() => {}), 500);
    const rejected = expect(result).rejects.toBeInstanceOf(AuthTimeoutError);
    await vi.advanceTimersByTimeAsync(500);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns a successful value without a leftover timer', async () => {
    await expect(withAuthTimeout(() => Promise.resolve('session'))).resolves.toBe('session');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the original rejection', async () => {
    const error = new Error('Network unavailable');
    await expect(withAuthTimeout(() => Promise.reject(error))).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});

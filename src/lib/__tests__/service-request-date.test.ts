import { describe, expect, it } from 'vitest';
import { isPreferredDatePast, localISODate } from '../service-request-date';

describe('Services — date souhaitée locale', () => {
  const reference = new Date(2026, 10, 11, 23, 55);

  it('utilise le jour civil local et non la date UTC', () => {
    expect(localISODate(reference)).toBe('2026-11-11');
  });

  it('refuse une date passée', () => {
    expect(isPreferredDatePast('2026-11-10', reference)).toBe(true);
  });

  it('autorise le jour même et un jour futur', () => {
    expect(isPreferredDatePast('2026-11-11', reference)).toBe(false);
    expect(isPreferredDatePast('2026-11-12', reference)).toBe(false);
  });

  it('accepte une date facultative vide', () => {
    expect(isPreferredDatePast('', reference)).toBe(false);
  });
});

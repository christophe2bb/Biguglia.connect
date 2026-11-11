import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111112500_prevent_artisan_rating_reassignment.sql'),
  'utf8',
);

describe('Services — garde des avis artisans', () => {
  it('bloque le déplacement d’un avis vers un artisan sans prestation', () => {
    expect(migration).toContain("OLD.target_type = 'artisan' OR NEW.target_type = 'artisan'");
    expect(migration).toContain('NEW.target_type IS DISTINCT FROM OLD.target_type');
    expect(migration).toContain('NEW.target_id IS DISTINCT FROM OLD.target_id');
  });

  it('protège l’auteur et le déclencheur avant toute mise à jour', () => {
    expect(migration).toContain('NEW.user_id IS DISTINCT FROM OLD.user_id');
    expect(migration).toContain('NEW.author_id IS DISTINCT FROM OLD.author_id');
    expect(migration).toContain('BEFORE UPDATE ON public.item_ratings');
    expect(migration).toContain("ERRCODE = '42501'");
  });
});

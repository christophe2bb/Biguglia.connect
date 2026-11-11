/**
 * Régression structurelle des politiques Services.
 * Les assertions fonctionnelles/RLS restent à exécuter dans Supabase :
 * ce test garantit que la migration corrige les trois failles identifiées.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111115000_consolidate_services_insert_policies.sql'),
  'utf8',
);

const membershipMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111120500_harden_conversation_membership_mutations.sql'),
  'utf8',
);
const conversationUpdateMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111121600_close_conversation_direct_updates.sql'),
  'utf8',
);

describe("Services — consolidation de l’identité et des pièces jointes", () => {
  it('retire la règle qui permettait de créer une demande avec n’importe quel statut', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "service_requests_insert_resident"');
  });
  it('retire la règle qui permettait une URL arbitraire dans les photos', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Résident ajoute photos"');
  });
  it('empêche un client de rejoindre ou de modifier arbitrairement des conversations', () => {
    expect(membershipMigration).toContain('DROP POLICY IF EXISTS "conversations_insert_creator"');
    expect(membershipMigration).toContain('DROP POLICY IF EXISTS "conversation_participants_insert_own"');
    expect(membershipMigration).toContain('DROP POLICY IF EXISTS "conversation_participants_update_own"');
    expect(membershipMigration).toContain('DROP POLICY IF EXISTS "Supprimer ses participations"');
    expect(conversationUpdateMigration).toContain('DROP POLICY IF EXISTS "conversations_update_participant"');
  });
  it("consolide l’identité et l’appartenance pour l’ajout d’un message", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "messages_insert_participant"');
    expect(migration).toContain('DROP POLICY IF EXISTS "messages_sender_identity_guard"');
    expect(migration).toContain('FOR INSERT');
    expect(migration).toContain('TO authenticated');
    expect(migration).toMatch(/sender_id\s*=\s*\(SELECT auth\.uid\(\)\)/);
    expect(migration).toMatch(/cp\.conversation_id\s*=\s*messages\.conversation_id/);
    expect(migration).toMatch(/cp\.user_id\s*=\s*\(SELECT auth\.uid\(\)\)/);
  });
});

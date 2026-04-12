/**
 * src/types/user.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types de base liés à l'utilisateur / profil.
 *
 * Ces types sont transversaux à toute l'application ; les autres modules
 * (artisans, messages, forum…) les importent directement depuis ce fichier.
 */

export type UserRole =
  | 'resident'
  | 'artisan_pending'
  | 'artisan_verified'
  | 'moderator'
  | 'admin';

export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
  legal_consent: boolean;
  legal_consent_at?: string;
  // ── Couche territoriale transversale ──────────────────────────────────────
  home_sector_id?: string | null; // secteur de résidence/référence de l'utilisateur
}

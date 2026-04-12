/**
 * src/types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel d'export — re-exporte tous les types par domaine.
 *
 * Les imports existants `from '@/types'` continuent de fonctionner sans
 * modification. Pour les nouveaux fichiers, préférer l'import direct depuis
 * le module concerné :
 *
 *   import type { Profile }     from '@/types/user';
 *   import type { ForumTopic }  from '@/types/forum';
 *   import type { Listing }     from '@/types/listings';
 *   …
 *
 * Modules disponibles :
 *  @/types/user        — Profile, UserRole, AccountStatus
 *  @/types/artisans    — ArtisanProfile, TradeCategory, ServiceRequest, Appointment, Review, …
 *  @/types/messages    — Conversation, ConversationParticipant, Message
 *  @/types/listings    — Listing, ListingCategory, ListingPhoto
 *  @/types/equipment   — EquipmentItem, EquipmentCategory, BorrowRequest, …
 *  @/types/outings     — GroupOuting, OutingParticipant, OutingStatusFr, …
 *  @/types/forum       — ForumTopic, ForumReply, ForumSector, ForumCategory, …
 *  @/types/events      — Event, EventParticipant, EventStatusFr, …
 *  @/types/community   — Sector, LostFoundItem, HelpRequest, Promenade,
 *                        Association, CollectionItem, Report, Notification
 */

// ── Utilisateur ───────────────────────────────────────────────────────────────
export type { UserRole, AccountStatus, Profile } from './user';

// ── Artisans ──────────────────────────────────────────────────────────────────
export type {
  ArtisanType,
  TradeCategory,
  ArtisanPhoto,
  Review,
  ArtisanProfile,
  ServiceRequestPhoto,
  ServiceRequest,
  Appointment,
} from './artisans';

// ── Messagerie ────────────────────────────────────────────────────────────────
export type { Message, ConversationParticipant, Conversation } from './messages';

// ── Annonces ──────────────────────────────────────────────────────────────────
export type { ListingCategory, ListingPhoto, Listing } from './listings';

// ── Matériel en prêt ──────────────────────────────────────────────────────────
export type {
  EquipmentCategory,
  EquipmentPhoto,
  EquipmentItem,
  BorrowRequest,
} from './equipment';

// ── Sorties groupées ──────────────────────────────────────────────────────────
export type {
  OutingStatusFr,
  OutingStatus,
  OutingParticipantStatus,
  OutingPhoto,
  GroupOuting,
  OutingParticipant,
  OutingStatusHistory,
} from './outings';

// ── Forum ─────────────────────────────────────────────────────────────────────
export type {
  ForumSector,
  ForumCategory,
  ForumTag,
  ForumTopicStatus,
  ForumReply,
  ForumTopic,
  ForumReaction,
  ForumFollow,
  ForumReport,
  ForumModerationLog,
  ForumPost,
  ForumComment,
} from './forum';

// ── Événements ────────────────────────────────────────────────────────────────
export type {
  EventStatusFr,
  EventParticipantStatusFr,
  EventPhoto,
  EventParticipant,
  Event,
  EventStatusHistory,
  EventDateHistory,
} from './events';

// ── Communauté (Sector, Perdu/Trouvé, Coups de main, Promenades,
//               Associations, Collectionneurs, Signalements, Notifications) ───
export type {
  Sector,
  LostFoundItem,
  HelpRequest,
  Promenade,
  Association,
  CollectionItem,
  Report,
  Notification,
} from './community';

// ─── Types partagés — admin/stats ──────────────────────────────────────────

export interface DailyPoint { date: string; value: number }
export interface KV { name: string; value: number; color?: string }

export interface AllStats {
  // Utilisateurs
  totalUsers:        number;
  residents:         number;
  artisansPending:   number;
  artisansVerified:  number;
  artisansPro:       number;
  artisansParticulier: number;
  newUsersLast7:     number;
  newUsersLast30:    number;
  // Messages & conversations
  totalMessages:     number;
  totalConversations: number;
  // Annonces
  totalListings:     number;
  activeListings:    number;
  listingViews:      number;
  // Forum
  totalPosts:        number;
  totalComments:     number;
  closedPosts:       number;
  // Demandes artisans
  totalRequests:     number;
  requestsByStatus:  KV[];
  // Avis
  totalReviews:      number;
  avgRating:         number;
  // Matériel
  totalEquipment:    number;
  availableEquipment: number;
  totalBorrows:      number;
  // Signalements
  pendingReports:    number;
  totalReports:      number;
  // Notifications
  totalNotifications:  number;
  unreadNotifications: number;
  // Séries temporelles (30 jours)
  dailyUsers:     DailyPoint[];
  dailyMessages:  DailyPoint[];
  dailyPosts:     DailyPoint[];
  dailyListings:  DailyPoint[];
  // Répartition
  roleDistribution:  KV[];
  listingCategories: KV[];
  forumCategories:   KV[];
  tradeCategories:   KV[];
  // Nuage de mots (titres forum)
  topForumWords:    KV[];
  // Activité par heure (messages)
  activityByHour: { hour: string; messages: number; posts: number }[];
}

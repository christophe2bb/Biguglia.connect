// ─── Types partagés — admin/stats ──────────────────────────────────────────

export interface DailyPoint { date: string; value: number }
export interface KV { name: string; value: number; color?: string }

export interface PlatformAlert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  actionHref?: string;
  value?: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate: number;
  color: string;
}

export interface WeeklyComparison {
  metric: string;
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
}

export interface AllStats {
  // Utilisateurs
  totalUsers:           number;
  residents:            number;
  artisansPending:      number;
  artisansVerified:     number;
  artisansPro:          number;
  artisansParticulier:  number;
  newUsersLast7:        number;
  newUsersLast30:       number;
  newUsersLast90:       number;

  // Engagement
  activeUsersLast30:       number;
  activationRate:          number;
  dauEstimate:             number;
  avgMsgsPerConversation:  number;
  avgCommentsPerPost:      number;
  artisanResponseRate:     number;

  // Messages & conversations
  totalMessages:       number;
  totalConversations:  number;
  activeConversations: number;
  messagesLast7:       number;
  messagesPrev7:       number;

  // Annonces
  totalListings:       number;
  activeListings:      number;
  listingViews:        number;
  listingCategories:   KV[];
  listingsLast7:       number;
  listingsPrev7:       number;
  listingActiveRate:   number;

  // Forum
  totalPosts:          number;
  totalComments:       number;
  closedPosts:         number;
  forumCategories:     KV[];
  topForumWords:       KV[];
  postsLast7:          number;
  postsPrev7:          number;
  forumResolutionRate: number;

  // Demandes artisans
  totalRequests:             number;
  requestsByStatus:          KV[];
  requestCompletionRate:     number;
  requestCancellationRate:   number;
  pendingRequests:           number;

  // Avis
  totalReviews:        number;
  avgRating:           number;
  ratingDistribution:  KV[];
  positiveReviews:     number;
  negativeReviews:     number;

  // Matériel
  totalEquipment:      number;
  availableEquipment:  number;
  totalBorrows:        number;
  equipmentUsageRate:  number;

  // Signalements
  pendingReports:        number;
  totalReports:          number;
  resolvedReports:       number;
  reportResolutionRate:  number;

  // Notifications
  totalNotifications:   number;
  unreadNotifications:  number;
  notifReadRate:        number;

  // Séries temporelles (30 jours)
  dailyUsers:     DailyPoint[];
  dailyMessages:  DailyPoint[];
  dailyPosts:     DailyPoint[];
  dailyListings:  DailyPoint[];
  dailyRequests:  DailyPoint[];

  // Répartition
  roleDistribution:  KV[];
  tradeCategories:   KV[];
  activityByHour:    { hour: string; messages: number; posts: number }[];

  // Santé plateforme
  healthScore:     number;
  healthLevel:     'excellent' | 'good' | 'fair' | 'poor';
  healthBreakdown: { label: string; score: number; max: number; icon: string }[];

  // Alertes prioritaires
  alerts: PlatformAlert[];

  // Comparaisons S/S
  weeklyComparisons: WeeklyComparison[];

  // Funnel artisan
  artisanFunnel: FunnelStep[];

  // Croissance
  userGrowthRate:   number;
  monthlyNewUsers:  number;

  // Autres contenus
  totalHelpRequests: number;
  totalOutings:      number;
  totalLostFound:    number;
  totalEvents:       number;
}

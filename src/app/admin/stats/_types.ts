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

// ─── Score individuel artisan ─────────────────────────────────────────────────
export interface ArtisanScore {
  userId:        string;
  displayName:   string;
  tradeCategory: string;
  artisanType:   string;
  // métriques brutes
  totalRequests:    number;
  completedRequests:number;
  cancelledRequests:number;
  pendingRequests:  number;
  totalReviews:     number;
  avgRating:        number;
  responseRate:     number;   // % demandes répondues
  completionRate:   number;   // % demandes terminées
  // score composite 0-100
  score:        number;
  scoreLevel:   'excellent' | 'good' | 'fair' | 'poor';
  badge:        string;  // emoji badge
  // tendances
  requestsLast30:   number;
  requestsLast7:    number;
  lastActivityDays: number;  // jours depuis dernière activité (null = jamais)
}

// ─── Heatmap activité 7 jours × 24 heures ────────────────────────────────────
export interface HeatmapCell {
  day:   number;  // 0=lun … 6=dim
  hour:  number;  // 0-23
  value: number;  // nombre d'actions
}

// ─── Données prédictives ──────────────────────────────────────────────────────
export interface PredictionPoint {
  date:       string;
  actual:     number | null;
  predicted:  number;
  lower:      number;  // intervalle de confiance bas
  upper:      number;  // intervalle de confiance haut
}

export interface Prediction {
  metric:     string;
  horizon:    number;     // jours dans le futur
  points:     PredictionPoint[];
  trend:      'up' | 'down' | 'flat';
  confidence: number;     // 0-100
  insight:    string;
}

// ─── Benchmark ────────────────────────────────────────────────────────────────
export interface BenchmarkItem {
  metric:     string;
  platform:   number;   // valeur Biguglia Connect
  benchmark:  number;   // valeur de référence secteur civic-tech
  unit:       string;
  status:     'above' | 'at' | 'below';
  gap:        number;   // écart absolu
  gapPct:     number;   // écart en %
  context:    string;   // explication textuelle
}

// ─── AllStats étendu ──────────────────────────────────────────────────────────
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

  // ── NOUVEAU : Heatmap 7 jours × 24 heures ────────────────────────────────
  heatmap7x24: HeatmapCell[];

  // ── NOUVEAU : Scores individuels artisans ────────────────────────────────
  artisanScores: ArtisanScore[];

  // ── NOUVEAU : Prédictions 14 jours ───────────────────────────────────────
  predictions: Prediction[];

  // ── NOUVEAU : Benchmarks secteur civic-tech ──────────────────────────────
  benchmarks: BenchmarkItem[];

  // ── NOUVEAU : Métriques rétention avancées ───────────────────────────────
  /** Membres inscrits il y a > 30j sans aucune activité */
  ghostUsers:         number;
  /** Taux de rétention = membres actifs parmi ceux inscrits > 30j */
  retentionRate:      number;
  /** Vitesse moyenne de réponse artisan (jours, approx) */
  avgResponseDays:    number;
  /** Score de vélocité contenu (actions/jour lissées sur 7j) */
  contentVelocity:    number;
  /** Jours depuis la dernière publication de contenu */
  daysSinceLastContent: number;
  /** Pic d'activité horaire (heure 0-23) */
  peakHour:           number;
  /** Pic d'activité journalier (0=lun … 6=dim) */
  peakDayOfWeek:      number;
  /** Série temporelle score de santé (12 semaines, calculé rétrospectivement) */
  healthHistory:      DailyPoint[];
}

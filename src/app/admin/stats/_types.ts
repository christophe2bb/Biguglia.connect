// ─── Types partagés — admin/stats v4.0 ─────────────────────────────────────

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
  totalRequests:     number;
  completedRequests: number;
  cancelledRequests: number;
  pendingRequests:   number;
  totalReviews:      number;
  avgRating:         number;
  responseRate:      number;   // % demandes répondues
  completionRate:    number;   // % demandes terminées
  // score composite 0-100
  score:        number;
  scoreLevel:   'excellent' | 'good' | 'fair' | 'poor';
  badge:        string;  // emoji badge
  // tendances
  requestsLast30:   number;
  requestsLast7:    number;
  lastActivityDays: number;
  // NOUVEAU : tendance du score sur 2 périodes
  scoreTrend:       'up' | 'down' | 'flat';
  churnRisk:        'high' | 'medium' | 'low';  // risque de désengagement
}

// ─── Heatmap activité 7 jours × 24 heures ────────────────────────────────────
export interface HeatmapCell {
  day:   number;  // 0=lun … 6=dim
  hour:  number;  // 0-23
  value: number;
}

// ─── Données prédictives ──────────────────────────────────────────────────────
export interface PredictionPoint {
  date:      string;
  actual:    number | null;
  predicted: number;
  lower:     number;
  upper:     number;
}

export interface Prediction {
  metric:     string;
  horizon:    number;
  points:     PredictionPoint[];
  trend:      'up' | 'down' | 'flat';
  confidence: number;
  insight:    string;
  // NOUVEAU
  momentumScore:  number;   // -100 à +100, accélération de la tendance
  ewma7:          number;   // moyenne mobile exponentielle 7j
  ewma30:         number;   // moyenne mobile exponentielle 30j
}

// ─── Benchmark ────────────────────────────────────────────────────────────────
export interface BenchmarkItem {
  metric:    string;
  platform:  number;
  benchmark: number;
  unit:      string;
  status:    'above' | 'at' | 'below';
  gap:       number;
  gapPct:    number;
  context:   string;
}

// ─── NOUVEAU : Anomalie statistique (Z-score) ─────────────────────────────────
export interface AnomalyPoint {
  date:    string;
  metric:  string;
  value:   number;
  zscore:  number;       // score Z (nb d'écarts-types de la moyenne)
  mean:    number;
  stddev:  number;
  level:   'critical' | 'warning' | 'normal';  // |z|>3 critique, |z|>2 warning
  direction: 'spike' | 'drop' | 'normal';
}

// ─── NOUVEAU : Cohorte de rétention ──────────────────────────────────────────
export interface CohortRetention {
  cohortLabel:  string;   // ex: "Avr 2025"
  cohortSize:   number;
  retDay7:      number;   // % retenus à J+7
  retDay14:     number;   // % retenus à J+14
  retDay30:     number;   // % retenus à J+30
}

// ─── NOUVEAU : Métriques EWMA ─────────────────────────────────────────────────
export interface EwmaMetrics {
  messagesEwma7:  number;
  messagesEwma30: number;
  postsEwma7:     number;
  postsEwma30:    number;
  usersEwma7:     number;
  usersEwma30:    number;
  // momentum = (ewma7 - ewma30) / ewma30 * 100  → % accélération
  messagesMomentum: number;
  postsMomentum:    number;
  usersMomentum:    number;
}

// ─── NOUVEAU : Métriques engagement avancées ──────────────────────────────────
export interface EngagementMetrics {
  dauMauRatio:          number;   // DAU/MAU × 100 (%)  — cible > 20%
  weeklyActiveRate:     number;   // % actifs 7j / total
  stickiness:           number;   // DAU/WAU — fidélité quotidienne
  avgSessionsPerUser:   number;   // estimé via msgs/user actif
  newUserActivation7d:  number;   // % nouveaux inscrits actifs en 7j
  churnRisk30d:         number;   // % membres risquant l'abandon (30j sans action)
  virality:             number;   // nouveaux via invitations (estimé)
  nps:                  number;   // Net Promoter Score estimé (avis 5★ − avis 1-2★)
}

// ─── AllStats étendu v4.0 ─────────────────────────────────────────────────────
export interface AllStats {
  // Utilisateurs
  totalUsers:          number;
  residents:           number;
  artisansPending:     number;
  artisansVerified:    number;
  artisansPro:         number;
  artisansParticulier: number;
  newUsersLast7:       number;
  newUsersLast30:      number;
  newUsersLast90:      number;

  // Engagement
  activeUsersLast30:      number;
  activationRate:         number;
  dauEstimate:            number;
  avgMsgsPerConversation: number;
  artisanResponseRate:    number;

  // Messages & conversations
  totalMessages:       number;
  totalConversations:  number;
  activeConversations: number;
  messagesLast7:       number;
  messagesPrev7:       number;

  // Annonces
  totalListings:     number;
  activeListings:    number;
  listingViews:      number;
  listingCategories: KV[];
  listingsLast7:     number;
  listingsPrev7:     number;
  listingActiveRate: number;

  // Forum
  totalPosts:          number;
  totalComments:       number;
  closedPosts:         number;
  forumCategories:     KV[];
  topForumWords:       KV[];
  postsLast7:          number;
  postsPrev7:          number;
  forumResolutionRate: number;
  avgCommentsPerPost:  number;  // commentaires moyens par post forum

  // Demandes artisans
  totalRequests:           number;
  requestsByStatus:        KV[];
  requestCompletionRate:   number;
  requestCancellationRate: number;
  pendingRequests:         number;

  // Avis
  totalReviews:       number;
  avgRating:          number;
  ratingDistribution: KV[];
  positiveReviews:    number;
  negativeReviews:    number;

  // Matériel
  totalEquipment:    number;
  availableEquipment:number;
  totalBorrows:      number;
  equipmentUsageRate:number;

  // Signalements
  pendingReports:       number;
  totalReports:         number;
  resolvedReports:      number;
  reportResolutionRate: number;

  // Notifications
  totalNotifications:  number;
  unreadNotifications: number;
  notifReadRate:       number;

  // Séries temporelles (30 jours)
  dailyUsers:    DailyPoint[];
  dailyMessages: DailyPoint[];
  dailyPosts:    DailyPoint[];
  dailyListings: DailyPoint[];
  dailyRequests: DailyPoint[];

  // Répartition
  roleDistribution: KV[];
  tradeCategories:  KV[];
  activityByHour:   { hour: string; messages: number; posts: number }[];

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
  userGrowthRate:  number;
  monthlyNewUsers: number;

  // Autres contenus
  totalHelpRequests: number;
  totalOutings:      number;
  totalLostFound:    number;
  totalEvents:       number;

  // Heatmap 7j × 24h
  heatmap7x24: HeatmapCell[];

  // Scores artisans
  artisanScores: ArtisanScore[];

  // Prédictions 14j
  predictions: Prediction[];

  // Benchmarks secteur
  benchmarks: BenchmarkItem[];

  // Métriques rétention
  ghostUsers:           number;
  retentionRate:        number;
  avgResponseDays:      number;
  contentVelocity:      number;
  daysSinceLastContent: number;
  peakHour:             number;
  peakDayOfWeek:        number;
  healthHistory:        DailyPoint[];

  // ── NOUVEAU v4.0 : Algorithmes avancés ───────────────────────────────────

  /** Anomalies statistiques détectées (z-score > 2σ) sur les 7 derniers jours */
  anomalies: AnomalyPoint[];

  /** Analyse EWMA et momentum par série */
  ewmaMetrics: EwmaMetrics;

  /** Engagement avancé : DAU/MAU, stickiness, churn, NPS */
  engagementMetrics: EngagementMetrics;

  /** Cohortes de rétention (3 derniers mois) */
  cohortRetention: CohortRetention[];

  /** Score de momentum global plateforme (-100 à +100) */
  platformMomentum: number;

  /** Timestamp ISO de génération des stats */
  generatedAt: string;
}

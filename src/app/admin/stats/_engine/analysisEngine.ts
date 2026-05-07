/**
 * Moteur d'analyse contextuel — admin/stats
 *
 * Génère des insights, diagnostics et recommandations basés
 * sur les VRAIES valeurs de la plateforme.
 * Chaque insight est unique, précis, chiffré, non répétable.
 */

import type { AllStats } from '../_types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'critical' | 'danger' | 'warning' | 'ok' | 'great';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: 'growth' | 'engagement' | 'content' | 'artisans' | 'quality' | 'moderation' | 'retention';
  icon: string;
  title: string;
  metric: string;
  diagnosis: string;
  actions: string[];
  target?: string;
  priority: number;
}

export interface PlatformTheme {
  level: AllStats['healthLevel'];
  headerGradient: string;
  accent: string;
  label: string;
  statusLine: string;
  emoji: string;
  barClass: string;
  sectionBg: string;
  sectionBorder: string;
  textAccent: string;
}

export interface AnalysisResult {
  theme: PlatformTheme;
  insights: Insight[];
  topActions: { action: string; from: string }[];
  executiveSummary: string;
}

// ─── Thèmes visuels ───────────────────────────────────────────────────────────

export function getPlatformTheme(
  level: AllStats['healthLevel'],
  score: number,
): PlatformTheme {
  switch (level) {
    case 'excellent':
      return {
        level,
        headerGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
        accent: '#059669',
        label: 'Plateforme en pleine forme',
        statusLine: `Score ${score}/100 — Communauté active et engagée`,
        emoji: '🚀',
        barClass: 'bg-emerald-400',
        sectionBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
        sectionBorder: 'border-emerald-200',
        textAccent: 'text-emerald-700',
      };
    case 'good':
      return {
        level,
        headerGradient: 'from-blue-600 via-indigo-600 to-violet-700',
        accent: '#2563eb',
        label: 'Bonne dynamique',
        statusLine: `Score ${score}/100 — Croissance régulière, engagement à consolider`,
        emoji: '📈',
        barClass: 'bg-blue-400',
        sectionBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        sectionBorder: 'border-blue-200',
        textAccent: 'text-blue-700',
      };
    case 'fair':
      return {
        level,
        headerGradient: 'from-amber-500 via-orange-500 to-red-500',
        accent: '#d97706',
        label: 'Plateforme en démarrage',
        statusLine: `Score ${score}/100 — Potentiel fort, actions prioritaires identifiées`,
        emoji: '⚡',
        barClass: 'bg-amber-400',
        sectionBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
        sectionBorder: 'border-amber-200',
        textAccent: 'text-amber-700',
      };
    case 'poor':
    default:
      return {
        level,
        headerGradient: 'from-red-600 via-rose-600 to-pink-700',
        accent: '#dc2626',
        label: 'Activation critique',
        statusLine: `Score ${score}/100 — Fondations à poser immédiatement`,
        emoji: '🔧',
        barClass: 'bg-red-400',
        sectionBg: 'bg-gradient-to-br from-red-50 to-rose-50',
        sectionBorder: 'border-red-200',
        textAccent: 'text-red-700',
      };
  }
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

// ─── Générateurs d'insights par domaine ──────────────────────────────────────

function growthInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];
  const dailyRate = s.newUsersLast30 / 30;

  if (s.totalUsers === 0) {
    out.push({
      id: 'no_users',
      severity: 'critical',
      category: 'growth',
      icon: '🧍',
      title: 'Aucun membre inscrit',
      metric: '0 membre',
      diagnosis: "La plateforme n'a encore aucun utilisateur enregistré. Impossible de mesurer l'engagement ou la valeur.",
      actions: [
        'Partager le lien d\'inscription sur les groupes WhatsApp / Facebook de Biguglia',
        'Contacter directement 5 artisans locaux (plombier, électricien, maçon) pour les inscrire en priorité',
        "Créer 2-3 annonces de démonstration pour illustrer la valeur de la plateforme",
      ],
      target: 'Objectif : 10 membres actifs dans les 30 premiers jours',
      priority: 10,
    });
    return out;
  }

  if (s.newUsersLast7 === 0 && s.totalUsers > 3) {
    out.push({
      id: 'zero_growth_week',
      severity: 'danger',
      category: 'growth',
      icon: '📉',
      title: 'Zéro inscription cette semaine',
      metric: '0 nouveau membre / 7j',
      diagnosis: `${fmt(s.totalUsers)} membres inscrits au total, mais 0 inscription sur les 7 derniers jours. Le bouche-à-oreille est insuffisant. Taux annualisé actuel : 0 nouvelle inscription/an.`,
      actions: [
        `Envoyer un message personnalisé aux ${fmt(s.totalUsers)} membres existants pour partager le lien d'invitation`,
        'Publier un post sur les réseaux municipaux avec un exemple concret de service rendu',
        'Proposer un parrainage : 1 invité = badge spécial visible sur le profil',
        'Contacter la mairie de Biguglia pour relai dans le bulletin municipal',
      ],
      target: 'Objectif minimal viable : +2 nouveaux membres/semaine',
      priority: 9,
    });
  } else if (s.newUsersLast7 === 1) {
    out.push({
      id: 'slow_growth',
      severity: 'warning',
      category: 'growth',
      icon: '🐌',
      title: '1 seule inscription cette semaine',
      metric: `1 inscription / 7j`,
      diagnosis: `À ce rythme (${dailyRate.toFixed(2)}/jour), atteindre 100 membres prendrait ${Math.ceil((100 - s.totalUsers) / (dailyRate || 0.1))} jours. Ce mois : +${s.newUsersLast30} inscrits. Le réseau initial est probablement saturé.`,
      actions: [
        "Programmer un événement physique 'Découverte Biguglia Connect' dans le village",
        'Créer un QR code à afficher chez les commerçants et artisans locaux',
        'Proposer 3 mois de visibilité premium gratuits pour les 20 prochains inscrits',
      ],
      target: 'Objectif : +5 inscriptions/semaine',
      priority: 7,
    });
  } else if (s.newUsersLast7 >= 5 && s.userGrowthRate >= 0) {
    out.push({
      id: 'healthy_growth',
      severity: 'great',
      category: 'growth',
      icon: '🌱',
      title: `Croissance saine : +${s.newUsersLast7} cette semaine`,
      metric: `+${s.newUsersLast7} membres / 7j`,
      diagnosis: `+${s.newUsersLast30} ce mois (${s.userGrowthRate > 0 ? '+' : ''}${s.userGrowthRate}% vs mois précédent). Sur 90j : +${s.newUsersLast90}. La communauté grandit organiquement.`,
      actions: [
        'Analyser la source des inscriptions (bouche-à-oreille, social, QR) pour doubler dessus',
        `Mettre en place un NPS (score de recommandation) auprès des ${fmt(s.totalUsers)} membres`,
      ],
      target: `Suivant : maintenir +${Math.ceil(s.newUsersLast7 * 1.2)}/semaine`,
      priority: 2,
    });
  }

  if (s.userGrowthRate < -20 && s.newUsersLast30 > 0) {
    out.push({
      id: 'growth_declining',
      severity: 'warning',
      category: 'growth',
      icon: '📉',
      title: `Ralentissement : ${s.userGrowthRate}% vs mois précédent`,
      metric: `${s.userGrowthRate}% croissance`,
      diagnosis: `Ce mois : +${s.newUsersLast30} inscrits, contre davantage le mois précédent. Le réseau initial est probablement saturé.`,
      actions: [
        "Élargir la communication au-delà du cercle initial (communes voisines, groupes régionaux)",
        "Lancer une campagne 'Invitez votre voisin' avec notification in-app",
      ],
      target: `Cible : +${Math.ceil(s.newUsersLast30 * 1.1)} le mois prochain`,
      priority: 6,
    });
  }

  return out;
}

function engagementInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];
  if (s.totalUsers < 2) return out;

  const inactiveUsers = s.totalUsers - s.activeUsersLast30;
  const inactivePct = pct(inactiveUsers, s.totalUsers);

  if (inactivePct > 70 && s.totalUsers > 5) {
    out.push({
      id: 'ghost_members',
      severity: 'danger',
      category: 'engagement',
      icon: '👻',
      title: `${inactivePct}% de membres silencieux (${fmt(inactiveUsers)} fantômes)`,
      metric: `${fmt(inactiveUsers)} inactifs / ${fmt(s.totalUsers)}`,
      diagnosis: `${fmt(inactiveUsers)} membres sur ${fmt(s.totalUsers)} n'ont produit aucune action en 30j. Problème probable : onboarding absent ou valeur perçue insuffisante. Un membre inactif 30j a 80% de chances de ne jamais revenir.`,
      actions: [
        `Envoyer une notification 'On vous a manqué !' aux ${fmt(Math.min(inactiveUsers, 30))} membres les plus anciens sans activité`,
        "Créer un post 'Question de la semaine' pour inciter les silencieux à commenter",
        "Mettre en place un email digest hebdomadaire 'Ce qui s'est passé à Biguglia'",
        "Afficher une page d'accueil personnalisée avec contenus locaux à chaque reconnexion",
      ],
      target: `Objectif : inactivité < 50% (${fmt(Math.ceil(s.totalUsers * 0.5))} actifs/mois)`,
      priority: 8,
    });
  } else if (inactivePct > 40 && inactivePct <= 70 && s.totalUsers > 5) {
    out.push({
      id: 'moderate_inactivity',
      severity: 'warning',
      category: 'engagement',
      icon: '😴',
      title: `${inactivePct}% d'inactivité mensuelle`,
      metric: `${fmt(s.activeUsersLast30)} actifs / ${fmt(s.totalUsers)}`,
      diagnosis: `${fmt(inactiveUsers)} membres sans interaction ce mois. Normal en phase de démarrage, mais actionnable facilement.`,
      actions: [
        "Activer les notifications push pour les annonces importantes du quartier",
        "Créer 1 post d'animation par semaine (ex: 'Bons plans', 'Astuce locale')",
      ],
      target: `Objectif : 60% actifs/mois (${fmt(Math.ceil(s.totalUsers * 0.6))})`,
      priority: 5,
    });
  }

  if (s.totalConversations > 0 && s.avgMsgsPerConversation < 2) {
    out.push({
      id: 'thin_conversations',
      severity: 'warning',
      category: 'engagement',
      icon: '💬',
      title: `Conversations abandonnées : ${s.avgMsgsPerConversation} msg/convo`,
      metric: `${s.avgMsgsPerConversation} msgs/conversation`,
      diagnosis: `${fmt(s.totalMessages)} messages pour ${fmt(s.totalConversations)} conversations = ${s.avgMsgsPerConversation} messages en moyenne. Une conversation saine contient ≥5 échanges. Cause probable : questions sans réponse ou réponses trop tardives.`,
      actions: [
        "Activer les notifications 'Nouvelle réponse' pour inciter à relire les threads",
        "Ajouter un rappel automatique 48h après l'envoi si aucune réponse",
        "Encourager les artisans à indiquer leur délai de réponse dans leur profil",
      ],
      target: '≥ 4 messages/conversation (échange complet)',
      priority: 5,
    });
  } else if (s.avgMsgsPerConversation >= 5) {
    out.push({
      id: 'rich_conversations',
      severity: 'great',
      category: 'engagement',
      icon: '💬',
      title: `Échanges riches : ${s.avgMsgsPerConversation} msgs/convo`,
      metric: `${s.avgMsgsPerConversation} msgs/conversation`,
      diagnosis: `Excellent niveau d'échange. Les ${fmt(s.totalConversations)} conversations génèrent ${fmt(s.totalMessages)} messages.`,
      actions: [
        "Extraire les sujets des conversations les plus longues pour identifier les besoins populaires",
        "Mettre en avant les artisans les plus réactifs dans un 'Top' hebdomadaire",
      ],
      priority: 2,
    });
  }

  return out;
}

function contentInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];
  const totalContent = s.totalPosts + s.totalListings + s.totalHelpRequests + s.totalOutings + s.totalEvents;

  if (totalContent === 0 && s.totalUsers > 2) {
    out.push({
      id: 'no_content',
      severity: 'critical',
      category: 'content',
      icon: '📭',
      title: 'Aucun contenu publié',
      metric: '0 publication',
      diagnosis: `${fmt(s.totalUsers)} membres inscrits mais zéro publication. La plateforme est vide — les visiteurs repartent aussitôt. Une plateforme vide ne crée aucune raison de revenir.`,
      actions: [
        "Créer les 3 premiers posts forum avec des questions ouvertes locales ('Qui connaît un bon plombier à Biguglia ?')",
        "Ajouter 2-3 annonces de démonstration pour montrer le format",
        "Inviter les artisans à créer leur présentation dans le forum",
      ],
      target: '10 contenus publiés dans les 2 premières semaines',
      priority: 10,
    });
    return out;
  }

  if (s.totalPosts > 0 && s.avgCommentsPerPost < 0.5 && s.totalPosts >= 3) {
    out.push({
      id: 'silent_forum',
      severity: 'danger',
      category: 'content',
      icon: '🦗',
      title: `Forum silencieux : ${s.avgCommentsPerPost} commentaire/post`,
      metric: `${fmt(s.totalComments)} cmts / ${fmt(s.totalPosts)} posts`,
      diagnosis: `${fmt(s.totalPosts)} posts créés, seulement ${fmt(s.totalComments)} commentaires au total. Les sujets lancés ne génèrent aucune discussion. Cause probable : sujets trop formels, trop généraux, ou aucune relance de l'admin.`,
      actions: [
        `Commenter soi-même les ${Math.min(3, s.totalPosts)} posts existants avec une question ouverte pour amorcer`,
        "Renommer les catégories forum en sujets ultra-locaux ('Artisans Biguglia', 'Entraide village', 'Bons plans')",
        "Envoyer une notification ciblée 'X personnes ont commenté ce post' pour créer de la curiosité",
        "Lancer un post hebdomadaire 'Question de la semaine' sur un sujet local concret",
      ],
      target: '≥ 2 commentaires par post (forum vivant)',
      priority: 7,
    });
  } else if (s.avgCommentsPerPost >= 3) {
    out.push({
      id: 'active_forum',
      severity: 'great',
      category: 'content',
      icon: '🔥',
      title: `Forum vivant : ${s.avgCommentsPerPost} commentaires/post`,
      metric: `${fmt(s.totalComments)} commentaires`,
      diagnosis: `${s.avgCommentsPerPost} commentaires par post — signe d'une communauté engagée. ${s.closedPosts} posts résolus (${s.forumResolutionRate}% de résolution).`,
      actions: [
        "Mettre en avant les posts les plus commentés sur la page d'accueil",
        "Créer un badge 'Animateur' pour les membres qui commentent le plus",
      ],
      priority: 2,
    });
  }

  if (s.totalListings > 3 && s.listingActiveRate < 40) {
    const inactiveListings = s.totalListings - s.activeListings;
    out.push({
      id: 'stale_listings',
      severity: 'warning',
      category: 'content',
      icon: '📦',
      title: `${inactiveListings} annonces expirées`,
      metric: `${s.listingActiveRate}% actives`,
      diagnosis: `${fmt(inactiveListings)} annonces sur ${fmt(s.totalListings)} sont inactives (${100 - s.listingActiveRate}%). Un catalogue obsolète donne une impression de plateforme abandonnée.`,
      actions: [
        `Notifier les ${fmt(inactiveListings)} auteurs : 'Votre annonce est expirée — republier en 1 clic ?'`,
        "Activer l'archivage automatique après 60j sans activité",
        "Afficher uniquement les annonces actives aux visiteurs non-membres",
      ],
      target: `≥ 70% actives (${Math.ceil(s.totalListings * 0.7)} sur ${s.totalListings})`,
      priority: 4,
    });
  }

  const activeTypes = [
    s.totalPosts > 0, s.totalListings > 0, s.totalHelpRequests > 0,
    s.totalOutings > 0, s.totalEvents > 0,
  ].filter(Boolean).length;

  if (activeTypes <= 1 && totalContent > 3) {
    out.push({
      id: 'low_content_diversity',
      severity: 'warning',
      category: 'content',
      icon: '🎭',
      title: `1 seul type de contenu exploité sur 5`,
      metric: `${activeTypes}/5 modules actifs`,
      diagnosis: `La plateforme n'utilise qu'un module sur 5 disponibles. Les membres ne découvrent pas les coups de main, sorties, événements, objets perdus — autant de raisons de revenir.`,
      actions: [
        "Créer un post 'Vous saviez qu'on peut organiser des sorties ensemble ?' avec tutoriel",
        "L'admin crée le premier 'Coup de main' pour montrer l'exemple",
        "Ajouter un onboarding visuel présentant les 5 modules à l'inscription",
      ],
      target: '≥ 3 types de contenus actifs',
      priority: 5,
    });
  }

  return out;
}

function artisanInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];

  if (s.artisansVerified === 0 && s.totalUsers > 2) {
    out.push({
      id: 'no_artisan',
      severity: 'critical',
      category: 'artisans',
      icon: '🔨',
      title: 'Aucun artisan vérifié — valeur principale inactive',
      metric: '0 artisan actif',
      diagnosis: `La mission principale de Biguglia Connect est inactive. ${s.artisansPending > 0 ? `${s.artisansPending} demande(s) en attente de votre validation.` : "Aucun artisan n'a encore candidaté."} Sans artisan, les habitants n'ont aucune raison de consulter la plateforme.`,
      actions: [
        s.artisansPending > 0
          ? `⚡ URGENT : Valider immédiatement les ${s.artisansPending} demande(s) artisan en attente (/admin/artisans)`
          : "Contacter directement 3-5 artisans locaux (plombier, électricien, maçon) et les inscrire",
        "Créer un flyer 'Artisan à Biguglia ? Inscrivez-vous gratuitement' à distribuer",
        "Offrir 3 mois de visibilité premium au premier artisan qui s'inscrit",
      ],
      target: '≥ 1 artisan vérifié pour débloquer la valeur principale',
      priority: 10,
    });
    return out;
  }

  if (s.artisansPending > 0) {
    const waitRatio = pct(s.artisansPending, s.artisansPending + s.artisansVerified);
    out.push({
      id: 'pending_artisans',
      severity: waitRatio > 50 ? 'danger' : 'warning',
      category: 'artisans',
      icon: '⏳',
      title: `${s.artisansPending} artisan(s) en attente de validation`,
      metric: `${s.artisansPending} en attente / ${s.artisansVerified} validés`,
      diagnosis: `Un artisan non validé dans les 48h a 3x plus de chances d'abandonner. ${waitRatio}% des demandes artisan sont encore en suspens.`,
      actions: [
        `Aller sur /admin/artisans et valider les ${s.artisansPending} demande(s) maintenant (< 5 min)`,
        "Mettre en place une alerte email admin pour chaque nouvelle demande",
        "Objectif interne : toute demande validée sous 24h",
      ],
      target: '0 demande en attente > 48h',
      priority: 8,
    });
  }

  if (s.totalRequests > 2 && s.artisanResponseRate < 30) {
    const unanswered = Math.round(s.totalRequests * (1 - s.artisanResponseRate / 100));
    out.push({
      id: 'low_artisan_response',
      severity: 'danger',
      category: 'artisans',
      icon: '🔕',
      title: `Artisans peu réactifs : ${s.artisanResponseRate}% de réponse`,
      metric: `${s.artisanResponseRate}% taux de réponse`,
      diagnosis: `Sur ${fmt(s.totalRequests)} demandes, ${unanswered} sont restées sans réponse. ${s.pendingRequests} attendent encore. Les habitants se découragent — une absence de réponse en 48h = client perdu.`,
      actions: [
        `Contacter personnellement les artisans inactifs — rappeler que ${s.pendingRequests} demandes les attendent`,
        "Activer les notifications push/email pour les artisans à chaque nouvelle demande",
        "Proposer des templates de réponse rapide ('Je suis disponible le...', 'Je rappelle sous 24h')",
        "Suspendre les artisans avec 0 réponse depuis 30+ jours pour ne pas bloquer les habitants",
      ],
      target: '≥ 60% de taux de réponse (standard marketplace)',
      priority: 9,
    });
  } else if (s.artisanResponseRate >= 60 && s.totalRequests > 2) {
    out.push({
      id: 'good_artisan_response',
      severity: 'great',
      category: 'artisans',
      icon: '⚡',
      title: `Artisans réactifs : ${s.artisanResponseRate}% de réponse`,
      metric: `${s.artisanResponseRate}% réponses`,
      diagnosis: `Excellent taux de réactivité. ${Math.round(s.totalRequests * s.requestCompletionRate / 100)} demandes menées à terme (${s.requestCompletionRate}% completion).`,
      actions: [
        "Mettre en avant les artisans les plus réactifs avec un badge 'Réactif'",
        `Encourager les ${Math.round(s.totalRequests * s.requestCompletionRate / 100)} clients satisfaits à laisser un avis`,
      ],
      priority: 2,
    });
  }

  return out;
}

function qualityInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];

  if (s.totalReviews === 0 && s.totalRequests > 2) {
    out.push({
      id: 'no_reviews',
      severity: 'warning',
      category: 'quality',
      icon: '⭐',
      title: `0 avis malgré ${fmt(s.totalRequests)} demandes`,
      metric: `0 avis / ${fmt(s.totalRequests)} demandes`,
      diagnosis: `Les avis sont la preuve sociale la plus puissante pour convaincre de nouveaux clients et artisans. Aucun avis laissé signifie que le parcours post-prestation est manquant.`,
      actions: [
        "Envoyer automatiquement 'Êtes-vous satisfait ?' 3 jours après une demande terminée",
        "Rendre le bouton 'Laisser un avis' plus visible dans l'interface",
        "Afficher le compteur d'avis de chaque artisan dans les résultats de recherche",
      ],
      target: '≥ 1 avis par demande terminée',
      priority: 6,
    });
  } else if (s.totalReviews > 0 && s.avgRating < 3) {
    const negPct = pct(s.negativeReviews, s.totalReviews);
    out.push({
      id: 'bad_rating',
      severity: 'critical',
      category: 'quality',
      icon: '🚨',
      title: `Note critique : ${s.avgRating}/5 (${negPct}% négatifs)`,
      metric: `${s.avgRating}/5 — ${s.negativeReviews} avis ≤2★`,
      diagnosis: `${s.negativeReviews} avis négatifs sur ${s.totalReviews}. Une note < 3/5 dissuade activement les nouveaux clients — effet boule de neige négatif.`,
      actions: [
        "Identifier les artisans avec ≥2 avis négatifs et les contacter individuellement",
        "Proposer une mise en conformité ou une formation sous peine de suspension",
        "Afficher une réponse officielle aux avis négatifs pour rassurer la communauté",
      ],
      target: '≥ 4/5 de note moyenne',
      priority: 10,
    });
  } else if (s.avgRating >= 4.5 && s.totalReviews >= 3) {
    out.push({
      id: 'excellent_rating',
      severity: 'great',
      category: 'quality',
      icon: '🌟',
      title: `Réputation excellente : ${s.avgRating}/5`,
      metric: `${s.avgRating}/5 · ${s.positiveReviews} avis positifs`,
      diagnosis: `${s.positiveReviews} avis positifs (${pct(s.positiveReviews, s.totalReviews)}%) sur ${s.totalReviews} total — au-dessus des standards marketplace (4.2/5 en moy).`,
      actions: [
        "Utiliser ces avis comme preuve sociale dans la communication externe (flyers, réseaux)",
        "Créer un widget 'Artisans les mieux notés' sur la page d'accueil publique",
      ],
      priority: 1,
    });
  }

  return out;
}

function moderationInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];

  if (s.pendingReports > 3) {
    out.push({
      id: 'reports_backlog',
      severity: 'critical',
      category: 'moderation',
      icon: '🚨',
      title: `${s.pendingReports} signalements en souffrance`,
      metric: `${s.pendingReports} non traités`,
      diagnosis: `${s.pendingReports} signalements en attente sur ${s.totalReports} total. Résolution actuelle : ${s.reportResolutionRate}%. Un backlog > 3 nuit à la confiance et peut dissuader les membres de signaler.`,
      actions: [
        `Traiter les ${s.pendingReports} signalements maintenant : /admin/signalements`,
        "Établir une routine de modération : 15 min/jour à heure fixe",
        "Activer les alertes email pour tout nouveau signalement",
      ],
      target: '0 signalement > 24h sans réponse',
      priority: 10,
    });
  } else if (s.pendingReports > 0) {
    out.push({
      id: 'few_reports',
      severity: 'warning',
      category: 'moderation',
      icon: '🛡️',
      title: `${s.pendingReports} signalement(s) à traiter`,
      metric: `${s.pendingReports} en attente`,
      diagnosis: `${s.pendingReports} signalement(s) en attente. Communauté globalement saine (${s.reportResolutionRate}% de résolution historique).`,
      actions: [`Traiter les ${s.pendingReports} signalement(s) : /admin/signalements`],
      target: 'Traitement sous 24h',
      priority: 7,
    });
  }

  if (s.unreadNotifications > 50 && s.notifReadRate < 30) {
    out.push({
      id: 'notif_flood',
      severity: 'warning',
      category: 'moderation',
      icon: '🔔',
      title: `${fmt(s.unreadNotifications)} notifications ignorées (${100 - s.notifReadRate}%)`,
      metric: `${s.notifReadRate}% taux de lecture`,
      diagnosis: `${fmt(s.unreadNotifications)} non lues sur ${fmt(s.totalNotifications)}. Un taux de ${s.notifReadRate}% signifie que la plupart des notifications sont du bruit — les utilisateurs les désactivent.`,
      actions: [
        "Auditer les types de notifs : garder uniquement réponse artisan et nouveau message",
        "Permettre aux utilisateurs de choisir leurs préférences de notification",
        "Tester un format digest hebdomadaire plutôt que des notifs en temps réel",
      ],
      target: '≥ 60% de taux de lecture',
      priority: 4,
    });
  }

  return out;
}

function retentionInsights(s: AllStats): Insight[] {
  const out: Insight[] = [];

  if (s.totalEquipment > 3 && s.equipmentUsageRate < 20) {
    out.push({
      id: 'underused_equipment',
      severity: 'warning',
      category: 'retention',
      icon: '🛠️',
      title: `Matériel sous-utilisé : ${s.equipmentUsageRate}% d'utilisation`,
      metric: `${s.totalBorrows} prêts / ${s.totalEquipment} équipements`,
      diagnosis: `${s.totalEquipment} équipements disponibles (${s.availableEquipment} libres) pour seulement ${s.totalBorrows} prêts réalisés. Le module est probablement inconnu des membres.`,
      actions: [
        "Envoyer une notification 'Saviez-vous qu'on peut emprunter du matériel ?' avec lien direct",
        "Créer un post forum présentant les 3 équipements les plus utiles",
        "Afficher les équipements disponibles en section 'Disponible maintenant' sur la home",
      ],
      target: '≥ 50% de taux d\'utilisation des équipements',
      priority: 3,
    });
  }

  if (s.totalHelpRequests === 0 && s.totalUsers > 5) {
    out.push({
      id: 'no_mutual_aid',
      severity: 'warning',
      category: 'retention',
      icon: '🤝',
      title: "Module 'Coups de main' inexploité",
      metric: '0 coup de main',
      diagnosis: "Aucune demande d'entraide publiée. Ce module crée un lien fort entre voisins et améliore la rétention — les utilisateurs qui aident reviennent 4x plus souvent.",
      actions: [
        "L'admin crée le premier 'Coup de main' avec un exemple concret local",
        "Ajouter un call-to-action 'Aidez votre voisin' sur la page d'accueil",
        "Envoyer un email hebdomadaire 'Demandes d'aide près de chez vous'",
      ],
      target: '≥ 1 coup de main par semaine',
      priority: 3,
    });
  }

  return out;
}

// ─── Assembleur ───────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0, danger: 1, warning: 2, ok: 3, great: 4,
};

export function analyzeStats(s: AllStats): AnalysisResult {
  const theme = getPlatformTheme(s.healthLevel, s.healthScore);

  const raw: Insight[] = [
    ...growthInsights(s),
    ...engagementInsights(s),
    ...contentInsights(s),
    ...artisanInsights(s),
    ...qualityInsights(s),
    ...moderationInsights(s),
    ...retentionInsights(s),
  ];

  const seen = new Set<string>();
  const insights = raw
    .filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; })
    .sort((a, b) =>
      b.priority - a.priority ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

  const topActions = insights
    .filter(i => ['critical', 'danger'].includes(i.severity))
    .slice(0, 3)
    .map(i => ({ action: i.actions[0], from: i.title }));

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const dangerCount   = insights.filter(i => i.severity === 'danger').length;
  const greatCount    = insights.filter(i => i.severity === 'great').length;

  let executiveSummary = '';
  if (criticalCount > 0) {
    executiveSummary = `${criticalCount} point${criticalCount > 1 ? 's' : ''} critique${criticalCount > 1 ? 's' : ''} — chaque heure perdue réduit les chances d'activation de la communauté.`;
  } else if (dangerCount > 0) {
    executiveSummary = `Plateforme fonctionnelle mais ${dangerCount} signal${dangerCount > 1 ? 'aux' : ''} d'alarme à traiter cette semaine.`;
  } else if (greatCount >= 2) {
    executiveSummary = `La plateforme performe bien sur ${greatCount} axes. Focus sur la montée en puissance et la diversification.`;
  } else {
    executiveSummary = `Dynamique stable. Priorité : régularité du contenu et activation des membres silencieux.`;
  }

  return { theme, insights, topActions, executiveSummary };
}

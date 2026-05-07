

import {
  Users, Wrench, MessageSquare, Package,
  FileText, Activity, Star, ShoppingBag,
  Flag, Bell, HardHat, Users2, Heart, MapPin, Search, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { KpiCard } from './KpiCard';
import { SectionTitle } from './SectionTitle';
import { fmt } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionOverview({ stats }: { stats: AllStats }) {
  // Score quick‑look
  const healthColor =
    stats.healthLevel === 'excellent' ? 'bg-emerald-500' :
    stats.healthLevel === 'good'      ? 'bg-blue-500' :
    stats.healthLevel === 'fair'      ? 'bg-amber-500' : 'bg-red-500';
  const healthLabel =
    stats.healthLevel === 'excellent' ? '🟢 Excellent' :
    stats.healthLevel === 'good'      ? '🔵 Bon' :
    stats.healthLevel === 'fair'      ? '🟡 Moyen' : '🔴 Critique';

  return (
    <section>
      <SectionTitle icon={Activity} title="Vue d'ensemble" color="text-gray-900" />

      {/* Bannière santé + score */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Score de santé global</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-white">{stats.healthScore}</span>
            <span className="text-white/40 text-xl">/100</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-full text-white ${healthColor}`}>
              {healthLabel}
            </span>
          </div>
          <div className="mt-2 w-48 bg-white/20 rounded-full h-2">
            <div
              className={`h-full rounded-full ${healthColor}`}
              style={{ width: `${stats.healthScore}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{stats.activeUsersLast30}</p>
            <p className="text-white/60 text-xs">Actifs / 30j</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.activationRate}%</p>
            <p className="text-white/60 text-xs">Taux activation</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {stats.userGrowthRate > 0 ? '+' : ''}{stats.userGrowthRate}%
            </p>
            <p className="text-white/60 text-xs">Croissance 30j</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.alerts.length}</p>
            <p className="text-white/60 text-xs">Alertes actives</p>
          </div>
        </div>
      </div>

      {/* KPI cards — membres & artisans */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">👥 Membres & Artisans</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Users} label="Membres inscrits" value={fmt.format(stats.totalUsers)}
          sub={`+${stats.newUsersLast7} cette semaine · +${stats.newUsersLast30} ce mois`}
          color="text-blue-600" bg="bg-blue-50" />
        <KpiCard icon={Wrench} label="Artisans vérifiés" value={fmt.format(stats.artisansVerified)}
          sub={`${stats.artisansPending} en attente · ${stats.artisansPro} pros`}
          color="text-green-600" bg="bg-green-50" />
        <KpiCard icon={HardHat} label="Artisans Pro" value={fmt.format(stats.artisansPro)}
          sub="Professionnels déclarés" color="text-blue-700" bg="bg-blue-100" />
        <KpiCard icon={Users2} label="Particuliers/Bénévoles" value={fmt.format(stats.artisansParticulier)}
          sub="Savoir-faire & entraide" color="text-green-700" bg="bg-green-100" />
      </div>

      {/* KPI cards — activité */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💬 Activité & Contenu</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={MessageSquare} label="Messages envoyés" value={fmt.format(stats.totalMessages)}
          sub={`${stats.totalConversations} convos · ${stats.activeConversations} actives (7j)`}
          color="text-brand-600" bg="bg-orange-50" />
        <KpiCard icon={Package} label="Annonces publiées" value={fmt.format(stats.totalListings)}
          sub={`${stats.activeListings} actives (${stats.listingActiveRate}%) · +${stats.listingsLast7} cette sem.`}
          color="text-purple-600" bg="bg-purple-50" />
        <KpiCard icon={FileText} label="Posts forum" value={fmt.format(stats.totalPosts)}
          sub={`${stats.totalComments} commentaires · ${stats.closedPosts} résolus`}
          color="text-teal-600" bg="bg-teal-50" />
        <KpiCard icon={Activity} label="Demandes artisans" value={fmt.format(stats.totalRequests)}
          sub={`${stats.pendingRequests} en attente · ${stats.requestCompletionRate}% complétés`}
          color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      {/* KPI cards — qualité & autres contenus */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">⭐ Qualité & Autres Contenus</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Star} label="Avis clients" value={fmt.format(stats.totalReviews)}
          sub={`Note moy. ${stats.avgRating}/5 ⭐ · ${stats.positiveReviews} positifs`}
          color="text-amber-600" bg="bg-amber-50" />
        <KpiCard icon={ShoppingBag} label="Matériel" value={fmt.format(stats.totalEquipment)}
          sub={`${stats.availableEquipment} dispo · ${stats.totalBorrows} prêts (${stats.equipmentUsageRate}% util.)`}
          color="text-pink-600" bg="bg-pink-50" />
        <KpiCard icon={Heart} label="Coups de main" value={fmt.format(stats.totalHelpRequests)}
          sub="Demandes entraide voisinage" color="text-rose-600" bg="bg-rose-50" />
        <KpiCard icon={MapPin} label="Sorties groupées" value={fmt.format(stats.totalOutings)}
          sub="Promenades & activités" color="text-cyan-600" bg="bg-cyan-50" />
        <KpiCard icon={Search} label="Objets perdus" value={fmt.format(stats.totalLostFound)}
          sub="Annonces perdu/trouvé" color="text-violet-600" bg="bg-violet-50" />
        <KpiCard icon={Calendar} label="Événements" value={fmt.format(stats.totalEvents)}
          sub="Événements locaux" color="text-fuchsia-600" bg="bg-fuchsia-50" />
        <KpiCard icon={Flag} label="Signalements" value={fmt.format(stats.totalReports)}
          sub={`${stats.pendingReports} en attente · ${stats.reportResolutionRate}% résolus`}
          color="text-red-600" bg="bg-red-50" />
        <KpiCard icon={Bell} label="Notifications" value={fmt.format(stats.totalNotifications)}
          sub={`${stats.unreadNotifications} non lues · ${stats.notifReadRate}% lues`}
          color="text-sky-600" bg="bg-sky-50" />
      </div>

      {/* Alertes critiques inline si nécessaire */}
      {stats.alerts.filter(a => a.level === 'critical').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-sm font-bold text-red-700">
                {stats.alerts.filter(a => a.level === 'critical').length} alerte{stats.alerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''} critique{stats.alerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600">
                {stats.alerts.filter(a => a.level === 'critical').map(a => a.title).join(' · ')}
              </p>
            </div>
          </div>
          <Link
            href="#sante"
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Voir les alertes →
          </Link>
        </div>
      )}
    </section>
  );
}

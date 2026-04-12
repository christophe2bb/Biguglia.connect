'use client';

import {
  Users, Wrench, MessageSquare, Package,
  FileText, Activity, Star, ShoppingBag,
  Flag, Bell, HardHat, Users2,
} from 'lucide-react';
import { KpiCard } from './KpiCard';
import { SectionTitle } from './SectionTitle';
import { fmt } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionOverview({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={Activity} title="Vue d'ensemble" color="text-gray-900" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Membres inscrits" value={fmt.format(stats.totalUsers)}
          sub={`+${stats.newUsersLast7} cette semaine`} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard icon={Wrench} label="Artisans vérifiés" value={fmt.format(stats.artisansVerified)}
          sub={`${stats.artisansPending} en attente`} color="text-green-600" bg="bg-green-50" />
        <KpiCard icon={MessageSquare} label="Messages envoyés" value={fmt.format(stats.totalMessages)}
          sub={`${stats.totalConversations} conversations`} color="text-brand-600" bg="bg-orange-50" />
        <KpiCard icon={Package} label="Annonces publiées" value={fmt.format(stats.totalListings)}
          sub={`${stats.activeListings} actives · ${fmt.format(stats.listingViews)} vues`} color="text-purple-600" bg="bg-purple-50" />
        <KpiCard icon={FileText} label="Posts forum" value={fmt.format(stats.totalPosts)}
          sub={`${stats.totalComments} commentaires`} color="text-teal-600" bg="bg-teal-50" />
        <KpiCard icon={Activity} label="Demandes artisans" value={fmt.format(stats.totalRequests)}
          sub="Toutes demandes" color="text-indigo-600" bg="bg-indigo-50" />
        <KpiCard icon={Star} label="Avis clients" value={fmt.format(stats.totalReviews)}
          sub={`Note moy. ${stats.avgRating}/5 ⭐`} color="text-amber-600" bg="bg-amber-50" />
        <KpiCard icon={ShoppingBag} label="Matériel" value={fmt.format(stats.totalEquipment)}
          sub={`${stats.availableEquipment} dispo · ${stats.totalBorrows} prêts`} color="text-pink-600" bg="bg-pink-50" />
        <KpiCard icon={Flag} label="Signalements" value={fmt.format(stats.totalReports)}
          sub={`${stats.pendingReports} en attente`} color="text-red-600" bg="bg-red-50" />
        <KpiCard icon={Bell} label="Notifications" value={fmt.format(stats.totalNotifications)}
          sub={`${stats.unreadNotifications} non lues`} color="text-sky-600" bg="bg-sky-50" />
        <KpiCard icon={HardHat} label="Artisans Pro" value={fmt.format(stats.artisansPro)}
          sub="Professionnels déclarés" color="text-blue-700" bg="bg-blue-100" />
        <KpiCard icon={Users2} label="Particuliers/Bénévoles" value={fmt.format(stats.artisansParticulier)}
          sub="Savoir-faire & entraide" color="text-green-700" bg="bg-green-100" />
      </div>
    </section>
  );
}

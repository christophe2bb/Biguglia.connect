'use client';

import { Package, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Tag, Eye } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmt, fmtTooltip } from '../_helpers';
import type { AllStats } from '../_types';

function InsightCard({
  text, severity, actions,
}: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }) {
  const styles = {
    ok:     'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn:   'bg-amber-50   border-amber-200   text-amber-800',
    danger: 'bg-red-50     border-red-200     text-red-800',
    info:   'bg-blue-50    border-blue-200    text-blue-800',
  };
  const icons = {
    ok:     <CheckCircle   className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
    warn:   <AlertTriangle className="w-4 h-4 text-amber-500   flex-shrink-0 mt-0.5" />,
    danger: <AlertTriangle className="w-4 h-4 text-red-500     flex-shrink-0 mt-0.5" />,
    info:   <TrendingUp    className="w-4 h-4 text-blue-500    flex-shrink-0 mt-0.5" />,
  };
  return (
    <div className={`border rounded-xl p-4 ${styles[severity]}`}>
      <div className="flex items-start gap-2 text-sm font-medium">
        {icons[severity]}
        <span>{text}</span>
      </div>
      {actions && actions.length > 0 && (
        <ol className="mt-2 ml-6 space-y-1 text-xs opacity-90 list-decimal">
          {actions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      )}
    </div>
  );
}

function KpiTile({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export function SectionListings({ stats }: { stats: AllStats }) {

  // Métriques dérivées
  const listingTrend: 'up' | 'down' | 'flat' =
    stats.listingsPrev7 === 0 ? (stats.listingsLast7 > 0 ? 'up' : 'flat')
    : stats.listingsLast7 > stats.listingsPrev7 ? 'up'
    : stats.listingsLast7 < stats.listingsPrev7 ? 'down' : 'flat';

  const listingDelta = stats.listingsPrev7 > 0
    ? Math.round(((stats.listingsLast7 - stats.listingsPrev7) / stats.listingsPrev7) * 100)
    : 0;

  const viewsPerListing = stats.activeListings > 0
    ? Math.round(stats.listingViews / stats.activeListings)
    : 0;

  const activeRatePct = stats.listingActiveRate;

  // Insights contextuels
  const insights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  if (stats.totalListings === 0) {
    insights.push({
      text: 'Aucune annonce publiée — module non adopté',
      severity: 'danger',
      actions: [
        'Créer 2-3 annonces tests pour montrer les possibilités',
        'Envoyer un guide "comment publier une annonce" par email',
        'Ajouter un CTA prominent sur la page d\'accueil',
        'Proposer des catégories populaires en avant-première',
      ],
    });
  } else {
    if (activeRatePct >= 70) {
      insights.push({ text: `${activeRatePct}% d'annonces actives — excellent taux de fraîcheur`, severity: 'ok' });
    } else if (activeRatePct >= 40) {
      insights.push({
        text: `${activeRatePct}% d'annonces actives — ${stats.totalListings - stats.activeListings} expirées à archiver`,
        severity: 'warn',
        actions: [
          'Envoyer un rappel aux auteurs des annonces expirées',
          'Implémenter un archivage automatique après 30j d\'inactivité',
          'Proposer une option "prolonger mon annonce" en 1 clic',
        ],
      });
    } else if (stats.totalListings > 0) {
      insights.push({
        text: `Seulement ${activeRatePct}% d'annonces actives — catalogue majoritairement obsolète`,
        severity: 'danger',
        actions: [
          'Lancer une campagne de réactivation des annonceurs',
          'Archiver automatiquement les annonces > 60j',
          'Notifier les membres : "Mettez à jour votre annonce pour rester visible"',
        ],
      });
    }

    if (stats.listingCategories.length === 1) {
      insights.push({
        text: `Annonces concentrées dans une seule catégorie — diversifier`,
        severity: 'warn',
        actions: [
          'Promouvoir les catégories peu utilisées dans la newsletter',
          'Suggérer des catégories lors de la création d\'annonce',
          'Créer des annonces exemples dans les catégories vides',
        ],
      });
    } else if (stats.listingCategories.length >= 3) {
      insights.push({ text: `${stats.listingCategories.length} catégories actives — bonne diversité du catalogue`, severity: 'ok' });
    }

    if (viewsPerListing >= 10) {
      insights.push({ text: `${viewsPerListing} vues/annonce — forte visibilité du catalogue`, severity: 'ok' });
    } else if (stats.listingViews > 0 && viewsPerListing < 3) {
      insights.push({
        text: `Seulement ${viewsPerListing} vues/annonce — catalogue peu consulté`,
        severity: 'warn',
        actions: [
          'Partager les nouvelles annonces dans le fil d\'actualité',
          'Envoyer une digest email hebdomadaire des nouvelles annonces',
          'Intégrer les annonces récentes sur la page d\'accueil',
        ],
      });
    }

    if (listingTrend === 'down' && Math.abs(listingDelta) > 30) {
      insights.push({
        text: `${listingDelta}% d'annonces cette semaine vs la précédente`,
        severity: 'warn',
        actions: [
          'Notifier les membres de la semaine de publier une annonce',
          'Mettre en avant les avantages de publier (visibilité quartier)',
        ],
      });
    } else if (listingTrend === 'up' && listingDelta > 20) {
      insights.push({ text: `+${listingDelta}% d'annonces cette semaine — belle dynamique !`, severity: 'ok' });
    }
  }

  // Barre de progression taux actif
  const activeBarColor = activeRatePct >= 70 ? 'bg-emerald-500' : activeRatePct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <section>
      <SectionTitle icon={Package} title="Annonces & Matériel" color="text-purple-700" />

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="Annonces totales"
          value={stats.totalListings}
          sub={`${stats.activeListings} actives`}
          color="text-purple-600"
        />
        <KpiTile
          label="Taux actif"
          value={`${activeRatePct}%`}
          sub="benchmark ≥ 70%"
          color={activeRatePct >= 70 ? 'text-emerald-600' : activeRatePct >= 40 ? 'text-amber-600' : 'text-red-600'}
        />
        <KpiTile
          label="Vues totales"
          value={fmt.format(stats.listingViews)}
          sub={viewsPerListing > 0 ? `${viewsPerListing} vues/annonce` : undefined}
          color="text-blue-600"
        />
        <KpiTile
          label="Cette semaine"
          value={stats.listingsLast7}
          sub={listingDelta !== 0 ? `${listingDelta > 0 ? '+' : ''}${listingDelta}% vs S-1` : 'stable'}
          color={listingTrend === 'up' ? 'text-emerald-600' : listingTrend === 'down' ? 'text-red-600' : 'text-gray-600'}
        />
      </div>

      {/* ── Barre de taux actif ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4 text-purple-500" />
            Taux d'annonces actives
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            {listingTrend === 'up'
              ? <TrendingUp className="w-4 h-4 text-emerald-500" />
              : listingTrend === 'down'
              ? <TrendingDown className="w-4 h-4 text-red-500" />
              : null}
            <span className={activeRatePct >= 70 ? 'text-emerald-600 font-semibold' : activeRatePct >= 40 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
              {activeRatePct}%
            </span>
            <span className="text-gray-400 text-xs">/ cible 70%</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${activeBarColor}`}
            style={{ width: `${Math.min(100, activeRatePct)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{stats.activeListings} annonces actives</span>
          <span>{stats.totalListings - stats.activeListings} expirées / archivées</span>
        </div>
      </div>

      {/* ── Insights ────────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {insights.map((ins, i) => (
            <InsightCard key={i} text={ins.text} severity={ins.severity} actions={ins.actions} />
          ))}
        </div>
      )}

      {/* ── Graphiques ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Annonces par catégorie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Annonces par catégorie</h3>
          {stats.listingCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={stats.listingCategories} cx="50%" cy="50%" outerRadius={85}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }: PieLabelRenderProps) =>
                    (((percent as number) ?? 0) > 0.05)
                      ? `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                      : ''
                  }
                >
                  {stats.listingCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={fmtTooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-10">Aucune annonce</p>}
        </div>

        {/* Nouvelles annonces 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Nouvelles annonces — 30 jours</h3>
            {stats.listingViews > 0 && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Eye className="w-3.5 h-3.5" />
                {fmt.format(stats.listingViews)} vues
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={stats.dailyListings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Bar dataKey="value" fill={COLORS.purple} radius={[4, 4, 0, 0]} name="Annonces" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Matériel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Matériel communautaire</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Objets enregistrés',   value: stats.totalEquipment,   color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Disponibles',           value: stats.availableEquipment, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Prêts effectués',       value: stats.totalBorrows,     color: 'text-blue-600',   bg: 'bg-blue-50' },
              {
                label: 'Taux utilisation',
                value: `${stats.equipmentUsageRate}%`,
                color: stats.equipmentUsageRate >= 50 ? 'text-emerald-600' : stats.equipmentUsageRate >= 20 ? 'text-amber-600' : 'text-red-600',
                bg: stats.equipmentUsageRate >= 50 ? 'bg-emerald-50' : stats.equipmentUsageRate >= 20 ? 'bg-amber-50' : 'bg-red-50',
              },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-gray-600 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          {stats.totalEquipment === 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-center text-sm text-gray-500">
              Aucun matériel enregistré — inviter les membres à partager leurs équipements
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

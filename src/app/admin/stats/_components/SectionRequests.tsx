'use client';

import { Star, Flag, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, MessageSquare, Award, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import Link from 'next/link';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmt } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Composants utilitaires ───────────────────────────────────────────────────

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

// ─── Jauge circulaire ─────────────────────────────────────────────────────────

function CircleGauge({
  label, value, max = 100, color, unit = '%', benchmark,
}: {
  label: string; value: number; max?: number; color: string; unit?: string; benchmark?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const aboveBench = benchmark !== undefined ? value >= benchmark : null;
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3.5" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3.5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-gray-900 leading-none">{value}{unit}</span>
        </div>
      </div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      {benchmark !== undefined && (
        <div className={`text-xs mt-0.5 font-medium ${aboveBench ? 'text-emerald-600' : 'text-amber-600'}`}>
          {aboveBench ? '✓' : '↑'} cible {benchmark}{unit}
        </div>
      )}
    </div>
  );
}

// ─── Distribution par étoile ──────────────────────────────────────────────────

function RatingBars({ stats }: { stats: AllStats }) {
  const maxCount = Math.max(...[5, 4, 3, 2, 1].map(s =>
    stats.ratingDistribution.find(r => r.name === `${s} ⭐`)?.value ?? 0
  ), 1);

  // Insights avis
  const reviewInsights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  if (stats.totalReviews === 0) {
    reviewInsights.push({
      text: 'Aucun avis client — réputation invisible pour les nouveaux membres',
      severity: 'danger',
      actions: [
        'Envoyer un rappel automatique 48h après une demande complétée',
        'Simplifier le formulaire d\'avis : 1 étoile + commentaire optionnel',
        'Afficher un compteur "X membres ont déjà laissé un avis" pour le FOMO',
        'Proposer un badge "Client vérifié" à ceux qui laissent des avis',
      ],
    });
  } else {
    if (stats.avgRating >= 4.5) {
      reviewInsights.push({ text: `Note moyenne ${stats.avgRating}/5 — excellente réputation`, severity: 'ok' });
    } else if (stats.avgRating >= 4.0) {
      reviewInsights.push({
        text: `Note moyenne ${stats.avgRating}/5 — bonne satisfaction, viser 4.5+`,
        severity: 'info',
        actions: ['Identifier les demandes sans avis et relancer les clients', 'Encourager les retours positifs avec un message de remerciement'],
      });
    } else if (stats.avgRating >= 3.0) {
      reviewInsights.push({
        text: `Note ${stats.avgRating}/5 — satisfaction mitigée, action requise`,
        severity: 'warn',
        actions: [
          'Contacter les artisans ayant des avis < 3★ pour comprendre les problèmes',
          'Mettre en place un suivi qualité après chaque mission',
          'Proposer une médiation pour les avis négatifs récents',
        ],
      });
    } else {
      reviewInsights.push({
        text: `Note critique ${stats.avgRating}/5 — satisfaction très faible`,
        severity: 'danger',
        actions: [
          'Audit immédiat de toutes les demandes avec avis ≤ 2★',
          'Suspendre temporairement les artisans avec plusieurs avis négatifs',
          'Contacter chaque client insatisfait personnellement',
        ],
      });
    }

    if (stats.negativeReviews > 0 && stats.totalReviews > 0) {
      const negPct = Math.round((stats.negativeReviews / stats.totalReviews) * 100);
      if (negPct >= 20) {
        reviewInsights.push({
          text: `${negPct}% d'avis négatifs (≤2★) — taux préoccupant`,
          severity: 'warn',
          actions: ['Analyser les causes communes des avis négatifs', 'Former les artisans sur la communication client'],
        });
      }
    }

    if (stats.positiveReviews > 0) {
      const posPct = Math.round((stats.positiveReviews / stats.totalReviews) * 100);
      if (posPct >= 80) {
        reviewInsights.push({ text: `${posPct}% d'avis positifs — base de confiance solide pour recruter de nouveaux artisans`, severity: 'ok' });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Avis clients — {fmt.format(stats.totalReviews)} avis
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl font-black text-amber-500">{stats.avgRating > 0 ? stats.avgRating : '-'}</span>
          <div>
            <div className="flex gap-0.5 text-amber-400 text-lg">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={s <= Math.round(stats.avgRating) ? 'opacity-100' : 'opacity-20'}>★</span>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {stats.totalReviews > 0 ? `sur 5 · ${fmt.format(stats.totalReviews)} avis` : 'Aucun avis encore'}
            </p>
          </div>
          {stats.totalReviews > 0 && (
            <div className="ml-auto text-right">
              <div className="text-xs text-emerald-600 font-semibold">{stats.positiveReviews} positifs</div>
              <div className="text-xs text-red-500">{stats.negativeReviews} négatifs</div>
            </div>
          )}
        </div>

        {stats.totalReviews > 0 ? (
          <div className="space-y-2 mb-4">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.ratingDistribution.find(r => r.name === `${star} ⭐`)?.value ?? 0;
              const barW  = Math.round((count / maxCount) * 100);
              const barColor = star >= 4 ? 'bg-emerald-400' : star === 3 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-6">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barW}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun avis pour le moment</p>
          </div>
        )}

        {stats.totalReviews > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-emerald-700">{stats.positiveReviews}</p>
              <p className="text-xs text-emerald-600">Positifs (≥4★)</p>
              {stats.totalReviews > 0 && (
                <p className="text-xs text-emerald-400">{Math.round((stats.positiveReviews / stats.totalReviews) * 100)}%</p>
              )}
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-600">{stats.negativeReviews}</p>
              <p className="text-xs text-red-500">Négatifs (≤2★)</p>
              {stats.totalReviews > 0 && (
                <p className="text-xs text-red-300">{Math.round((stats.negativeReviews / stats.totalReviews) * 100)}%</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insights avis */}
      {reviewInsights.map((ins, i) => (
        <InsightCard key={i} text={ins.text} severity={ins.severity} actions={ins.actions} />
      ))}
    </div>
  );
}

// ─── Panel demandes artisans enrichi ──────────────────────────────────────────

function RequestsPanel({ stats }: { stats: AllStats }) {

  const completionOk  = stats.requestCompletionRate >= 50;
  const responseOk    = stats.artisanResponseRate >= 60;
  const responseBench = 65;

  const reqInsights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  if (stats.totalRequests === 0) {
    reqInsights.push({
      text: 'Aucune demande artisan — fonctionnalité non utilisée',
      severity: 'danger',
      actions: [
        'Mettre en avant le bouton "Demander un devis" sur la page artisans',
        'Envoyer un email avec 3 exemples de demandes populaires',
        'Créer une FAQ "Comment fonctionne une demande artisan ?"',
        'Proposer une liste de demandes fréquentes en 1 clic (pré-remplies)',
      ],
    });
  } else {
    if (!responseOk) {
      reqInsights.push({
        text: `Taux de réponse artisans ${stats.artisanResponseRate}% — sous le benchmark (${responseBench}%)`,
        severity: stats.artisanResponseRate < 30 ? 'danger' : 'warn',
        actions: [
          'Envoyer des rappels automatiques aux artisans non-répondants après 24h',
          'Afficher un badge "Réactif" sur les profils avec > 80% de réponse',
          'Pénaliser les artisans avec < 30% de réponse (déclassement du profil)',
          'Notifier l\'admin pour intervention directe si pas de réponse après 48h',
        ],
      });
    } else {
      reqInsights.push({ text: `Taux de réponse ${stats.artisanResponseRate}% — au-dessus du benchmark (${responseBench}%)`, severity: 'ok' });
    }

    if (stats.requestCompletionRate >= 70) {
      reqInsights.push({ text: `${stats.requestCompletionRate}% de demandes complétées — excellent suivi`, severity: 'ok' });
    } else if (stats.requestCompletionRate >= 40) {
      reqInsights.push({
        text: `${stats.requestCompletionRate}% de complétion — améliorer le suivi post-réponse`,
        severity: 'info',
        actions: ['Envoyer un rappel "Marquez la demande comme terminée" après 7j', 'Demander un avis automatiquement après marquage comme terminé'],
      });
    } else if (stats.totalRequests > 0) {
      reqInsights.push({
        text: `Seulement ${stats.requestCompletionRate}% de complétion — beaucoup de demandes abandonnées`,
        severity: 'warn',
        actions: [
          'Analyser les raisons d\'abandon (prix trop élevé ? artisan non disponible ?)',
          'Proposer un suivi de mission intégré à la plateforme',
          'Mettre en place une relance automatique après 14j sans activité',
        ],
      });
    }

    if (stats.pendingRequests > 3) {
      reqInsights.push({
        text: `${stats.pendingRequests} demandes en attente depuis > 48h — clients frustrés`,
        severity: 'warn',
        actions: [
          'Notifier manuellement les artisans concernés',
          'Proposer d\'autres artisans disponibles si non-réponse après 24h',
        ],
      });
    }

    if (stats.requestCancellationRate >= 20) {
      reqInsights.push({
        text: `${stats.requestCancellationRate}% de demandes annulées — taux élevé d'abandon`,
        severity: 'warn',
        actions: [
          'Analyser à quelle étape les demandes sont annulées',
          'Simplifier le processus de devis et de confirmation',
          'Contacter les clients ayant annulé pour comprendre les raisons',
        ],
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">
          Demandes artisans — {fmt.format(stats.totalRequests)} total
        </h3>

        {/* Jauges circulaires */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <CircleGauge
            label="Taux réponse"
            value={stats.artisanResponseRate}
            color={responseOk ? COLORS.green : stats.artisanResponseRate >= 30 ? COLORS.amber : COLORS.red}
            benchmark={responseBench}
          />
          <CircleGauge
            label="Complétion"
            value={stats.requestCompletionRate}
            color={completionOk ? COLORS.green : COLORS.amber}
            benchmark={50}
          />
          <CircleGauge
            label="Annulation"
            value={stats.requestCancellationRate}
            color={stats.requestCancellationRate < 10 ? COLORS.green : stats.requestCancellationRate < 25 ? COLORS.amber : COLORS.red}
            benchmark={10}
          />
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${
                stats.pendingRequests === 0 ? 'bg-emerald-50' :
                stats.pendingRequests <= 3  ? 'bg-amber-50' : 'bg-red-50'
              }`}>
                <Clock className={`w-5 h-5 mb-0.5 ${
                  stats.pendingRequests === 0 ? 'text-emerald-500' :
                  stats.pendingRequests <= 3  ? 'text-amber-500' : 'text-red-500'
                }`} />
                <span className={`text-lg font-black ${
                  stats.pendingRequests === 0 ? 'text-emerald-700' :
                  stats.pendingRequests <= 3  ? 'text-amber-700' : 'text-red-700'
                }`}>{stats.pendingRequests}</span>
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-700">En attente</div>
            <div className={`text-xs mt-0.5 ${stats.pendingRequests === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.pendingRequests === 0 ? '✓ Aucune' : 'cible 0'}
            </div>
          </div>
        </div>

        {/* Statuts bar chart */}
        {stats.requestsByStatus.length > 0 ? (
          <>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Répartition par statut</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.requestsByStatus} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="value" fill={COLORS.indigo} radius={[0, 6, 6, 0]} name="Demandes" />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Aucune demande enregistrée</p>
        )}
      </div>

      {/* Insights demandes */}
      {reqInsights.map((ins, i) => (
        <InsightCard key={i} text={ins.text} severity={ins.severity} actions={ins.actions} />
      ))}
    </div>
  );
}

// ─── Panel signalements enrichi ───────────────────────────────────────────────

function ReportsPanel({ stats }: { stats: AllStats }) {
  if (stats.totalReports === 0) return null;

  const reportData = [
    { name: 'En attente', value: stats.pendingReports,  fill: COLORS.amber },
    { name: 'Résolus',    value: stats.resolvedReports,  fill: COLORS.green },
    { name: 'Autres',     value: Math.max(0, stats.totalReports - stats.pendingReports - stats.resolvedReports), fill: COLORS.blue },
  ].filter(d => d.value > 0);

  const resRate = stats.reportResolutionRate;

  const repInsights: { text: string; severity: 'ok' | 'warn' | 'danger' }[] = [];
  if (resRate >= 80) {
    repInsights.push({ text: `${resRate}% des signalements traités — excellente gestion de la modération`, severity: 'ok' });
  } else if (resRate >= 50) {
    repInsights.push({ text: `${resRate}% de signalements traités — établir une routine quotidienne de modération`, severity: 'warn' });
  } else {
    repInsights.push({ text: `Seulement ${resRate}% des signalements traités — la confiance des membres est en jeu`, severity: 'danger' });
  }

  return (
    <section className="mt-8">
      <SectionTitle icon={Flag} title="Signalements & Modération" color="text-red-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-4xl font-black text-red-600">{fmt.format(stats.pendingReports)}</p>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">signalements</p>
                  <p className="text-xs text-gray-400">en attente</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{fmt.format(stats.totalReports)} total</span>
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3 h-3" />{fmt.format(stats.resolvedReports)} résolus</span>
                <span className="flex items-center gap-1 text-blue-600"><Award className="w-3 h-3" />{resRate}% taux résolution</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {stats.pendingReports > 0 && (
                <Link
                  href="/admin/signalements"
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Traiter les signalements
                </Link>
              )}
            </div>
          </div>

          {/* Barre résolution */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">Taux de résolution</span>
              <span className={resRate >= 80 ? 'text-emerald-600 font-semibold' : resRate >= 50 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>{resRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${resRate >= 80 ? 'bg-emerald-500' : resRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, resRate)}%` }}
              />
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 space-y-2">
            {repInsights.map((ins, i) => (
              <InsightCard key={i} text={ins.text} severity={ins.severity} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition des signalements</h3>
          {reportData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={reportData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value" nameKey="name" paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {reportData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {reportData.map(d => (
                  <div key={d.name} className="text-center p-2 rounded-lg" style={{ backgroundColor: d.fill + '15' }}>
                    <p className="text-lg font-bold" style={{ color: d.fill }}>{d.value}</p>
                    <p className="text-xs text-gray-500">{d.name}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">Tous les signalements sont traités</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function SectionRequests({ stats }: { stats: AllStats }) {
  return (
    <>
      <section>
        <SectionTitle icon={Star} title="Demandes artisans & Avis clients" color="text-amber-700" />

        {/* ── Jauges qualité résumé ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            Tableau de bord qualité service
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <CircleGauge
              label="Réponse artisans"
              value={stats.artisanResponseRate}
              color={stats.artisanResponseRate >= 65 ? COLORS.green : stats.artisanResponseRate >= 30 ? COLORS.amber : COLORS.red}
              benchmark={65}
            />
            <CircleGauge
              label="Complétion missions"
              value={stats.requestCompletionRate}
              color={stats.requestCompletionRate >= 50 ? COLORS.green : COLORS.amber}
              benchmark={50}
            />
            <CircleGauge
              label="Satisfaction client"
              value={stats.avgRating > 0 ? Math.round(stats.avgRating * 20) : 0}
              color={stats.avgRating >= 4 ? COLORS.green : stats.avgRating >= 3 ? COLORS.amber : COLORS.red}
              unit=" pts"
              benchmark={80}
            />
            <CircleGauge
              label="Modération"
              value={stats.reportResolutionRate}
              color={stats.reportResolutionRate >= 80 ? COLORS.green : stats.reportResolutionRate >= 50 ? COLORS.amber : COLORS.red}
              benchmark={80}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RequestsPanel stats={stats} />
          <RatingBars stats={stats} />
        </div>
      </section>

      <ReportsPanel stats={stats} />
    </>
  );
}

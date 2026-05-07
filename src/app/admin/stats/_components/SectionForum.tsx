'use client';

import { FileText, AlertTriangle, CheckCircle, MessageCircle, Hash, TrendingUp, Award } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
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
  label, value, sub, color, icon: Icon,
}: { label: string; value: string | number; sub?: string; color: string; icon?: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export function SectionForum({ stats }: { stats: AllStats }) {

  const cmtBenchmark   = 2.5;
  const resBenchmark   = 40;
  const avgCmtPerPost  = stats.avgCommentsPerPost;
  const resRate        = stats.forumResolutionRate;

  const postTrend: 'up' | 'down' | 'flat' =
    stats.postsPrev7 === 0 ? (stats.postsLast7 > 0 ? 'up' : 'flat')
    : stats.postsLast7 > stats.postsPrev7 ? 'up'
    : stats.postsLast7 < stats.postsPrev7 ? 'down' : 'flat';

  const postDelta = stats.postsPrev7 > 0
    ? Math.round(((stats.postsLast7 - stats.postsPrev7) / stats.postsPrev7) * 100)
    : 0;

  // ─── Insights automatiques ──────────────────────────────────────────────────
  const insights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  if (stats.totalPosts === 0) {
    insights.push({
      text: 'Forum vide — aucun post publié',
      severity: 'danger',
      actions: [
        'Publier 3 posts d\'amorçage sur des sujets de quartier populaires',
        'Inviter les membres à poser une question ou partager une info locale',
        'Créer une catégorie "Bienvenue" pour les nouveaux membres',
        'Organiser un "forum de lancement" avec un sujet phare de la semaine',
      ],
    });
  } else {
    // Engagement commentaires
    if (avgCmtPerPost >= cmtBenchmark) {
      insights.push({ text: `${avgCmtPerPost} commentaires/post — au-dessus du benchmark (${cmtBenchmark})`, severity: 'ok' });
    } else if (avgCmtPerPost >= 1) {
      insights.push({
        text: `${avgCmtPerPost} cmts/post — sous le benchmark secteur (${cmtBenchmark} recommandé)`,
        severity: 'warn',
        actions: [
          'Notifier les membres des nouvelles réponses à leurs posts',
          'Afficher les posts "sans réponse" en priorité sur la page forum',
          'Ajouter un bouton "Je peux aider" sur les posts de demande',
          'Poster des questions ouvertes hebdomadaires pour stimuler les échanges',
        ],
      });
    } else {
      insights.push({
        text: `Quasi aucune interaction : ${avgCmtPerPost} cmt/post — forum en mode "publication sans échange"`,
        severity: 'danger',
        actions: [
          'L\'admin doit commenter activement les posts pour créer l\'habitude',
          'Mettre en place des "likes" pour réduire la friction de la réaction',
          'Notifier par push les membres qui n\'ont jamais commenté',
          'Récompenser les premiers commentateurs (badge "Membre actif")',
        ],
      });
    }

    // Taux de résolution
    if (resRate >= resBenchmark) {
      insights.push({ text: `${resRate}% de posts résolus — excellent taux de résolution`, severity: 'ok' });
    } else if (stats.totalPosts >= 3 && resRate < 20) {
      insights.push({
        text: `Seulement ${resRate}% de posts fermés/résolus — clarifier le workflow`,
        severity: 'warn',
        actions: [
          'Envoyer un rappel automatique : "Votre question a-t-elle été résolue ?"',
          'Ajouter un bouton "Marquer comme résolu" plus visible',
          'Récompenser les auteurs qui ferment leurs posts résolus',
        ],
      });
    }

    // Tendance posts
    if (postTrend === 'down' && Math.abs(postDelta) > 40) {
      insights.push({
        text: `${postDelta}% de nouveaux posts cette semaine vs la précédente`,
        severity: 'warn',
        actions: [
          'Lancer un sujet animé par l\'admin pour relancer les discussions',
          'Envoyer un email "Quoi de neuf dans le quartier ?"',
        ],
      });
    } else if (postTrend === 'up' && postDelta > 30) {
      insights.push({ text: `+${postDelta}% de posts cette semaine — belle dynamique forum !`, severity: 'ok' });
    }

    // Mots-clés tendance
    if (stats.topForumWords.length > 0) {
      const top3 = stats.topForumWords.slice(0, 3).map(w => w.name).join(', ');
      insights.push({
        text: `Sujets tendance : "${top3}" — créer des catégories dédiées si récurrents`,
        severity: 'info',
      });
    }

    // Diversité catégories
    if (stats.forumCategories.length === 1) {
      insights.push({
        text: 'Une seule catégorie de posts — la communauté manque de diversité thématique',
        severity: 'warn',
        actions: [
          'Créer des sous-forums thématiques (Travaux, Événements, Entraide, Commerce local)',
          'Promouvoir les catégories peu utilisées dans la newsletter',
        ],
      });
    } else if (stats.forumCategories.length >= 4) {
      insights.push({ text: `${stats.forumCategories.length} catégories actives — bonne diversité thématique`, severity: 'ok' });
    }
  }

  // Jauge de résolution
  const resBarColor = resRate >= 60 ? 'bg-emerald-500' : resRate >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const cmtBarColor = avgCmtPerPost >= cmtBenchmark ? 'bg-emerald-500' : avgCmtPerPost >= 1 ? 'bg-amber-500' : 'bg-red-500';
  const cmtBarPct   = Math.min(100, Math.round((avgCmtPerPost / (cmtBenchmark * 1.5)) * 100));

  return (
    <section>
      <SectionTitle icon={FileText} title="Forum & Discussions" color="text-teal-700" />

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="Posts totaux"
          value={stats.totalPosts}
          sub={`${stats.postsLast7} cette semaine`}
          color="text-teal-600"
          icon={FileText}
        />
        <KpiTile
          label="Commentaires"
          value={stats.totalComments}
          sub={`${avgCmtPerPost} par post`}
          color={avgCmtPerPost >= cmtBenchmark ? 'text-emerald-600' : 'text-amber-600'}
          icon={MessageCircle}
        />
        <KpiTile
          label="Posts résolus"
          value={`${resRate}%`}
          sub={`${stats.closedPosts} fermés`}
          color={resRate >= 40 ? 'text-emerald-600' : 'text-amber-600'}
          icon={Award}
        />
        <KpiTile
          label="Catégories"
          value={stats.forumCategories.length}
          sub="actives"
          color="text-blue-600"
          icon={Hash}
        />
      </div>

      {/* ── Jauges qualité ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Qualité des discussions</h3>
        <div className="space-y-4">
          {/* Engagement commentaires */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-gray-700">Commentaires / post</span>
              <span className={avgCmtPerPost >= cmtBenchmark ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {avgCmtPerPost} / cible {cmtBenchmark}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${cmtBarColor}`} style={{ width: `${cmtBarPct}%` }} />
            </div>
          </div>
          {/* Taux résolution */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-gray-700">Taux de résolution</span>
              <span className={resRate >= resBenchmark ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {resRate}% / cible {resBenchmark}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${resBarColor}`} style={{ width: `${Math.min(100, resRate)}%` }} />
            </div>
          </div>
          {/* Tendance semaine */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-gray-700">Posts cette semaine vs S-1</span>
              <span className={
                postTrend === 'up' ? 'text-emerald-600 font-semibold' :
                postTrend === 'down' ? 'text-red-600 font-semibold' :
                'text-gray-500'
              }>
                {stats.postsLast7} vs {stats.postsPrev7} {postDelta !== 0 ? `(${postDelta > 0 ? '+' : ''}${postDelta}%)` : ''}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${postTrend === 'up' ? 'bg-emerald-500' : postTrend === 'down' ? 'bg-red-400' : 'bg-gray-400'}`}
                style={{ width: `${Math.min(100, stats.postsPrev7 > 0 ? Math.round((stats.postsLast7 / stats.postsPrev7) * 70) : (stats.postsLast7 > 0 ? 50 : 5))}%` }}
              />
            </div>
          </div>
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

        {/* Posts par catégorie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Posts par catégorie</h3>
          {stats.forumCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.forumCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="value" fill={COLORS.teal} radius={[0, 6, 6, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-10">Aucun post</p>}
        </div>

        {/* Nuage de mots enrichi */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Mots-clés tendance
          </h3>
          {stats.topForumWords.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {stats.topForumWords.map((w, idx) => {
                  const maxVal = stats.topForumWords[0].value;
                  const size   = Math.max(11, Math.min(22, 11 + (w.value / maxVal) * 11));
                  const rank   = idx;
                  const bg     = rank === 0 ? 'bg-teal-100 border-teal-300 text-teal-800' :
                                 rank <= 2  ? 'bg-teal-50 border-teal-200 text-teal-700' :
                                              'bg-gray-50 border-gray-200 text-gray-600';
                  return (
                    <span
                      key={w.name}
                      style={{ fontSize: size }}
                      className={`${bg} border px-2.5 py-1 rounded-full font-medium cursor-default`}
                      title={`${w.value} occurrence${w.value > 1 ? 's' : ''}`}
                    >
                      {w.name}
                      <span className="text-xs ml-1 opacity-60">{w.value}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                Top sujet : <span className="font-medium text-gray-600">"{stats.topForumWords[0]?.name}"</span> — envisager une catégorie dédiée
              </p>
            </>
          ) : <p className="text-sm text-gray-400 text-center py-10">Aucun post forum</p>}
        </div>

        {/* Nouveaux posts 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Nouveaux posts — 30 jours</h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="text-teal-600 font-semibold">{stats.totalPosts} posts</span>
              <span>{stats.totalComments} commentaires</span>
              <span>{stats.closedPosts} fermés</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={stats.dailyPosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke={COLORS.teal} strokeWidth={2.5} dot={false} name="Posts" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, CheckCircle2, Clock, Circle, MapPin, Tag, Users,
  Lock, Archive, Bell, Search, Shield, BarChart3, MessageCircle,
  Heart, Flag, Settings, Database, Zap, FileText, Eye, Pin, Flame
} from 'lucide-react';

// ─── Définition des modules ───────────────────────────────────────────────────
const MODULES = [
  {
    id: 'structure',
    icon: MapPin,
    title: 'Structure & Navigation',
    color: 'emerald',
    status: 'done',
    items: [
      { label: 'Hub principal /forum avec statistiques globales (sujets, réponses, membres)', done: true },
      { label: '6 secteurs géographiques (Les Collines, Figabruna, Village, Casatorra, Ortale, La Plaine)', done: true },
      { label: '10 catégories thématiques (Vie quartier, Infos pratiques, Entraide, Sécurité, etc.)', done: true },
      { label: 'Filtre par secteur (boutons colorés avec icônes)', done: true },
      { label: 'Filtre par catégorie (sidebar)', done: true },
      { label: 'Navigation Niveau 1 = secteur, Niveau 2 = catégorie', done: true },
      { label: 'Liens rapides (Sujets chauds, Derniers, Plus vus, Mes suivis)', done: true },
      { label: 'Liens modules liés (Événements, Promenades, Coups de main)', done: true },
      { label: 'Mode vue liste / grille', done: true },
    ],
  },
  {
    id: 'statuts',
    icon: Lock,
    title: 'Statuts des sujets',
    color: 'amber',
    status: 'done',
    items: [
      { label: 'Statut ouvert — sujet actif, réponses autorisées', done: true },
      { label: 'Statut verrouillé — aucune nouvelle réponse, lu seul', done: true },
      { label: 'Statut masqué — invisible pour les membres, visible par modérateurs', done: true },
      { label: 'Statut archivé — conservé en lecture seule, retiré du fil actif', done: true },
      { label: 'Badges visuels statut sur les cartes et la page détail', done: true },
      { label: 'Transitions (ouvert→verrouillé, verrouillé→ouvert, →archivé) gérées par modérateurs', done: true },
    ],
  },
  {
    id: 'creation',
    icon: FileText,
    title: 'Wizard création de sujet (4 étapes)',
    color: 'blue',
    status: 'done',
    items: [
      { label: 'Étape 1 — Choix secteur géographique (6 boutons colorés + option Général)', done: true },
      { label: 'Étape 2 — Choix catégorie thématique (10 options)', done: true },
      { label: 'Étape 3 — Rédaction (titre + contenu + tags libres + compteurs)', done: true },
      { label: 'Étape 4 — Visibilité (Public / Membres / Mon secteur) + récapitulatif', done: true },
      { label: 'Indicateur de progression étapes avec état complété', done: true },
      { label: 'Validation côté client (longueur titre ≥5, contenu ≥10)', done: true },
      { label: 'Tags libres avec ajout Entrée/virgule, max 5 tags, suppression X', done: true },
      { label: 'Fallback v1 (forum_posts) si table forum_topics absente', done: true },
      { label: 'Prévisualisation récapitulatif avant publication', done: true },
    ],
  },
  {
    id: 'detail',
    icon: MessageCircle,
    title: 'Page détail sujet',
    color: 'violet',
    status: 'done',
    items: [
      { label: 'Badges secteur colorés, catégorie, statut, Épinglé, Hot', done: true },
      { label: 'Tags libres affichés en chips colorées', done: true },
      { label: 'Métadonnées (auteur, date, vues, nb réponses)', done: true },
      { label: 'Incrément automatique compteur vues à l\'ouverture', done: true },
      { label: 'Bouton Suivre / Ne plus suivre avec état persisté', done: true },
      { label: 'Bouton Copier le lien (partage)', done: true },
      { label: 'Réactions (👍 ❤️ 😂 😢 🔥 👏) sur le sujet et chaque réponse', done: true },
      { label: 'Panneau réactions avec compteurs et toggle de sa propre réaction', done: true },
      { label: 'Actions modérateur : verrouiller/déverrouiller, épingler, archiver', done: true },
      { label: 'Suppression sujet (auteur ou modérateur)', done: true },
      { label: 'Lien modifier sujet (auteur uniquement)', done: true },
    ],
  },
  {
    id: 'reponses',
    icon: MessageCircle,
    title: 'Réponses & Interactions',
    color: 'green',
    status: 'done',
    items: [
      { label: 'Formulaire de réponse avec Textarea et validation', done: true },
      { label: 'Citations : citer une réponse existante avec extrait visuel', done: true },
      { label: 'Marquer une réponse comme "Solution" (auteur du sujet)', done: true },
      { label: 'Badge "Solution retenue" visible sur la réponse', done: true },
      { label: 'Réactions par réponse (même système que le sujet)', done: true },
      { label: 'Suppression réponse (auteur ou modérateur)', done: true },
      { label: 'Menu ⋯ par réponse (Citer, Marquer solution, Signaler, Supprimer)', done: true },
      { label: 'Fallback v1 (forum_comments) si table forum_replies absente', done: true },
      { label: 'Trigger auto-incrémentation reply_count + last_reply_at', done: true },
    ],
  },
  {
    id: 'recherche',
    icon: Search,
    title: 'Recherche & Filtres avancés',
    color: 'cyan',
    status: 'done',
    items: [
      { label: 'Barre de recherche plein texte (ilike sur titre)', done: true },
      { label: 'Filtre statut (Tous / Ouverts / Verrouillés / Archivés)', done: true },
      { label: 'Tri par date, popularité, réponses, vues', done: true },
      { label: 'Effacer les filtres (bouton reset)', done: true },
      { label: 'Compteur de filtres actifs affiché sur le bouton Filtres', done: true },
      { label: 'Tri rapide par onglets (Récents / Hot / Actifs / Vus)', done: true },
      { label: 'Full-text search (tsvector French) sur titre + contenu', done: true },
      { label: 'Index GIN pour recherche full-text', done: true },
      { note: 'Recherche avancée (auteur, date, tag, secteur simultanément) — partiel', done: false },
    ],
  },
  {
    id: 'roles',
    icon: Users,
    title: 'Rôles & Permissions',
    color: 'orange',
    status: 'done',
    items: [
      { label: 'Créateur : publier, modifier, fermer, supprimer, marquer solution', done: true },
      { label: 'Membre : répondre, citer, réagir, suivre, signaler', done: true },
      { label: 'Modérateur : verrouiller, déverrouiller, épingler, archiver, supprimer, log', done: true },
      { label: 'Admin : accès global via admin panel', done: true },
      { label: 'Badges rôle affichés (Admin, Mod, Artisan) sur profils', done: true },
      { label: 'RLS Supabase par rôle sur toutes les tables', done: true },
    ],
  },
  {
    id: 'moderation',
    icon: Shield,
    title: 'Modération',
    color: 'red',
    status: 'done',
    items: [
      { label: 'Signalement de sujet ou réponse (hors sujet, insulte, spam, désinformation, contenu sensible, autre)', done: true },
      { label: 'Table forum_reports avec motif, description, statut (en_attente/examiné/résolu/rejeté)', done: true },
      { label: 'Journal forum_moderation_logs (action, modérateur, cible, raison)', done: true },
      { label: 'Actions : masquer, verrouiller, archiver, supprimer, épingler', done: true },
      { label: 'Droit déverrouiller indiqué aux modérateurs sur un sujet verrouillé', done: true },
      { note: 'Tableau de bord admin modération (file signalements forum)', done: false },
      { note: 'Fusion de sujets (déplacer réponses)', done: false },
      { note: 'Suspension temporaire d\'un utilisateur depuis le forum', done: false },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications & Suivis',
    color: 'yellow',
    status: 'partial',
    items: [
      { label: 'Suivre / Ne plus suivre un sujet (table forum_follows)', done: true },
      { label: 'État de suivi persisté en base, rechargé à l\'ouverture', done: true },
      { label: 'Option notify_replies par sujet suivi', done: true },
      { note: 'Envoi d\'une notification push/email lors d\'une nouvelle réponse (Edge Function)', done: false },
      { note: 'Dashboard /dashboard/forum — mes sujets suivis', done: false },
      { note: 'Alerte locale (mode alerte secteur pour info urgente)', done: false },
    ],
  },
  {
    id: 'ux',
    icon: Eye,
    title: 'UX & Ergonomie',
    color: 'pink',
    status: 'done',
    items: [
      { label: 'EmptyState intelligent (avec ou sans filtres actifs)', done: true },
      { label: 'Skeleton loading animé (5 cartes)', done: true },
      { label: 'Toasts succès/erreur sur toutes les actions', done: true },
      { label: 'Réponse au clavier (focus textarea après citation)', done: true },
      { label: 'Fermeture panneau réaction au clic extérieur', done: true },
      { label: 'Badge "Hot" avec icône flamme', done: true },
      { label: 'Incitation connexion si non connecté (bannière bas de page)', done: true },
      { note: 'Carte interactive du quartier (Leaflet/Mapbox)', done: false },
      { note: 'Mode "alerte locale" (sujet épinglé en urgence sur secteur)', done: false },
    ],
  },
  {
    id: 'base-de-donnees',
    icon: Database,
    title: 'Base de données',
    color: 'slate',
    status: 'done',
    items: [
      { label: 'forum_sectors — 6 secteurs Biguglia, RLS', done: true },
      { label: 'forum_categories — catégories thématiques, RLS', done: true },
      { label: 'forum_topics — sujets v2 (statut, secteur, tags, visibilité, compteurs, search_vector)', done: true },
      { label: 'forum_replies — réponses (citation, solution, réaction_count), RLS', done: true },
      { label: 'forum_tags + forum_topic_tags — tags libres liés aux sujets', done: true },
      { label: 'forum_reactions — réactions emoji (topic ou reply), UNIQUE par user+emoji', done: true },
      { label: 'forum_follows — suivis sujets par utilisateur, RLS', done: true },
      { label: 'forum_reports — signalements forum (motif, statut), RLS', done: true },
      { label: 'forum_moderation_logs — journal modération (action, cible, raison)', done: true },
      { label: 'Trigger reply_count_update automatique', done: true },
      { label: 'Trigger full-text search (tsvector French)', done: true },
      { label: 'Trigger updated_at automatique', done: true },
      { label: 'Indexes secteur, catégorie, statut, hot, full-text', done: true },
      { note: 'Réputation / points (badges sujet chaud, réponse solution, etc.)', done: false },
      { note: 'Analytics admin (catégories populaires, taux de réponse)', done: false },
    ],
  },
  {
    id: 'migrations',
    icon: Zap,
    title: 'Migration SQL',
    color: 'indigo',
    status: 'done',
    items: [
      { label: 'Bloc SQL FORUM_V2_SQL visible et copiable dans /admin/migration', done: true },
      { label: 'Insertion 6 secteurs Biguglia ON CONFLICT DO NOTHING', done: true },
      { label: 'Insertion 9 catégories thématiques enrichies', done: true },
      { label: 'Toutes RLS avec DO $$ BEGIN IF NOT EXISTS...', done: true },
      { label: 'Compatibilité MIGRATION_SQL v1 conservée (forum_posts/comments)', done: true },
    ],
  },
];

// ─── Couleurs par module ──────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; light: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-50' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   border: 'border-amber-300',   light: 'bg-amber-50'   },
  blue:    { bg: 'bg-blue-500',    text: 'text-blue-700',    border: 'border-blue-300',    light: 'bg-blue-50'    },
  violet:  { bg: 'bg-violet-500',  text: 'text-violet-700',  border: 'border-violet-300',  light: 'bg-violet-50'  },
  green:   { bg: 'bg-green-500',   text: 'text-green-700',   border: 'border-green-300',   light: 'bg-green-50'   },
  cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-700',    border: 'border-cyan-300',    light: 'bg-cyan-50'    },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-700',  border: 'border-orange-300',  light: 'bg-orange-50'  },
  red:     { bg: 'bg-red-500',     text: 'text-red-700',     border: 'border-red-300',     light: 'bg-red-50'     },
  yellow:  { bg: 'bg-yellow-500',  text: 'text-yellow-700',  border: 'border-yellow-300',  light: 'bg-yellow-50'  },
  pink:    { bg: 'bg-pink-500',    text: 'text-pink-700',    border: 'border-pink-300',    light: 'bg-pink-50'    },
  slate:   { bg: 'bg-slate-500',   text: 'text-slate-700',   border: 'border-slate-300',   light: 'bg-slate-50'   },
  indigo:  { bg: 'bg-indigo-500',  text: 'text-indigo-700',  border: 'border-indigo-300',  light: 'bg-indigo-50'  },
};

// ─── Calcul score global ──────────────────────────────────────────────────────
function computeScore() {
  let done = 0, total = 0;
  MODULES.forEach(m => m.items.forEach(item => {
    total++;
    if (item.done) done++;
  }));
  return { done, total, pct: Math.round((done / total) * 100) };
}

// ─── Icône statut ─────────────────────────────────────────────────────────────
function ItemIcon({ done, note }: { done: boolean; note?: string }) {
  if (done) return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />;
  if (note) return <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />;
  return <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />;
}

// ─── Carte module ─────────────────────────────────────────────────────────────
function ModuleCard({ module }: { module: typeof MODULES[0] }) {
  const [open, setOpen] = useState(false);
  const colors = COLOR_MAP[module.color] || COLOR_MAP.slate;
  const doneCount = module.items.filter(i => i.done).length;
  const total = module.items.length;
  const pct = Math.round((doneCount / total) * 100);

  const statusBadge = module.status === 'done'
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ Complet</span>
    : module.status === 'partial'
      ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏳ Partiel</span>
      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">⭕ À faire</span>;

  const Icon = module.icon;

  return (
    <div className={`bg-white rounded-2xl border ${colors.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-4 text-left hover:${colors.light} transition-colors`}
      >
        <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{module.title}</span>
            {statusBadge}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-32">
              <div
                className={`h-full ${colors.bg} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{doneCount}/{total}</span>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`px-4 pb-4 ${colors.light} border-t ${colors.border}`}>
          <ul className="mt-3 space-y-2">
            {module.items.map((item, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                <ItemIcon done={item.done} note={'note' in item ? item.note : undefined} />
                <span className={!item.done ? 'italic' : ''}>
                  {'note' in item ? item.note : item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ForumSpecPage() {
  const { done, total, pct } = computeScore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'done' | 'partial' | 'todo'>('all');

  const filtered = MODULES.filter(m => {
    if (activeFilter === 'all') return true;
    return m.status === activeFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Retour */}
      <Link href="/admin/spec" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Cahiers des charges
      </Link>

      {/* En-tête */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            💬
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">Forum local — Cahier des charges</h1>
            <p className="text-indigo-200 text-sm">
              Forum de voisinage par secteurs géographiques (Les Collines, Figabruna, Village de Biguglia, Casatorra, Ortale, La Plaine) avec catégories thématiques, modération complète et interactions sociales.
            </p>
          </div>
        </div>

        {/* Score global */}
        <div className="mt-5 bg-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Conformité globale</span>
            <span className="text-2xl font-bold text-white">{pct}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-indigo-200 mt-1">
            <span>{done} points réalisés</span>
            <span>{total - done} restants</span>
          </div>
        </div>
      </div>

      {/* Résumé chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Modules', value: MODULES.length, icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Points réalisés', value: done, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Points restants', value: total - done, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Score', value: `${pct}%`, icon: Zap, color: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color.split(' ')[0]}`} />
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          { key: 'all',     label: 'Tous',      count: MODULES.length },
          { key: 'done',    label: '✅ Complets', count: MODULES.filter(m => m.status === 'done').length },
          { key: 'partial', label: '⏳ Partiels', count: MODULES.filter(m => m.status === 'partial').length },
          { key: 'todo',    label: '⭕ À faire',  count: MODULES.filter(m => m.status === 'todo').length },
        ] as { key: 'all' | 'done' | 'partial' | 'todo'; label: string; count: number }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
              activeFilter === f.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label} <span className="opacity-60 ml-1">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-3 mb-8">
        {filtered.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      {/* Pages déployées */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" /> Pages déployées
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: '/forum',        label: 'Hub Forum',            status: 'done' },
            { href: '/forum/nouveau',label: 'Créer un sujet',       status: 'done' },
            { href: '/forum/[id]',   label: 'Détail sujet',         status: 'done' },
            { href: '/forum/[id]/modifier', label: 'Modifier sujet', status: 'done' },
            { href: '/admin/migration', label: 'SQL Forum v2',       status: 'done' },
            { href: '/dashboard/forum', label: 'Dashboard forum',    status: 'todo' },
            { href: '/admin/moderation', label: 'Admin modération',  status: 'partial' },
          ].map(page => (
            <Link
              key={page.href}
              href={page.href}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-sm border transition-colors hover:shadow-sm ${
                page.status === 'done'
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : page.status === 'partial'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-200 text-gray-500 cursor-default'
              }`}
            >
              <span>{page.status === 'done' ? '✅' : page.status === 'partial' ? '⏳' : '⭕'}</span>
              <code className="text-xs">{page.href}</code>
            </Link>
          ))}
        </div>
      </div>

      {/* Points restants */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Points restants ({total - done})
        </h2>
        <ul className="space-y-1.5">
          {MODULES.flatMap(m =>
            m.items
              .filter(item => !item.done)
              .map((item, i) => (
                <li key={`${m.id}-${i}`} className="flex items-start gap-2 text-sm text-amber-700">
                  <Circle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>{'note' in item ? item.note : item.label}</span>
                  <span className="text-xs text-amber-500 flex-shrink-0">[{m.title}]</span>
                </li>
              ))
          )}
        </ul>
      </div>

      {/* SQL requis */}
      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <h2 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
          <Database className="w-4 h-4" /> Action requise — Supabase
        </h2>
        <p className="text-sm text-indigo-700 mb-3">
          Pour activer le forum v2, exécuter le script SQL dans Supabase :
        </p>
        <Link
          href="/admin/migration"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Database className="w-4 h-4" /> Aller à /admin/migration → Copier SQL Forum v2
        </Link>
      </div>
    </div>
  );
}

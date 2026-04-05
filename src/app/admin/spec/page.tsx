'use client';

/**
 * Biguglia Connect — Cahier des charges & Spécification Fonctionnelle
 * Module Collectionneurs Premium v2.0
 * Page consultable par l'admin pour vérifier l'état du développement.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Clock, Circle, AlertCircle,
  Tag, ArrowLeftRight, Gift, Search, Camera, Star, Shield,
  MessageSquare, BarChart3, Database, Zap, Lock, Bell,
  Users, Gem, FileText, Settings,
} from 'lucide-react';

// ─── Données spec ─────────────────────────────────────────────────────────────

const MODULES: {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  status: 'done' | 'partial' | 'todo';
  items: { label: string; done: boolean }[];
}[] = [
  {
    id: 'modes',
    icon: Tag,
    title: 'Modes d\'annonce',
    color: 'blue',
    status: 'done',
    items: [
      { label: 'Mode Vente — prix, statuts : actif → réservé → vendu → archivé', done: true },
      { label: 'Mode Échange — objet souhaité, statuts : actif → réservé → échangé → archivé', done: true },
      { label: 'Mode Don gratuit — statuts : actif → réservé → donné → archivé', done: true },
      { label: 'Mode Recherche — statuts : actif → trouvé → archivé', done: true },
      { label: 'Transitions interdites (ex: vendu → actif uniquement par admin)', done: true },
      { label: 'Config centralisée MODE_CONFIG (label, icône, couleur, CTA, verbeDone)', done: true },
      { label: 'Statuts internes : brouillon, en_attente_validation, signalé, masqué, supprimé_admin', done: true },
    ],
  },
  {
    id: 'creation',
    icon: Gem,
    title: 'Wizard création d\'annonce',
    color: 'amber',
    status: 'done',
    items: [
      { label: 'Étape 1 — Choix du mode (Vente / Échange / Don / Recherche)', done: true },
      { label: 'Étape 2 — Sélection catégorie (16 catégories, grille visuelle)', done: true },
      { label: 'Étape 3 — Formulaire détaillé : titre, description, état, année, marque, rareté, prix/échange, lieu, expédition, meetup, tags', done: true },
      { label: 'Étape 4 — Photos (upload Supabase, ≤12 photos, couverture sélectionnable, HD)', done: true },
      { label: 'Étape 5 — Aperçu & publication (checklist conformité, bouton publier)', done: true },
      { label: 'Authenticity_declared (badge vert "Authenticité déclarée")', done: true },
      { label: 'Dimensions, matériau, provenance, défauts notés', done: true },
    ],
  },
  {
    id: 'detail',
    icon: Camera,
    title: 'Page détail annonce',
    color: 'purple',
    status: 'done',
    items: [
      { label: 'Galerie immersive : navigation clavier/swipe, zoom plein écran, indicateur couverture', done: true },
      { label: 'Photo viewer plein écran avec compteur photos', done: true },
      { label: 'Badges mode & statut colorés', done: true },
      { label: 'Prix / info échange / don gratuit / objet recherché', done: true },
      { label: 'Localisation, dates, description complète', done: true },
      { label: 'Bloc vendeur : avatar, note, badges confiance, date d\'inscription', done: true },
      { label: 'CTA contextuel (Je suis acheteur / Proposer échange / Je suis intéressé / J\'ai cet objet)', done: true },
      { label: 'Boutons : contacter, favori, partager, signaler', done: true },
      { label: 'Gestion statut propriétaire (transitions autorisées)', done: true },
      { label: 'Annonces similaires (même catégorie)', done: true },
      { label: 'Section sécurité & conseils', done: true },
      { label: 'Incrément vues automatique', done: true },
    ],
  },
  {
    id: 'search',
    icon: Search,
    title: 'Recherche & filtres',
    color: 'teal',
    status: 'done',
    items: [
      { label: 'Recherche texte (titre, description, marque, série)', done: true },
      { label: 'Filtres rapides par mode (Vente/Échange/Don/Recherche)', done: true },
      { label: 'Filtre catégorie (sidebar desktop, scroll horizontal mobile)', done: true },
      { label: 'Filtres avancés : statut, état, rareté, prix min/max', done: true },
      { label: 'Filtres transaction : expédition possible, remise en main propre', done: true },
      { label: 'Tris : récents, prix croissant/décroissant, vues, en vedette', done: true },
      { label: 'Section "En vedette" séparée (is_featured)', done: true },
      { label: 'Pagination infinie (load more)', done: true },
      { label: 'Vue grille / liste switchable', done: true },
      { label: 'Debounce recherche (400ms)', done: true },
      { label: 'Overlay loading lors du changement de filtre', done: true },
    ],
  },
  {
    id: 'trust',
    icon: Shield,
    title: 'Système de confiance',
    color: 'emerald',
    status: 'done',
    items: [
      { label: 'trust_interactions — interaction réelle entre deux membres', done: true },
      { label: 'reviews — avis uniquement après interaction complétée (review_unlocked)', done: true },
      { label: 'Anti-abus : pas d\'auto-évaluation, unique par interaction, fenêtre 30j', done: true },
      { label: 'Dimensions : communication, fiabilité, ponctualité, qualité', done: true },
      { label: 'trust_profile_stats — score calculé automatiquement (0–100)', done: true },
      { label: 'profile_badges — badges système ou admin (email_verified, fast_responder…)', done: true },
      { label: 'Bloc vendeur sur page détail : note moyenne, nb avis, badges', done: true },
      { label: 'Trigger unlock_review quand interaction → done', done: true },
      { label: 'Recalcul automatique stats (trigger recalc_trust_stats)', done: true },
      { label: 'RLS : avis publics visibles, création conditionnée, modération admin', done: true },
      { label: 'Page /confiance (hub public confiance & sécurité)', done: true },
      { label: 'Admin /admin/confiance (dashboard trust)', done: true },
    ],
  },
  {
    id: 'messaging',
    icon: MessageSquare,
    title: 'Messagerie & contact',
    color: 'sky',
    status: 'done',
    items: [
      { label: 'ContactButton lié à l\'annonce (source_type="collection_item")', done: true },
      { label: 'Messagerie privée existante (/messages)', done: true },
      { label: 'Création automatique de conversation depuis l\'annonce', done: true },
      { label: 'Messagerie sécurisée (RLS par participants)', done: true },
      { label: 'Propositions d\'offre via collection_offers', done: true },
      { label: 'Blocage et signalement (ReportButton)', done: true },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard vendeur',
    color: 'indigo',
    status: 'done',
    items: [
      { label: 'Onglets : Actives, Réservées, Clôturées, Statistiques', done: true },
      { label: 'Carte annonce avec métriques (vues, favoris, messages)', done: true },
      { label: 'Actions rapides : Modifier, Réserver, Remettre actif, Marquer vendu/échangé/donné/trouvé', done: true },
      { label: 'Suppression avec confirmation double-clic', done: true },
      { label: 'Statistiques globales : total vues, favoris, messages', done: true },
      { label: 'Distribution par mode (barres colorées)', done: true },
      { label: 'Liens vers modifier & voir l\'annonce', done: true },
      { label: 'Accès depuis /dashboard → widget Collections', done: true },
    ],
  },
  {
    id: 'premium',
    icon: Zap,
    title: 'Options premium & boost',
    color: 'orange',
    status: 'partial',
    items: [
      { label: 'is_featured / featured_until — mise en avant', done: true },
      { label: 'Section "En vedette" séparée dans la liste', done: true },
      { label: 'boost_count (compteur boosts)', done: true },
      { label: 'Abonnements vendeur (à implémenter)', done: false },
      { label: 'Badge vendeur premium (à implémenter)', done: false },
      { label: 'Galerie enrichie extra-photos (max actuel : 12)', done: true },
      { label: 'Analytics détaillées (en cours)', done: false },
      { label: 'Page boutique personnelle vendeur (à implémenter)', done: false },
      { label: 'Alertes prioritaires (à implémenter)', done: false },
      { label: 'Ventes privées (à implémenter)', done: false },
    ],
  },
  {
    id: 'moderation',
    icon: Lock,
    title: 'Sécurité & modération',
    color: 'red',
    status: 'done',
    items: [
      { label: 'moderation_status sur collection_items (publie/signale/masque/supprime_admin)', done: true },
      { label: 'RLS enrichie : items visibles si publie, ou auteur, ou admin/moderator', done: true },
      { label: 'ReportButton sur page détail (signalement avec raison)', done: true },
      { label: 'Admin /admin/moderation (file de modération générale)', done: true },
      { label: 'Admin /admin/signalements (signalements)', done: true },
      { label: 'Admin /admin/securite (sécurité)', done: true },
      { label: 'Soft-delete via status="supprime_admin" (à finaliser)', done: false },
      { label: 'Historique modération par annonce (à implémenter)', done: false },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    color: 'rose',
    status: 'partial',
    items: [
      { label: 'Page /notifications existante', done: true },
      { label: 'Nouveau contact sur annonce', done: true },
      { label: 'Annonce ajoutée aux favoris', done: false },
      { label: 'Alerte expiration annonce', done: false },
      { label: 'Offre reçue / acceptée / refusée', done: false },
      { label: 'Transaction complétée', done: false },
      { label: 'Action admin (masquage, avertissement)', done: false },
    ],
  },
  {
    id: 'database',
    icon: Database,
    title: 'Base de données',
    color: 'gray',
    status: 'done',
    items: [
      { label: 'collection_items — 35+ colonnes (mode, status, rarity, brand, city, shipping, photos count…)', done: true },
      { label: 'collection_item_photos (url, is_cover, sort_order, alt_text)', done: true },
      { label: 'collection_categories (id, name, slug, icon, color, display_order)', done: true },
      { label: 'collection_favorites (user_id, item_id, UNIQUE)', done: true },
      { label: 'collection_offers (buyer_id, seller_id, offer_type, status)', done: true },
      { label: 'trust_interactions (source_type, requester_id, receiver_id, status, review_unlocked)', done: true },
      { label: 'reviews (author_id, target_user_id, rating, dimensions, moderation_status)', done: true },
      { label: 'review_tags (review_id, tag)', done: true },
      { label: 'trust_profile_stats (avg_rating, trust_score, distributions)', done: true },
      { label: 'profile_badges (badge_code, awarded_by)', done: true },
      { label: 'Indexes perf : mode, status, rarity, city, author+status, featured', done: true },
      { label: 'RLS complète sur toutes les tables', done: true },
      { label: 'Triggers : sync_favorites_count, recalc_trust_stats, unlock_review_on_done', done: true },
    ],
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'done' | 'partial' | 'todo' }) {
  if (status === 'done')
    return <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Livré</span>;
  if (status === 'partial')
    return <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock className="w-3 h-3" />Partiel</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><Circle className="w-3 h-3" />À faire</span>;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
};

// ─── Stats globales ────────────────────────────────────────────────────────────

function GlobalStats() {
  const totalItems = MODULES.flatMap(m => m.items);
  const doneItems = totalItems.filter(i => i.done);
  const pct = Math.round((doneItems.length / totalItems.length) * 100);
  const modulesDone = MODULES.filter(m => m.status === 'done').length;
  const modulesPartial = MODULES.filter(m => m.status === 'partial').length;

  return (
    <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 rounded-3xl p-6 text-white mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gem className="w-6 h-6 text-white/80" />
            <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Biguglia Connect</span>
          </div>
          <h1 className="text-2xl font-black mb-1">Cahier des charges — Collectionneurs Premium v2.0</h1>
          <p className="text-white/80 text-sm">État du développement au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-4xl font-black">{pct}%</div>
          <div className="text-white/80 text-sm">réalisé</div>
        </div>
      </div>

      <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
        <div className="bg-white rounded-full h-3 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black">{doneItems.length}</div>
          <div className="text-xs text-white/80">fonctionnalités livrées</div>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black">{modulesDone}</div>
          <div className="text-xs text-white/80">modules complets</div>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black">{modulesPartial}</div>
          <div className="text-xs text-white/80">modules partiels</div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpecPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-black text-gray-900">Spécification fonctionnelle</h1>
            <p className="text-sm text-gray-500">Cahier des charges — Module Collectionneurs Premium v2.0</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/migration" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              <Database className="w-3.5 h-3.5" /> Migration SQL
            </Link>
            <Link href="/collectionneurs" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition">
              <Gem className="w-3.5 h-3.5" /> Voir module
            </Link>
          </div>
        </div>

        {/* Stats globales */}
        <GlobalStats />

        {/* Navigation rapide */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Navigation rapide</h2>
          <div className="flex flex-wrap gap-2">
            {MODULES.map(m => {
              const Icon = m.icon;
              const cls = COLOR_MAP[m.color] || COLOR_MAP.gray;
              return (
                <a key={m.id} href={`#${m.id}`}
                   className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${cls}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {m.title}
                </a>
              );
            })}
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {MODULES.map(m => {
            const Icon = m.icon;
            const cls = COLOR_MAP[m.color] || COLOR_MAP.gray;
            const doneCount = m.items.filter(i => i.done).length;
            const pct = Math.round((doneCount / m.items.length) * 100);
            return (
              <div key={m.id} id={m.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-50`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cls}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900">{m.title}</h2>
                      <p className="text-xs text-gray-500">{doneCount}/{m.items.length} fonctionnalités</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-black text-gray-900">{pct}%</div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                </div>

                {/* Barre progression */}
                <div className="px-5 pt-3 pb-1">
                  <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="px-5 py-3 space-y-2">
                  {m.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm leading-snug ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer lien pages */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> Pages déployées
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { href: '/collectionneurs', label: 'Liste Collectionneurs', icon: Gem },
              { href: '/collectionneurs/nouveau', label: 'Wizard Création (5 étapes)', icon: Tag },
              { href: '/dashboard/collectionneurs', label: 'Dashboard Vendeur', icon: BarChart3 },
              { href: '/confiance', label: 'Confiance & Sécurité', icon: Shield },
              { href: '/admin/confiance', label: 'Admin Trust', icon: Settings },
              { href: '/admin/migration', label: 'Admin Migration SQL', icon: Database },
              { href: '/admin/moderation', label: 'Admin Modération', icon: Lock },
              { href: '/admin/signalements', label: 'Admin Signalements', icon: AlertCircle },
              { href: '/messages', label: 'Messagerie', icon: MessageSquare },
            ].map(p => {
              const Icon = p.icon;
              return (
                <Link key={p.href} href={p.href}
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{p.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Note déploiement */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 mb-2">⚠️ Actions requises pour activer toutes les fonctionnalités</h3>
              <ol className="space-y-2 text-sm text-amber-700">
                <li><strong>1.</strong> Allez sur <Link href="/admin/migration" className="underline font-semibold">Admin → Migration SQL</Link></li>
                <li><strong>2.</strong> Copiez et collez dans Supabase SQL Editor le script <strong>&quot;🏆 Collectionneurs v2.0 Premium&quot;</strong> (20+ colonnes, favoris, offres, RLS)</li>
                <li><strong>3.</strong> Copiez et collez le script <strong>&quot;⭐ Confiance &amp; Réputation v2.0&quot;</strong> (trust_interactions, reviews, badges — idempotent)</li>
                <li><strong>4.</strong> Vérifiez que toutes les tables ✅ sont vertes dans l&apos;outil de diagnostic de la page migration</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

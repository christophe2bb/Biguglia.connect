'use client';

/**
 * Biguglia Connect — Cahier des charges Module Perdu / Trouvé
 * Page de suivi de conformité pour l'admin.
 * Vérification au 2026-04-05
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp,
  Search, MapPin, Shield, Bell, Database, Zap, Users,
  BarChart3, Camera, FileText, Settings, Star, MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemStatus = 'done' | 'partial' | 'todo';

type SpecItem = {
  label: string;
  status: ItemStatus;
  note?: string;
};

type Module = {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  items: SpecItem[];
};

// ─── Modules & items ──────────────────────────────────────────────────────────
const MODULES: Module[] = [
  {
    id: 'catalogue',
    icon: Search,
    title: 'Catalogue & liste',
    color: 'orange',
    items: [
      { label: 'Flux actif (perdu, trouvé, identifié) séparé du flux historique (restitué, clos, archivé)', status: 'done' },
      { label: 'Filtres : type (perdu/trouvé), statut, catégorie, recherche texte (titre, couleur, marque, lieu)', status: 'done' },
      { label: 'Tri par recents, catégorie, lieu', status: 'done' },
      { label: 'Compteurs perdu/trouvé/identifié/restitué dans le hero', status: 'done' },
      { label: 'Grille responsive 1→2→3 colonnes avec cartes photo', status: 'done' },
      { label: 'Pagination / Load more sur la liste', status: 'done', note: 'Limit 100 items par requête' },
      { label: 'Avertissement DB manquante avec lien migration', status: 'done' },
    ],
  },
  {
    id: 'statuts',
    icon: Settings,
    title: 'Cycle de vie & statuts',
    color: 'blue',
    items: [
      { label: 'Statuts business : perdu, trouvé, identifié, restitué, clos, archivé, draft', status: 'done' },
      { label: 'Statuts modération : en_attente_validation, signalé, masqué, supprimé_admin', status: 'partial', note: 'Champ moderation_status présent, UI modération non développée' },
      { label: 'Transitions autorisées selon CdC (perdu→identifié/clos, trouvé→identifié/clos, etc.)', status: 'done' },
      { label: 'Suppression logique : archivage (archived_at) plutôt que DELETE', status: 'done' },
      { label: 'Boutons de transition contextuels selon statut courant', status: 'done' },
      { label: 'Historique de statuts (lf_status_history) — table SQL + enregistrement', status: 'done' },
      { label: 'Champs closed_at et archived_at remplis automatiquement', status: 'done' },
    ],
  },
  {
    id: 'formulaire',
    icon: FileText,
    title: 'Formulaire déclaration (6 étapes)',
    color: 'emerald',
    items: [
      { label: 'Étape 1 — Choix type : Perdu / Trouvé avec description contextuelle', status: 'done' },
      { label: 'Étape 2 — Objet : titre, catégorie (13 items + grille visuelle), description, couleur, marque, signe distinctif', status: 'done' },
      { label: 'Étape 3 — Lieu & date : date, heure approx, lieu principal (dropdown), détail lieu', status: 'done' },
      { label: 'Étape 4 — Photos : upload ≤5 photos, preview, désignation couverture, conseils sensibles', status: 'done' },
      { label: 'Étape 5 — Contact : nom, tél, email, mode contact, show_phone + extras (récompense, valeur sentimentale, autorités, dépôt, preuve)', status: 'done' },
      { label: 'Étape 6 — Validation : aperçu, conseils sécurité, 3 checkboxes, bouton publier + brouillon', status: 'done' },
      { label: 'Catégories sensibles auto-détectées (portefeuille, document officiel)', status: 'done' },
      { label: 'is_sensitive booléen enregistré en base', status: 'done' },
      { label: 'Mode édition (startEdit) : préremplissage de toutes les étapes', status: 'done' },
    ],
  },
  {
    id: 'detail',
    icon: Camera,
    title: 'Carte détail annonce',
    color: 'purple',
    items: [
      { label: 'Photo principale avec lightbox plein-écran (PhotoViewer)', status: 'done' },
      { label: 'Badge statut + badge type + badge catégorie + badge sensible', status: 'done' },
      { label: 'Badges secondaires : valeur sentimentale, confidentiel, déclaré autorités, lieu dépôt, récompense', status: 'done' },
      { label: 'Lieu + date + heure approximative', status: 'done' },
      { label: 'Description avec expand/collapse', status: 'done' },
      { label: 'Détails étendus : couleur, marque, signe distinctif, preuve propriété, contact conditionnel', status: 'done' },
      { label: 'Confidentialité : infos cachées si keep_secret = true', status: 'done' },
      { label: 'Galerie miniatures supplémentaires cliquables', status: 'done' },
      { label: 'Page détail dédiée /perdu-trouve/[id]', status: 'done' },
    ],
  },
  {
    id: 'actions',
    icon: Zap,
    title: 'Actions & interactions',
    color: 'amber',
    items: [
      { label: 'Bouton ContactButton avec message prérempli contextuel (\"C\'est le mien\" / \"J\'ai une info\")', status: 'done' },
      { label: 'Mini-forum (lf_comments) avec compteur, chargement lazzy, envoi', status: 'done' },
      { label: 'Partage : SMS, Email, copie lien', status: 'done' },
      { label: 'Signaler (ReportButton)', status: 'done' },
      { label: 'Transitions de statut pour l\'auteur (boutons colorés)', status: 'done' },
      { label: 'Modifier et Supprimer pour l\'auteur', status: 'done' },
      { label: 'Impression fiche (window.print + styles dédiés)', status: 'done' },
      { label: 'QR code fiche', status: 'todo', note: 'Librairie qrcode.react — non implémenté' },
    ],
  },
  {
    id: 'matching',
    icon: Zap,
    title: 'Moteur de correspondance',
    color: 'blue',
    items: [
      { label: 'Score de matching catégorie (+40), lieu (+20), couleur (+15), marque (+15), date proche (+10/+5), mots-clés (+3/mot)', status: 'done' },
      { label: 'Seuil minimum 50% pour afficher les correspondances', status: 'done' },
      { label: 'Badge animé \"N correspondances\" sur la carte', status: 'done' },
      { label: 'Panneau correspondances dépliable avec score coloré et ContactButton', status: 'done' },
      { label: 'Table lf_matches en base de données', status: 'done' },
      { label: 'Bannière de correspondances sur le dashboard utilisateur', status: 'done' },
      { label: 'Matching serveur (backend) avec stockage en lf_matches', status: 'partial', note: 'Table créée, matching côté client actif, pas encore de job de matching asynchrone' },
      { label: 'Alertes automatiques aux auteurs lors d\'une correspondance', status: 'todo', note: 'Notification à implémenter via Supabase edge function ou trigger' },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard utilisateur',
    color: 'indigo',
    items: [
      { label: 'Sections : En cours, Restitués, Clos, Archivés', status: 'done' },
      { label: 'Compteurs par section dans les onglets', status: 'done' },
      { label: 'Stats cartes (en cours, restitués, clos, total)', status: 'done' },
      { label: 'Graphique activité (barres 12 mois : perdus / trouvés)', status: 'done' },
      { label: 'Bannière correspondances suggérées avec score', status: 'done' },
      { label: 'Transitions rapides depuis la liste dashboard', status: 'done' },
      { label: 'Historique (statuts archivés) séparé', status: 'done' },
      { label: 'Filtre texte dans chaque section', status: 'done' },
      { label: 'Actions rapides : nouvelle annonce, voir toutes, actualiser', status: 'done' },
    ],
  },
  {
    id: 'securite',
    icon: Shield,
    title: 'Sécurité & confidentialité',
    color: 'red',
    items: [
      { label: 'is_sensitive auto-détecté (portefeuille, document officiel)', status: 'done' },
      { label: 'Badge "Sensible" affiché sur les cartes', status: 'done' },
      { label: 'keep_secret = masque les coordonnées publiques (tél, email)', status: 'done' },
      { label: 'Conseils sécurité dans étape 6 (ne pas photographier, garder un détail secret…)', status: 'done' },
      { label: 'Conseils photo pour objets sensibles (étape 4)', status: 'done' },
      { label: 'proof_required flag pour la restitution', status: 'done' },
      { label: 'Visibilité photos par niveau (public / private_admin / private_restitution)', status: 'done', note: 'visibility_type ajouté sur lf_photos via migration LF Extras' },
      { label: 'Validation admin pour objets très sensibles (identité bancaire)', status: 'todo', note: 'Workflow modération à développer' },
    ],
  },
  {
    id: 'base_de_donnees',
    icon: Database,
    title: 'Base de données',
    color: 'slate',
    items: [
      { label: 'Table lost_found_items avec tous les champs CdC (type, status, is_sensitive, matched_item_id, closed_at, archived_at…)', status: 'done' },
      { label: 'Table lf_photos (item_id FK, url, display_order, is_cover)', status: 'done' },
      { label: 'Table lf_comments (item_id FK, author_id FK, content)', status: 'done' },
      { label: 'Table lf_status_history (item_id, old_status, new_status, changed_by, reason)', status: 'done' },
      { label: 'Table lf_matches (lost_item_id, found_item_id, match_score, match_status)', status: 'done' },
      { label: 'RLS sur toutes les tables : lecture publique, écriture auteur, admin full', status: 'done' },
      { label: 'Trigger log_lost_found_status sur lost_found_items', status: 'done' },
      { label: 'Fonction SQL change_lost_found_status (validation transitions)', status: 'done' },
      { label: 'Colonnes visibility_type sur lf_photos', status: 'done', note: 'SQL dans bloc LF Extras de /admin/migration' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    color: 'yellow',
    items: [
      { label: 'Toast en-page pour les changements de statut', status: 'done' },
      { label: 'Toast publication / modification / suppression', status: 'done' },
      { label: 'Notification utilisateur : correspondance détectée', status: 'todo', note: 'Edge function à créer pour notif push/email' },
      { label: 'Notification utilisateur : fiche identifiée par quelqu\'un', status: 'todo', note: 'À implémenter via conversations ou notifications système' },
      { label: 'Notification utilisateur : restitution confirmée', status: 'todo' },
      { label: 'Notification admin : nouvel objet sensible', status: 'todo' },
      { label: 'Notification admin : signalement', status: 'partial', note: 'ReportButton envoie un signal, dashboard admin à compléter' },
      { label: 'Archivage automatique J+60 (fonction SQL + cron)', status: 'done', note: 'Fonction archive_expired_lost_found() + cron commenté dans bloc LF Extras de /admin/migration' },
    ],
  },
  {
    id: 'trust',
    icon: Star,
    title: 'Réputation & confiance',
    color: 'emerald',
    items: [
      { label: 'TrustScoreMini affiché dans le footer de chaque carte', status: 'done' },
      { label: 'Lost_found enregistré comme InteractionSourceType dans trust.ts', status: 'done' },
      { label: 'related_type \'lost_found\' dans les migrations trust_system', status: 'done' },
      { label: 'trust_interaction créé automatiquement lors de la restitution confirmée', status: 'done', note: 'Implémenté dans handleStatusChange() de perdu-trouve/page.tsx et dashboard/perdu-trouve' },
      { label: 'Badge "Restitution confirmée" pour les profils ayant restitué', status: 'todo', note: 'À ajouter dans le système de badges' },
    ],
  },
  {
    id: 'ux',
    icon: MessageSquare,
    title: 'UX & accessibilité',
    color: 'pink',
    items: [
      { label: 'Design clair, rassurant, civique : gradients orange → emerald, cartes arrondies', status: 'done' },
      { label: 'Hero avec compteurs d\'activité et appels à l\'action', status: 'done' },
      { label: 'Blocs info bas de page (confidentialité, statut identifié, historique séparé)', status: 'done' },
      { label: 'État vide contextuel avec CTA (publier / se connecter)', status: 'done' },
      { label: 'CTA non-connecté en bas de liste', status: 'done' },
      { label: 'Responsive mobile (flex, grid adaptés)', status: 'done' },
      { label: 'Carte animée (animate-pulse) sur correspondances', status: 'done' },
      { label: 'Lightbox photo plein-écran avec zoom, swipe, fond sombre', status: 'done' },
      { label: 'Carte miniature animaux avec conseils vétérinaire/puce', status: 'done' },
    ],
  },
  {
    id: 'premium',
    icon: MapPin,
    title: 'Fonctionnalités premium / innovantes',
    color: 'violet',
    items: [
      { label: 'Impression fiche (window.print + styles dédiés depuis la page détail)', status: 'done' },
      { label: 'QR code fiche', status: 'todo', note: 'Librairie qrcode.react' },
      { label: 'Carte locale des pertes/trouvailles (leaflet/mapbox)', status: 'todo' },
      { label: 'Lieux relais partenaires (mairie, commerces)', status: 'partial', note: 'deposited_at est géré mais sans liste officielle de relais' },
      { label: 'Analytics locaux (catégories fréquentes, taux restitution)', status: 'todo', note: 'Section admin à créer' },
      { label: 'Alerte automatique email/push sur correspondance', status: 'todo' },
      { label: 'Détection / fusion de doublons', status: 'todo', note: 'Modérateur outil à développer' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusIcon(s: ItemStatus) {
  if (s === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (s === 'partial') return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />;
}

function statusBadge(s: ItemStatus) {
  if (s === 'done') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Fait</span>;
  if (s === 'partial') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ Partiel</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">⭕ À faire</span>;
}

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  indigo: 'bg-indigo-500',
  red: 'bg-red-500',
  slate: 'bg-slate-500',
  yellow: 'bg-yellow-500',
  pink: 'bg-pink-500',
  violet: 'bg-violet-500',
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SpecPerduTrouvePage() {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(['catalogue', 'statuts']));

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Calcul global
  const allItems = MODULES.flatMap(m => m.items);
  const doneCount = allItems.filter(i => i.status === 'done').length;
  const partialCount = allItems.filter(i => i.status === 'partial').length;
  const todoCount = allItems.filter(i => i.status === 'todo').length;
  const total = allItems.length;
  const compliance = Math.round((doneCount / total) * 100);

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/admin/spec"
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black">Cahier des charges — Perdu / Trouvé</h1>
              <p className="text-amber-100 text-sm">Bilan de conformité · Biguglia Connect · Vérifié le 2026-04-05</p>
            </div>
          </div>

          {/* Score global */}
          <div className="bg-white/20 border border-white/25 rounded-2xl p-5 mt-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-black text-white">{compliance}%</p>
                <p className="text-amber-100 text-sm">de conformité globale</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xl font-black text-white">{doneCount}</p>
                  <p className="text-xs text-amber-100">✅ Faits</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-200">{partialCount}</p>
                  <p className="text-xs text-amber-100">⏳ Partiels</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white/60">{todoCount}</p>
                  <p className="text-xs text-amber-100">⭕ À faire</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-white transition-colors"
                style={{ width: `${compliance}%` }}
              />
            </div>
            <p className="text-xs text-amber-100 mt-2">{doneCount}/{total} points complétés</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Navigation rapide */}
        <div className="flex gap-2 flex-wrap mb-6">
          {MODULES.map(m => {
            const done = m.items.filter(i => i.status === 'done').length;
            const pct = Math.round((done / m.items.length) * 100);
            return (
              <button key={m.id} onClick={() => {
                setOpenModules(prev => { const n = new Set(prev); n.add(m.id); return n; });
                document.getElementById(`module-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  pct === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  pct >= 60  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                               'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                {pct === 100 ? '✅' : pct >= 60 ? '⏳' : '⭕'} {m.title} ({pct}%)
              </button>
            );
          })}
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {MODULES.map(m => {
            const Icon = m.icon;
            const isOpen = openModules.has(m.id);
            const done = m.items.filter(i => i.status === 'done').length;
            const partial = m.items.filter(i => i.status === 'partial').length;
            const pct = Math.round((done / m.items.length) * 100);
            const accentBg = COLOR_MAP[m.color] ?? 'bg-gray-500';

            return (
              <div key={m.id} id={`module-${m.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleModule(m.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`p-2.5 rounded-xl ${accentBg} text-white flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 text-sm">{m.title}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        pct === 100 ? 'bg-emerald-100 text-emerald-700' :
                        pct >= 60  ? 'bg-amber-100 text-amber-700' :
                                     'bg-gray-100 text-gray-500'
                      }`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${accentBg} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{done}/{m.items.length}</span>
                      {partial > 0 && <span className="text-xs text-amber-500 flex-shrink-0">{partial} partiel{partial > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 pb-5">
                    <ul className="space-y-2 mt-4">
                      {m.items.map((item, idx) => (
                        <li key={idx} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                          item.status === 'done' ? 'bg-emerald-50/50' :
                          item.status === 'partial' ? 'bg-amber-50/50' :
                          'bg-gray-50/50'
                        }`}>
                          {statusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start gap-2">
                              <p className={`text-sm leading-relaxed ${
                                item.status === 'done' ? 'text-gray-700' :
                                item.status === 'partial' ? 'text-amber-800' :
                                'text-gray-400'
                              }`}>
                                {item.label}
                              </p>
                              {statusBadge(item.status)}
                            </div>
                            {item.note && (
                              <p className="text-xs text-gray-400 italic mt-1">💬 {item.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-2xl font-black text-gray-800 mb-1">{compliance}% de conformité</p>
          <p className="text-gray-500 text-sm mb-4">
            {doneCount} points ✅ · {partialCount} partiels ⏳ · {todoCount} à faire ⭕ · Total : {total} points
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/perdu-trouve"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors">
              <Search className="w-4 h-4" /> Voir le module
            </Link>
            <Link href="/dashboard/perdu-trouve"
              className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
              <Users className="w-4 h-4" /> Dashboard utilisateur
            </Link>
            <Link href="/admin/migration"
              className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
              <Database className="w-4 h-4" /> Migration SQL
            </Link>
          </div>
        </div>
      </div>
    </div>

    </>
  );
}
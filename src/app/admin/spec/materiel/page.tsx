'use client';

/**
 * Biguglia Connect — Cahier des charges Matériel / Prêt entre voisins
 * Bilan de conformité — vérifié ligne à ligne vs code réel
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle,
  Package, Wrench, Clock, Users, Star, Shield,
  BarChart3, Database, Bell, Settings, FileText,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Données du cahier des charges ───────────────────────────────────────────

type ItemStatus = 'done' | 'partial' | 'todo';

interface SpecItem {
  label: string;
  status: ItemStatus;
  note?: string;
}

interface SpecModule {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  items: SpecItem[];
}

const MODULES: SpecModule[] = [
  {
    id: 'catalogue',
    icon: Package,
    title: 'Catalogue & liste',
    color: 'teal',
    items: [
      { label: 'Liste paginée (12/page) avec bouton "Charger plus" et compteur', status: 'done' },
      { label: 'Filtres : statut (disponible / réservé / prêté / indisponible / tout)', status: 'done' },
      { label: 'Filtre par catégorie (menu déroulant)', status: 'done' },
      { label: 'Filtre Gratuit seulement', status: 'done' },
      { label: 'Recherche texte (titre, description, lieu)', status: 'done' },
      { label: 'Compteurs rapides cliquables (disponible / réservé / prêté)', status: 'done' },
      { label: 'Lien Communauté matériel', status: 'done' },
      { label: 'Lien Mon matériel (dashboard)', status: 'done' },
      { label: 'Bouton Proposer du matériel', status: 'done' },
      { label: 'Cartes avec : photo, statut coloré, catégorie, prix/gratuit, titre, propriétaire, lieu, état', status: 'done' },
      { label: 'Badge "Votre matériel" pour le propriétaire', status: 'done' },
      { label: 'État vide avec CTA contextuel (connecté / visiteur)', status: 'done' },
    ],
  },
  {
    id: 'statuts',
    icon: Clock,
    title: 'Cycle de vie & statuts',
    color: 'purple',
    items: [
      { label: '6 statuts : disponible → réservé → prêté → rendu → indisponible → archivé', status: 'done' },
      { label: 'Transitions autorisées et interdites (ALLOWED_TRANSITIONS)', status: 'done' },
      { label: 'Labels de transition contextuels ("Réserver pour un emprunteur", etc.)', status: 'done' },
      { label: 'Trigger SQL : log automatique des changements de statut', status: 'done' },
      { label: 'Trigger SQL : sync is_available avec status', status: 'done' },
      { label: 'Trigger SQL : archived_at auto sur archivage', status: 'done' },
      { label: 'Historique des statuts visible par le propriétaire', status: 'done' },
      { label: 'Règles de suppression (impossible si prêt actif ou réservé)', status: 'done' },
      { label: 'Visibilité publique (archivé masqué sauf pour le propriétaire)', status: 'done' },
    ],
  },
  {
    id: 'creation',
    icon: Wrench,
    title: 'Formulaire création/modification',
    color: 'blue',
    items: [
      { label: 'Titre, description, catégorie, état (neuf/très bon/bon/usagé)', status: 'done' },
      { label: 'Gratuit ou tarif journalier', status: 'done' },
      { label: 'Montant de la caution (optionnel)', status: 'done' },
      { label: 'Lieu de récupération', status: 'done' },
      { label: "Règles d'utilisation (optionnel)", status: 'done' },
      { label: 'Upload photos (max 5, stockage Supabase)', status: 'done' },
      { label: 'Modification de toutes les informations (/materiel/[id]/modifier)', status: 'done' },
      { label: 'Suppression avec nettoyage photos Supabase Storage', status: 'done' },
    ],
  },
  {
    id: 'detail',
    icon: FileText,
    title: 'Page détail matériel',
    color: 'indigo',
    items: [
      { label: 'Galerie photos (PhotoGallery avec navigation)', status: 'done' },
      { label: 'Badge statut coloré + description état', status: 'done' },
      { label: 'Prix / Gratuit / Caution', status: 'done' },
      { label: 'Lieu de récupération, date de création, état', status: 'done' },
      { label: 'Description complète + règles utilisation', status: 'done' },
      { label: 'Bloc propriétaire : avatar, nom, bouton contact', status: 'done' },
      { label: 'Message pré-rempli contextuel ("Bonjour, intéressé par votre perceuse...")', status: 'done' },
      { label: 'Réputation du propriétaire (TrustScoreFull)', status: 'done' },
      { label: 'Lien "Voir le profil complet →" vers /profil/[id]', status: 'done' },
      { label: 'Conseils de prêt (vérifier état, rendre propre, signaler problème)', status: 'done' },
      { label: 'Gestion statut propriétaire (transitions disponibles)', status: 'done' },
      { label: 'Bouton Modifier la fiche', status: 'done' },
      { label: 'Bouton Tableau de bord', status: 'done' },
      { label: 'Bouton Partager', status: 'done' },
      { label: 'Bouton Supprimer (avec confirmation)', status: 'done' },
    ],
  },
  {
    id: 'demandes',
    icon: Users,
    title: 'Demandes d\'emprunt',
    color: 'orange',
    items: [
      { label: 'Formulaire de demande avec dates début/fin et message', status: 'done' },
      { label: 'Redirection connexion si visiteur non connecté', status: 'done' },
      { label: 'Blocage si matériel non disponible (affiche raison)', status: 'done' },
      { label: 'Statut "demande en attente" visible par l\'emprunteur', status: 'done' },
      { label: 'Annulation de sa propre demande', status: 'done' },
      { label: 'Liste des demandes en attente visible par le propriétaire', status: 'done' },
      { label: 'Accepter une demande → crée le prêt + réserve le matériel', status: 'done' },
      { label: 'Refuser une demande', status: 'done' },
      { label: 'Accepter auto-refuse les autres demandes en attente', status: 'done' },
      { label: 'Statut de ma dernière demande visible (acceptée/refusée/annulée/terminée)', status: 'done' },
      { label: 'Notification au propriétaire quand nouvelle demande d\'emprunt', status: 'done' },
    ],
  },
  {
    id: 'pret',
    icon: Package,
    title: 'Gestion du prêt',
    color: 'emerald',
    items: [
      { label: 'Bloc "Réservé pour / Prêté à" avec avatar emprunteur visible par propriétaire', status: 'done' },
      { label: 'Bouton "Marquer comme prêté (remis)" → passe statut en prete', status: 'done' },
      { label: 'Bouton "Confirmer le retour" → passe statut en rendu + clôt le prêt', status: 'done' },
      { label: 'Table equipment_loans avec statuts : réservé → en_cours → retourné', status: 'done' },
      { label: 'Dates : reserved_at, loan_started_at, returned_at', status: 'done' },
      { label: 'Notes propriétaire / emprunteur sur le prêt (formulaires dans l\'UI)', status: 'done' },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard propriétaire',
    color: 'cyan',
    items: [
      { label: 'Vue d\'ensemble : total matériel, par statut, prêts actifs, demandes en attente', status: 'done' },
      { label: 'Vue equipment_owner_summary (SQL)', status: 'done' },
      { label: 'Gestion statut depuis le dashboard (transitions)', status: 'done' },
      { label: 'Accepter / refuser les demandes depuis le dashboard', status: 'done' },
      { label: 'Marquer prêté / retour depuis le dashboard', status: 'done' },
      { label: 'Historique des prêts (actifs + terminés)', status: 'done' },
      { label: 'Lien vers la fiche détail de chaque matériel', status: 'done' },
      { label: 'Graphique d\'activité (emprunts par mois, 12 mois, top matériels)', status: 'done' },
    ],
  },
  {
    id: 'confiance',
    icon: Star,
    title: 'Réputation & confiance',
    color: 'amber',
    items: [
      { label: 'Réputation du propriétaire sur la page détail (TrustScoreFull)', status: 'done' },
      { label: 'Score de confiance calculé via trust_profile_stats', status: 'done' },
      { label: 'Badges obtenus affichés', status: 'done' },
      { label: 'Avis reçus uniquement après prêts complétés (trust_interactions)', status: 'done' },
      { label: 'Lien profil complet depuis page matériel', status: 'done' },
      { label: 'Suppression ExchangePrompt + RatingWidget (notation ouverte à tous ❌)', status: 'done' },
      { label: 'trust_interaction créée automatiquement à la clôture du prêt (review_unlocked)', status: 'done' },
    ],
  },
  {
    id: 'securite',
    icon: Shield,
    title: 'Sécurité & RLS',
    color: 'red',
    items: [
      { label: 'RLS equipment_items : lecture publique (hors archivé), modification propriétaire', status: 'done' },
      { label: 'RLS equipment_requests : lecture propriétaire + emprunteur', status: 'done' },
      { label: 'RLS equipment_loans : lecture propriétaire + emprunteur', status: 'done' },
      { label: 'RLS equipment_status_history : lecture propriétaire + admin', status: 'done' },
      { label: 'Suppression bloquée si prêt actif', status: 'done' },
      { label: 'Formulaire emprunt bloqué si visiteur non connecté (redirect /connexion)', status: 'done' },
    ],
  },
  {
    id: 'bdd',
    icon: Database,
    title: 'Base de données',
    color: 'gray',
    items: [
      { label: 'Table equipment_items (colonnes status, archived_at, location_area, etc.)', status: 'done' },
      { label: 'Table equipment_requests', status: 'done' },
      { label: 'Table equipment_loans', status: 'done' },
      { label: 'Table equipment_status_history (audit trail)', status: 'done' },
      { label: 'Vue equipment_owner_summary', status: 'done' },
      { label: 'Index de performance (status, owner, category, requester, borrower)', status: 'done' },
      { label: 'Triggers updated_at (3 tables)', status: 'done' },
      { label: 'Trigger log_equipment_status_change (audit)', status: 'done' },
      { label: 'SQL idempotent dans /admin/migration', status: 'done' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    color: 'pink',
    items: [
      {
        label: 'Notification au propriétaire à chaque nouvelle demande d\'emprunt',
        status: 'partial',
        note: 'Infrastructure Realtime présente mais pas de notification dédiée "nouvelle demande matériel"',
      },
      { label: 'Notification à l\'emprunteur quand sa demande est acceptée ou refusée', status: 'done' },
      { label: 'Notification aux emprunteurs refusés lors de l\'acceptation d\'une autre demande', status: 'done' },
      { label: 'Rappel de retour J-1 (SQL + pg_cron/Edge Function, disponible dans /admin/migration)', status: 'done' },
    ],
  },
  {
    id: 'ux',
    icon: Settings,
    title: 'UX & accessibilité',
    color: 'violet',
    items: [
      { label: 'Vue grille responsive (1 col mobile / 2 tablette / 3 desktop)', status: 'done' },
      { label: 'Skeleton loading pendant le chargement', status: 'done' },
      { label: 'Toasts de confirmation pour toutes les actions', status: 'done' },
      { label: 'États vides avec messages contextuels', status: 'done' },
      { label: 'Retour haut de page / navigation fil d\'Ariane', status: 'done' },
      { label: 'Pagination "Charger plus" (12 par page, compteur total / chargé)', status: 'done' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-800',    badge: 'bg-teal-100 text-teal-700' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-800',  badge: 'bg-purple-100 text-purple-700' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    badge: 'bg-blue-100 text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-800',  badge: 'bg-indigo-100 text-indigo-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-100 text-orange-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    badge: 'bg-cyan-100 text-cyan-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-100 text-red-700' },
  gray:    { bg: 'bg-gray-50',    border: 'border-gray-200',    text: 'text-gray-800',    badge: 'bg-gray-100 text-gray-700' },
  pink:    { bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-800',    badge: 'bg-pink-100 text-pink-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  badge: 'bg-violet-100 text-violet-700' },
};

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'done')    return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />;
  if (status === 'partial') return <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />;
  return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />;
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function SpecMaterielPage() {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) =>
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));

  // Calculs globaux
  const allItems = MODULES.flatMap(m => m.items);
  const totalDone    = allItems.filter(i => i.status === 'done').length;
  const totalPartial = allItems.filter(i => i.status === 'partial').length;
  const totalTodo    = allItems.filter(i => i.status === 'todo').length;
  const total        = allItems.length;
  const pctDone      = Math.round((totalDone / total) * 100);
  const pctPartial   = Math.round((totalPartial / total) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Admin
        </Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/spec" className="text-gray-500 hover:text-gray-800 transition text-sm">Specs</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">Matériel</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🔧</span>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Cahier des charges — Matériel</h1>
            <p className="text-gray-500 text-sm">Prêt de matériel entre voisins — Biguglia Connect</p>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-800">Conformité globale</span>
            <span className="text-2xl font-black text-emerald-600">{pctDone}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-emerald-400 h-full transition-all"
                style={{ width: `${pctDone}%` }}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${pctPartial}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-gray-600"><strong className="text-emerald-700">{totalDone}</strong> terminés</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-gray-600"><strong className="text-amber-700">{totalPartial}</strong> partiels</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <span className="text-gray-600"><strong className="text-red-500">{totalTodo}</strong> à faire</span>
            </div>
            <div className="ml-auto text-gray-400 text-xs">{total} points au total</div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {MODULES.map(mod => {
          const colors = COLOR_MAP[mod.color] || COLOR_MAP.gray;
          const done    = mod.items.filter(i => i.status === 'done').length;
          const partial = mod.items.filter(i => i.status === 'partial').length;
          const todo    = mod.items.filter(i => i.status === 'todo').length;
          const pct     = Math.round((done / mod.items.length) * 100);
          const isOpen  = openModules[mod.id] ?? true;
          const Icon    = mod.icon;

          return (
            <div key={mod.id} className={`rounded-2xl border overflow-hidden ${colors.border}`}>
              {/* Header module */}
              <button
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-center justify-between px-5 py-4 ${colors.bg} hover:opacity-90 transition`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                  <span className={`font-bold ${colors.text}`}>{mod.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                    {done}/{mod.items.length}
                  </span>
                  {todo > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">
                      {todo} à faire
                    </span>
                  )}
                  {partial > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                      {partial} partiel{partial > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-white/60 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-sm font-black ${pct === 100 ? 'text-emerald-600' : colors.text}`}>
                      {pct}%
                    </span>
                  </div>
                  {isOpen
                    ? <ChevronUp className={`w-4 h-4 ${colors.text}`} />
                    : <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                  }
                </div>
              </button>

              {/* Items */}
              {isOpen && (
                <div className="divide-y divide-gray-50">
                  {mod.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-5 py-3 bg-white hover:bg-gray-50 transition">
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${item.status === 'todo' ? 'text-gray-400' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                        {item.note && (
                          <p className="text-xs text-amber-600 mt-0.5 italic">{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Points à implémenter */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Points restants à implémenter
        </h3>
        <div className="space-y-2">
          {allItems
            .filter(i => i.status === 'todo' || i.status === 'partial')
            .map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <StatusIcon status={item.status} />
                <div>
                  <span className="text-sm text-amber-800">{item.label}</span>
                  {item.note && <p className="text-xs text-amber-600 italic mt-0.5">{item.note}</p>}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Cahier des charges Biguglia Connect — Module Matériel · Vérifié le {new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}

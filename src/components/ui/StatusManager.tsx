'use client';

/**
 * StatusManager — Panneau de gestion du statut pour les créateurs
 *
 * Affiche les actions disponibles selon le type de contenu et le statut actuel.
 * Gère les transitions cohérentes et affiche les boutons d'action créateur.
 */

import { useState } from 'react';
import {
  ChevronDown, CheckCircle2, Archive, Trash2, Pause, Play,
  Eye, EyeOff, AlertCircle, Handshake, RotateCcw, X,
  BadgeCheck, Clock, Lock, Zap, Users, CalendarX, Package,
  Shield, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from './StatusBadge';
import toast from 'react-hot-toast';

// ─── Types de contenu et leurs transitions possibles ─────────────────────────

export type ContentType =
  | 'listing'
  | 'equipment'
  | 'help_request'
  | 'outing'
  | 'event'
  | 'lost_found';

interface StatusAction {
  key: string;           // nouveau statut cible
  label: string;         // texte bouton
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  confirmMessage?: string;
}

// Transitions autorisées par type et statut actuel
const TRANSITIONS: Record<ContentType, Record<string, StatusAction[]>> = {
  listing: {
    active: [
      { key: 'reserved', label: 'Marquer réservé', icon: Lock, variant: 'warning' },
      { key: 'sold', label: 'Marquer vendu', icon: BadgeCheck, variant: 'success', confirmMessage: 'Marquer cette annonce comme vendue ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral', confirmMessage: 'Archiver cette annonce ?' },
    ],
    reserved: [
      { key: 'active', label: 'Remettre en vente', icon: Zap, variant: 'primary' },
      { key: 'sold', label: 'Confirmer la vente', icon: BadgeCheck, variant: 'success', confirmMessage: 'Confirmer la vente ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral', confirmMessage: 'Archiver cette annonce ?' },
    ],
    sold: [
      { key: 'active', label: 'Remettre en vente', icon: Zap, variant: 'primary', confirmMessage: 'Remettre cette annonce en vente ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    expired: [
      { key: 'active', label: 'Republier', icon: Zap, variant: 'primary' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'active', label: 'Restaurer', icon: RotateCcw, variant: 'primary', confirmMessage: 'Restaurer cette annonce ?' },
    ],
  },

  equipment: {
    available: [
      { key: 'unavailable', label: 'Marquer indisponible', icon: EyeOff, variant: 'warning' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral', confirmMessage: 'Archiver ce matériel ?' },
    ],
    borrowed: [
      { key: 'available', label: 'Marquer rendu', icon: CheckCircle2, variant: 'success', confirmMessage: 'Confirmer le retour du matériel ?' },
    ],
    unavailable: [
      { key: 'available', label: 'Remettre disponible', icon: CheckCircle2, variant: 'success' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'available', label: 'Restaurer', icon: RotateCcw, variant: 'primary', confirmMessage: 'Restaurer ce matériel ?' },
    ],
  },

  help_request: {
    active: [
      { key: 'in_progress', label: 'Aide en cours', icon: Zap, variant: 'primary' },
      { key: 'paused', label: 'Mettre en pause', icon: Pause, variant: 'warning' },
      { key: 'resolved', label: 'Marquer résolu', icon: CheckCircle2, variant: 'success', confirmMessage: 'Marquer cette demande comme résolue ?' },
      { key: 'closed', label: 'Fermer', icon: X, variant: 'neutral', confirmMessage: 'Fermer définitivement ?' },
    ],
    in_progress: [
      { key: 'resolved', label: 'Marquer résolu', icon: CheckCircle2, variant: 'success', confirmMessage: 'Marquer comme résolu ?' },
      { key: 'paused', label: 'Mettre en pause', icon: Pause, variant: 'warning' },
      { key: 'closed', label: 'Fermer', icon: X, variant: 'neutral', confirmMessage: 'Fermer définitivement ?' },
    ],
    paused: [
      { key: 'active', label: 'Réactiver', icon: Play, variant: 'success' },
      { key: 'resolved', label: 'Marquer résolu', icon: CheckCircle2, variant: 'success' },
      { key: 'closed', label: 'Fermer', icon: X, variant: 'neutral' },
    ],
    resolved: [
      { key: 'active', label: 'Réouvrir', icon: Play, variant: 'primary', confirmMessage: 'Réouvrir cette demande ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    closed: [
      { key: 'active', label: 'Réouvrir', icon: Play, variant: 'primary', confirmMessage: 'Réouvrir ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'active', label: 'Restaurer', icon: RotateCcw, variant: 'primary' },
    ],
  },

  outing: {
    active: [
      { key: 'cancelled', label: 'Annuler la sortie', icon: X, variant: 'danger', confirmMessage: 'Annuler définitivement cette sortie ?' },
      { key: 'completed', label: 'Marquer terminée', icon: CheckCircle2, variant: 'success', confirmMessage: 'Marquer cette sortie comme terminée ?' },
    ],
    full: [
      { key: 'active', label: 'Rouvrir les inscriptions', icon: Play, variant: 'primary' },
      { key: 'cancelled', label: 'Annuler la sortie', icon: X, variant: 'danger', confirmMessage: 'Annuler ?' },
    ],
    cancelled: [
      { key: 'active', label: 'Réactiver', icon: Play, variant: 'primary', confirmMessage: 'Réactiver cette sortie ?' },
    ],
    completed: [
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'active', label: 'Restaurer', icon: RotateCcw, variant: 'primary' },
    ],
  },

  event: {
    active: [
      { key: 'cancelled', label: 'Annuler', icon: CalendarX, variant: 'danger', confirmMessage: "Annuler cet événement ? Les participants seront notifiés." },
      { key: 'completed', label: 'Marquer terminé', icon: CheckCircle2, variant: 'success' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    cancelled: [
      { key: 'active', label: 'Réactiver', icon: Play, variant: 'primary', confirmMessage: 'Réactiver cet événement ?' },
    ],
    completed: [
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'active', label: 'Restaurer', icon: RotateCcw, variant: 'primary' },
    ],
  },

  lost_found: {
    active: [
      { key: 'resolved', label: 'Marquer restitué / clos', icon: CheckCircle2, variant: 'success', confirmMessage: 'Marquer cet objet comme restitué ou retrouvé ?' },
      { key: 'closed', label: 'Fermer sans suite', icon: X, variant: 'neutral', confirmMessage: 'Fermer sans suite ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    resolved: [
      { key: 'active', label: 'Réouvrir', icon: Play, variant: 'primary', confirmMessage: 'Réouvrir cette déclaration ?' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    closed: [
      { key: 'active', label: 'Réouvrir', icon: Play, variant: 'primary' },
      { key: 'archived', label: 'Archiver', icon: Archive, variant: 'neutral' },
    ],
    archived: [
      { key: 'active', label: 'Restaurer', icon: RotateCcw, variant: 'primary' },
    ],
  },
};

// ─── Variant → couleur bouton ────────────────────────────────────────────────

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  neutral: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface StatusManagerProps {
  contentType: ContentType;
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  onDelete?: () => void;
  onArchive?: () => void;
  className?: string;
  compact?: boolean;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function StatusManager({
  contentType,
  currentStatus,
  onStatusChange,
  onDelete,
  className,
  compact = false,
}: StatusManagerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Normalise le statut pour le lookup
  const normalizedStatus = currentStatus === 'available' ? 'available'
    : currentStatus === 'active' ? 'active'
    : currentStatus;

  const actions = TRANSITIONS[contentType]?.[normalizedStatus] || [];
  const statusConf = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.active;

  const handleAction = async (action: StatusAction) => {
    if (action.confirmMessage) {
      if (!window.confirm(action.confirmMessage)) return;
    }
    setBusy(action.key);
    setOpen(false);
    try {
      await onStatusChange(action.key);
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[action.key]?.label || action.key}`);
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setBusy(null);
    }
  };

  if (actions.length === 0) return null;

  if (compact) {
    // Version compacte : dropdown inline
    return (
      <div className={cn('relative inline-block', className)}>
        <button
          onClick={() => setOpen(!open)}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Shield className="w-3 h-3 text-gray-500" />
          Changer le statut
          <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden min-w-[200px]">
              {actions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    onClick={() => handleAction(action)}
                    disabled={!!busy}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0',
                      action.variant === 'danger' ? 'text-red-500' :
                      action.variant === 'success' ? 'text-emerald-600' :
                      action.variant === 'warning' ? 'text-amber-600' :
                      action.variant === 'primary' ? 'text-brand-600' : 'text-gray-500'
                    )} />
                    {busy === action.key ? 'Mise à jour...' : action.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Version complète : liste de boutons
  return (
    <div className={cn('', className)}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" />
        Actions créateur
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={!!busy}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50',
                VARIANT_STYLES[action.variant]
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {busy === action.key ? 'En cours…' : action.label}
            </button>
          );
        })}
        {onDelete && (
          <button
            onClick={() => {
              if (window.confirm('Supprimer définitivement ? Cette action est irréversible.')) {
                onDelete();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── StatusHistoryBadge — affiche le statut + date si disponible ─────────────

interface StatusHistoryBadgeProps {
  status: string;
  updatedAt?: string;
  resolvedAt?: string;
  archivedAt?: string;
  className?: string;
}

export function StatusHistoryBadge({ status, updatedAt, resolvedAt, archivedAt, className }: StatusHistoryBadgeProps) {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const Icon = conf.icon;

  const dateToShow = archivedAt || resolvedAt || updatedAt;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
        conf.bg, conf.text, conf.border
      )}>
        <Icon className="w-3 h-3" />
        {conf.label}
      </span>
      {dateToShow && (
        <span className="text-xs text-gray-400">
          mis à jour {new Date(dateToShow).toLocaleDateString('fr-FR')}
        </span>
      )}
    </div>
  );
}

// ─── StatusFilterBar — barre de filtres par statut ──────────────────────────

interface StatusFilterItem {
  key: string;
  label: string;
  count?: number;
}

interface StatusFilterBarProps {
  items: StatusFilterItem[];
  selected: string;
  onChange: (key: string) => void;
  className?: string;
}

export function StatusFilterBar({ items, selected, onChange, className }: StatusFilterBarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map(item => {
        const conf = STATUS_CONFIG[item.key];
        const isSelected = selected === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              isSelected
                ? conf ? `${conf.bg} ${conf.text} ${conf.border}` : 'bg-brand-100 text-brand-700 border-brand-300'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            )}
          >
            {conf && isSelected && <conf.icon className="w-3 h-3" />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                isSelected ? 'bg-white/50' : 'bg-gray-100 text-gray-500'
              )}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

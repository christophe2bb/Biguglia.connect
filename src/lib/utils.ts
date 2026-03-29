import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return formatDateShort(dateStr);
}

export function formatPrice(price?: number | null): string {
  if (!price && price !== 0) return 'Gratuit';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export const URGENCY_LABELS: Record<string, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  tres_urgent: 'Très urgent',
};

export const URGENCY_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  urgent: 'bg-orange-100 text-orange-700',
  tres_urgent: 'bg-red-100 text-red-700',
};

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Envoyée',
  viewed: 'Vue',
  replied: 'Répondue',
  scheduled: 'Planifiée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  pending: 'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
  rescheduled: 'Reportée',
  active: 'Active',
  sold: 'Vendu',
  archived: 'Archivée',
  approved: 'Approuvée',
  rejected: 'Refusée',
  borrowed: 'En prêt',
  returned: 'Retourné',
};

export const CONDITION_LABELS: Record<string, string> = {
  neuf: 'Neuf',
  tres_bon: 'Très bon état',
  bon: 'Bon état',
  usage: 'Usagé',
  excellent: 'Excellent',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: 'À vendre',
  wanted: 'Recherché',
  free: 'Gratuit',
  service: 'Service',
};

export const LISTING_TYPE_COLORS: Record<string, string> = {
  sale: 'bg-blue-100 text-blue-700',
  wanted: 'bg-purple-100 text-purple-700',
  free: 'bg-green-100 text-green-700',
  service: 'bg-orange-100 text-orange-700',
};

export const ROLE_LABELS: Record<string, string> = {
  resident: 'Résident',
  artisan_pending: 'Artisan (en attente)',
  artisan_verified: 'Artisan vérifié',
  moderator: 'Modérateur',
  admin: 'Administrateur',
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

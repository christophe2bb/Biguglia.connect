'use client';

import { Flag, Users, FileText, ShoppingBag, MessageSquare } from 'lucide-react';

export const REASON_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  fake:       { label: 'Fausse annonce',    color: 'text-orange-600 bg-orange-50 border-orange-200', emoji: '🤥' },
  spam:       { label: 'Spam',              color: 'text-yellow-600 bg-yellow-50 border-yellow-200', emoji: '📢' },
  insulte:    { label: 'Insulte',           color: 'text-red-600 bg-red-50 border-red-200',          emoji: '😡' },
  arnaque:    { label: 'Arnaque',           color: 'text-red-700 bg-red-100 border-red-300',         emoji: '⚠️' },
  interdit:   { label: 'Contenu interdit',  color: 'text-red-800 bg-red-200 border-red-400',         emoji: '🚫' },
  hors_sujet: { label: 'Hors sujet',        color: 'text-blue-600 bg-blue-50 border-blue-200',       emoji: '📂' },
  autre:      { label: 'Autre',             color: 'text-gray-600 bg-gray-50 border-gray-200',       emoji: '💬' },
};

export const TYPE_LABELS: Record<string, { label: string; icon: typeof Flag; href?: (id: string) => string }> = {
  user:           { label: 'Utilisateur',       icon: Users,       href: (_id: string) => `/admin/utilisateurs` },
  post:           { label: 'Post forum',         icon: FileText,    href: (id: string) => `/forum/${id}` },
  listing:        { label: 'Annonce',            icon: ShoppingBag, href: (id: string) => `/annonces/${id}` },
  equipment:      { label: 'Matériel',           icon: ShoppingBag, href: (id: string) => `/materiel/${id}` },
  message:        { label: 'Message',            icon: MessageSquare },
  event:          { label: 'Événement',          icon: Flag,        href: (_id: string) => `/evenements` },
  promenade:      { label: 'Promenade',          icon: Flag,        href: (_id: string) => `/promenades` },
  outing:         { label: 'Sortie groupée',     icon: Users,       href: (_id: string) => `/promenades` },
  association:    { label: 'Association',        icon: Users,       href: (_id: string) => `/associations` },
  lost_found:     { label: 'Perdu/Trouvé',       icon: Flag,        href: (_id: string) => `/perdu-trouve` },
  collection_item:{ label: 'Collectionneur',     icon: ShoppingBag, href: (_id: string) => `/collectionneurs` },
  help_request:   { label: 'Coup de main',       icon: Flag,        href: (_id: string) => `/coups-de-main` },
};

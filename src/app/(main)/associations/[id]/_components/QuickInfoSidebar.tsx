'use client';

import Link from 'next/link';
import {
  Star, Shield, Bell, BellOff, CheckCircle2, ChevronRight,
  Building2, Handshake, Calendar, MessageSquare, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { CAT_CONFIG } from '../_config';
import type { Association } from '../_types';
import { useAssoFollow } from '../../_hooks/useAssoFollow';

type Props = {
  asso: Association;
  isAuthor: boolean;
  isLoggedIn: boolean;
};

const SEE_ALSO_LINKS = [
  { href: '/associations',  icon: Building2,    label: 'Toutes les associations', sub: 'Retour à la liste' },
  { href: '/coups-de-main', icon: Handshake,    label: 'Coups de main',           sub: 'Entraide & bénévolat' },
  { href: '/evenements',    icon: Calendar,     label: 'Événements',              sub: 'Agenda communautaire' },
  { href: '/messages',      icon: MessageSquare,label: 'Messages',                sub: 'Messagerie directe' },
] as const;

export function QuickInfoSidebar({ asso, isAuthor, isLoggedIn }: Props) {
  const cat = CAT_CONFIG[asso.category];
  const { following, loading, checked, toggle } = useAssoFollow(asso.id);

  return (
    <div className="space-y-5">

      {/* ── Infos rapides ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-violet-500" /> Infos rapides
        </h3>
        <div className="space-y-2.5 text-sm">

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Catégorie</span>
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', cat.bg, cat.color)}>
              {cat.emoji} {cat.label}
            </span>
          </div>

          {asso.sector_id && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">Secteur</span>
              <SectorBadge sectorId={asso.sector_id} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Statut</span>
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              asso.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              asso.status === 'draft'  ? 'bg-gray-100 text-gray-600'      :
                                         'bg-amber-100 text-amber-700',
            )}>
              {asso.status === 'active' ? '✅ Active' : asso.status === 'draft' ? '📋 Brouillon' : '⏸️ Inactive'}
            </span>
          </div>

          {asso.declared && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">Déclaration</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Préfecture
              </span>
            </div>
          )}

          {asso.rna_number && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">RNA</span>
              <span className="text-xs text-gray-600 font-mono">{asso.rna_number}</span>
            </div>
          )}

          {asso.membership_required && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">Adhésion</span>
              <span className="text-xs font-bold text-amber-700">🎫 Obligatoire</span>
            </div>
          )}

          {asso.capacity && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">Capacité</span>
              <span className="text-xs font-bold text-gray-700">{asso.capacity} places</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Published by ───────────────────────────────────────────────────── */}
      {asso.author?.full_name && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" /> Publié par
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-black text-sm flex-shrink-0">
              {asso.author.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{asso.author.full_name}</p>
              <p className="text-xs text-gray-400">Référent association</p>
            </div>
          </div>
          {isAuthor && (
            <Link
              href="/associations"
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-gray-200 transition-colors"
            >
              ✏️ Modifier ma fiche
            </Link>
          )}
        </div>
      )}

      {/* ── Notifications / Suivi ──────────────────────────────────────────── */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">
        <h3 className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" /> Restez informé
        </h3>

        {!isLoggedIn ? (
          <>
            <p className="text-xs text-emerald-700 mb-3">
              Connectez-vous pour être alerté des mises à jour et nouveaux besoins de cette association.
            </p>
            <Link
              href="/connexion"
              className="w-full text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" /> Se connecter pour les alertes
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs text-emerald-700 mb-3">
              {!checked
                ? 'Chargement…'
                : following
                  ? "✅ Vous recevrez une notification dès qu'une mise à jour est publiée."
                  : 'Soyez alerté des mises à jour et nouveaux besoins de cette association.'}
            </p>
            <button
              onClick={toggle}
              disabled={loading || !checked}
              className={cn(
                'w-full text-xs font-bold py-2 rounded-xl border transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60',
                following
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border-emerald-300',
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : following ? (
                <BellOff className="w-3.5 h-3.5" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              {loading
                ? 'Mise à jour…'
                : following
                  ? 'Se désabonner'
                  : 'Activer les alertes'}
            </button>
            {following && (
              <p className="text-[10px] text-emerald-500 mt-2 text-center">
                Gérez vos abonnements dans{' '}
                <Link href="/notifications" className="underline font-semibold">
                  vos notifications
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Voir aussi ─────────────────────────────────────────────────────── */}
      <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-violet-800 mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-violet-500" /> Voir aussi
        </h3>
        <div className="space-y-2">
          {SEE_ALSO_LINKS.map(({ href, icon: Icon, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors group"
            >
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-violet-800 group-hover:text-violet-600 truncate">{label}</p>
                <p className="text-[10px] text-violet-400">{sub}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-violet-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Package, Wrench, Heart, HelpCircle, Calendar, Footprints,
  BookOpen, Handshake, Trophy, MapPin, ChevronRight, Plus, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useDashboardData } from '@/hooks/useDashboardData';
import { SectionHeader, ContentRow, StatusBreakdown, SkeletonRows } from '../_components/DashWidgets';

type DashData = ReturnType<typeof useDashboardData>;

interface Props { dashData: DashData }

const PAGE_SIZE = 5;

/** Bouton "Voir plus / Réduire" réutilisable dans les listes paginées */
function ShowMoreBtn({
  visible, total, href, onMore, onLess,
}: {
  visible: number; total: number; href: string;
  onMore: () => void; onLess: () => void;
}) {
  if (total <= PAGE_SIZE) return null;
  const hasMore = visible < total;
  return (
    <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-50 mt-1">
      {hasMore ? (
        <button
          onClick={onMore}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {Math.min(PAGE_SIZE, total - visible)} de plus
        </button>
      ) : (
        <button
          onClick={onLess}
          className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Réduire
        </button>
      )}
      <Link href={href} className="text-xs font-semibold text-gray-400 hover:text-brand-600 transition-colors">
        Vue complète →
      </Link>
    </div>
  );
}

export default function ContenusTab({ dashData }: Props) {
  const { stats, recentContents, loading } = dashData;

  const [listingsVisible,  setListingsVisible]  = useState(PAGE_SIZE);
  const [equipmentVisible, setEquipmentVisible] = useState(PAGE_SIZE);

  const allListings  = recentContents.filter(c => c.type === 'listing');
  const allEquipment = recentContents.filter(c => c.type === 'equipment');

  // Listings: actifs d'abord, archivés à la suite
  const orderedListings = [
    ...allListings.filter(c => !c.isClosed),
    ...allListings.filter(c => c.isClosed),
  ];

  const visibleListings  = orderedListings.slice(0, listingsVisible);
  const visibleEquipment = allEquipment.slice(0, equipmentVisible);

  const moreListings  = useCallback(() => setListingsVisible(v => v + PAGE_SIZE),  []);
  const lessListings  = useCallback(() => setListingsVisible(PAGE_SIZE),            []);
  const moreEquipment = useCallback(() => setEquipmentVisible(v => v + PAGE_SIZE), []);
  const lessEquipment = useCallback(() => setEquipmentVisible(PAGE_SIZE),          []);

  return (
    <div className="space-y-5">
      <SectionHeader icon={Package} title="Mes contenus"
        subtitle="Tous vos publications et créations"
        color="text-brand-600" href="/dashboard/contenus" linkLabel="Vue détaillée" />

      {/* ── Annonces ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-blue-50/50">
          <span className="text-sm font-bold text-blue-700 flex items-center gap-2">
            <Package className="w-4 h-4" /> Annonces ({stats.totalListings})
          </span>
          <Link href="/annonces/nouvelle" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3 h-3" /> Nouvelle
          </Link>
        </div>
        <StatusBreakdown counts={stats.listingsByStatus} type="listing" />
        <div className="p-3">
          {loading ? <SkeletonRows n={3} /> :
           allListings.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune annonce publiée
              <Link href="/annonces/nouvelle" className="block mt-2 text-xs font-semibold text-brand-600 hover:underline">
                Publier ma première annonce →
              </Link>
            </div>
          ) : (
            <>
              {visibleListings.map(item => <ContentRow key={item.id} item={item} />)}
              <ShowMoreBtn
                visible={listingsVisible} total={orderedListings.length}
                href="/dashboard/contenus"
                onMore={moreListings} onLess={lessListings}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Matériel ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-sky-50/50">
          <span className="text-sm font-bold text-sky-700 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Matériel ({stats.activeEquipment})
          </span>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/materiel" className="text-xs font-bold text-sky-600 hover:text-sky-700">Gérer →</Link>
            <Link href="/materiel/nouveau" className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700">
              <Plus className="w-3 h-3" /> Ajouter
            </Link>
          </div>
        </div>
        <StatusBreakdown counts={stats.equipmentByStatus} type="equipment" />
        <div className="p-3">
          {loading ? <SkeletonRows n={2} /> :
           allEquipment.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-sm">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucun matériel à prêter
              <Link href="/materiel/nouveau" className="block mt-2 text-xs font-semibold text-sky-600 hover:underline">
                Ajouter du matériel →
              </Link>
            </div>
          ) : (
            <>
              {visibleEquipment.map(item => <ContentRow key={item.id} item={item} />)}
              <ShowMoreBtn
                visible={equipmentVisible} total={allEquipment.length}
                href="/dashboard/materiel"
                onMore={moreEquipment} onLess={lessEquipment}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Coups de main + Perdu/Trouvé ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/coups-de-main">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50">
                <Heart className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Coups de main ({Object.values(stats.helpsByStatus).reduce((s, v) => s + v, 0)})
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
            <StatusBreakdown counts={stats.helpsByStatus} type="help" />
          </div>
        </Link>
        <Link href="/perdu-trouve">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50">
                <HelpCircle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Perdu/Trouvé ({Object.values(stats.lostFoundByStatus).reduce((s, v) => s + v, 0)})
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
            <StatusBreakdown counts={stats.lostFoundByStatus} type="lost_found" />
          </div>
        </Link>
      </div>

      {/* ── Other content links ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {([
          { icon: Calendar,  label: `${stats.upcomingEvents} événement(s)`,    href: '/dashboard/evenements',     color: 'text-purple-600',  bg: 'bg-purple-50'  },
          { icon: Footprints,label: `${stats.upcomingOutings} sortie(s)`,      href: '/dashboard/promenades',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: BookOpen,  label: `${stats.forumPosts} sujet(s) forum`,      href: '/forum',                    color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { icon: Handshake, label: `${stats.associations} association(s)`,    href: '/associations',             color: 'text-teal-600',    bg: 'bg-teal-50'    },
          { icon: Trophy,    label: `${stats.activeCollections} collection(s)`,href: '/dashboard/collectionneurs',color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { icon: MapPin,    label: 'Toutes mes publications',                  href: '/dashboard/contenus',       color: 'text-brand-600',   bg: 'bg-brand-50'   },
        ] as const).map(item => (
          <Link key={item.href} href={item.href}>
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                <item.icon className={cn('w-4 h-4', item.color)} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

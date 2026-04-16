'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Flag } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

import { TABS, STAT_CARDS } from './_config';
import { useAdminCounts } from './_hooks/useAdminCounts';
import ListingsTab  from './_components/ListingsTab';
import ForumTab     from './_components/ForumTab';
import EquipmentTab from './_components/EquipmentTab';
import ReviewsTab   from './_components/ReviewsTab';
import type { TabId } from './_types';

export default function AdminContenuPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('listings');

  const counts = useAdminCounts(!!profile);


  // sans polluer l'historique du navigateur.

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-6 h-6 text-brand-600" /> Gestion du contenu
            </h1>
            <p className="text-sm text-gray-500">
              Modérer les annonces, posts forum, équipements et avis · Pouvoirs complets
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map(({ tab, label, icon: Icon, color, bg }) => (
            <div key={tab} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`inline-flex p-2 rounded-xl ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{counts[tab]}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {counts[id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === id ? 'bg-gray-100 text-gray-600' : 'bg-white/60 text-gray-500'
                }`}>
                  {counts[id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active tab panel */}
        {activeTab === 'listings'  && <ListingsTab />}
        {activeTab === 'forum'     && <ForumTab />}
        {activeTab === 'equipment' && <EquipmentTab />}
        {activeTab === 'reviews'   && <ReviewsTab />}

      </div>
    </>
  );
}

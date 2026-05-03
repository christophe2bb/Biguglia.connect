'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import CalendarView from './CalendarView';
import SectorExplorer from './SectorExplorer';
import type { LocalEvent } from '../_types';

interface Props {
  events: LocalEvent[];
  userId?: string;
  loading: boolean;
  onJoin: (id: string, joined: boolean) => void;
  onStatusChange: (id: string, s: string) => void;
  profile: { id: string } | null;
  sectorCounts: Record<string, number>;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  totalFiltered: number;
}

export default function TabAgenda({ events, userId, loading, onJoin, onStatusChange, profile, sectorCounts, filterSector, setFilterSector, totalFiltered }: Props) {
  const displayedEvents = filterSector
    ? events.filter(e =>
        filterSector === 'ville' ? !e.sector_id : e.sector_id === filterSector
      )
    : events;

  return (
    <div>
      <SectorExplorer
        sectorCounts={sectorCounts}
        filterSector={filterSector}
        setFilterSector={setFilterSector}
        totalFiltered={totalFiltered}
      />
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <CalendarView events={displayedEvents} userId={userId} onJoin={onJoin} onStatusChange={onStatusChange} />
      )}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
        <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-purple-800 mb-1">🔔 Ne ratez aucun événement</p>
          <p className="text-purple-600 text-sm">
            Cliquez sur un jour puis « Participer » pour être notifié avant l&apos;événement.
            {!profile && (
              <> <Link href="/inscription" className="underline font-medium">Créez un compte</Link> pour activer les alertes.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, PartyPopper, Shield, Loader2, UserX } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { TrustScoreFull } from '@/components/ui/TrustScore';
import { usePublicProfile } from './_hooks/usePublicProfile';
import { ProfileHeader }    from './_sections/ProfileHeader';
import { TabInfo }          from './_sections/TabInfo';
import { TabEvents }        from './_sections/TabEvents';
import { type ProfileTab }  from './_types';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const rawParams = useParams();
  const userId    = (Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id) ?? '';
  const router    = useRouter();
  const { profile: me } = useAuthStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');

  const {
    loading, notFound, publicProfile, events, upcomingEvents, pastEvents,
  } = usePublicProfile(userId);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // ── 404 ──────────────────────────────────────────────────────────────────

  if (notFound || !publicProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <UserX className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-700">Profil introuvable</h1>
        <p className="text-gray-500 text-center">Ce profil n&apos;existe pas ou a été supprimé.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  // ── Derived flags ─────────────────────────────────────────────────────────

  const isMe         = me?.id === userId;
  const isAdmin      = me?.role === 'admin' || me?.role === 'moderator';
  const canSeeContact = isMe || isAdmin;

  // ── Tabs config ───────────────────────────────────────────────────────────

  const TABS: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info',   label: 'Informations',            icon: <Users className="w-4 h-4" /> },
    { key: 'events', label: `Événements (${events.length})`, icon: <PartyPopper className="w-4 h-4" /> },
    { key: 'trust',  label: 'Confiance',               icon: <Shield className="w-4 h-4" /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      <ProfileHeader
        profile={publicProfile}
        isMe={isMe}
        meId={me?.id}
        onBack={() => router.back()}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'info' && (
          <TabInfo
            profile={publicProfile}
            totalEvents={events.length}
            upcomingCount={upcomingEvents.length}
            isMe={isMe}
            canSeeContact={canSeeContact}
            meId={me?.id}
          />
        )}

        {activeTab === 'trust' && (
          <TrustScoreFull profile={publicProfile} />
        )}

        {activeTab === 'events' && (
          <TabEvents upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
        )}
      </div>
    </div>
  );
}

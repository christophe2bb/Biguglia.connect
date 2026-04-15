/**
 * HomeCommunitySection — composant async Server Component
 * Charge les données communautaires (stats, artisans, helpers, membres, events)
 * de manière isolée pour ne pas bloquer le rendu de la page.
 * Utilisé avec <Suspense> dans page.tsx.
 */
import {
  fetchCommunityStats,
  fetchTopArtisans,
  fetchRecentHelpers,
  fetchActiveMembersSpotlight,
  fetchRecentEvents,
} from '@/services/community/queries';
import CommunitySpotlight from './CommunitySpotlight';
import type { SpotlightArtisan, SpotlightHelper, SpotlightMember, SpotlightEvent, CommunityStats } from '@/services/community/queries';

export default async function HomeCommunitySection() {
  let communityStats: CommunityStats = { totalMembers: 0, totalHelps: 0, totalEvents: 0, totalListings: 0, totalForumTopics: 0, activeThisWeek: 0 };
  let spotlightArtisans: SpotlightArtisan[] = [];
  let recentHelpers: SpotlightHelper[] = [];
  let activeMembers: SpotlightMember[] = [];
  let recentEvents: SpotlightEvent[] = [];

  try {
    const [cs, sa, rh, am, re] = await Promise.allSettled([
      fetchCommunityStats(),
      fetchTopArtisans(4),
      fetchRecentHelpers(5),
      fetchActiveMembersSpotlight(6),
      fetchRecentEvents(3),
    ]);
    if (cs.status === 'fulfilled') communityStats = cs.value;
    if (sa.status === 'fulfilled') spotlightArtisans = sa.value;
    if (rh.status === 'fulfilled') recentHelpers = rh.value;
    if (am.status === 'fulfilled') activeMembers = am.value;
    if (re.status === 'fulfilled') recentEvents = re.value;
  } catch {
    communityStats = { totalMembers: 0, totalHelps: 0, totalEvents: 0, totalListings: 0, totalForumTopics: 0, activeThisWeek: 0 };
  }

  return (
    <CommunitySpotlight
      stats={communityStats}
      artisans={spotlightArtisans}
      helpers={recentHelpers}
      members={activeMembers}
      events={recentEvents}
    />
  );
}

/**
 * src/app/admin/migration/page.tsx
 *
 * Orchestrateur de la page d'administration Migration.
 * Toute la logique est dans _hooks/useMigration.ts.
 * Tout le rendu SQL est dans les composants _components/*.
 */

'use client';

import ProtectedPage from '@/components/providers/ProtectedPage';
import { useMigration } from './_hooks/useMigration';
import { SectionTableStatus } from './_components/SectionTableStatus';
import { SectionRealtime }    from './_components/SectionRealtime';
import { SectionRating }      from './_components/SectionRating';
import { SectionMessaging }   from './_components/SectionMessaging';
import { SectionStorage }     from './_components/SectionStorage';
import { SectionTrust }       from './_components/SectionTrust';
import { SectionModeration }  from './_components/SectionModeration';
import { SectionEvents }      from './_components/SectionEvents';
import { SectionLostFound }   from './_components/SectionLostFound';

export default function MigrationPage() {
  const m = useMigration();

  return (
    <ProtectedPage adminOnly>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Diagnostic tables + SQL principal ── */}
        <SectionTableStatus
          checking={m.checking}
          tables={m.tables}
          allOk={m.allOk}
          missingCount={m.missingCount}
          onRefresh={m.checkTables}
          MIGRATION_SQL={m.MIGRATION_SQL}
          copiedMain={m.copiedMain}
          onCopyMain={m.handleCopyMain}
          copiedNotify={m.copiedNotify}
          onCopyNotify={m.handleCopyNotify}
        />

        {/* ── Realtime ── */}
        <SectionRealtime
          copied={m.copiedRealtime}
          onCopy={m.handleCopyRealtime}
          sql={m.REALTIME_SQL}
        />

        {/* ── Notation + Échanges + Interactions ── */}
        <SectionRating
          copiedRating={m.copiedRating}       onCopyRating={m.handleCopyRating}       RATING_SQL={m.RATING_SQL}
          copiedExchange={m.copiedExchange}   onCopyExchange={m.handleCopyExchange}   EXCHANGE_SQL={m.EXCHANGE_SQL}
          copiedInteraction={m.copiedInteraction} onCopyInteraction={m.handleCopyInteraction} INTERACTION_SQL={m.INTERACTION_SQL}
        />

        {/* ── Fix messagerie + Messagerie universelle + Statuts enrichis + Recherche ── */}
        <SectionMessaging
          copiedConvFix1={m.copiedConvFix1}   onCopyConvFix1={m.handleCopyConvFix1}   CONV_FIX_BLOC1={m.CONV_FIX_BLOC1}
          copiedConvFix2={m.copiedConvFix2}   onCopyConvFix2={m.handleCopyConvFix2}   CONV_FIX_BLOC2={m.CONV_FIX_BLOC2}
          copiedMessaging={m.copiedMessaging} onCopyMessaging={m.handleCopyMessaging} MESSAGING_SQL={m.MESSAGING_SQL}
          copiedStatus={m.copiedStatus}       onCopyStatus={m.handleCopyStatus}       STATUS_SQL={m.STATUS_SQL}
          copiedSearch={m.copiedSearch}       onCopySearch={m.handleCopySearch}       SEARCH_SQL={m.SEARCH_SQL}
        />

        {/* ── Storage + Artisan + Communautés + RLS Statuts + Bucket ── */}
        <SectionStorage
          storageDiag={m.storageDiag}
          checkingStorage={m.checkingStorage}
          testingUpload={m.testingUpload}
          onCheckStorage={m.checkStorage}
          onTestUpload={m.testRealUpload}
          fileInputRef={m.fileInputRef}
          copiedBucket={m.copiedBucket}                   onCopyBucket={m.handleCopyBucket}
          copiedArtisan={m.copiedArtisan}                 onCopyArtisan={m.handleCopyArtisan}
          copiedCollectionComments={m.copiedCollectionComments} onCopyCollectionComments={m.handleCopyCollectionComments}
          copiedCommunity={m.copiedCommunity}             onCopyCommunity={m.handleCopyCommunity}
          copiedDiscussions={m.copiedDiscussions}         onCopyDiscussions={m.handleCopyDiscussions}
          copiedRLS={m.copiedRLS}                         onCopyRLS={m.handleCopyRLS}
          BUCKET_SQL={m.BUCKET_SQL}
          ARTISAN_SQL={m.ARTISAN_SQL}
          COLLECTION_COMMENTS_SQL={m.COLLECTION_COMMENTS_SQL}
          COMMUNITY_SQL={m.COMMUNITY_SQL}
          DISCUSSIONS_SQL={m.DISCUSSIONS_SQL}
          RLS_STATUS_SQL={m.RLS_STATUS_SQL}
        />

        {/* ── Confiance & Réputation ── */}
        <SectionTrust
          copiedTrustFix={m.copiedTrustFix}   onCopyTrustFix={m.handleCopyTrustFix}   TRUST_STATS_FIX_SQL={m.TRUST_STATS_FIX_SQL}
          copiedTrust={m.copiedTrust}         onCopyTrust={m.handleCopyTrust}         TRUST_SQL={m.TRUST_SQL}
        />

        {/* ── Modération + Matériel + Sorties + user_role ── */}
        <SectionModeration
          copiedModFix={m.copiedModFix}         onCopyModFix={m.handleCopyModFix}         MODERATION_FIX_SQL={m.MODERATION_FIX_SQL}
          copiedModeration={m.copiedModeration} onCopyModeration={m.handleCopyModeration} MODERATION_SQL={m.MODERATION_SQL}
          copiedEquipment={m.copiedEquipment}   onCopyEquipment={m.handleCopyEquipment}   EQUIPMENT_LIFECYCLE_SQL={m.EQUIPMENT_LIFECYCLE_SQL}
          copiedOutings={m.copiedOutings}       onCopyOutings={m.handleCopyOutings}       OUTINGS_LIFECYCLE_SQL={m.OUTINGS_LIFECYCLE_SQL}
          copiedRoleFix={m.copiedRoleFix}       onCopyRoleFix={m.handleCopyRoleFix}       USER_ROLE_FIX_SQL={m.USER_ROLE_FIX_SQL}
        />

        {/* ── Événements + Collectionneurs v2 ── */}
        <SectionEvents
          copiedEventsBase={m.copiedEventsBase}   onCopyEventsBase={m.handleCopyEventsBase}   EVENTS_BASE_SQL={m.EVENTS_BASE_SQL}
          copiedEvents={m.copiedEvents}           onCopyEvents={m.handleCopyEvents}           EVENT_LIFECYCLE_SQL={m.EVENT_LIFECYCLE_SQL}
          copiedEventFix={m.copiedEventFix}       onCopyEventFix={m.handleCopyEventFix}       EVENT_FIX_SQL={m.EVENT_FIX_SQL}
          copiedCollectV2={m.copiedCollectV2}     onCopyCollectV2={m.handleCopyCollectV2}     COLLECTIONNEURS_V2_SQL={m.COLLECTIONNEURS_V2_SQL}
        />

        {/* ── Profils + P/T + Rappel + Secteurs + Forum ── */}
        <SectionLostFound
          copiedProfilPublic={m.copiedProfilPublic} onCopyProfilPublic={m.handleCopyProfilPublic} PROFIL_PUBLIC_SQL={m.PROFIL_PUBLIC_SQL}
          copiedLfHistory={m.copiedLfHistory}       onCopyLfHistory={m.handleCopyLfHistory}       LF_HISTORY_SQL={m.LF_HISTORY_SQL}
          copiedLfMatches={m.copiedLfMatches}       onCopyLfMatches={m.handleCopyLfMatches}       LF_MATCHES_SQL={m.LF_MATCHES_SQL}
          copiedLfExtras={m.copiedLfExtras}         onCopyLfExtras={m.handleCopyLfExtras}         LF_EXTRAS_SQL={m.LF_EXTRAS_SQL}
          copiedReminder={m.copiedReminder}         onCopyReminder={m.handleCopyReminder}         REMINDER_SQL={m.REMINDER_SQL}
          copiedSectors={m.copiedSectors}           onCopySectors={m.handleCopySectors}           SECTORS_SQL={m.SECTORS_SQL}
          copiedForumV2={m.copiedForumV2}           onCopyForumV2={m.handleCopyForumV2}           FORUM_V2_SQL={m.FORUM_V2_SQL}
        />

      </div>
    </ProtectedPage>
  );
}

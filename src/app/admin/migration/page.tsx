/**
 * src/app/admin/migration/page.tsx
 *
 * Orchestrateur de la page d'administration Migration.
 * Toute la logique est dans _hooks/useMigration.ts.
 * Tout le rendu SQL est dans les composants _components/*.
 *
 * API de copie unifiée : chaque Section reçoit uniquement
 *   copied: (key: SqlKey) => boolean
 *   copy:   (key: SqlKey) => void
 * Les SQL strings sont lus dans SQL_MAP directement dans les composants.
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
  const { checking, tables, allOk, missingCount, checkTables,
          storageDiag, checkingStorage, testingUpload,
          checkStorage, testRealUpload, fileInputRef,
          copied, copy } = useMigration();

  return (
    <ProtectedPage adminOnly>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <SectionTableStatus
          checking={checking}
          tables={tables}
          allOk={allOk}
          missingCount={missingCount}
          onRefresh={checkTables}
          copied={copied}
          copy={copy}
        />

        <SectionRealtime copied={copied} copy={copy} />

        <SectionRating copied={copied} copy={copy} />

        <SectionMessaging copied={copied} copy={copy} />

        <SectionStorage
          storageDiag={storageDiag}
          checkingStorage={checkingStorage}
          testingUpload={testingUpload}
          onCheckStorage={checkStorage}
          onTestUpload={testRealUpload}
          fileInputRef={fileInputRef}
          copied={copied}
          copy={copy}
        />

        <SectionTrust copied={copied} copy={copy} />

        <SectionModeration copied={copied} copy={copy} />

        <SectionEvents copied={copied} copy={copy} />

        <SectionLostFound copied={copied} copy={copy} />

      </div>
    </ProtectedPage>
  );
}

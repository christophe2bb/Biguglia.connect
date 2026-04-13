'use client';

/**
 * Admin — Page de modération détaillée
 * Route: /admin/moderation/[id]
 *
 * Orchestrateur mince — toute la logique est dans useModerationDetail.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { useModerationDetail } from './_hooks/useModerationDetail';
import { resolveContentUrl }   from './_config';
import { DetailHeader }         from './_components/DetailHeader';
import { RiskPanel }            from './_components/RiskPanel';
import { ContentPanel }         from './_components/ContentPanel';
import { DecisionPanel }        from './_components/DecisionPanel';
import { PreviousDecisionBanner } from './_components/PreviousDecisionBanner';
import { HistoryPanel }         from './_components/HistoryPanel';
import { AuthorPanel }          from './_components/AuthorPanel';
import { TrustPanel }           from './_components/TrustPanel';
import { AuditPanel }           from './_components/AuditPanel';

function ModerationDetailContent() {
  const {
    item, history, authorStats,
    loading, processing,
    selectedDecision, selectedReason, moderatorNote, photoIndex,
    canDecide,
    setSelectedDecision, setSelectedReason, setModeratorNote, setPhotoIndex,
    fetchData, handleDecision, handleTrustChange,
  } = useModerationDetail();

  /* ── États de chargement / erreur ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Publication introuvable dans la file de modération.</p>
        <Link
          href="/admin/moderation"
          className="mt-4 inline-flex items-center gap-2 text-brand-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la file
        </Link>
      </div>
    );
  }

  const contentUrl = resolveContentUrl(item.content_type, item.content_id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <DetailHeader item={item} contentUrl={contentUrl} onRefresh={fetchData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche : contenu + décision ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <RiskPanel item={item} />

          <ContentPanel
            item={item}
            photoIndex={photoIndex}
            onPhotoSelect={setPhotoIndex}
          />

          {canDecide && (
            <DecisionPanel
              selectedDecision={selectedDecision}
              selectedReason={selectedReason}
              moderatorNote={moderatorNote}
              processing={processing}
              onSelectDecision={setSelectedDecision}
              onSelectReason={setSelectedReason}
              onNoteChange={setModeratorNote}
              onSubmit={handleDecision}
            />
          )}

          {!canDecide && item.decision && (
            <PreviousDecisionBanner item={item} />
          )}

          <HistoryPanel history={history} />
        </div>

        {/* ── Colonne droite : auteur + confiance + audit ──────────────────── */}
        <div className="space-y-5">
          <AuthorPanel item={item} authorStats={authorStats} />
          <TrustPanel  item={item} onTrustChange={handleTrustChange} />
          <AuditPanel  item={item} contentUrl={contentUrl} />
        </div>
      </div>
    </div>
  );
}

export default function AdminModerationDetailPage() {
  return (
    <ProtectedPage adminOnly>
      <ModerationDetailContent />
    </ProtectedPage>
  );
}

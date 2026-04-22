'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Eye, MessageSquare,
  Clock, MapPin, Briefcase, FileText, Phone,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ROLE_LABELS, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Profile } from '@/types';

/** Panneau dépliable (documents + actions) — chargé uniquement quand l'admin l'ouvre. */
const ArtisanExpandedPanel = dynamic(() => import('./ArtisanExpandedPanel'), {
  loading: () => (
    <div className="border-t border-gray-100 p-5 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  ),
});

export interface ArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: 'professionnel' | 'particulier';
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  created_at: string;
  profile?: Profile & { email: string; phone?: string };
  trade_category?: { name: string; icon: string };
}

interface ArtisanCardProps {
  artisan: ArtisanEntry;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
}

export default function ArtisanCard({ artisan, onApprove, onReject }: ArtisanCardProps) {
  const router                        = useRouter();
  const [expanded,    setExpanded]    = useState(false);
  const [sendingMsg,  setSendingMsg]  = useState(false);

  const isPending  = artisan.profile?.role === 'artisan_pending';
  const isVerified = artisan.profile?.role === 'artisan_verified';
  const docCount   = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;

  const handleSendMessage = async () => {
    if (!artisan.user_id) return;
    setSendingMsg(true);
    try {
      const supabaseAuth = createClient();
      const { data: sessionData } = await supabaseAuth.auth.getSession();
      if (!sessionData.session) { toast.error('Non connecté'); return; }

      const res = await fetch('/api/messages/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          ownerId:     artisan.user_id,
          subject:     `Dossier artisan — ${artisan.profile?.full_name || artisan.business_name}`,
          relatedType: 'general',
          relatedId:   null,
          initialMsg:  null,
        }),
      }).catch(() => null);

      if (!res?.ok) { toast.error('Impossible de créer la conversation'); return; }
      const { conversationId } = await res.json().catch(() => ({}));
      if (!conversationId) { toast.error('Impossible de créer la conversation'); return; }
      router.push(`/messages/${conversationId}`); // nosec — path is server-controlled (conversationId from API)
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'ouverture de la messagerie");
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors ${
      isPending ? 'border-orange-200' : isVerified ? 'border-green-200' : 'border-gray-200'
    }`}>

      {/* ── En-tête résumé ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar
            src={artisan.profile?.avatar_url}
            name={artisan.profile?.full_name || artisan.business_name}
            size="lg"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-lg">
                {artisan.profile?.full_name || artisan.business_name || 'Artisan'}
              </span>
              <Badge variant={isVerified ? 'success' : isPending ? 'warning' : 'default'}>
                {ROLE_LABELS[artisan.profile?.role || 'artisan_pending']}
              </Badge>
              {docCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  📎 {docCount} doc{docCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-1">
              {artisan.profile?.phone ? (
                <span className="flex items-center gap-1 font-medium text-brand-700">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${artisan.profile.phone}`} className="hover:underline">{artisan.profile.phone}</a>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 italic text-xs">
                  <Phone className="w-3 h-3" /> Téléphone non renseigné
                </span>
              )}
              <a href={`mailto:${artisan.profile?.email}`} className="text-brand-600 hover:underline text-xs">
                {artisan.profile?.email}
              </a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {artisan.trade_category && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {artisan.trade_category.icon} {artisan.trade_category.name}
                </span>
              )}
              {artisan.service_area && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {artisan.service_area}
                </span>
              )}
              {artisan.years_experience != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {artisan.years_experience} ans d&apos;exp.
                </span>
              )}
              {artisan.siret && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> SIRET : {artisan.siret}
                </span>
              )}
              <span className="text-gray-400">Inscrit {formatRelative(artisan.created_at)}</span>
            </div>
          </div>

          {/* Boutons d'action rapide */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Réduire' : 'Voir le dossier'}
            </button>

            <button
              onClick={handleSendMessage}
              disabled={sendingMsg}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors disabled:opacity-60"
            >
              {sendingMsg
                ? <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <MessageSquare className="w-3.5 h-3.5" />
              }
              Envoyer un message
            </button>

            <Link href={`/artisans/${artisan.id}`} target="_blank">
              <Button size="sm" variant="outline" className="w-full">
                <Eye className="w-3.5 h-3.5" /> Profil public
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dossier complet dépliable (chargé en lazy) ── */}
      {expanded && (
        <ArtisanExpandedPanel
          artisan={artisan}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  );
}

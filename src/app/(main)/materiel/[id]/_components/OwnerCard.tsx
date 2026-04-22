'use client';

import Link from 'next/link';
import { Pencil, Share2, Package, Shield } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';
import { TrustScoreFull } from '@/components/ui/TrustScore';
import {
  EQUIPMENT_STATUS_CONFIG, getAllowedTransitions, getTransitionLabel,
} from '@/lib/equipment';
import type { EquipmentItemFull, EquipmentStatus } from '@/lib/equipment';
import toast from 'react-hot-toast';

type Props = {
  item: EquipmentItemFull;
  isOwner: boolean;
  userId?: string;
  statusLoading: boolean;
  onStatusChange: (s: EquipmentStatus) => void;
  onDelete: () => void;
};

export default function OwnerCard({ item, isOwner, userId, statusLoading, onStatusChange, onDelete }: Props) {
  const status      = (item.status as EquipmentStatus) || 'disponible';
  const transitions = getAllowedTransitions(status);
  const owner       = item.owner as { full_name?: string; avatar_url?: string; id?: string; created_at?: string; role?: string } | null;

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: item.title, url: window.location.href }); // nosec — read-only current URL
    else { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !'); } // nosec — read-only current URL
  };

  return (
    <div className="space-y-4">
      {/* Carte propriétaire */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Proposé par</h3>
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={owner?.avatar_url} name={owner?.full_name || '?'} size="md" />
          <div>
            <div className="font-medium text-gray-900">{owner?.full_name || 'Habitant'}</div>
            <div className="text-xs text-gray-400">Habitant de Biguglia</div>
          </div>
        </div>

        {isOwner ? (
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="text-xs text-center text-brand-600 font-medium py-1 bg-brand-50 rounded-xl">
              ✅ C&apos;est votre matériel
            </div>

            {/* Transitions statut */}
            {transitions.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 mb-2">Actions disponibles :</div>
                {transitions.map(t => {
                  const tCfg = EQUIPMENT_STATUS_CONFIG[t];
                  return (
                    <button key={t} onClick={() => onStatusChange(t)} disabled={statusLoading}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition hover:opacity-90 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                      <span>{tCfg.icon}</span>
                      {getTransitionLabel(status, t)}
                    </button>
                  );
                })}
              </div>
            )}

            <Link href={`/materiel/${item.id}/modifier`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">
              <Pencil className="w-4 h-4" /> Modifier la fiche
            </Link>
            <Link href="/dashboard/materiel"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 text-sm rounded-xl hover:bg-gray-100 transition">
              <Package className="w-4 h-4" /> Tableau de bord
            </Link>
            <button onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
              <Share2 className="w-3.5 h-3.5" /> Partager
            </button>
            <button onClick={onDelete}
              className="flex items-center justify-center gap-1 w-full text-xs text-red-400 hover:text-red-600 py-1 transition">
              Supprimer
            </button>
          </div>
        ) : (
          <ContactButton
            sourceType="equipment"
            sourceId={item.id}
            sourceTitle={item.title}
            ownerId={item.owner_id}
            userId={userId}
            ctaLabel="Demander ce matériel"
            prefillMsg={[
              `Bonjour, je souhaiterais emprunter votre « ${item.title} »${item.is_free ? ' (gratuit)' : item.daily_rate ? ` à ${item.daily_rate}€/j` : ''}.`,
              item.availability_mode === 'toujours'
                ? 'Quand serait-il possible de le récupérer ?'
                : 'Pourriez-vous me préciser vos créneaux disponibles ?',
              item.requires_explanation ? 'Je suis disponible pour les explications à la remise.' : '',
            ].filter(Boolean).join(' ')}
            className="w-full"
          />
        )}
      </div>

      {/* Réputation propriétaire */}
      {owner && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800">⭐ Réputation du propriétaire</h3>
          </div>
          <div className="p-4">
            <TrustScoreFull profile={{
              id: item.owner_id,
              created_at: owner.created_at ?? new Date().toISOString(),
              role: owner.role ?? 'resident',
              avatar_url: owner.avatar_url ?? null,
              phone: null,
              full_name: owner.full_name ?? null,
            }} />
            <Link href={`/profil/${item.owner_id}`}
              className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors">
              Voir le profil complet →
            </Link>
          </div>
        </div>
      )}

      {/* Rassurance */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-teal-900">Prêt local — règles de confiance</h4>
        </div>
        <ul className="text-xs text-teal-800 space-y-1.5">
          {[
            ['✅', 'Vérifiez l\'état du matériel à la remise'],
            ['✅', 'Respectez les règles et la durée convenue'],
            ['✅', 'Rendez propre, en bon état et à l\'heure'],
            ['✅', 'Signalez tout problème sans attendre'],
            ['🚫', 'Aucun paiement en dehors de l\'accord établi'],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-start gap-1.5">
              <span className="mt-0.5">{icon}</span> {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

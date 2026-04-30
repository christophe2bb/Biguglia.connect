'use client';

import { MessageSquare, Phone, ExternalLink, Shield } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import type { HelpRequest } from '../_types';

type Props = {
  item: HelpRequest;
  isAuthor: boolean;
  isActive: boolean;
  userId?: string;
};

export default function HelpContact({ item, isAuthor, isActive, userId }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-black text-gray-800">Contact</h3>

      {/* Mode de contact */}
      <div className="space-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          {item.contact_mode === 'messagerie'
            ? <><MessageSquare className="w-4 h-4 text-violet-500 flex-shrink-0" /> Via la messagerie</>
            : <><Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Téléphone possible après 1er échange</>
          }
        </p>
        <p className="flex items-center gap-2">
          {item.visibility === 'public'
            ? <><ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" /> Visible par tous</>
            : <><Shield className="w-4 h-4 text-gray-500 flex-shrink-0" /> Membres connectés uniquement</>
          }
        </p>
      </div>

      {/* Bouton contacter (sidebar desktop) */}
      {!isAuthor && isActive && (
        <ContactButton
          sourceType="help_request"
          sourceId={item.id}
          sourceTitle={item.title}
          ownerId={item.author_id}
          userId={userId}
          size="md"
          className="w-full justify-center"
        />
      )}

      {/* Date de résolution — resolved_at n'existe pas sur help_requests → status_changed_at */}
      {item.status === 'resolved' && item.status_changed_at && (
        <p className="text-xs text-emerald-600 font-semibold">
          ✅ Résolu le {new Date(item.status_changed_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}

'use client';

/**
 * ContactBlock — Wrapper client pour le bloc "Intéressé(e) par ce profil ?"
 * Se masque automatiquement quand l'utilisateur est propriétaire de l'annonce.
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
import ProtectedContact from './ProtectedContact';

interface ContactBlockProps {
  type: 'offer' | 'demand';
  slug: string;
  cvUrl?: string | null;
  jobTitle?: string;
  colorScheme?: 'brand' | 'purple';
  title: string;
}

export default function ContactBlock({
  type,
  slug,
  cvUrl,
  jobTitle = '',
  colorScheme = 'purple',
  title,
}: ContactBlockProps) {
  const [isOwner, setIsOwner] = useState(false);

  if (isOwner) return null;

  return (
    <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <ProtectedContact
        type={type}
        slug={slug}
        hasEmail={true}
        hasPhone={true}
        colorScheme={colorScheme}
        jobTitle={jobTitle}
        ctaLabel="Voir les coordonnées"
        onOwner={() => setIsOwner(true)}
      />
      {cvUrl && !isOwner && (
        <div className="mt-3">
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-4 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-colors justify-center"
          >
            <FileText className="w-4 h-4" /> Voir le CV
          </a>
        </div>
      )}
    </div>
  );
}

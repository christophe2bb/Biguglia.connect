'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { safeStoragePath } from '@/lib/upload-utils';
import toast from 'react-hot-toast';


interface DocLinkProps {
  storagePath?: string;
  label: string;
  icon: string;
}

export default function DocLink({ storagePath, label, icon }: DocLinkProps) {
  const [loading, setLoading] = useState(false);

  const openDoc = async () => {
    if (!storagePath) return;
    setLoading(true);
    try {
      const supabase = createClient();
      // safeStoragePath() extrait le chemin relatif au bucket et rejette toute
      // tentative de traversée de répertoire (CWE-22 : ".." ou chemin absolu).
      // Retourne null si le préfixe de bucket ne correspond pas exactement.
      const path = safeStoragePath(
        // storagePath peut être soit un chemin relatif, soit une URL publique.
        // On normalise en URL publique si nécessaire pour que safeStoragePath()
        // puisse appliquer son guard basé sur le séparateur /storage/v1/object/public/.
        storagePath.startsWith('http')
          ? storagePath
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${storagePath.replace(/^documents\//, '')}`,
        'documents',
      );
      if (!path) { toast.error('Chemin de document invalide'); return; }
      // nosec: path est validé par safeStoragePath() — pas de traversée possible
      const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600); // nosec
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error('Document temporairement indisponible');
      }
    } catch {
      toast.error('Impossible d\'ouvrir le document');
    } finally {
      setLoading(false);
    }
  };

  if (!storagePath) return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-xs">
      <span>{icon}</span><span className="flex-1">{label}</span>
      <span className="italic text-gray-300">Non fourni</span>
    </div>
  );

  return (
    <button
      onClick={openDoc}
      disabled={loading}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs hover:bg-green-100 transition-colors disabled:opacity-60 text-left"
    >
      <span>{icon}</span>
      <span className="font-medium flex-1">{label}</span>
      {loading
        ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        : <ExternalLink className="w-3 h-3 opacity-60" />
      }
    </button>
  );
}

'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { safeRelativePath } from '@/lib/upload-utils';
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
      // safeRelativePath() valide le chemin relatif issu de la BDD avant de le
      // passer à createSignedUrl(). Protège contre CWE-22 (path traversal) :
      // rejette "..", chemins absolus ("/…") et valeurs vides.
      // Le préfixe de bucket "documents/" est supprimé si présent.
      const path = safeRelativePath(storagePath, 'documents');
      if (!path) { toast.error('Chemin de document invalide'); return; }
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600); // nosec: path validé par safeRelativePath (CWE-22 mitigé)
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

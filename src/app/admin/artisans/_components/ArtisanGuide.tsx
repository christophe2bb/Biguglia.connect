

/**
 * ArtisanGuide — Panneau d'instructions pour valider un artisan.
 * Composant pur, sans état.
 */

import { Shield } from 'lucide-react';

export default function ArtisanGuide() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
        <Shield className="w-4 h-4" /> Comment valider un artisan
      </h3>
      <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
        <li>Cliquez sur <strong>«&nbsp;Voir le dossier&nbsp;»</strong> pour voir les détails complets</li>
        <li>Vérifiez les informations (nom, téléphone, catégorie, documents éventuels)</li>
        <li>Utilisez <strong>«&nbsp;Envoyer un message&nbsp;»</strong> pour demander des informations supplémentaires</li>
        <li>Cochez <strong>«&nbsp;Artisan de Biguglia ✓&nbsp;»</strong> puis cliquez sur <strong>«&nbsp;Approuver&nbsp;»</strong></li>
      </ol>
    </div>
  );
}

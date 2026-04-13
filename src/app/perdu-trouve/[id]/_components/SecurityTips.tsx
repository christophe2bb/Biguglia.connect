import { Shield } from 'lucide-react';

type Props = { proofRequired?: boolean };

export function SecurityTips({ proofRequired }: Props) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 print:hidden">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-bold text-blue-800">Rappels de sécurité</p>
      </div>
      <ul className="text-xs text-blue-600 space-y-1">
        <li>• Ne transmettez jamais d&apos;argent avant d&apos;avoir récupéré l&apos;objet</li>
        <li>• Privilégiez les échanges dans des lieux publics ou officiels (mairie, commerce)</li>
        {proofRequired && (
          <li>• Ce déclarant demande une preuve de propriété avant remise</li>
        )}
        <li>• Signalez tout comportement suspect via le bouton &quot;Signaler&quot;</li>
      </ul>
    </div>
  );
}

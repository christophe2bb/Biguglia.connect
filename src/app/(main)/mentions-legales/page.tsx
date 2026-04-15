import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions Légales' };

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions Légales</h1>

      <div className="space-y-6 text-gray-600">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Éditeur de la plateforme</h2>
          <p>Biguglia Connect — Plateforme locale de mise en relation</p>
          <p>Commune de Biguglia, Haute-Corse (2B), France</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Hébergement</h2>
          <p>Supabase Inc. — base de données et authentification</p>
          <p>Vercel Inc. — hébergement de l&apos;application web</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Propriété intellectuelle</h2>
          <p>L&apos;ensemble des contenus de Biguglia Connect est protégé. La reproduction totale ou partielle est interdite sans autorisation préalable.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Limitation de responsabilité</h2>
          <p>
            Biguglia Connect est une plateforme de mise en relation. Elle ne garantit pas la qualité des prestations des artisans référencés, ni la véracité des annonces publiées par les utilisateurs. La plateforme se réserve le droit de supprimer tout contenu ne respectant pas ses conditions d&apos;utilisation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Données personnelles</h2>
          <p>Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Consultez notre politique de confidentialité pour plus d&apos;informations.</p>
        </section>
      </div>
    </div>
  );
}

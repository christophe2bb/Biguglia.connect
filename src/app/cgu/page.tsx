import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions Générales d\'Utilisation' };

export default function CGUPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-gray-500 mb-10">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Présentation de la plateforme</h2>
          <p className="text-gray-600 leading-relaxed">
            Biguglia Connect est une plateforme locale de mise en relation entre les habitants et les artisans de la commune de Biguglia (Corse). Elle propose également des fonctionnalités de petites annonces, de prêt de matériel et de forum communautaire.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Inscription et comptes</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;inscription est gratuite. Chaque utilisateur doit fournir des informations exactes lors de son inscription. Les profils artisans sont soumis à validation manuelle par l&apos;administrateur avant d&apos;être publiés.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Vous êtes responsable de la confidentialité de vos identifiants de connexion. Tout accès frauduleux à votre compte doit être signalé immédiatement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Règles d&apos;utilisation</h2>
          <p className="text-gray-600 leading-relaxed mb-3">Il est interdit de :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Publier des contenus faux, trompeurs ou diffamatoires</li>
            <li>Usurper l&apos;identité d&apos;un tiers</li>
            <li>Harceler ou menacer d&apos;autres utilisateurs</li>
            <li>Utiliser la plateforme à des fins illégales</li>
            <li>Publier des annonces frauduleuses</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Limitation de responsabilité</h2>
          <p className="text-gray-600 leading-relaxed">
            Biguglia Connect est une plateforme de mise en relation. Elle ne garantit pas la qualité des travaux réalisés par les artisans, ni la conformité des transactions entre particuliers. La plateforme décline toute responsabilité en cas de litige entre utilisateurs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Résiliation</h2>
          <p className="text-gray-600 leading-relaxed">
            L&apos;administrateur se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les présentes CGU. Les utilisateurs peuvent supprimer leur compte depuis leurs paramètres de profil.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Modification des CGU</h2>
          <p className="text-gray-600 leading-relaxed">
            Ces CGU peuvent être modifiées. Les utilisateurs seront informés par notification en cas de changements importants.
          </p>
        </section>
      </div>
    </div>
  );
}

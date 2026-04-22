import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — Biguglia Connect',
  description: 'Conditions générales d\'utilisation de la plateforme Biguglia Connect.',
  robots: { index: true, follow: true },
};

/** Date statique — ne pas utiliser new Date() (problème d'hydratation SSG). */
const LAST_UPDATE = '22 avril 2026';

export default function CGUPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-gray-500 mb-10">Dernière mise à jour : {LAST_UPDATE}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Présentation de la plateforme</h2>
          <p className="text-gray-600 leading-relaxed">
            Biguglia Connect est une plateforme locale de mise en relation entre les habitants et les artisans
            de la commune de Biguglia (Corse). Elle propose des fonctionnalités de petites annonces, de prêt de
            matériel, de forum communautaire, d&apos;entraide (coups de main), et de gestion d&apos;événements locaux.
          </p>
          <p className="text-gray-600 leading-relaxed mt-2">
            L&apos;accès à la plateforme est réservé aux résidents et professionnels de Biguglia et ses environs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Inscription et comptes</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;inscription est gratuite. Chaque utilisateur doit fournir des informations exactes lors de son
            inscription. En créant un compte, l&apos;utilisateur accepte expressément les présentes CGU et la
            <a href="/confidentialite" className="text-brand-600 hover:underline"> politique de confidentialité</a>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Les profils artisans sont soumis à validation manuelle par l&apos;administrateur avant d&apos;être publiés.
            Les documents justificatifs fournis (SIRET, assurance RC Pro) sont traités de façon confidentielle.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Vous êtes responsable de la confidentialité de vos identifiants de connexion. Tout accès frauduleux
            à votre compte doit être signalé immédiatement via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Règles d&apos;utilisation</h2>
          <p className="text-gray-600 leading-relaxed mb-3">Il est interdit de :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Publier des contenus faux, trompeurs, diffamatoires ou à caractère haineux</li>
            <li>Usurper l&apos;identité d&apos;un tiers ou d&apos;un professionnel</li>
            <li>Harceler, menacer ou intimider d&apos;autres utilisateurs</li>
            <li>Utiliser la plateforme à des fins illégales ou commerciales non autorisées</li>
            <li>Publier des annonces frauduleuses ou des prix manifestement erronés</li>
            <li>Collecter des données personnelles d&apos;autres utilisateurs sans leur consentement</li>
            <li>Contourner les mécanismes de modération ou de sécurité</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Modération des contenus</h2>
          <p className="text-gray-600 leading-relaxed">
            L&apos;administrateur et les modérateurs se réservent le droit de supprimer tout contenu ne respectant
            pas les présentes CGU, sans préavis. Les utilisateurs peuvent signaler un contenu inapproprié via
            le bouton de signalement présent sur chaque publication.
          </p>
          <p className="text-gray-600 leading-relaxed mt-2">
            En cas d&apos;infraction répétée, le compte de l&apos;utilisateur pourra être suspendu ou supprimé définitivement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Limitation de responsabilité</h2>
          <p className="text-gray-600 leading-relaxed">
            Biguglia Connect est une plateforme de mise en relation. Elle ne garantit pas la qualité des travaux
            réalisés par les artisans, ni la conformité des transactions entre particuliers. La plateforme décline
            toute responsabilité en cas de litige entre utilisateurs.
          </p>
          <p className="text-gray-600 leading-relaxed mt-2">
            Biguglia Connect ne saurait être tenue responsable des dommages directs ou indirects résultant de
            l&apos;utilisation de la plateforme ou de l&apos;impossibilité temporaire d&apos;y accéder.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Résiliation et suppression de compte</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;utilisateur peut supprimer son compte à tout moment depuis ses paramètres de profil.
            La suppression entraîne l&apos;anonymisation des données personnelles dans un délai de 30 jours,
            conformément au <strong>droit à l&apos;effacement (RGPD Art. 17)</strong>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Les contenus publiés (annonces, messages) peuvent être conservés sous forme anonymisée pour
            maintenir la cohérence des discussions et de l&apos;historique de la plateforme.
          </p>
          <p className="text-gray-600 leading-relaxed">
            L&apos;administrateur se réserve le droit de suspendre ou supprimer tout compte ne respectant pas
            les présentes CGU. L&apos;utilisateur est informé par email avant toute suspension, sauf en cas
            d&apos;urgence sécuritaire.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Données personnelles (RGPD)</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Le traitement des données personnelles est encadré par notre{' '}
            <a href="/confidentialite" className="text-brand-600 hover:underline">politique de confidentialité</a>{' '}
            (Règlement UE 2016/679 — RGPD). En vous inscrivant, vous consentez explicitement au traitement
            de vos données pour les finalités décrites dans ce document.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Vous disposez des droits suivants, exercés via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a> :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong>Droit d&apos;accès (Art. 15) :</strong> consultez vos données depuis votre profil</li>
            <li><strong>Droit de rectification (Art. 16) :</strong> modifiez vos informations depuis vos paramètres</li>
            <li><strong>Droit à l&apos;effacement (Art. 17) :</strong> supprimez votre compte — données anonymisées sous 30 jours</li>
            <li><strong>Droit à la portabilité (Art. 20) :</strong> export de vos données sur demande (format JSON)</li>
            <li><strong>Droit d&apos;opposition (Art. 21) :</strong> opposition au traitement fondé sur l&apos;intérêt légitime</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            En cas de litige, vous pouvez saisir la{' '}
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              CNIL
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Propriété intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed">
            Les utilisateurs conservent la propriété de leurs contenus publiés. En publiant sur Biguglia Connect,
            ils accordent à la plateforme une licence non exclusive, gratuite, mondiale, d&apos;utilisation, de
            reproduction et d&apos;affichage de ces contenus, limitée au fonctionnement du service.
          </p>
          <p className="text-gray-600 leading-relaxed mt-2">
            Le code source, le design et les éléments graphiques de la plateforme sont protégés par le droit
            d&apos;auteur et ne peuvent être reproduits sans autorisation expresse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Modification des CGU</h2>
          <p className="text-gray-600 leading-relaxed">
            Ces CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés par notification
            in-app et/ou email en cas de changements substantiels. La poursuite de l&apos;utilisation du service
            après notification vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Droit applicable et juridiction</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes CGU sont régies par le droit français. En cas de litige non résolu amiablement,
            les tribunaux compétents sont ceux du ressort de Bastia (Haute-Corse), France.
          </p>
        </section>
      </div>
    </div>
  );
}

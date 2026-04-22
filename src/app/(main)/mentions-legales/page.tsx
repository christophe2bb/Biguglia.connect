import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales — Biguglia Connect',
  description: 'Mentions légales de la plateforme Biguglia Connect.',
  robots: { index: true, follow: true },
};

/** Date statique — ne pas utiliser new Date() (problème d'hydratation SSG). */
const LAST_UPDATE = '22 avril 2026';

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions Légales</h1>
      <p className="text-gray-500 mb-10">Dernière mise à jour : {LAST_UPDATE}</p>

      <div className="space-y-8 text-gray-600 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Éditeur de la plateforme</h2>
          <p><strong>Biguglia Connect</strong> — Plateforme locale de mise en relation</p>
          <p>Commune de Biguglia, Haute-Corse (2B), France</p>
          <p className="mt-2">
            Contact : via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Directeur de la publication</h2>
          <p>L&apos;administrateur de la plateforme Biguglia Connect, joignable via la page d&apos;aide.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Hébergement</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-800">Vercel Inc.</p>
              <p>340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</p>
              <p>Hébergement de l&apos;application web et CDN mondial.</p>
              <p>
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline text-sm"
                >
                  Politique de confidentialité Vercel →
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Supabase Inc.</p>
              <p>970 Toa Payoh North, #07-04, Singapore 318992</p>
              <p>Base de données PostgreSQL et authentification (serveurs en Europe — région EU West).</p>
              <p>
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline text-sm"
                >
                  Politique de confidentialité Supabase →
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Sentry Inc.</p>
              <p>45 Fremont Street, 8th Floor, San Francisco, CA 94105, États-Unis</p>
              <p>Monitoring des erreurs applicatives (données anonymisées, sans PII).</p>
              <p>
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline text-sm"
                >
                  Politique de confidentialité Sentry →
                </a>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Responsable du traitement des données</h2>
          <p>
            Le responsable du traitement des données personnelles au sens du RGPD (Art. 4§7) est
            l&apos;administrateur de la plateforme Biguglia Connect.
          </p>
          <p className="mt-2">
            <strong>Contact DPO (Délégué à la Protection des Données) :</strong>{' '}
            via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a>.
            Délai de réponse garanti : <strong>30 jours ouvrés</strong> maximum.
          </p>
          <p className="mt-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            Pour exercer vos droits (accès, rectification, effacement, portabilité, opposition),
            utilisez la page d&apos;aide en précisant la nature de votre demande.
            Consultez notre{' '}
            <a href="/confidentialite" className="text-brand-600 hover:underline">
              politique de confidentialité
            </a>{' '}
            pour la liste complète de vos droits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus de Biguglia Connect (textes, graphismes, logo, code source)
            est protégé par le droit d&apos;auteur. La reproduction totale ou partielle sans autorisation
            préalable écrite est interdite, à l&apos;exception des contenus publiés par les utilisateurs
            qui restent leur propriété.
          </p>
          <p className="mt-2">
            Les utilisateurs accordent à Biguglia Connect une licence non exclusive d&apos;utilisation
            de leurs contenus publiés, limitée au fonctionnement de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Limitation de responsabilité</h2>
          <p>
            Biguglia Connect est une plateforme de mise en relation entre particuliers et professionnels.
            Elle ne garantit pas la qualité des prestations des artisans référencés, ni la véracité
            des annonces publiées par les utilisateurs. La plateforme se réserve le droit de supprimer
            tout contenu ne respectant pas ses conditions d&apos;utilisation.
          </p>
          <p className="mt-2">
            Biguglia Connect ne saurait être tenue responsable des dommages directs ou indirects
            résultant de l&apos;utilisation de la plateforme ou de l&apos;impossibilité d&apos;y accéder.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Données personnelles</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679),
            vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et de portabilité
            de vos données personnelles.
          </p>
          <p className="mt-2">
            Consultez notre{' '}
            <a href="/confidentialite" className="text-brand-600 hover:underline">
              politique de confidentialité complète
            </a>{' '}
            pour les informations détaillées sur les traitements, les bases légales, les durées de
            conservation et vos droits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies et traceurs</h2>
          <p>
            La plateforme utilise uniquement des cookies <strong>strictement nécessaires</strong> à son
            fonctionnement (cookie de session d&apos;authentification Supabase).
            <strong> Aucun cookie publicitaire, de tracking comportemental ou d&apos;analyse tiers</strong> n&apos;est utilisé.
          </p>
          <p className="mt-2">
            Le Sentry Session Replay est <strong>désactivé</strong> en production (taux à 0) pour des raisons
            de performance et de conformité RGPD. Voir notre{' '}
            <a href="/confidentialite" className="text-brand-600 hover:underline">
              politique de confidentialité
            </a>{' '}
            pour le détail.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Droit applicable et juridiction</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige,
            les tribunaux compétents sont ceux du ressort de Bastia (Haute-Corse), France.
          </p>
          <p className="mt-2">
            En cas de litige relatif à vos données personnelles, vous pouvez également saisir la{' '}
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              Commission Nationale de l&apos;Informatique et des Libertés (CNIL)
            </a>.
          </p>
        </section>

      </div>
    </div>
  );
}

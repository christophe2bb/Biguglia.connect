import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — Biguglia Connect',
  description: 'Politique de confidentialité et conformité RGPD de Biguglia Connect.',
  robots: { index: true, follow: true },
};

/**
 * Date de dernière mise à jour — statique (ne jamais utiliser new Date() ici,
 * car cela génère un contenu dynamique incompatible avec le cache SSG et
 * produit un avertissement d'hydratation React.
 */
const LAST_UPDATE = '22 avril 2025';

export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
      <p className="text-gray-500 mb-10">
        Conformité RGPD — Dernière mise à jour : {LAST_UPDATE}
      </p>

      <div className="space-y-8 text-gray-600 leading-relaxed">

        {/* 1. Responsable du traitement */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles collectées via Biguglia Connect est
            l&apos;administrateur de la plateforme, joignable via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a> ou
            par email à l&apos;adresse indiquée dans les <a href="/mentions-legales" className="text-brand-600 hover:underline">mentions légales</a>.
          </p>
        </section>

        {/* 2. Données collectées */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
          <p className="mb-3">Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Données d&apos;identité :</strong> nom complet, adresse email, numéro de téléphone (optionnel)</li>
            <li><strong>Données de profil :</strong> photo d&apos;avatar, description personnelle ou professionnelle</li>
            <li><strong>Contenus publiés :</strong> annonces, messages, publications forum, événements créés</li>
            <li><strong>Données de navigation :</strong> pages consultées, actions effectuées (à des fins de modération et sécurité)</li>
            <li><strong>Pour les artisans :</strong> informations professionnelles (SIRET, assurance RC Pro, documents justificatifs)</li>
          </ul>
        </section>

        {/* 3. Bases légales du traitement */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Bases légales du traitement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Finalité</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2">Création et gestion de compte</td>
                  <td className="px-4 py-2">Exécution du contrat (CGU)</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2">Messagerie entre utilisateurs</td>
                  <td className="px-4 py-2">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Vérification des artisans (documents)</td>
                  <td className="px-4 py-2">Intérêt légitime (confiance &amp; sécurité)</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2">Modération des contenus</td>
                  <td className="px-4 py-2">Intérêt légitime (sécurité de la plateforme)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Statistiques d&apos;utilisation anonymisées</td>
                  <td className="px-4 py-2">Intérêt légitime (amélioration du service)</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2">Monitoring d&apos;erreurs (Sentry)</td>
                  <td className="px-4 py-2">Intérêt légitime (stabilité technique)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Utilisation des données */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Utilisation des données</h2>
          <p className="mb-3">
            Vos données sont utilisées exclusivement pour le fonctionnement de la plateforme :
            mise en relation entre habitants et artisans, messagerie, publication d&apos;annonces et de
            contenus communautaires, et modération. <strong>Elles ne sont jamais vendues à des tiers.</strong>
          </p>
          <p>
            Les données de monitoring (Sentry) sont collectées de façon anonymisée — sans PII —
            pour détecter et corriger les erreurs techniques.
          </p>
        </section>

        {/* 5. Durées de conservation */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Durées de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Comptes actifs :</strong> données conservées tant que le compte est actif</li>
            <li><strong>Après suppression du compte :</strong> suppression sous 30 jours (sauf obligations légales)</li>
            <li><strong>Documents artisans :</strong> conservés 2 ans après la fin de la relation contractuelle</li>
            <li><strong>Logs de modération :</strong> conservés 1 an à des fins de sécurité</li>
            <li><strong>Données de monitoring :</strong> 90 jours glissants</li>
          </ul>
        </section>

        {/* 6. Destinataires */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Destinataires des données</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase Inc.</strong> — stockage de la base de données et authentification (serveurs en Europe)</li>
            <li><strong>Vercel Inc.</strong> — hébergement de l&apos;application (CDN mondial, données traitées selon RGPD)</li>
            <li><strong>Sentry Inc.</strong> — monitoring d&apos;erreurs anonymisé (données dépersonnalisées)</li>
            <li>Aucun autre tiers n&apos;a accès à vos données personnelles.</li>
          </ul>
        </section>

        {/* 7. Vos droits */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Vos droits (RGPD)</h2>
          <p className="mb-3">Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Droit d&apos;accès (art. 15) :</strong> consultez et exportez vos données depuis votre profil.
            </li>
            <li>
              <strong>Droit de rectification (art. 16) :</strong> modifiez vos informations depuis vos paramètres.
            </li>
            <li>
              <strong>Droit à l&apos;effacement (art. 17) :</strong> supprimez votre compte depuis vos paramètres.
              La suppression est effective sous 30 jours.
            </li>
            <li>
              <strong>Droit à la portabilité (art. 20) :</strong> contactez-nous pour recevoir un export de vos données
              dans un format lisible par machine.
            </li>
            <li>
              <strong>Droit d&apos;opposition (art. 21) :</strong> vous pouvez vous opposer à certains traitements
              fondés sur l&apos;intérêt légitime en nous contactant.
            </li>
            <li>
              <strong>Droit à la limitation (art. 18) :</strong> vous pouvez demander la suspension du traitement
              de vos données dans certains cas prévus par la loi.
            </li>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits, contactez-nous via la <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a>.
            Délai de réponse : 30 jours. En cas de litige, vous pouvez saisir la{' '}
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              CNIL
            </a>.
          </p>
        </section>

        {/* 8. Sécurité */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Sécurité des données</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chiffrement des données en transit (HTTPS/TLS 1.3) et au repos</li>
            <li>Mots de passe hachés avec bcrypt — jamais stockés en clair</li>
            <li>Accès aux données protégé par Row Level Security (RLS) Supabase</li>
            <li>Authentification à deux facteurs disponible</li>
            <li>Audit de sécurité régulier des règles d&apos;accès</li>
          </ul>
        </section>

        {/* 9. Cookies */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
          <p className="mb-3">
            Nous utilisons uniquement des cookies <strong>strictement nécessaires</strong> au fonctionnement :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><code className="bg-gray-100 px-1 rounded text-sm">sb-[ref]-auth-token</code> — session d&apos;authentification Supabase (durée : session navigateur)</li>
          </ul>
          <p className="mt-3">
            <strong>Aucun cookie publicitaire, de tracking ou d&apos;analyse comportementale</strong> n&apos;est utilisé.
            Le consentement à ces cookies est implicitement donné lors de l&apos;utilisation du service.
          </p>
        </section>

        {/* 10. Contact DPO */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact — Délégué à la Protection des Données</h2>
          <p>
            Pour toute question relative à vos données personnelles ou pour exercer vos droits,
            contactez le responsable du traitement via la{' '}
            <a href="/aide" className="text-brand-600 hover:underline">page d&apos;aide</a>.
            Toute demande reçoit une réponse dans un délai maximal de 30 jours.
          </p>
        </section>

      </div>
    </div>
  );
}

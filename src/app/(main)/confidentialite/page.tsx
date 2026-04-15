import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de Confidentialité' };

export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
      <p className="text-gray-500 mb-10">Conformité RGPD — Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Données collectées</h2>
          <p className="text-gray-600 leading-relaxed mb-3">Nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Nom complet, adresse email, numéro de téléphone</li>
            <li>Informations de profil (photo, description)</li>
            <li>Contenus publiés (annonces, messages, posts)</li>
            <li>Données de navigation et d&apos;utilisation de la plateforme</li>
            <li>Pour les artisans : informations professionnelles (SIRET, assurance)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Utilisation des données</h2>
          <p className="text-gray-600 leading-relaxed">
            Vos données sont utilisées uniquement pour le fonctionnement de la plateforme : mise en relation, messagerie, publication d&apos;annonces, et modération. Elles ne sont jamais vendues à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Vos droits (RGPD)</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong>Accès :</strong> Vous pouvez consulter vos données depuis votre profil</li>
            <li><strong>Rectification :</strong> Modifiez vos informations depuis vos paramètres</li>
            <li><strong>Suppression :</strong> Supprimez votre compte depuis vos paramètres</li>
            <li><strong>Portabilité :</strong> Contactez-nous pour un export de vos données</li>
            <li><strong>Opposition :</strong> Contactez-nous pour vous opposer à certains traitements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Sécurité</h2>
          <p className="text-gray-600 leading-relaxed">
            Vos données sont stockées de manière sécurisée avec chiffrement. Les mots de passe sont hashés et jamais stockés en clair. L&apos;accès aux données est protégé par des règles de sécurité strictes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            Nous utilisons uniquement des cookies essentiels au fonctionnement de la plateforme (session d&apos;authentification). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour toute question relative à vos données personnelles, contactez l&apos;administrateur via la page d&apos;aide.
          </p>
        </section>
      </div>
    </div>
  );
}

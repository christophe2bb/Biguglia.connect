# Biguglia Connect V2

Reconstruction indépendante de l’interface et de la session, dans le dépôt d’origine, avec conservation de la base Supabase existante.

```sh
cd apps/v2
npm ci
cp .env.example .env.local
# Renseigner uniquement la clé publique Supabase dans .env.local.
npm run dev
npm run test
npm run build
```

Le projet Vercel de recette est `biguglia-connect-v2`, racine `apps/v2`, équipe `christophe2bbs-projects`. L’ancien projet `webapp` et son domaine ne sont pas remplacés.

## Ouvrir la bonne version

| Version | Source GitHub | Application Vercel |
| --- | --- | --- |
| Reconstruction V2 en cours | [`rebuild/v2-20261111`, dossier `apps/v2`](https://github.com/christophe2bb/Biguglia.connect/tree/rebuild/v2-20261111/apps/v2) | [biguglia-connect-v2.vercel.app](https://biguglia-connect-v2.vercel.app), accès protégé |
| Ancienne application | Branche `main`, racine du dépôt | [biguglia-connect.vercel.app](https://biguglia-connect.vercel.app), projet `webapp` |

Les deux interfaces sont différentes parce qu’elles correspondent à deux clients distincts dans le même dépôt. Les comptes et les données restent dans le même projet Supabase `qmrkacrpncdkhofiqlrg`. Les connexions de l’application, de GitHub et de Vercel sont distinctes. Le déploiement V2 actuellement livré et ses contrôles sont identifiés dans [le relevé de livraison](docs/deployment-v2.snapshot.json).

## Connexion et e-mails

Les erreurs d’identifiants, d’adresse non confirmée et d’envoi d’e-mail sont distinguées. Le renvoi efface les anciens messages d’erreur ; la page de retour n’annonce pas une confirmation sans session, et le changement de mot de passe attend une session authentifiée. Ces parcours sont couverts par 11 tests d’interface supplémentaires sans envoyer d’e-mail réel.

Le diagnostic du 14 novembre a relevé `invalid_credentials` dans Supabase, pas `email_not_confirmed`. Aucune nouvelle inscription récente n’apparaissait dans le projet à ce contrôle. Cela ne permet pas d’identifier l’adresse saisie ni de conclure à une panne SMTP. La réception réelle des e-mails et la configuration SMTP restent à vérifier. Un compte déjà confirmé ne reçoit pas de nouvel e-mail de confirmation lors d’une nouvelle tentative d’inscription ; utiliser la connexion ou la récupération du mot de passe.

## Vérification

- `npm run test` : contrats de publication, annulation réseau et cycle de session sur fixtures locales.
- `npm run test:e2e` : interface réelle sur ordinateur et mobile, avec une panne Supabase simulée. Ces tests n’écrivent pas dans la base.
- La recette réelle multi-comptes reste séparée. Un test simulé réussi ne la remplace pas.
- Le schéma capturé couvre 104 tables et vues ; les 126 tests locaux incluent 72 contrôles PostgreSQL sur base jetable : autorisations, prêts, rendez-vous, avis, statistiques et contact privé. La CI `fc2f0c8` a validé ces 126 tests, 32 contrôles d’interface ordinateur/mobile et une compilation iOS sans signature.
- Les migrations V2 sont installées : `20261111173446_v2_secure_client_contract.sql` (conversations/photos/protections), `20261112031348_v2_transactional_workflows.sql` (prêts et décisions administratives), `20261112040922_v2_service_appointments.sql` (rendez-vous), `20261112042137_v2_verified_service_reviews.sql` (avis après devis terminé) et `20261114041938_v2_review_stats_permissions.sql` (statistiques et modération des avis).
- La recette SQL hébergée `tests/hosted-contract.sql` a réussi, avec simulation des rôles et annulation de toutes les données de test. Elle ne remplace pas la connexion réelle de plusieurs comptes par HTTP. Le contrôle a confirmé zéro matériel et zéro conversation de recette restants.
- `tests/hosted-appointments.sql` et `tests/hosted-service-reviews.sql` ont également réussi avec les vrais triggers Supabase. Les transactions ont été annulées, puis l’absence de devis, rendez-vous et avis de recette a été vérifiée.
- La migration `20261114043322_v2_bidirectional_quote_contact.sql` permet le contact dans les deux sens sur un devis privé et protège son caractère privé si le profil artisan est supprimé. `tests/hosted-quote-contact.sql` a réussi avec les rôles SQL simulés et tous ses enregistrements annulés.

## iOS

```sh
npm run ios:sync
npm run ios:open
```

Le dossier `ios/` est un projet Xcode ; aucune signature ou publication Apple n’est incluse. La CI tente une compilation pour simulateur sans signature. Les retours web et `fr.bigugliaconnect.app://auth/callback` sont configurés dans Supabase ; vérifier encore la réception/consommation des e-mails et la récupération sur appareil réel. Le relevé est dans `docs/auth-redirects.snapshot.json`.

Avant publication App Store : recette réelle de toutes les fonctions, suppression de compte, identité et contact de l’éditeur, politique de conservation, déclaration de confidentialité, signature et validation sur iPhone/iPad. Voir [le suivi de reconstruction](docs/RECONSTRUCTION.md).

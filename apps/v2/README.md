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

## Vérification

- `npm run test` : contrats de publication, annulation réseau et cycle de session sur fixtures locales.
- `npm run test:e2e` : interface réelle sur ordinateur et mobile, avec une panne Supabase simulée. Ces tests n’écrivent pas dans la base.
- La recette réelle multi-comptes reste séparée. Un test simulé réussi ne la remplace pas.
- Le schéma capturé couvre 104 tables et vues ; les 69 tests locaux incluent 33 contrôles d’autorisation et de cycle de prêt dans PostgreSQL sur une base jetable. La CI `2cabcfb` a également validé 32 tests d’interface ordinateur/mobile et une compilation iOS sans signature.
- Les migrations V2 sont installées : `20261111173446_v2_secure_client_contract.sql` (conversations/photos/protections) et `20261112031348_v2_transactional_workflows.sql` (prêts et décisions administratives).
- La recette SQL hébergée `tests/hosted-contract.sql` a réussi, avec simulation des rôles et annulation de toutes les données de test. Elle ne remplace pas la connexion réelle de plusieurs comptes par HTTP. Le contrôle a confirmé zéro matériel et zéro conversation de recette restants.

## iOS

```sh
npm run ios:sync
npm run ios:open
```

Le dossier `ios/` est un projet Xcode ; aucune signature ou publication Apple n’est incluse. La CI tente une compilation pour simulateur sans signature. Ajouter le retour `fr.bigugliaconnect.app://auth/callback` et le domaine de recette aux URL de redirection Supabase, puis vérifier confirmation d’e-mail et récupération sur appareil réel.

Avant publication App Store : recette réelle de toutes les fonctions, suppression de compte, identité et contact de l’éditeur, politique de conservation, déclaration de confidentialité, signature et validation sur iPhone/iPad. Voir [le suivi de reconstruction](docs/RECONSTRUCTION.md).

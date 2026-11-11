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
- Le schéma capturé couvre 104 tables et vues ; les 44 tests locaux incluent 14 contrôles d’autorisation dans PostgreSQL sur une base jetable. La CI de la première version a également validé 32 tests d’interface ordinateur/mobile et une compilation iOS sans signature.
- La migration `20261111162735_v2_secure_client_contract.sql` prépare l’ouverture atomique des conversations et les nouvelles règles de photos. Elle n’a pas été appliquée pendant l’indisponibilité de la base. Les échanges et uploads utilisant ce contrat doivent être testés après son application.

## iOS

```sh
npm run ios:sync
npm run ios:open
```

Le dossier `ios/` est un projet Xcode ; aucune signature ou publication Apple n’est incluse. La CI tente une compilation pour simulateur sans signature. Ajouter le retour `fr.bigugliaconnect.app://auth/callback` et le domaine de recette aux URL de redirection Supabase, puis vérifier confirmation d’e-mail et récupération sur appareil réel.

Avant publication App Store : recette réelle de toutes les fonctions, suppression de compte, identité et contact de l’éditeur, politique de conservation, déclaration de confidentialité, signature et validation sur iPhone/iPad. Voir [le suivi de reconstruction](docs/RECONSTRUCTION.md).

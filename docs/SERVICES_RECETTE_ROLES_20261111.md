# Biguglia Connect — Services : recette supplémentaire du 11 novembre 2026

## Périmètre validé (sans effets sur les données)

**Base réelle Supabase `qmrkacrpncdkhofiqlrg`.**
Contrôle des droits SQL à l'aide de transactions `BEGIN … ROLLBACK` et
`SET LOCAL ROLE authenticated` : il s'agit d'une **simulation de jeton et de
rôle SQL**, pas d'une session navigateur connectée avec mot de passe.

| Profil simulé | Demandes publiques | Conversations | Messages | Notifications |
| --- | ---: | ---: | ---: | ---: |
| Résident existant | 5 | 1 | 1 | 2 |
| Artisan vérifié existant | 5 | 16 | 26 | 14 |
| Administrateur existant | 5 | 30 | 33 | 5 |
| Identité inconnue | 5 | 0 | 0 | 0 |

Ces chiffres sont un instantané du 11/11/2026, pas des objectifs. Aucune
demande privée n'existait dans le projet à cette date : aucun test positif de
lecture d'un devis privé ne peut donc être certifié à partir de ces données.

**Cinq tentatives SQL d'accès ou écriture non autorisés bloquées :**
1. Lier une URL de photo arbitraire à une demande publique ;
2. Injecter un message en usurpant `sender_id` ;
3. Rejoindre directement une conversation sans passer par l'API ;
4. Créer directement une conversation depuis le rôle navigateur ;
5. Modifier directement une conversation depuis le rôle navigateur.

Ces cinq contrôles ont été exécutés sous `authenticated`, puis annulés ;
aucune donnée réelle n'a été insérée, supprimée ou modifiée durablement.

**Contrôles HTTP de production :** `/demandes` et `/artisans` répondent 200,
avec les bonnes métadonnées, sur le déploiement `82e10b4`.
L'outil d'accès direct à Vercel rencontre une authentification de déploiement
sur certaines routes API ; on ne considère pas un 401 de la plateforme comme
la preuve d'un 401 applicatif.

## Tests automatisés ajoutés

- `e2e/services-access-security.spec.ts` : API messages privées,
  protection de photos privées, rejet d'un nom de fichier suspect,
  affichage de l'annuaire et du tableau de demandes sur petit écran.
  Ces tests s'exécutent automatiquement en CI, sans utilisateur de production.
- `e2e/services-roles.spec.ts` : en mode strict uniquement,
  connexion d'un **résident**, d'un **artisan vérifié** et d'un
  **administrateur**, puis vérification des pages métier sans écriture.
- `.github/workflows/services-qa-authenticated.yml` : lancement
  volontaire de la recette à trois rôles, avec échec explicite s'il manque
  un secret. Aucun mot de passe n'est ajouté au dépôt ou aux rapports.

Les secrets GitHub nécessaires, à définir uniquement dans
**Settings → Secrets and variables → Actions**, sont :
`E2E_RESIDENT_EMAIL`, `E2E_RESIDENT_PASSWORD`,
`E2E_ARTISAN_EMAIL`, `E2E_ARTISAN_PASSWORD`,
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.
Les clés publiques Supabase existantes sont utilisées pour démarrer
l'application en local. Ne jamais mettre les mots de passe dans un commit,
dans une conversation ou dans le code.

## Critères encore non démontrés

- Publication réelle d'une demande et d'un devis privé avec photo ;
- Réception du devis par l'artisan, messagerie temps réel et notifications ;
- Clôture confirmée, avis à l'issue d'une intervention et suppression ;
- Modération complète, blocage, fonctionnement iOS / Android authentifié.

Ces essais nécessitent trois comptes de test dédiés et, pour les opérations
avec écriture, un environnement Supabase de test **distinct de la production**.
Ne pas utiliser les comptes des habitants ou ajouter des données factices
au projet de production.

**Conclusion : l'audit des permissions SQL et le smoke test public
avancent, mais cette recette ne certifie pas encore Services à 100 %.**

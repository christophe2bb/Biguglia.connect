# Biguglia Connect — reconstruction V2

Base de départ : `78636d259425f626080ac3169979ff7b4ab357a2`, 11 novembre 2026.

L’ancienne application demeure à la racine du dépôt. Cette application est un nouveau client dans `apps/v2`, sur une branche indépendante. Aucun contenu ni compte n’a été supprimé. Le domaine de l’ancienne production doit continuer à cibler son projet Vercel `webapp` jusqu’à recette complète de la V2.

## Architecture

- React et TypeScript, Vite, routes paresseuses par domaine.
- Une seule instance Supabase Auth. Aucun appel asynchrone depuis le callback `onAuthStateChange`.
- Profil chargé après la session, indépendamment de la navigation publique.
- Accès REST et Storage avec le jeton de la session courante et les politiques RLS existantes. Aucune clé d’administration dans le client.
- Délai réseau de 12 secondes avec annulation réelle ; erreurs et relance visibles.
- Requêtes paginées, sélections de colonnes explicites, aucun téléchargement initial de toutes les tables.
- Identité visuelle commune, versions ordinateur et mobile, polices locales.
- Projet Capacitor iOS distinct du serveur web : fichiers web embarqués, sans `server.url` distant.

## Inventaire conservé

Artisans et demandes de service ; annonces ; prêt de matériel ; collections ; perdu/trouvé ; offres et demandes d’emploi ; événements ; promenades et sorties ; associations ; entraide ; forum ; groupes communautaires ; messagerie ; favoris ; notifications ; profil et tableau personnel ; modération des signalements, contenus, artisans et utilisateurs.

La présence de l’interface et de l’adaptateur ne constitue pas une validation réelle du métier. Les tests HTTP entre comptes, les règles de visibilité, les envois d’e-mails, les remboursements / paiements éventuels (non présents), les pièces privées et les transitions concurrentes doivent être recensés dans la recette avant mise en production.

## Blocage constaté le 11 novembre

Le contrôle de santé de l’application existante renvoie `degraded`, avec un dépassement du délai Supabase de 5 secondes. Les lectures SQL ont ensuite échoué par délai de connexion ; la génération des types a renvoyé une erreur HTTP 522. Les essais réels ont été suspendus pour éviter d’ajouter de la charge. La documentation Supabase recommande de vérifier les requêtes actives et de redémarrer le projet depuis ses réglages si l’instance est bloquée. Aucun redémarrage ni pause de la base n’a été effectué.

Après l’annonce du rétablissement, plusieurs lectures SQL ont abouti : le contrat local couvre désormais 104 tables/vues et 1 196 colonnes. Les appels à l’API HTTP, y compris depuis l’interface dans le navigateur, dépassent encore leur délai ; les lectures SQL restent intermittentes. L’application de la migration V2 a échoué dès l’initialisation de la table d’historique, avant l’exécution du contrat. Une seconde tentative a expiré côté connecteur ; la lecture de contrôle ne retrouve ni la fonction V2 ni la migration dans l’historique. La migration reste donc à appliquer et à valider sur le projet hébergé. La connexion sécurisée au tableau Supabase a également expiré avant validation ; aucun redémarrage n’a été effectué.

## Vérifications effectuées

- 58 tests locaux réussis : formulaires, colonnes et statuts réels, cycle de session, délais réseau et 25 scénarios PostgreSQL sur base jetable.
- Ces scénarios PostgreSQL vérifient notamment le refus d’auto-promotion administrateur, l’isolement d’un tiers, le blocage d’un échange, les droits sur les photos privées et la déduplication du message initial. Le cycle de prêt vérifie aussi réservation unique, remise, retour, refus des tiers, notifications sans doublons et annulation de toute l’opération en cas d’échec d’écriture.
- La CI GitHub `2eec7d7` a réussi : 44 tests locaux, 32 tests d’interface avec panne simulée, compilation web et compilation Xcode pour simulateur. Les ajouts ultérieurs sont revérifiés par le même workflow.
- La première CI GitHub (`5c7df21`) a réussi : 29 tests locaux à cette révision, 32 tests d’interface ordinateur/mobile avec service de données simulé indisponible, compilation web et compilation Xcode pour simulateur sans signature.
- Déploiement isolé Vercel `biguglia-connect-v2`, protection Vercel activée pour tous les environnements. Aucun lien temporaire de partage n’a été créé après son refus par le contrôle automatique.

Les tests sur base jetable et service simulé ne sont pas une recette réelle entre comptes Supabase. La parité de toutes les options avancées de l’ancienne application et les transactions réelles doivent encore être validées ; cette V2 ne doit pas être présentée comme terminée ou prête à publier sur l’App Store.

## Parité métier

Le suivi matériel V2 utilise `bc_v2_equipment_action` : accepter/réserver, refuser, annuler une demande en attente, confirmer la remise et confirmer le retour. Le propriétaire et l’emprunteur voient le suivi et le nom du correspondant dans la limite des politiques de lecture existantes. Les 100 demandes les plus récentes sont affichées ; les fiches permettent de cibler un matériel. Ce contrat est testé sur base jetable et attend encore son installation et sa recette hébergée.

Les fonctions avancées qui restent à porter et à valider sont recensées dans [la matrice de recette](RECETTE.md).

## Conditions avant bascule

1. Supabase disponible ; schéma réel et politiques relus ; migration additive révisée et testée avant application.
2. Recette réelle résident A, résident B, artisan, modérateur et administrateur, avec preuves d’isolement des données.
3. Connexion, déconnexion, renouvellement, confirmation e-mail, réinitialisation du mot de passe et session mobile.
4. Publications, photos, données privées, signalements, blocages et suppression de compte validés réellement.
5. Parcours iOS compilé et essayé sur un appareil via Xcode ; signature, compte développeur, métadonnées et déclaration de confidentialité App Store finalisés.
6. Identité exacte de l’éditeur, contact de support et durées de conservation à confirmer avant publication publique. Les informations de l’ancien site étaient incomplètes ; aucun opérateur juridique n’a été inventé.

Ne pas présenter cette version comme prête pour l’App Store avant ces validations.

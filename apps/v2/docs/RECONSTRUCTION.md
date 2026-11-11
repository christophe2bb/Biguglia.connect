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

## Conditions avant bascule

1. Supabase disponible ; schéma réel et politiques relus ; migration additive révisée et testée avant application.
2. Recette réelle résident A, résident B, artisan, modérateur et administrateur, avec preuves d’isolement des données.
3. Connexion, déconnexion, renouvellement, confirmation e-mail, réinitialisation du mot de passe et session mobile.
4. Publications, photos, données privées, signalements, blocages et suppression de compte validés réellement.
5. Parcours iOS compilé et essayé sur un appareil via Xcode ; signature, compte développeur, métadonnées et déclaration de confidentialité App Store finalisés.
6. Identité exacte de l’éditeur, contact de support et durées de conservation à confirmer avant publication publique. Les informations de l’ancien site étaient incomplètes ; aucun opérateur juridique n’a été inventé.

Ne pas présenter cette version comme prête pour l’App Store avant ces validations.

# Périmètre et recette V2

Cette matrice décrit le nouveau client. L’ancienne application reste disponible dans le même dépôt. « Codé » indique la présence d’un parcours ; cela ne vaut pas validation sur la base hébergée.

| Domaine | Parcours codés | Travaux avant bascule |
| --- | --- | --- |
| Session | Connexion, inscription, déconnexion, récupération, changement de mot de passe, profil, renouvellement et reprise mobile ; redirections Supabase enregistrées et contrôlées | Vrais e-mails et sessions sur appareil ; suppression de compte |
| Services | Profils artisans, demande publique ou devis ciblé, catégories, photos publiques/privées, commentaires, favoris, statut, contact ; proposition/confirmation/refus/annulation/clôture des rendez-vous, durée et refus des chevauchements confirmés | Disponibilité récurrente, justificatifs de vérification, parcours d’avis et recette navigateur résident/artisan/administrateur |
| Messagerie | Conversations liées à une publication, fil privé, envoi, réception temps réel, lecture, blocage | Échanges réels entre comptes ; historique au-delà des 100 derniers messages ; confirmation d’échange |
| Annonces | Recherche, catégories, fiche, formulaire, modification, statut, photos, favoris et contact | Toutes les transitions métier et interactions liées aux avis |
| Matériel | Demandes datées, suivi propriétaire/emprunteur, réservation, remise et retour transactionnels, notifications et déblocage des avis | Concurrence HTTP réelle ; notes des deux parties ; pagination complète |
| Collections | Catalogue, fiche, formulaire, photos, commentaires et contact | Offres de prix/troc et acceptation transactionnelle |
| Perdu/trouvé | Publications, recherche, catégories, photos, statut et contact | Rapprochements et validation de restitution |
| Emploi | Offres et demandes, filtres, publication, modification et contact | CV privé, accès aux documents et parcours complet de candidature |
| Événements et sorties | Publications, photos, commentaires, inscription/désinscription et liste personnelle | Capacité concurrente, liste d’attente, gestion des participants et présence par l’organisateur |
| Promenades | Catalogue, fiche, publication, photos et commentaires | Parcours cartographique complet et traces |
| Associations | Fiches, photos, publication, commentaires et contact | Besoins et réponses structurées, gestion des membres et médias |
| Entraide | Publication, proposition d’aide, commentaire et contact | Acceptation/refus des propositions, réalisation et avis liés |
| Communauté et forum | Groupes, adhésion, publications et commentaires | Recette des droits et de toutes les actions de modération |
| Administration | Files de signalement, utilisateurs, artisans et contenus ; décisions administratives transactionnelles, motifs, confirmation et journal | Recette réelle de chaque rôle et des justificatifs ; parité de validation artisan par un modérateur |
| iOS | Projet natif Capacitor, ressources embarquées, liens de retour et compilation simulateur | Tests iPhone/iPad, signature, suppression de compte, identité éditeur et soumission Apple |

## Recette hébergée à exécuter

Utiliser des comptes d’essai nommés, sans modifier les comptes des habitants : résident A, résident B, artisan, modérateur et administrateur. Aucun secret de ces comptes ne doit être enregistré dans le dépôt.

Pour chaque domaine : créer, relire après reconnexion, modifier, vérifier l’isolement depuis un tiers, tester les états fermés et archivés, provoquer une réponse réseau lente, relancer sans doublon et vérifier les notifications. Les pièces privées doivent rester illisibles pour le tiers. Les tests de suppression utilisent exclusivement des enregistrements d’essai identifiés.

Pour les prêts : deux acceptations concurrentes sur le même matériel, double clic sur remise/retour, erreur pendant l’écriture d’une notification, refus d’un utilisateur étranger et reprise après délai réseau. Les tests PostgreSQL jetables couvrent les transactions ; les requêtes HTTP concurrentes restent à exécuter sur Supabase rétabli.

La bascule du domaine existant et la publication App Store restent conditionnées à cette recette et à la fermeture des écarts de parité ci-dessus.

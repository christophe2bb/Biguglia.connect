# Biguglia Connect — audit final de la rubrique Services (11/11/2026)

## Périmètre
Artisans, fiches métier, favoris, avis, demande publique, devis privé, tableau des demandes,
détails, réponses, modification, photos, messagerie, statuts et modération.

## Observations vérifiées
- Déploiement de base : `main` / production Vercel prête (contrôle initial).
- L'interface publique et les fonctions sont présentes ; les vérifications automatisées
  comprennent TypeScript, lint, tests unitaires, compilation et Playwright.
- Dans `e2e/service-requests.spec.ts`, les parcours de vrais utilisateurs
  dépendent de `STRICT_E2E` et d'identifiants de test ; ils sont ignorés
  lorsque ces conditions sont absentes. Le scénario de formulaire authentifié
  n'envoie volontairement aucune demande réelle.
- Dans Supabase, RLS activée sur les tables Services pertinentes.
- Audit des INSERT réels : des politiques héritées permissives permettaient
  de contourner des politiques plus strictes (création demande/statut,
  URL des photos et identité de l'expéditeur). Migration
  `20261111115000_consolidate_services_insert_policies.sql` appliquée.
  Les trois tables n'ont désormais qu'une politique INSERT,
  chacune avec les vérifications nécessaires ; données conservées.
- Test de lecture sous un UUID simulé non membre : aucun message ni commentaire
  visible ; les demandes publiques restent visibles aux comptes connectés.
- Inventaire au moment de l'audit : cinq demandes, zéro devis privé,
  deux références photo, zéro commentaire. Aucun scénario positif
  de devis privé, photo privée ou notification à deux comptes ne peut
  être prouvé par ces données.

## Matrice de recette
| Action | Contrôle code / automatisé | Test utilisateur réel |
| --- | --- | --- |
| Annuaire artisans, recherche, catégorie et fiche | Oui, dont tests de recherche avec données simulées | Pas de parcours métier complet certifié |
| Favoris / avis | Code et tests ciblés | À vérifier sur compte connecté |
| Poster une demande publique | Validation et permissions contrôlées | Publication réelle non exécutée |
| Poster un devis privé | Chemin API, création conversation et stockage privé contrôlés | À vérifier avec résident et artisan test |
| Tableau des demandes / recherche / filtres | Tests Playwright et logique SQL contrôlés | À confirmer sur jeu de données diversifié |
| Modification / annulation / résolution / suppression | Code, permissions et tests ciblés | Parcours complet non exécuté |
| Commentaire / notification | RLS et déclencheurs contrôlés | À tester avec deux comptes |
| Réception artisan / refus / planification | Code, déclencheurs, permissions contrôlés | À tester avec un artisan vérifié |
| Messagerie / blocage / échange terminé | Code et tests unitaires ; correctif Realtime en production | Échange temps réel à confirmer |
| Photos privées, galerie et zoom | Contrôles d'autorisation et composants contrôlés | Accès depuis deux comptes et mobile à tester |
| Validation / refus / révocation d'artisan | API et RPC transactionnelle contrôlées | Test admin / modérateur à confirmer |

## Conditions de clôture
Ne pas considérer Services « 100 % validé » sans une recette multi-comptes
sur environnement de test avec : résident, artisan vérifié, administrateur
ou modérateur, utilisateur non autorisé ; une publication publique,
un devis privé avec photo, échanges, notifications, avis, blocage, clôture,
suppression, écran mobile et connexions interrompues.

L'audit de code et de SQL ne remplace pas les essais authentifiés.
Ne pas supprimer les anciens fichiers photo possiblement orphelins sans inventaire.

# Biguglia Connect — préparation de mise en ligne (11 novembre 2026)

> Document de suivi technique de la même application (dépôt `christophe2bb/Biguglia.connect`, Vercel `webapp`, Supabase existant).
> La préparation et les contrôles ne valent **pas** autorisation de publier en production.

## Déploiements et maîtrise du quota gratuit

- Offre Vercel actuellement constatée : **Hobby**.
- Branche de travail : `fix/messagerie-integrite-20261110` (PR #573, non fusionnée).
- `vercel.json` : `git.deploymentEnabled["fix/messagerie-integrite-20261110"] = false` pour arrêter les déploiements automatiques de **cette branche** pendant l'audit.
- `main` conserve son comportement de déploiement existant ; ne pas y pousser/fusionner avant validation de la publication.
- Les commits sur la branche continuent de déclencher les contrôles GitHub Actions (PR), **sans avoir besoin de Vercel**.
- Pour la prochaine prévisualisation Vercel : réactiver **uniquement** la branche de travail dans `vercel.json` lors d'un commit de validation, après disponibilité du quota et réussite des contrôles CI. Vérifier qu'un seul aperçu se déclenche ; ne pas déclencher de déploiements redondants.
- Pour la production : obtenir l'accord de publication, confirmer branche/commit/environnement, ne fusionner qu'après recette et vérification des secrets/configuration. Tester les journaux après la mise en ligne.

## Contrôles à réussir avant toute publication

- [ ] Dernier commit de la PR #573 : GitHub CI **verte** (typecheck, lint, Vitest, build, Playwright).
- [ ] Parcours *Services > Poster une demande* : validation des champs, secteur, urgence, rendez-vous, photos, envoi et redirection.
- [ ] Parcours *Services > Tableau des demandes* : filtres, recherche, pagination, résultats vides, compteurs et navigation.
- [ ] Parcours détail : consulter, répondre, supprimer un commentaire autorisé, modifier/supprimer sa demande, marquer résolue.
- [ ] Parcours artisans : réception de devis privé, messagerie, changement de statut, refus et impossibilité d'accéder au devis d'autrui.
- [ ] Scénarios **réels** sur au moins deux comptes de test distincts et un visiteur non connecté, avec nettoyage des données de test. Les tests sans identifiants E2E peuvent être ignorés : un badge CI vert n'atteste pas de ces parcours réels.
- [ ] Vérifier la séparation des privilèges, les RLS des tables liées et le contrôle des actions de modération.
- [ ] Vérifier les photos depuis un navigateur sans session, notamment les devis privés.

## Risques connus / points bloquants

1. **Photos de devis privés** : les fichiers `requests/` sont actuellement dans le bucket Supabase `photos` **public**. La restriction RLS de `service_requests` ne protège pas à elle seule les fichiers. Un avertissement est déjà affiché dans le formulaire, mais **la confidentialité des pièces jointes n'est pas garantie**. Prévoir un stockage privé avec contrôle serveur et URL signée, sans modifier brutalement le bucket partagé utilisé par les autres fonctionnalités. **Blocage de validation du niveau de confidentialité attendu.**
2. **Stockage incohérent historique** : audit du 11/11 : 13 objets `requests/`, seulement 2 métadonnées associées dans `service_request_photos` ; 11 objets orphelins ou non reliés. Effectuer un inventaire fiable des références puis un nettoyage autorisé, **pas de suppression en masse**.
3. **Recette multi-compte non attestée** : la base contient peu de données (5 demandes, 0 commentaire lors du dernier audit). Les tests E2E de publication réelle doivent être exécutés sur des comptes et des demandes de test isolés.
4. **Erreurs Vercel antérieures** : ne pas confondre un ancien déploiement en erreur avec l'état du code sur le dernier commit ; contrôler l'aperçu correspondant au SHA effectivement testé.

## Corrections effectuées sur la branche

- Nettoyage des photos importées lorsque leur association SQL échoue, avec remontée d'un avertissement si le nettoyage échoue.
- Harmonisation de l'autorisation de suppression d'un commentaire côté bouton et traitement.
- Suppression des liens de photos **non associées en base** dans le message initial envoyé à l'artisan.
- Suspension des déploiements automatiques de la branche d'audit, pour conserver le quota gratuit.

## Règle de mise en ligne

**Pas de fusion ni de déploiement en production sans CI verte sur le bon SHA, recette de sécurité et feu vert explicite.**

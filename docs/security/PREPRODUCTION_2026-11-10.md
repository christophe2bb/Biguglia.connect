# Biguglia Connect — verrouillage Supabase avant fusion (10 novembre 2026)

> **PRÉPRODUCTION UNIQUEMENT — NE PAS EXÉCUTER DE MIGRATION SUR LA BASE ACTIVE.**
> Les changements du code sont dans la PR #569. Ce document décrit les
> contrôles restants, pas une attestation de sécurité ni un ordre d'exécution.

## Inventaire relevé en lecture seule

- `auth.users` : 6 comptes ; `public.profiles` : 4 profils.
- `listings` : 6 ; plusieurs annonces actives ne sont pas publiées/modérées.
- `sectors` : 6 identifiants, contre 7 dans l'interface (`la-marana` manquant).
- `forum_topics` : 6 sujets ; `forum_posts` (historique) : 4.
- `storage.objects` bucket `photos` : 71 objets répartis entre plusieurs modules.
- `job-documents` est actuellement un bucket public ; aucun objet dans ce
  bucket au relevé. Les nouveaux CV sont destinés au bucket privé `documents`.
- Des règles `SELECT true` pour les annonces et photos et des autorisations
  de modification trop générales sont encore actives.
- L'assistant Supabase signale une vue `moderation_kpi` non `security_invoker`.

Le constat reflète un instantané, pas un diagnostic définitif après déploiement.

## Étapes techniques (ordre requis)

1. **Vérifier une sauvegarde récupérable** et le retour arrière, sans données
   personnelles dans les journaux, tickets ou artefacts GitHub.
2. **Valider les chemins applicatifs** : toutes les suppressions `photos`
   passent par `DELETE /api/storage/photos`, tous les uploads par `POST /api/upload`.
   Vérifier avec deux utilisateurs distincts, les rôles staff et les anciennes images
   dont `owner_id` est absent.
3. **Profils** : empêcher le compte standard de changer son rôle, son statut,
   son activité et ses indicateurs de modération. Préserver les opérations
   administratives légitimes avec contrôle d'identité côté serveur.
4. **Annonces** : RLS publique uniquement si `moderation_status = 'publie'`
   et statut publiable. Propriétaires : accès à leurs propres brouillons.
   Modérateurs : accès aux éléments à examiner. Un auteur ne doit pas pouvoir
   forcer `moderation_status = 'publie'` via la Data API.
5. **Photos d'annonces** : appliquer la même visibilité RLS aux lignes
   `listing_photos`. Retirer les politiques Storage qui autorisent tout
   membre connecté à supprimer/modifier les photos d'autrui.
6. **Emploi** : rendre `job-documents` privé ; vérifier l'absence de lien
   public de CV et l'accès à `/api/emploi/cv`. **Les colonnes
   `job_demands.contact_email` et `contact_phone` restent visibles via
   la Data API pour des annonces publiées** tant que les accès à cette table
   ne sont pas réorganisés. Ne pas confondre l'affichage UI et la sécurité SQL.
7. **Secteurs et ancien forum** : faire correspondre `la-marana` avec une
   entrée `sectors`, puis reprendre les anciens sujets/commentaires sans
   doublonner ni supprimer les contenus.
8. **Revoir les fonctions** `SECURITY DEFINER`, `EXECUTE` et la vue KPI,
   puis relancer Supabase Security Advisors et les tests unitaires/Playwright.
9. **Inscription** : vérifier une inscription avec confirmation email et une
   création de profil; réparer les profils existants seulement après
   rapprochement individuel et contrôle des consentements.

## Matrice de non-régression minimale

| Acteur | Action | Résultat requis |
|---|---|---|
| Visiteur | Lire une annonce publiée | Autorisé |
| Visiteur | Lire un brouillon / annonce en attente par lien direct ou API | Refusé |
| Habitant A | Modifier `profiles.role`, `status`, `is_active` | Refusé |
| Habitant A | Ajouter une annonce en attente | Autorisé |
| Habitant A | Approuver lui-même son annonce via Data API | Refusé |
| Habitant A | Supprimer ses propres photos | Autorisé |
| Habitant A | Supprimer les photos de B | Refusé |
| Habitant A | Contacter B pour une annonce de B publiée | Autorisé si aucun blocage |
| Habitant A | Contacter B via une annonce de C | Refusé |
| Habitant A | Contacter B après blocage de l'un des deux | Refusé |
| Habitant A | Voir un CV privé d'une demande non publiée de B | Refusé |
| Membre connecté actif | Voir un CV privé publié via URL éphémère | Autorisé |
| Modérateur | Consulter la file de modération | Autorisé selon périmètre |
| Inscription | Compte Auth créé mais profil absent | Récupération sûre, jamais rôle staff |

## Conditions de publication

- Contrôles CI au vert sur le commit exact candidat.
- Tests **réels** avec au moins deux comptes distincts et données fictives
  dans une base isolée. Les tests unitaires simulés ne prouvent pas que les
  politiques RLS de production sont correctes.
- Vérifier les régressions sur forums, annonces, matériel, photo iPhone,
  Emploi et navigation mobile.
- Déployer séparément schéma, puis application, ou l'inverse selon compatibilité
  explicitement éprouvée en préproduction ; ne pas improviser l'ordre.
- Ne pas publier l'application App Store tant que la sécurité des données et
  les fonctionnalités communautaires obligatoires ne sont pas vérifiées.

**État actuel : code correctif sur branche GitHub ; base de production inchangée.**

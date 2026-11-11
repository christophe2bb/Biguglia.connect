# Biguglia Connect — contrôle de publication / Services

**Périmètre exclusif :** Artisans, Poster une demande, Tableau des demandes,
détails, suivi, commentaires, messagerie, pièces jointes, notifications,
administration des artisans et règles RLS.

**Dépôt unique :** `christophe2bb/Biguglia.connect`.
**PR de travail :** #573, `fix/messagerie-integrite-20261110`.
**Déploiement :** Vercel Hobby ; déploiement automatique de cette branche
désactivé dans `vercel.json`. `main` reste inchangée.

> Une CI réussie valide le code et les scénarios automatisés, **pas** la recette
> réelle multi-utilisateur ni la production. Ne pas fusionner ni publier sans
> feu vert explicite et sans lever les blocages ci-dessous.

## Corrections contrôlées / mises en place

- Annuaire Artisans : vrais IDs de profil, recherche et pagination au-delà
  de 200 fiches ; notes provenant de `item_ratings`.
- Favoris Artisans : vérifier que la base a modifié une ligne avant de changer le
  cœur et d'annoncer un succès.
- Poster une demande : validation des champs, défense contre les statuts
  falsifiés à l'INSERT, artisan cible obligatoirement vérifié, protection
  contre l'envoi à sa propre fiche.
- Tableau : filtres avant pagination, compteurs quartiers globaux, tab
  devis privés soumis à RLS.
- Fiche demande : suppression propriétaire contrôlée côté serveur,
  nettoyage du stockage après suppression SQL, nettoyage des fichiers
  orphelins de cette demande ; modification interdite des dossiers clos.
- Gestion du cycle de vie : le résident peut clôturer, annuler sans supprimer
  et conserver l'historique ; mises à jour conditionnelles sur ancien statut.
- Messagerie : retour à la bonne fiche après connexion, contrôle du destinataire
  et des comptes vérifiés, blocages bidirectionnels recontrôlés avant chaque
  message et au niveau du trigger SQL, validation de l'expéditeur.
- Notifications : lorsqu'un artisan modifie le statut, le résident est prévenu ;
  lorsqu'un résident annule/clôture un devis privé, l'artisan est prévenu ;
  demande d'avis après clôture maintenue.
- Photos privées : nouveau bucket `service-quote-photos` (public = false),
  upload réservé aux devis, URL de lecture interne, contrôle du résident,
  artisan destinataire, rôle modération, compte actif et métadonnée associée.
  Les autres photos restent dans `photos` (public) ; pas de bascule globale.
- RLS photos : URLs et appartenance au bon dossier/bucket obligatoires,
  refus d'ajouter des pièces jointes après clôture.
- Administration Artisans : validation/refus via transaction RPC unique,
  non-exécutable par les comptes ordinaires ; décisions uniquement annoncées
  après confirmation et signalement séparé d'un échec de notification.
- UX admin : protection contre les doubles clics, formulaire de révocation
  avec motif, pas de fermeture prématurée du dossier.

## Installation Supabase vérifiée — 11 novembre 2026

- Projet de référence : `qmrkacrpncdkhofiqlrg` (« christophe2bb's Project »).
- Migration `confirm_conversation_exchange_20261111` **appliquée avec succès** :
  la fonction `public.confirm_conversation_exchange(uuid, uuid)` existe.
- Droits vérifiés : `service_role` peut l'exécuter ; `anon` et
  `authenticated` **ne peuvent pas** l'exécuter.
- Bucket `service-quote-photos` confirmé **privé**, limité à 5 Mio
  et aux formats JPEG/PNG/WebP/GIF.
- RLS activée sur `service_requests`, `service_request_photos`,
  `request_comments`, `artisan_profiles`, `conversations`,
  `conversation_participants`, `messages` et `user_blocks`.
- Correctif GitHub supplémentaire : envoi de message refusé si l'expéditeur
  ou un destinataire n'est pas actif, avec tests de régression.
- Aucune nouvelle version Vercel ni fusion dans `main` autorisée.
- Les essais réels multi-comptes, les accès aux photos avec comptes distincts
  et les tests mobiles restent requis avant publication.

## Contrôles avant publication

- [ ] Dernier commit GitHub : TypeScript, lint, tests unitaires, build et
      Playwright **tous réussis sur le même SHA**.
- [ ] Recette réelle avec un résident, un artisan vérifié, un administrateur et
      un tiers non autorisé, sur des comptes **de test**.
- [ ] Déposer une demande publique : filtre, recherche, compteur, commentaire,
      statut, notification, résolution, annulation, suppression.
- [ ] Déposer un devis privé avec photos : vérifier le fil dans la messagerie,
      la réception artisan, le retour après connexion, les avis et statuts.
- [ ] Tester avec deux navigateurs : URL privée inaccessible sans connexion,
      inaccessible au tiers et à un compte suspendu ; accessible au résident,
      à l'artisan destinataire et au modérateur.
- [ ] Tester les interruptions réseau, doublons, erreurs de notification et
      suppression partielle de photos avec retour utilisateur correct.
- [ ] Tester iPhone et Android (boutons, galerie, zoom, formulaires et clavier).
- [ ] Nettoyer uniquement après inventaire validé les fichiers historiques
      potentiellement orphelins ; **ne jamais supprimer en masse**.

## Dernier inventaire Supabase (11 novembre 2026)

| Indicateur | Valeur constatée |
| --- | ---: |
| Demandes | 5 |
| Devis privés | 0 |
| Commentaires | 0 |
| Artisans vérifiés | 1 |
| Références de photos | 2 |
| Fichiers publics dans `requests/` | 13 |
| Fichiers dans le nouveau bucket privé | 0 |

**Point de vigilance :** les 13 fichiers publics pour 2 références demandent
un inventaire et une éventuelle correction manuelle autorisée, pas une suppression
automatique. Les essais de devis avec de vrais utilisateurs et de vrais fichiers
privés restent à démontrer avant publication.

**Source de vérité :** PR #573 et états GitHub Actions du commit testé.
**Règle :** pas d'autre rubrique et pas de fusion en production tant que
Services n'a pas passé la recette complète.

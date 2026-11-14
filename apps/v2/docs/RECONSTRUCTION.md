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

## État Supabase au 14 novembre 2026

L’incident du 11 novembre est résolu lors des derniers contrôles : l’API REST répond et les contrôles de santé ne renvoient plus d’alerte. La première migration avait finalement abouti après l’expiration de l’appel. Son fichier local a été réconcilié avec l’historique hébergé `20261111173446_v2_secure_client_contract.sql`, sans rejouer ses politiques.

La migration `20261112031348_v2_transactional_workflows.sql` est installée. Elle ajoute le cycle transactionnel des prêts et les décisions administratives auditées. Les endpoints publics d’administration refusent le rôle anonyme ; le rôle connecté doit ensuite passer la vérification d’un administrateur actif dans la fonction.

Le script `tests/hosted-contract.sql` a réussi sur la base hébergée : prêt complet et relances, notifications sans doublons, déblocage des avis, conversation et premier message uniques, refus d’un tiers non modérateur et refus d’une décision administrative par un résident. Les identités sont simulées uniquement au niveau SQL ; ce test ne vérifie pas l’émission d’un jeton Auth ni la connexion réelle du navigateur. Toute la transaction a été annulée, puis une lecture a confirmé l’absence de matériel et de conversation de recette restants. Aucun profil existant n’a été modifié.

## Vérifications effectuées

- 126 tests locaux réussis : formulaires, colonnes et statuts réels, cycle de session, délais réseau, interfaces administratives/rendez-vous/avis/contact et 72 scénarios PostgreSQL sur base jetable.
- Ces scénarios PostgreSQL vérifient notamment le refus d’auto-promotion administrateur, l’isolement d’un tiers, le blocage d’un échange, les droits sur les photos privées et la déduplication du message initial. Le cycle de prêt vérifie aussi réservation unique, remise, retour, refus des tiers, notifications sans doublons et annulation de toute l’opération en cas d’échec d’écriture.
- La CI GitHub `2cabcfb` a réussi : 58 tests, 32 contrôles d’interface avec panne simulée et compilations web et iOS pour simulateur.
- La CI GitHub `ba4414b` a réussi : 69 tests, 32 contrôles d’interface avec panne simulée et compilations web et iOS pour simulateur. Les nouveaux rendez-vous déclenchent à nouveau ces contrôles.
- La CI GitHub `6cff076` a réussi : 93 tests, 32 contrôles d’interface avec panne simulée et compilations web et iOS pour simulateur. Le workflow suit maintenant aussi les changements de migrations.
- La CI GitHub `62c155e` a réussi : 111 tests, 32 contrôles d’interface avec panne simulée et compilations web et iOS pour simulateur.
- La CI GitHub `fc2f0c8` a réussi : 126 tests, 32 contrôles d’interface avec panne simulée et compilations web et iOS pour simulateur. Exécution `43557791350`.
- La CI GitHub `2eec7d7` a réussi : 44 tests locaux, 32 tests d’interface avec panne simulée, compilation web et compilation Xcode pour simulateur. Les ajouts ultérieurs sont revérifiés par le même workflow.
- La première CI GitHub (`5c7df21`) a réussi : 29 tests locaux à cette révision, 32 tests d’interface ordinateur/mobile avec service de données simulé indisponible, compilation web et compilation Xcode pour simulateur sans signature.
- Déploiement isolé Vercel `biguglia-connect-v2`, protection Vercel activée pour tous les environnements. Aucun lien temporaire de partage n’a été créé après son refus par le contrôle automatique.

Les tests sur base jetable et service simulé ne sont pas une recette réelle entre comptes Supabase. La parité de toutes les options avancées de l’ancienne application et les transactions réelles doivent encore être validées ; cette V2 ne doit pas être présentée comme terminée ou prête à publier sur l’App Store.

## Parité métier

Le suivi matériel V2 utilise `bc_v2_equipment_action` : accepter/réserver, refuser, annuler une demande en attente, confirmer la remise et confirmer le retour. Le propriétaire et l’emprunteur voient le suivi et le nom du correspondant dans la limite des politiques de lecture existantes. Les 100 demandes les plus récentes sont affichées ; les fiches permettent de cibler un matériel. Ce contrat est installé et a réussi la recette SQL hébergée décrite ci-dessus. Les requêtes HTTP concurrentes et les sessions réelles restent à vérifier.

Les fonctions avancées qui restent à porter et à valider sont recensées dans [la matrice de recette](RECETTE.md).

## Rendez-vous des devis privés

La migration hébergée `20261112040922_v2_service_appointments.sql` ajoute l’auteur de proposition et une durée de 15 à 480 minutes. Les deux participants peuvent proposer ; seul le destinataire accepte/refuse ; seul le résident confirme la fin. Les écritures directes sont révoquées et les fonctions contrôlent identité, compte actif, artisan vérifié et blocages. Le verrou de l’artisan empêche deux confirmations qui se chevauchent. Les heures sont interprétées en Corse, y compris le refus d’une heure inexistante au passage à l’heure d’été.

La confirmation programme le devis ; l’annulation libère le créneau ; la clôture déclenche le contrat historique d’avis. Fermer le devis par son autre parcours annule aussi ses propositions encore actives. Les relances conservent l’identifiant et ne doublent pas les notifications.

Le script `tests/hosted-appointments.sql` a réussi sur Supabase avec les vrais triggers et des identités simulées au niveau SQL : proposition, relance, refus d’auto-confirmation et d’un tiers, isolement, interdiction d’écriture directe, conflit de créneaux, confirmation, clôture, avis et annulation liée au devis. La transaction a été annulée ; la lecture suivante confirme zéro rendez-vous et zéro devis de recette restants. Ce contrôle ne constitue pas une connexion Auth réelle entre deux navigateurs. Les avertissements de sécurité préexistants sont inchangés et le contrôle de santé est vide.

## Avis après intervention et tableau des demandes

Le tableau Services propose trois vues : demandes publiques (`artisan_id is null`), demandes et devis du résident, devis reçus par ses profils artisans. Si aucun profil artisan n’est trouvé, la vue reçue reste vide et ne retombe jamais sur l’ensemble des demandes.

La page `/dashboard/avis` reçoit les notifications historiques de fin d’intervention. Elle présente les interventions éligibles, les avis donnés et les avis reçus. Le dépôt utilise `bc_v2_submit_service_review` : devis terminé, preuve d’interaction, identité résident/artisan, note de 1 à 5, commentaire et période de 30 jours contrôlés par le serveur ; avis, indicateur de réalisation et notification sont atomiques. L’identifiant est conservé après une panne réseau. La contrainte historique d’un avis par résident et artisan est conservée. Les avis vérifiés ne peuvent être réattribués ni réécrits ; seule la modération change leur visibilité. Les fiches artisan montrent les avis visibles liés à une intervention vérifiée.

Les migrations `20261112042137_v2_verified_service_reviews.sql` et `20261114041938_v2_review_stats_permissions.sql` sont installées. Le contrôle hébergé a révélé que le trigger historique de statistiques bloquait la modération par RLS et produisait des valeurs nulles lorsqu’aucun avis visible ne restait. Un trigger privé calcule désormais les agrégats sans autoriser les clients à écrire les statistiques ; zéro avis visible produit zéro note et zéro compteur. Les avis historiques sans destinataire restent compatibles. Une politique restrictive protège les avis masqués malgré les anciennes politiques de lecture permissives.

Le 14 novembre, `tests/hosted-service-reviews.sql` a réussi avec les vrais triggers : avis après clôture, refus d’un tiers, relance unique, statistiques, notification, preuve immuable, modération et visibilité auteur/tiers. Toute la transaction a été annulée ; zéro devis et zéro avis de recette restent en base. Ce contrôle simule les identités SQL ; les connexions réelles et les parcours sur appareil restent à vérifier.

## Contact privé et conservation du contexte

La migration `20261114043322_v2_bidirectional_quote_contact.sql` corrige le contact unidirectionnel des devis : le résident peut commencer l’échange avec l’artisan affecté et l’artisan avec le résident. Les deux sens et les relances retrouvent la même conversation. Son propriétaire de contexte reste le résident. Les tiers restent refusés, et un devis clos ne permet pas de démarrer un nouvel échange. La fiche ouvre directement une conversation déjà commencée, y compris après clôture.

La même vérification a identifié le risque de `ON DELETE SET NULL` : supprimer un artisan pouvait retirer `artisan_id` des devis privés et les faire apparaître parmi les demandes publiques. Un trigger bloque désormais cette suppression lorsqu’un devis y est lié ; la désactivation reste le parcours à utiliser. Aucun devis ni profil existant n’a été supprimé.

Le script hébergé `tests/hosted-quote-contact.sql` a réussi : résident vers artisan, réponse inverse, unicité, relance, contexte propriétaire, isolement des messages, refus d’auto-validation artisan par un résident et conservation du caractère privé lors d’une tentative de suppression. Tout a été annulé ; la lecture suivante confirme zéro devis et zéro message de recette restants.

Les formulaires et brouillons sont réinitialisés lorsqu’on change de fiche ou de compte. Les tests d’interface couvrent les deux destinataires, la conversation existante, le lecteur administrateur non participant et l’absence de brouillon d’un autre contexte. Un devis privé est programmé par son rendez-vous ; son sélecteur n’offre pas de transition manuelle qui désynchroniserait les deux. Les états clos sont en lecture seule.

## Contrôle du navigateur avec données réelles

Le 14 novembre, le catalogue, les catégories, la fiche artisan, les photos et la section d’avis après intervention ont été contrôlés à nouveau sur l’aperçu relié au vrai Supabase. Les liens « Demander un devis » et « Mes avis » conduisent à la protection de connexion avec la bonne destination de retour. Voir [la capture de contrôle Services](preview-services-20261114.jpg). Ce navigateur n’a pas de session utilisateur de l’application : aucune publication ni message n’a été envoyé dans ce contrôle. Les seules erreurs de console observées provenaient de l’extension du navigateur, pas du code de l’application.

Le 12 novembre, le catalogue des artisans, les catégories, la fiche détaillée, les photos, une recherche sans résultat et le retour à la liste complète ont été vérifiés depuis le navigateur sur l’aperçu local raccordé au vrai projet Supabase. Voir [la capture de contrôle](preview-live-artisans.jpg). Aucun formulaire d’authentification n’a été soumis et aucun contenu utilisateur n’a été modifié pendant ce contrôle.

## Retours Auth et adresse stable

L’adresse fixe `https://biguglia-connect-v2.vercel.app` sert la révision `31e6a34` depuis le 14 novembre. Le déploiement V2 `dpl_6gShL9x5G7n8xcDxWjs64btaDhEu` est READY, cible production du projet V2 protégé par Vercel Authentication pour tous les environnements. La cible « production » n’indique pas une ouverture au public ni une recette complète. Le domaine de l’ancienne application reste rattaché au projet `webapp`. Voir [le relevé de livraison](deployment-v2.snapshot.json).

La connexion au tableau Supabase a abouti. L’ancien Site URL était `http://localhost:3000` et la liste de redirection était vide. Le Site URL pointe maintenant sur l’adresse fixe de la V2 ; 11 retours ont été ajoutés pour les routes web de confirmation/récupération, les adresses existantes, l’aperçu stable, le client iOS et l’aperçu local. L’enregistrement a été vérifié après rechargement.

Les contrôles HTTP avec un jeton volontairement invalide ont confirmé le retour web, le retour iOS et le refus d’une origine extérieure. Ils n’envoient aucun e-mail et ne constituent pas un test d’émission/consommation d’un vrai jeton utilisateur. Le détail public des URL est dans [le relevé de configuration](auth-redirects.snapshot.json).

## Administration V2

Les changements d’état des comptes et la validation des artisans passent par `bc_v2_admin_decision` : droits contrôlés sur le serveur, motif, confirmation, journal et notification. Un administrateur ne peut pas utiliser cette action pour modifier son propre compte ni un compte administrateur/modérateur. La V2 réserve ces décisions et le journal aux administrateurs ; les modérateurs conservent les vues signalements et contenus. La validation artisan par un modérateur, présente dans l’ancienne API serveur, reste un écart de parité explicite.

Les tests d’interface vérifient le motif obligatoire, l’appel au contrat protégé, la séparation des rôles et la reprise après erreur de chargement. Ils ont révélé et permis de corriger la perte de focus des fenêtres de dialogue lors de la saisie.

## Points de sécurité préexistants

Les contrôles Supabase conservent des avertissements antérieurs à cette modification : [extension dans public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), fonctions historiques [exécutables par anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) ou [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), et [protection contre les mots de passe compromis désactivée](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Ces fonctions doivent être examinées individuellement avant toute révocation afin de préserver les parcours existants. Les nouvelles fonctions privilégiées résident dans un schéma privé ; leurs façades publiques utilisent SECURITY INVOKER.

## Conditions avant bascule

1. Supabase disponible ; schéma réel et politiques relus ; migration additive révisée et testée avant application.
2. Recette réelle résident A, résident B, artisan, modérateur et administrateur, avec preuves d’isolement des données.
3. Connexion, déconnexion, renouvellement, confirmation e-mail, réinitialisation du mot de passe et session mobile.
4. Publications, photos, données privées, signalements, blocages et suppression de compte validés réellement.
5. Parcours iOS compilé et essayé sur un appareil via Xcode ; signature, compte développeur, métadonnées et déclaration de confidentialité App Store finalisés.
6. Identité exacte de l’éditeur, contact de support et durées de conservation à confirmer avant publication publique. Les informations de l’ancien site étaient incomplètes ; aucun opérateur juridique n’a été inventé.

Ne pas présenter cette version comme prête pour l’App Store avant ces validations.

## Diagnostic connexion et e-mails du 14 novembre

La correction `31e6a34` distingue les identifiants incorrects, une adresse non confirmée et les erreurs de distribution. La page de retour sans session n’annonce plus une confirmation réussie, y compris lorsque l’erreur arrive dans le fragment URL. La récupération attend une session authentifiée avant de proposer un nouveau mot de passe. Changer de page de connexion efface le mot de passe saisi, et le renvoi de confirmation efface les notices ou erreurs précédentes.

Les 137 tests et la compilation web ont réussi sur une extraction isolée du commit livré, sans les travaux de messagerie encore en cours. La CI `43565732157` a aussi réussi : 137 tests, 32 contrôles d’interface et compilation iOS pour simulateur sans signature. Le diagnostic des journaux indique `invalid_credentials`, sans preuve actuelle d’une panne SMTP. L’accès aux réglages SMTP nécessite encore la connexion au tableau de bord ; aucun mot de passe de compte ni réglage d’envoi n’a été changé et aucun e-mail réel n’a été envoyé pendant ces tests.

Les correspondances entre branches GitHub et projets Vercel sont détaillées dans le README V2. L’ancienne branche `main` demeure à `78636d2` ; la V2 ne remplace pas encore son domaine public.

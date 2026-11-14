# Connexion et e-mails : contrôle du 14 novembre 2026

Le rétablissement du service et la distribution d’un e-mail réel ne sont pas encore confirmés. Aucun nouveau compte, projet, abonnement ou secret d’envoi n’a été créé pendant ce contrôle.

## Observations

- Le compte Brevo existant est accessible. Les 87 événements du journal du 7 au 14 novembre comprennent des messages des applications Festivités et Élagage, ainsi que des réinitialisations sans nom d’application. Cela ne suffit pas à établir la configuration SMTP de Biguglia Connect. Aucun corps d’e-mail ni lien d’authentification n’a été utilisé.
- Avant le test de récupération, le projet Biguglia Connect ne présentait aucune création de compte, demande de confirmation ou récupération récente sur cette période. Le compte administrateur existant était déjà confirmé.
- Une demande de récupération a été soumise depuis le formulaire de la V2 déployée. Le navigateur a expiré avant de recevoir la réponse. Le journal de la passerelle Supabase indique une réponse HTTP 200 pour cette demande. Cette réponse ne prouve ni l’existence de l’adresse saisie ni la distribution de l’e-mail.
- Le contrôle de santé Supabase a signalé 100 % d’échecs sur 25, puis 53 requêtes Data API dans ses fenêtres de mesure. Plusieurs lectures administratives SQL ont aussi expiré. Le statut de contrôle du projet restait `ACTIVE_HEALTHY` ; il ne suffisait donc pas à valider le fonctionnement de l’API.
- Une lecture de `pg_stat_activity` a identifié cinq sessions `authenticator` / PostgREST inactives dans une transaction, sans transaction d’écriture attribuée. Les instructions visibles étaient des lectures ou des débuts de transaction ; aucune relation métier n’apparaissait parmi leurs verrous relevés.
- Une fermeture ciblée a été tentée avec contrôle du PID, de la date de démarrage, de la transaction, de l’inactivité, de l’absence d’écriture et des verrous. Les appels ont expiré ; leur résultat reste inconnu. Ne pas présenter ces sessions comme fermées sans vérification.
- L’organisation est sur le forfait Pro. La pause/reprise n’est pas disponible pour ce forfait et n’a pas été utilisée. Aucun transfert d’organisation ni changement de capacité n’a été effectué.

Le tableau de bord Supabase a présenté un contrôle anti-robot dans le navigateur partagé. Les outils connectés disponibles ne proposent pas la commande de redémarrage du projet ni la modification de sa configuration SMTP. Le compte Brevo a été contrôlé sans modifier l’envoi des autres applications.

## Correction du client

Le délai réseau reste borné à 12 secondes. Un délai ou une perte de réponse sur une inscription, une récupération ou un renvoi ne doit pas être présenté comme la preuve que l’opération n’a pas eu lieu côté serveur. L’interface affiche désormais un résultat non confirmé et invite à vérifier la boîte de réception avant de demander un autre lien. Elle ne relance pas automatiquement l’envoi.

Les erreurs explicites du fournisseur, notamment une adresse non autorisée ou une limite d’envoi, restent distinguées des pertes de réponse. Les tests de régression n’envoient pas d’e-mail et ne créent pas de compte réel.

## Vérifications restant nécessaires

Après remise en service du même projet Supabase : contrôler une lecture SQL légère, une lecture Data API, le contrôle de santé sur sa période complète, puis la récupération et la connexion d’un compte existant. Confirmer séparément l’acceptation de la demande, la distribution de l’e-mail et l’ouverture effective de la session.

La configuration SMTP Brevo de ce projet reste à contrôler avant de la remplacer. Les paramètres privés doivent rester dans les réglages du fournisseur ; aucune clé ne doit être enregistrée dans le dépôt.

## Références

- [Diagnostic des API HTTP Supabase](https://supabase.com/kb/troubleshooting/http-api-issues)
- [Délai de connexion SQL](https://supabase.com/kb/troubleshooting/failed-to-run-sql-query-connection-terminated-due-to-connection-timeout)
- [Configuration SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Configuration SMTP Brevo](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
- [Pause des projets Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)

# Audit de l'ouverture et de la connexion — Biguglia Connect

Date : 6 octobre 2026. Dépôt : `christophe2bb/Biguglia.connect`.
Version en ligne et base de travail : `3e5720d41b508d8cc453aa98656fe326946d513d`.
Corrections proposées sur la branche `codex/restore-opening`.

## Résultat principal

L'accueil de <https://biguglia-connect.vercel.app> et le formulaire de connexion s'affichent dans le navigateur. Les douze rubriques publiques contrôlées répondent HTTP 200. Le site n'est donc pas totalement inaccessible depuis l'environnement de contrôle.

En revanche, le diagnostic exécuté **par le serveur de production** signale un problème de communication avec Supabase. Le contrôle `/api/health` renvoie HTTP 200 mais un corps `status: "degraded"`, avec `supabase: "DB timeout (> 5 s)"`. Deux observations pendant l'audit retrouvent ce problème. Dernière observation enregistrée : **2026-10-06T10:10:25Z**, version `3e5720d4`, délai Supabase 5 005 ms, Redis opérationnel.

Cette dégradation peut expliquer des chargements de données ou une connexion qui semblent bloqués. Elle ne suffit pas à prouver que le service d'authentification est lui-même en panne, ni que le projet Supabase est suspendu. La rubrique `auth: "ok"` de ce diagnostic vérifie seulement la présence des variables d'environnement : elle ne teste aucune connexion utilisateur.

Plusieurs défauts du code aggravent les difficultés de session. Ils sont corrigés et couverts par des tests dans cette proposition. **Ces corrections ne réactivent pas un projet Supabase arrêté et ne sont pas encore déployées en production.**

## Étendue et méthode

Le dépôt contient 1 065 fichiers suivis, dont 943 fichiers TypeScript/TSX dans `src`, environ 176 000 lignes, 41 routes API et 50 migrations canoniques dans `supabase/migrations`.

L'audit combine l'inventaire du dépôt, l'analyse de la configuration et des dépendances, le contrôle TypeScript et ESLint sur les sources, l'exécution de la suite unitaire, la compilation de production, les vérifications HTTP publiques et une revue détaillée des chemins de démarrage, de session, de connexion, de callback et d'accès administrateur. Les routes utilisant le client privilégié, les protections API, les migrations et la configuration CI/E2E ont aussi été inspectées.

Il ne s'agit pas d'une preuve de lecture manuelle de chaque ligne, ni d'une certification fonctionnelle de tous les parcours. Aucun compte utilisateur ou administrateur n'a été utilisé. Aucun schéma, droit RLS, secret Vercel ou journal privé de Supabase n'a été consulté ; leur état réellement déployé reste à confirmer.

## Anomalies confirmées et corrections

| Priorité | Défaut constaté | Conséquence | Correction proposée |
|---|---|---|---|
| Haute — disponibilité | Le middleware attendait le rafraîchissement de session sans limite ni gestion d'échec. | Un ancien cookie et un service lent pouvaient retarder ou faire échouer l'ouverture d'une page. | Pas de rafraîchissement pour les visiteurs sans cookie de session ; délai de 5 s pour les autres, annulation de la requête réseau et poursuite du rendu public. |
| Haute — disponibilité | Le secours de `AuthProvider`, déclenché après 15 s, appelait lui aussi `getSession()` sans limite. | L'interface pouvait rester indéfiniment en initialisation. | Délai de 5 s pour cet appel de secours : l'état d'initialisation est libéré au plus tard vers 20 s si aucun événement de session n'arrive. |
| Haute — cohérence | Une réponse tardive de chargement de profil pouvait arriver après une déconnexion ou un changement de compte. | Le store pouvait rétablir un ancien utilisateur ou remplacer le profil du compte courant. | Invalidation des réponses appartenant à une ancienne révision de session. |
| Haute — sécurité | Le guard du layout administrateur décodait le `sub` d'un JWT fourni par un cookie sans vérifier sa signature, puis cherchait le rôle avec le client privilégié. | Une identité fournie par le navigateur pouvait être prise pour une identité authentifiée ; le découpage des cookies était aussi géré partiellement. | Vérification de l'utilisateur par `auth.getUser()` avant tout accès privilégié ; refus en cas d'erreur ; assemblage des cookies confié au SDK. Les guards des API avaient déjà une vérification serveur distincte. |
| Moyenne — session | Les cookies renouvelés n'étaient pas toujours transmis aux Server Components avec les en-têtes supplémentaires. Les redirections pouvaient perdre les suppressions de cookies. | Session incohérente dans la requête courante, cookies invalides conservés après redirection. | Transmission du nouvel en-tête Cookie avec le nonce et conservation des cookies dans la réponse de redirection. |
| Moyenne — connexion | La connexion par mot de passe et l'échange du code de callback n'avaient pas de limite d'attente applicative. | Bouton restant occupé ou callback échouant sans retour lisible. | Délai de 15 s pour la connexion, de 10 s pour le callback, message d'indisponibilité et retour au formulaire en cas d'échec. |
| Moyenne — redirection | Le test `startsWith('/')` acceptait les destinations commençant par `//`. | Une destination extérieure pouvait être acceptée après connexion. | Validation centralisée des chemins internes ; refus des doubles slashs, antislashs, contrôles et boucles vers connexion/callback. |
| Moyenne — sérialisation | L'échappement JSON-LD introduisait des séquences JSON invalides et ne couvrait pas toutes les fermetures HTML de script. | Données structurées invalides, protection HTML incomplète. | Encodage de chaque caractère `<` en `\u003c`, conservant un JSON valide et les données d'origine. |
| Haute — dépendances | L'audit initial de production signalait 24 entrées de dépendances : 1 critique, 8 hautes, 14 modérées, 1 basse. | Versions vulnérables, notamment Next.js ; exposition exacte dépendante des fonctions utilisées et de l'environnement. | Next.js 15.5.27, Sentry 10.76.0, mises à jour compatibles du verrou ; PostCSS de Next remplacé par une version corrigée ; suppression du paquet `uuid` inutilisé. Audit de production final : 0 entrée signalée. |

La fonction de délai limite l'attente applicative. Elle n'annule pas automatiquement tous les travaux internes du SDK : l'annulation réseau est explicitement mise en place dans le middleware ; les révisions de session protègent les retours tardifs de profil.

Les builds locaux n'envoient plus de télémétrie Sentry ni de source maps sans jeton d'upload explicitement configuré. La capture des erreurs à l'exécution reste configurée comme auparavant. La configuration des tests transforme désormais le JSX pour exécuter les tests de cycle de vie du provider.

## Vérifications

| Contrôle | Résultat |
|---|---|
| Installation reproductible du verrou final (`npm ci`) | Réussie. |
| TypeScript (`npm run typecheck`) | Réussi. |
| ESLint (`npm run lint`) | Réussi, avec 94 avertissements existants à traiter ; absence d'erreur bloquante. |
| Suite unitaire finale (`npm run test`) | **42 fichiers, 1 383 tests réussis.** Avant corrections : 36 fichiers, 1 346 tests existants réussis, ce qui ne couvrait pas les défauts découverts. |
| Reproduction sur les sources originales | Sur les trois ensembles de tests session/provider/guard, **11 cas échouent avec le code original** et passent avec le code corrigé. |
| Compilation de production finale (`npm run build`) | Réussie avec Next.js 15.5.27 ; génération de 108/108 pages. Avertissements Webpack et import Upstash utilisant `process.version` dans le runtime Edge, sans erreur bloquante. |
| Exécution du build corrigé sur serveur local | 6 contrôles réussis : accueil et connexion HTTP 200 ; messages et administration anonymes redirigés vers connexion ; callback sans code redirigé ; API conversations sans identité HTTP 401. |
| Audit des dépendances de production (`npm audit --omit=dev`) | **0 vulnérabilité connue signalée** au moment de l'audit ; ce résultat ne certifie pas la sécurité de l'application. |
| Audit incluant les outils de développement | 15 entrées signalées : 13 hautes et 2 modérées, dans les chaînes ESLint/Tailwind et leurs dépendances. Elles restent à traiter séparément, avec validation des outils de compilation. |
| Navigateur sur la production actuelle | Accueil affiché et navigation vers le formulaire de connexion réussie. Aucun identifiant saisi. |
| HTTP public en production | Accueil et douze rubriques répondent 200. Cela ne valide pas la présence des données ou les opérations authentifiées. |
| CSP en production | Les 92 balises script examinées portent le nonce attendu par la politique de sécurité. Aucun défaut de nonce confirmé justifiant une modification de la CSP. |
| E2E Playwright local | Non exécuté : le téléchargement de Chromium renvoie une archive tronquée dans cet environnement. Les parcours avec compte ne sont donc pas validés. |

Rubriques HTTP contrôlées : `/annonces`, `/artisans`, `/forum`, `/evenements`, `/associations`, `/materiel`, `/perdu-trouve`, `/promenades`, `/collectionneurs`, `/coups-de-main`, `/emploi/offres`, `/emploi/demandes`. Les observations prennent environ 7 à 9 s depuis l'environnement de contrôle ; ce délai inclut le réseau et ne constitue pas une mesure isolée du temps de rendu serveur.

La compilation utilise des variables factices de test pour Supabase et aucune clé donnant accès à la base. Elle confirme que l'application se construit, pas que la base de production fonctionne. Environnement local : Node.js 24.19.0 ; la CI du dépôt utilise Node.js 22. Les tests TypeScript et la compilation ont été exécutés séquentiellement pour éviter que la régénération de `.next/types` interfère avec le contrôle de types.

## Ce qu'il faut vérifier pour rétablir l'accès réel

1. Ouvrir [le projet Supabase concerné](https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg) et contrôler son statut ainsi que les journaux API/Auth et les ressources de la base. Si le tableau de bord confirme une pause, le réactiver depuis ce tableau de bord. Une pause après inactivité est possible pour certains projets gratuits, mais n'est **pas confirmée ici**.
2. Vérifier que les variables Supabase du déploiement Vercel correspondent au projet actif. Le diagnostic actuel montre leur présence, sans valider leur valeur ni leurs droits. Ne pas publier de clé privée dans une issue ou dans le code.
3. Une fois le service joignable, contrôler `/api/health` : le résultat Supabase doit redevenir opérationnel. Valider ensuite avec un compte de test la connexion, la déconnexion, le rafraîchissement, les messages et l'accès administrateur selon le rôle.
4. Examiner puis intégrer la proposition de corrections avant son déploiement. Le site en ligne observé reste sur `3e5720d4` pendant cet audit.
5. Vérifier l'historique des migrations réellement appliquées et les policies RLS de production. Les fichiers SQL regroupés à la racine et les anciens scripts dans `src/lib` diffèrent ; `supabase/migrations` est la source canonique annoncée par le dépôt. Ne pas rejouer un ancien script global pour tenter de résoudre le timeout.

## Limites et suites de maintenance

Les avertissements de lint concernent notamment des dépendances de hooks React, des variables inutilisées et des usages d'images. Ils n'empêchent pas la compilation, mais leur correction devra être faite avec vérification du comportement de chaque rubrique.

La configuration E2E actuelle active `bypassCSP: true`. Même une suite E2E réussie ne démontrerait donc pas le respect de la CSP dans le navigateur. Le contrôle de nonce effectué ici est séparé et limité aux scripts de la page observée.

Les anciennes affirmations « production ready » ou « 100/100 » dans la documentation du dépôt ne sont pas des résultats de cet audit. Le fonctionnement avec données réelles, les droits réellement appliqués, les courriels et les services externes devront être validés dans leur environnement.

Références : [Supabase — production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [Supabase — clients SSR et validation de session](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js — CSP](https://nextjs.org/docs/app/guides/content-security-policy), [avis Next.js AVIF](https://github.com/advisories/GHSA-p293-qw3h-jr36). Les constats de disponibilité ci-dessus proviennent des observations du site et de son code, et non de ces références générales.

# Biguglia Connect — finalisation technique du 10 novembre 2026

## Périmètre réellement modifié

Application officielle : https://biguglia-connect.vercel.app — dépôt unique `christophe2bb/Biguglia.connect`. Aucune nouvelle base et aucun service payant.

### Changements Supabase déjà appliqués et vérifiés

- `20261110152829` : vue `moderation_kpi` avec `security_invoker=true`; SELECT refusé à `anon`/`authenticated`, conservé pour `service_role`.
- `20261110155116` : `profiles` n'accepte plus les INSERT directs des visiteurs ni les UPDATE de `role`, `status`, `is_active`, `trust_level`; nom, avatar, téléphone et secteur restent modifiables pour son propre compte.
- `20261110155338` : retrait des politiques Storage autorisant un utilisateur connecté à supprimer, écraser ou créer arbitrairement les objets du bucket `photos`. L'API serveur contrôlée gère ces opérations. Anciennes politiques d'accès direct aux CV de `job-documents` retirées.
- `20261110155757` : accès anonyme aux annonces publié seulement, avec maintien des brouillons pour leur propriétaire ; photos rattachées à la visibilité de l'annonce ; protection SQL contre l'auto-validation et la modification éditoriale après approbation.
- `20261110160718` : `add_interaction_history` vérifie acteur, participant et transition ; `confirm_interaction_done` rejette les utilisateurs anonymes et les statuts incompatibles ; anciennes RPC/maintenance retirées de l'accès direct client.
- Un profil manquant pour un compte **déjà confirmé** a été créé en préservant le consentement explicitement enregistré ; aucune promotion administrative. Un compte non confirmé reste sans profil (attendu).
- Secteur `la-marana` inséré avec les mêmes valeurs que `src/lib/sectors.ts`, portant à sept les secteurs actifs.

Vérifications de lecture seule : 99/99 tables publiques avec RLS, 3 annonces approuvées visibles et 0 annonce non approuvée visible sous rôle `anon`, 71 photos Storage conservées.

### Corrections sur la branche de code de finalisation

- Interdiction d'envoyer de nouveaux CV dans le bucket historique public `job-documents` même en passant par `/api/upload`.
- Messages : brouillon conservé si erreur ; l'enregistrement réussi n'est plus présenté comme échoué si une notification secondaire échoue.
- Échanges : plus de mutation de statut directe en cas d'échec des RPC ; création par INSERT (pas UPSERT implicite), confirmations à deux parties reflétées correctement.

## À faire après déploiement du nouveau code

1. Retirer `UPDATE` pour `anon`/`authenticated` sur `public.interactions`, après avoir confirmé la version applicative, car ses mutations passent désormais par les RPC vérifiées. Vérifier via `has_table_privilege`.
2. Limiter la variable `SUPABASE_SERVICE_ROLE_KEY` Vercel à l'environnement **production** ; créer une base de préproduction isolée avant de rétablir des previews administrables.
3. Tester avec deux vraies sessions distinctes : inscription, contact, blocage, messagerie, échange, CV, photo, mobile, profils.
4. Examiner le champ CV et les données de contact du module Emploi : éviter les lectures directes de données personnelles depuis la Data API.
5. Conserver une stratégie de migration avant de rendre le bucket `photos` privé : des URL publiques existent déjà et 55 fichiers n'ont pas de propriétaire Storage.
6. Décider du statut du bucket `job-documents` : vide, pas de nouveaux uploads, mais toujours déclaré `public=true` ; ne changer ce paramètre que via l'API/Dashboard Storage.
7. Auditer les autres fonctions `SECURITY DEFINER` et leurs appels légitimes, puis relancer Supabase Security Advisor.

## Limites de vérification

Les tests GitHub `tsc`, lint, unitaires et Playwright utilisent des scénarios automatisés ; ils ne prouvent **pas** les droits avec deux jetons Auth de personnes distinctes sur la base de production. Ne pas déclarer une conformité App Store ou une recette métier complète sans ces tests. Ne jamais publier de jetons, données personnelles ou clés de service dans un rapport.

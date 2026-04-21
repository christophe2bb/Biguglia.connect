# Guide de déploiement — Biguglia Connect

## 🗄️ Étape 1 : Créer les tables Supabase

Exécuter les migrations dans l'ordre dans **Supabase → SQL Editor** :

| # | Fichier | Description |
|---|---------|-------------|
| 1 | `supabase/migrations/20260407_baseline_rls_indexes.sql` | Index FK, performances, RLS corrigée |
| 2 | `supabase/migrations/20260408_fixes_rls_categories.sql` | Fix RLS forum, emploi, catégories |
| 3 | `supabase/migrations/20260409_emploi_local.sql` | Module Emploi Local |
| 4 | `supabase/migrations/20260411_events_cdc_fields.sql` | Évènements CDC |
| 5 | `supabase/migrations/20260411_associations_cdc.sql` | Associations CDC |
| 6 | `supabase/migrations/20260411_group_outings_enriched.sql` | Sorties enrichies |
| 7 | `supabase/migrations/20260411_help_requests_cdc.sql` | Module Coups de main |
| 8 | `supabase/migrations/20260411_lost_found_cdc.sql` | Module Perdu / Trouvé |
| 9 | `supabase/migrations/20260411_annonces_cdc.sql` | Module Petites Annonces CDC |
| 10 | `supabase/migrations/20260412_conversations_unique.sql` | Anti-duplication conversations |
| 11 | `supabase/migrations/20260413_listings_all_missing_columns.sql` | Colonnes manquantes table listings (consolidé) |
| 12 | `supabase/migrations/20260413_listings_optional_columns.sql` | Colonnes optionnelles manquantes listings |
| 13 | `supabase/migrations/20260413_moderation_queue_fix.sql` | Correction colonnes manquantes moderation_queue |
| 14 | `supabase/migrations/20260414_admin_full_fix.sql` | Fix complet Admin + Listings + Profiles RLS |
| 15 | `supabase/migrations/20260414_profiles_rls_fix.sql` | Correction RLS profiles |
| 16 | `supabase/migrations/20260416_event_comments_delete_policy.sql` | Politique DELETE commentaires événements |
| 17 | `supabase/migrations/20260416_help_participants_rls.sql` | RLS participants coups de main |
| 18 | `supabase/migrations/20260416_help_status_history_rls.sql` | RLS historique statuts coups de main |
| 19 | `supabase/migrations/20260416_job_demands_rls_normalize.sql` | Normalisation RLS demandes emploi |
| 20 | `supabase/migrations/20260416_lf_matches_rls.sql` | RLS correspondances perdu/trouvé |
| 21 | `supabase/migrations/20260416_listing_status_history_rls.sql` | RLS historique statuts annonces |
| 22 | `supabase/migrations/20260416_profiles_rls_final.sql` | RLS profiles — version finale |
| 23 | `supabase/migrations/20260416_profiles_rls_hardening.sql` | Durcissement RLS profiles |
| 24 | `supabase/migrations/20260416_rls_security_audit_fixes.sql` | Corrections audit sécurité RLS |
| 25 | `supabase/migrations/20260417_fix_admin_access.sql` | Correction accès admin |
| 26 | `supabase/migrations/20260417_rls_close_open_policies.sql` | Fermeture policies RLS ouvertes |
| 27 | `supabase/migrations/20260417_rls_fix_real_issues.sql` | Correction problèmes RLS réels |
| 28 | `supabase/migrations/20260418_perf_indexes.sql` | Index de performance |
| 29 | `supabase/migrations/20260421_cleanup_duplicate_policies.sql` | Nettoyage policies RLS dupliquées |
| 30 | `supabase/migrations/20260421_unindexed_fk.sql` | Index sur clés étrangères non couvertes |

> **Ordre d'exécution obligatoire** : respecter impérativement le numéro `#` du tableau.
> Les noms de fichiers commencent par une date (`YYYYMMDD`) : trier par nom = trier par ordre correct.
> Ne pas exécuter plusieurs fichiers d'une même date dans un ordre arbitraire.
>
> **Dépendances critiques** :
> - `#11` (`20260413_listings_all_missing_columns`) et `#12` (`20260413_listings_optional_columns`)
>   **doivent être exécutées avant** `#14` (`20260414_admin_full_fix`) — ce dernier référence
>   des colonnes (`listing_type` enum étendu, `is_negotiable`, etc.) créées par les deux précédentes.
>   Exécuter `#14` seul sur une base vierge produira une erreur `column does not exist`.
> - Plus généralement, chaque migration suppose que toutes les précédentes ont réussi.
>
> **Idempotence** : tous les fichiers utilisent `IF NOT EXISTS` / `IF EXISTS` — ils peuvent être
> relancés sans risque si une exécution précédente a échoué à mi-chemin.
>
> Pour chaque fichier : copier le contenu → coller dans SQL Editor → cliquer **Run** → vérifier "Success. No rows returned."

### Schéma de référence

Pour créer la base depuis zéro, utiliser `docs/db/schema.sql` (snapshot initial).
Les migrations ci-dessus **s'appliquent par-dessus** ce schéma.

---

## ⚙️ Étape 2 : Configurer Supabase Auth

1. **Settings > Auth**
2. **Site URL** : `https://votre-domaine.vercel.app`
3. **Redirect URLs** : `https://votre-domaine.vercel.app/**`
4. **Email Confirmation** : Activé (recommandé)

---

## 🗂️ Étape 3 : Configurer Supabase Storage

Dans **Storage**, créer deux buckets :

| Bucket | Visibilité | Taille max | Types acceptés |
|--------|------------|------------|----------------|
| `photos` | Public | 5 MB | image/jpeg, image/png, image/webp |
| `documents` | Privé | 10 MB | application/pdf, image/* |

---

## ⚡ Étape 4 : Activer le Realtime

Dans **Database > Replication**, activer :
- `messages`
- `notifications`
- `conversation_participants`

---

## 🚀 Étape 5 : Déployer sur Vercel

### Variables d'environnement requises

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Requis | URL du projet Supabase (ex : `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Requis | Clé publique Supabase (`sb_publishable_...`) |
| `NEXT_PUBLIC_SITE_URL` | ✅ Requis | URL du site déployé (ex : `https://biguglia-connect.vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Requis | Clé service role (côté serveur uniquement, ne jamais exposer côté client) |
| `UPSTASH_REDIS_REST_URL` | ⚠️ Fortement recommandé | URL REST Upstash (ex : `https://xxx.upstash.io`) — voir §5b ci-dessous |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Fortement recommandé | Token Bearer Upstash — voir §5b ci-dessous |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ Fortement recommandé | DSN public Sentry — monitoring client (erreurs JS, Core Web Vitals, Replay) |
| `SENTRY_DSN` | ⚠️ Fortement recommandé | DSN Sentry côté serveur (mêmes valeur que `NEXT_PUBLIC_SENTRY_DSN`) |
| `SENTRY_ORG` | ⚠️ Recommandé build | Slug de l'organisation Sentry (ex : `biguglia-connect`) — upload source maps |
| `SENTRY_PROJECT` | ⚠️ Recommandé build | Slug du projet Sentry (ex : `biguglia-connect-nextjs`) — upload source maps |
| `SENTRY_AUTH_TOKEN` | ⚠️ Recommandé build | Auth token Sentry pour l'upload des source maps au build (générer dans Sentry → Settings → Auth Tokens) |

> ⚠️ Ne jamais committer `.env.local`. Toutes ces valeurs sont confidentielles.

> 🚨 **Sans `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`**, Sentry est **silencieusement désactivé** :
> aucune erreur de production ne remonte au tableau de bord.
> Sans `SENTRY_AUTH_TOKEN`, les source maps ne sont pas uploadées :
> les stack traces Sentry afficheront du code minifié illisible.

> 🚨 **Sans `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`**, le rate-limiting
> fonctionne en **mode mémoire locale** : chaque instance Vercel Edge possède ses propres
> compteurs. Sur plusieurs instances simultanées, une IP peut multiplier ses tentatives
> (brute-force, spam) par le nombre d'instances actives.
> **En production multi-instance, ces deux variables sont indispensables.**

### Via interface Vercel

1. Créer un projet sur https://vercel.com
2. Importer le repo GitHub `christophe2bb/Biguglia.connect`
3. Ajouter les variables d'environnement
4. Cliquer **Deploy**

### Via CLI

```bash
vercel login
vercel --name biguglia-connect
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_DSN
vercel env add SENTRY_ORG
vercel env add SENTRY_PROJECT
vercel env add SENTRY_AUTH_TOKEN
vercel --prod
```

---

## 🔴 Étape 5b : Configurer Upstash Redis (rate-limiting distribué)

> **Pourquoi c'est important :** Vercel déploie l'application sur plusieurs instances
> Edge simultanément. Sans Redis partagé, chaque instance maintient ses propres
> compteurs de rate-limiting en mémoire → une IP malveillante peut contourner la
> protection en atteignant des instances différentes.
>
> Upstash Redis centralise tous les compteurs → **protection réelle multi-instances**.
> Le tier gratuit suffit pour démarrer (10 000 req/jour gratuites).

### Créer une base Upstash Redis

1. Aller sur **https://console.upstash.com**
2. Créer un compte (gratuit)
3. Cliquer **Create Database**
4. Choisir :
   - **Name** : `biguglia-ratelimit`
   - **Region** : `EU-West-1 (Ireland)` — la plus proche de Vercel Frankfurt
   - **Type** : `Regional` (tier gratuit)
5. Cliquer **Create**
6. Dans l'onglet **REST API** de la base créée, copier :
   - `UPSTASH_REDIS_REST_URL` → ex : `https://free-xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → token Bearer

### Ajouter les variables dans Vercel

Via l'interface Vercel :
1. **Settings → Environment Variables**
2. Ajouter `UPSTASH_REDIS_REST_URL` (Production + Preview)
3. Ajouter `UPSTASH_REDIS_REST_TOKEN` (Production + Preview)
4. Redéployer : **Deployments → ⋯ → Redeploy**

Ou via CLI :
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel --prod
```

### Vérifier que Redis est actif

Après déploiement, les logs Vercel (fonctions) ne doivent **plus** contenir :
```
[rate-limit] Redis non configuré — fallback mémoire actif
```

Si ce message apparaît, les variables ne sont pas lues par le runtime → vérifier
qu'elles sont bien définies en **Production** (pas seulement Preview) et redéployer.

---

## 🐛 Étape 5c : Configurer Sentry (monitoring erreurs production)

> **Pourquoi c'est important :** Sans Sentry, les erreurs de production sont invisibles.
> Le code gère gracieusement l'absence du DSN (pas de crash) mais **aucune alerte n'est
> envoyée** en cas d'erreur côté client ou serveur. En production, Sentry est indispensable
> pour détecter les régressions avant que les utilisateurs ne les signalent.

### Créer un projet Sentry

1. Aller sur **https://sentry.io** (compte gratuit disponible)
2. Créer une organisation : `biguglia-connect`
3. Créer un projet : **Next.js** → nom `biguglia-connect-nextjs`
4. Récupérer le **DSN** dans **Settings → Projects → biguglia-connect-nextjs → Client Keys (DSN)**
5. Générer un **Auth Token** dans **Settings → Auth Tokens → Create New Token**
   - Cocher les scopes : `project:releases`, `org:read`

### Variables à ajouter dans Vercel

| Variable | Valeur | Scope |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@xxx.ingest.sentry.io/xxx` | Production + Preview |
| `SENTRY_DSN` | *(même valeur que `NEXT_PUBLIC_SENTRY_DSN`)* | Production + Preview |
| `SENTRY_ORG` | `biguglia-connect` | Production + Preview + Build |
| `SENTRY_PROJECT` | `biguglia-connect-nextjs` | Production + Preview + Build |
| `SENTRY_AUTH_TOKEN` | `sntrys_xxx` | Production + Preview + Build |

### Vérifier que Sentry est actif

Après déploiement, visiter `/test-sentry` sur votre domaine (route de test).
Les logs Vercel ne doivent **plus** contenir :
```
[Sentry] DSN absent — monitoring client désactivé.
```

---

## 👤 Étape 6 : Créer le compte administrateur

1. S'inscrire sur `/inscription`
2. Dans Supabase SQL Editor :

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.fr';
```

3. Accès admin : `/admin`

---

## ✅ Vérifications post-déploiement

### Fonctionnel
- [ ] `/annonces` — page liste charge sans erreur
- [ ] `/annonces/[id]` — page détail affiche le squelette puis le contenu
- [ ] `/perdu-trouve` — pas de bandeau "Migration nécessaire"
- [ ] `/perdu-trouve/[id]` — page détail charge correctement
- [ ] `/coups-de-main` — pas de bandeau "Migration nécessaire"
- [ ] `/associations/[id]` — page détail charge correctement
- [ ] `/connexion` — inscription + connexion fonctionnelle
- [ ] `/auth/reset-password` — email de reset pointe vers le bon domaine (NEXT_PUBLIC_SITE_URL)
- [ ] `/admin` — accessible avec le compte admin
- [ ] Storage `photos` — upload depuis `/annonces/nouvelle` fonctionne
- [ ] Messagerie — `/messages` charge et envoie un message

### Infrastructure
- [ ] Logs Vercel — absence du message `[rate-limit] Redis non configuré — fallback mémoire actif`
- [ ] Logs Vercel — absence du message `[Sentry] DSN absent — monitoring client désactivé`
- [ ] Sentry dashboard — les erreurs remontent bien (tester via `/test-sentry`)
- [ ] CSP — aucune violation CSP dans la console navigateur

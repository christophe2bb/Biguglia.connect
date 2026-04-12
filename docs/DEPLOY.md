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

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (ex : `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (`sb_publishable_...`) |
| `NEXT_PUBLIC_SITE_URL` | URL du site déployé |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Email de l'administrateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (côté serveur uniquement, ne jamais exposer côté client) |

> ⚠️ Ne jamais committer `.env.local`. Toutes ces valeurs sont confidentielles.

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
vercel env add NEXT_PUBLIC_ADMIN_EMAIL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
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

- [ ] `/annonces` — page liste charge sans erreur
- [ ] `/perdu-trouve` — pas de bandeau "Migration nécessaire"
- [ ] `/coups-de-main` — pas de bandeau "Migration nécessaire"
- [ ] `/connexion` — inscription + connexion fonctionnelle
- [ ] `/admin` — accessible avec le compte admin
- [ ] Storage `photos` — upload depuis `/annonces/nouvelle` fonctionne
- [ ] Messagerie — `/messages` charge et envoie un message

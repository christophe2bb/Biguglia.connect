# Incident Playbook — Biguglia Connect

> **Usage** : ce document est le point d'entrée unique en cas d'incident en production.
> Il complète le runbook de rollback de `docs/DEPLOY.md` avec les procédures
> de backup, restauration DB, contacts et escalade.
>
> **Principe** : chaque minute compte en incident. Ce playbook doit pouvoir être
> exécuté par n'importe quel membre de l'équipe, même sans contexte préalable.

---

## 1. Contacts d'urgence

| Rôle | Nom | Moyen de contact | Disponibilité |
|------|-----|-----------------|---------------|
| Super-admin / Propriétaire | Christophe | Email admin Supabase | 24/7 pour P0 |
| Accès Vercel | Christophe | Dashboard Vercel | Immédiat |
| Accès Supabase | Christophe | dashboard.supabase.com | Immédiat |
| Support Supabase Pro | Supabase | support.supabase.com (ticket) | < 24h |
| Support Vercel Pro | Vercel | vercel.com/support | < 4h |

> **Compte admin Supabase** : l'email du compte propriétaire du projet
> `qmrkacrpncdkhofiqlrg` est l'email configuré lors de la création du projet.
> Vérifier dans Supabase Dashboard → Settings → General → Project owner.

---

## 2. Niveaux de sévérité et RTO/RPO

| Niveau | Description | Exemples | RTO cible | RPO cible |
|--------|-------------|---------|-----------|-----------|
| **P0 — Critique** | Site inaccessible ou perte de données en cours | 500 sur toutes les pages, DB corrompue, fuite de données | **< 15 min** | **< 1h** |
| **P1 — Majeur** | Fonctionnalité clé cassée | Connexion impossible, uploads échouent, messages bloqués | **< 1h** | **< 4h** |
| **P2 — Mineur** | Dégradation partielle | Page lente, feature secondaire cassée, warning Sentry | **< 4h** | **< 24h** |
| **P3 — Cosmétique** | UI/UX imparfaite sans impact fonctionnel | Texte mal aligné, image manquante | **< 48h** | N/A |

> **RTO** (Recovery Time Objective) : temps maximum acceptable avant retour à la normale.
> **RPO** (Recovery Point Objective) : perte de données maximale acceptable.

---

## 3. Arbre de décision — premier réflexe

```
L'incident est-il détecté ?
│
├─ Oui → Vérifier Sentry : https://sentry.io → projet biguglia-connect
│         └─ Erreur visible → noter le timestamp et l'error ID
│
├─ Site down (Vercel) ?
│   └─ Oui → Section 4 : Rollback Vercel (< 2 min)
│
├─ DB inaccessible / données corrompues ?
│   └─ Oui → Section 5 : Accès backups Supabase
│
├─ Migration SQL défaillante ?
│   └─ Oui → Section 6 : Rollback migration
│
└─ Cause inconnue → Section 7 : Diagnostic rapide
```

---

## 4. Rollback Vercel (< 2 minutes)

**Quand l'utiliser** : build cassé, régression introduite par un déploiement récent.

### Procédure

1. Aller sur **https://vercel.com/dashboard**
2. Cliquer sur le projet **biguglia-connect**
3. Cliquer sur **Deployments** (onglet en haut)
4. Repérer le dernier déploiement en statut **`Ready`** avant l'incident
   - Vérifier le timestamp du déploiement vs timestamp du premier signalement
5. Cliquer sur **⋯ (trois points)** à droite de ce déploiement
6. Cliquer **"Promote to Production"**
7. Confirmer — le trafic bascule immédiatement (< 30 secondes)

### Vérification post-rollback

```bash
curl -I https://biguglia-connect.vercel.app/api/health
# → HTTP 200 + {"status":"ok"} attendu
```

> ⚠️ **Important** : le rollback Vercel ne touche pas la base de données.
> Si une migration SQL a été exécutée entre le déploiement stable et le déploiement
> cassé, les données peuvent être incompatibles avec l'ancien code.
> → Appliquer aussi la Section 6 si nécessaire.

---

## 5. Accès aux backups Supabase

### Plan Pro — backups automatiques inclus

Le projet Supabase **qmrkacrpncdkhofiqlrg** doit être en **plan Pro** pour bénéficier
des backups automatiques. Vérifier :

1. Aller sur **https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg**
2. Settings → Billing → vérifier que le plan est **Pro** (ou supérieur)

> Si le projet est en plan **Free** : les backups automatiques ne sont pas inclus.
> → Passer en Pro avant la mise en production réelle.
> → En attendant, effectuer des exports manuels réguliers (voir ci-dessous).

### Accéder aux backups automatiques (plan Pro)

1. Supabase Dashboard → projet **qmrkacrpncdkhofiqlrg**
2. **Database** (menu gauche) → **Backups**
3. Tu vois la liste des backups disponibles (1 par jour, conservés 7 jours)
4. Cliquer sur le backup voulu → **Restore**

> ⚠️ **La restauration remplace TOUTE la base de données** par l'état du backup.
> Toutes les données créées APRÈS le backup seront perdues.
> Durée estimée : 5-15 minutes selon la taille de la DB.

### Export manuel de la DB (avant une migration risquée)

Exécuter **avant** chaque migration importante :

```bash
# Via Supabase CLI (nécessite supabase login)
supabase db dump --project-ref qmrkacrpncdkhofiqlrg -f backup_$(date +%Y%m%d_%H%M%S).sql

# Ou via pg_dump (remplacer [DB_PASSWORD] par le mot de passe DB)
pg_dump \
  "postgresql://postgres.[REF]:[DB_PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" \
  --no-acl --no-owner \
  -f backup_$(date +%Y%m%d_%H%M%S).sql
```

> Les paramètres de connexion sont dans Supabase Dashboard →
> Settings → Database → Connection string → URI.

### Point-in-Time Recovery (PITR) — plan Pro Enterprise

Si le plan inclut le PITR, il est possible de restaurer à la seconde près :
Dashboard → Database → Backups → **Point in Time Recovery** → choisir le timestamp exact.

---

## 6. Rollback de migration SQL

### Règle d'or

```
TOUJOURS dans cet ordre :
  1. Rollback Vercel (Section 4)
  2. Rollback DB (cette section)

Ne jamais rollback la DB sans avoir d'abord rollback le code.
```

### Identifier la migration à annuler

```sql
-- Dans Supabase SQL Editor : voir les dernières migrations appliquées
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;
```

### Annuler une migration manuellement

Chaque migration dans `supabase/migrations/` doit avoir un script d'annulation documenté.
Si non documenté, construire le `DOWN` manuellement :

```sql
-- Exemple : annuler l'ajout d'une colonne
ALTER TABLE ma_table DROP COLUMN IF EXISTS nouvelle_colonne;

-- Exemple : annuler la création d'un index
DROP INDEX IF EXISTS idx_ma_table_nouvelle_colonne;

-- Exemple : annuler la création d'une table
DROP TABLE IF EXISTS nouvelle_table CASCADE;

-- Exemple : annuler une politique RLS
DROP POLICY IF EXISTS "nom_de_la_politique" ON ma_table;
```

> Exécuter dans **Supabase → SQL Editor** avec le compte admin.

### Rollback en staging d'abord (si staging disponible)

```bash
# Réinitialiser le schéma en staging pour tester le rollback
supabase db reset --project-ref [REF_STAGING]

# Vérifier que l'application fonctionne avec l'ancien schéma
# Puis appliquer le même rollback en production
```

### Vérification post-rollback DB

```sql
-- Vérifier que les tables critiques sont intactes
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Vérifier le nombre d'enregistrements dans les tables clés
SELECT
  (SELECT COUNT(*) FROM profiles)       AS profiles,
  (SELECT COUNT(*) FROM listings)       AS listings,
  (SELECT COUNT(*) FROM conversations)  AS conversations,
  (SELECT COUNT(*) FROM messages)       AS messages;
```

---

## 7. Diagnostic rapide — cause inconnue

### Checklist dans l'ordre

```bash
# 1. Health check
curl https://biguglia-connect.vercel.app/api/health | jq .

# 2. Vérifier les logs Vercel
# → vercel.com/dashboard → projet → Logs (temps réel)

# 3. Vérifier Sentry
# → sentry.io → biguglia-connect → Issues (trier par "First seen")

# 4. Vérifier le statut Supabase
# → status.supabase.com (incidents en cours ?)

# 5. Vérifier le statut Vercel
# → vercel-status.com

# 6. Vérifier les logs middleware (rate-limit, CSP)
# → Vercel Logs → filtrer par "middleware"
```

### Signaux d'alerte Sentry à surveiller

| Pattern d'erreur | Cause probable | Action |
|-----------------|---------------|--------|
| `TypeError: Headers.set` | CSP invalide (var env avec \n) | Corriger le secret, redéployer |
| `PGRST116` / `relation does not exist` | Migration manquante | Appliquer la migration |
| `JWT expired` en masse | Supabase Auth down | Vérifier status.supabase.com |
| `rate limit exceeded` Redis | Upstash saturé | Vérifier le plan Upstash |
| `500` sur `/api/upload` | Bucket Storage manquant | Créer le bucket via SQL |

---

## 8. Communication incident (P0/P1)

### Template message utilisateurs (si downtime > 15 min)

```
[Biguglia Connect] 🔧 Maintenance en cours

Nous rencontrons actuellement une perturbation du service.
Nos équipes travaillent à la résolution.

Début incident : [HH:MM]
Statut : En cours de résolution
Prochaine mise à jour : dans 30 minutes

Nous nous excusons pour la gêne occasionnée.
```

### Post-mortem (après résolution P0/P1)

Créer un fichier `docs/archive/postmortem_YYYY-MM-DD.md` avec :

```markdown
# Post-mortem — [Description courte] — YYYY-MM-DD

## Résumé
- Durée : XX minutes (HH:MM → HH:MM)
- Impact : [utilisateurs affectés, fonctionnalités impactées]
- Sévérité : P0/P1

## Chronologie
- HH:MM — Premier signalement
- HH:MM — Diagnostic établi
- HH:MM — Action corrective appliquée
- HH:MM — Service restauré

## Cause racine
[Description technique précise]

## Actions correctives
- [x] Action immédiate appliquée
- [ ] Action préventive à planifier

## Leçons apprises
[Ce qu'on aurait pu faire différemment]
```

---

## 9. Checklist pré-mise en production

À vérifier **avant** chaque mise en production d'une fonctionnalité majeure :

- [ ] Plan Supabase **Pro** activé (backups automatiques inclus)
- [ ] Export manuel DB effectué (`supabase db dump`)
- [ ] Migration testée en staging avant prod
- [ ] Script de rollback SQL préparé et testé
- [ ] Vercel deployment protection activée (checks CI requis)
- [ ] Sentry configuré et alertes actives
- [ ] `GET /api/health` répond 200 après déploiement
- [ ] Smoke tests Playwright passent (`npm run test:e2e`)

---

## 10. Liens utiles

| Service | URL |
|---------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg |
| Supabase Backups | https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg/database/backups |
| Supabase Logs | https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg/logs/edge-logs |
| Vercel Dashboard | https://vercel.com/dashboard |
| Vercel Logs | https://vercel.com/christophe2bb/biguglia-connect/logs |
| Sentry | https://sentry.io (projet biguglia-connect) |
| Statut Supabase | https://status.supabase.com |
| Statut Vercel | https://vercel-status.com |
| Upstash Console | https://console.upstash.com |
| CI GitHub Actions | https://github.com/christophe2bb/Biguglia.connect/actions |

---

*Dernière mise à jour : 2026-04-22 — Créé suite à l'audit de résilience opérationnelle.*

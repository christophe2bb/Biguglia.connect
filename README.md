# Biguglia Connect

Plateforme communautaire locale — **Next.js 15** · Supabase · Tailwind CSS · TypeScript

---

## Démarrage rapide

```bash
npm ci                              # installation exacte depuis package-lock.json
cp .env.local.example .env.local   # renseigner toutes les variables (voir §Variables)
npm run dev                         # http://localhost:3000
```

> ⚠️ Utiliser `npm ci` (pas `npm install`) pour garantir une installation reproductible.

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript (sans build) |
| `npm run lint` | ESLint (next lint --dir src) |
| `npm run test` | Tests unitaires Vitest |
| `npm run test:coverage` | Couverture de tests |
| `npm run test:e2e` | Tests end-to-end Playwright |
| `npm run ci` | typecheck + lint + test (pipeline CI) |

### Checklist GO prod (dans l'ordre)

```bash
rm -rf node_modules .next
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm audit --omit=dev
```

---

## Structure du projet

```
src/
├── app/              # Pages Next.js App Router + routes API (/api/*)
│   ├── (main)/       # Pages publiques (annonces, artisans, forum…)
│   ├── (private)/    # Pages authentifiées (messages, profil, dashboard)
│   ├── (auth)/       # Pages auth (connexion, inscription)
│   └── admin/        # Interface d'administration
├── components/       # Composants React réutilisables
│   ├── layout/       # Navbar, Footer
│   └── ui/           # Badge, Avatar, Modal, TrustScore, SectorFilter…
├── hooks/            # Hooks React (useUnreadCounts, useModeration…)
├── lib/              # Logique métier partagée
│   ├── auth-store.ts       # Zustand store auth
│   ├── moderation/         # Système de modération (types, rules, spam, scoring)
│   ├── sectors.ts          # Définition des 7 secteurs de Biguglia
│   ├── supabase/           # Clients Supabase + auth-helper API routes
│   └── trust.ts            # Moteur confiance & réputation
├── services/         # Services métier (jobs, home feed, publish…)
└── types/            # Types globaux TypeScript
```

---

## Variables d'environnement

Toutes ces variables sont **obligatoires en production** :

```env
# ── Supabase ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # clé publique (anon)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # ⚠️ server-side uniquement — ne jamais exposer

# ── Site ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://votre-domaine.vercel.app

# ── Rate limiting (Upstash Redis) ──────────────────────────────────────────
# Sans Redis → fallback mémoire (insuffisant en prod multi-instance Vercel)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZ...

# ── Monitoring (Sentry) ─────────────────────────────────────────────────────
# Sans Sentry → les erreurs serveur ne sont pas capturées
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_...   # pour l'upload des source maps au build
SENTRY_ORG=votre-org-slug
SENTRY_PROJECT=votre-project-slug
```

> ⚠️ Ne jamais committer `.env.local`.  
> La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit **jamais** être exposée côté client.

---

## Base de données (Supabase)

### Source canonique des migrations

**`supabase/migrations/`** est la source de vérité des changements SQL versionnés. L'index des fichiers est dans [`docs/db/SCHEMA.md`](docs/db/SCHEMA.md); il décrit le dépôt, pas l'état d'une base Supabase.

Avant toute application, établir si la base est neuve ou existante et comparer son schéma aux fichiers déjà exécutés. [`docs/db/schema.sql`](docs/db/schema.sql) est un snapshot initial, pas une migration de rattrapage à lancer aveuglément sur une base existante. La procédure et les précautions sont dans [`docs/DEPLOY.md`](docs/DEPLOY.md).

### Audit RLS

```bash
# Vérifier que toutes les tables sensibles ont RLS activé
node scripts/audit-rls.mjs

# Ou directement en SQL (Supabase SQL Editor) :
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/DEPLOY.md` | Guide de déploiement complet (Supabase + Vercel) |
| `docs/db/SCHEMA.md` | Documentation base de données |
| `docs/specs/EMPLOI_LOCAL.md` | Spécifications module Emploi |

---

## Modules disponibles

| Route | Module | Statut |
|-------|--------|--------|
| `/annonces` | Petites annonces | ✅ CDC complet |
| `/coups-de-main` | Entraide / Coups de main | ✅ CDC complet |
| `/perdu-trouve` | Perdu / Trouvé | ✅ CDC complet |
| `/associations` | Associations | ✅ CDC complet |
| `/evenements` | Événements | ✅ CDC complet |
| `/promenades` | Promenades & Sorties | ✅ CDC complet |
| `/emploi` | Emploi Local | ✅ v1 |
| `/materiel` | Matériel & Prêt | ✅ v1 |
| `/forum` | Forum communautaire | ✅ v1 |
| `/messages` | Messagerie interne | ✅ v1 |
| `/profil` | Profil & Réputation | ✅ v1 |
| `/artisans` | Annuaire artisans vérifiés | ✅ v1 |
| `/admin` | Administration | ✅ v1 |

---

## Sécurité — Architecture

- **CSP dynamique** avec nonce par requête (middleware) — pas d'`unsafe-inline`
- **CSRF guard** (`assertCsrfSafe`) sur toutes les mutations API
- **RLS Supabase** activée sur toutes les tables sensibles
- **Rate limiting** distribué Upstash Redis (fallback mémoire si absent)
- **Upload sécurisé** : validation magic bytes, ownership, taille max, MIME whitelist
- **Admin guard** double couche : middleware + `verifyAdminLayout()` serveur
- **Sentry** : capture erreurs serveur (Edge + Node) — source maps uploadées au build

## Règles de discipline du projet

- **Zéro fichier SQL à la racine** — toujours dans `supabase/migrations/`
- **Zéro fichier temporaire à la racine** — utiliser `docs/` pour la documentation
- **Zéro clé secrète commitée** — `.env.local` est dans `.gitignore`
- **`supabase/migrations/` = seule source de vérité SQL**
- **`docs/db/SCHEMA.md` = seule référence du schéma**
- **`npm ci` — jamais `npm install`** en CI et en prod

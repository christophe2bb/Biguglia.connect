# Biguglia Connect

Plateforme communautaire locale — Next.js 14 · Supabase · Tailwind CSS · TypeScript

---

## Démarrage rapide

```bash
npm install
cp .env.local.example .env.local   # renseigner NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                         # http://localhost:3000
```

Scripts disponibles :

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript (sans build) |
| `npm run lint` | ESLint |
| `npm run ci` | typecheck + lint (utilisé en CI) |

---

## Structure du projet

```
src/
├── app/              # Pages Next.js App Router + routes API (/api/*)
├── components/       # Composants React réutilisables
│   ├── layout/       # Navbar, Footer (sous-composants dans navbar/)
│   └── ui/           # Badge, Avatar, Modal, TrustScore…
├── hooks/            # Hooks React (useUnreadCounts, useModeration…)
├── lib/              # Logique métier partagée
│   ├── auth-store.ts       # Zustand store auth
│   ├── moderation/         # Système de modération (types, rules, spam, scoring)
│   ├── moderation.ts       # Barrel public (re-exports)
│   ├── supabase/           # Clients Supabase + auth-helper API routes
│   └── trust.ts            # Moteur confiance & réputation
├── services/         # Services métier (jobs, home feed, publish…)
└── types/            # Types globaux TypeScript
```

---

## Base de données (Supabase)

### Schéma de référence
- `docs/db/schema.sql` — schéma complet (référence)
- `docs/db/SCHEMA.md` — documentation du schéma

### Migrations à appliquer
Dossier `sql/migrations/` — scripts à exécuter dans Supabase → SQL Editor, dans l'ordre :

| Fichier | Description |
|---------|-------------|
| `migration_A_fk_indexes_exact.sql` | Index manquants sur clés étrangères |
| `migration_B_lot1_faible_risque.sql` | Index faible risque |
| `migration_B_lot2_forum_listings.sql` | Index forum + listings |
| `migration_B_lot3_events_profiles.sql` | Index events + profiles |
| `migration_B_lot4_conversations_moderation.sql` | Index conversations + modération |
| `migration_B_drop_unused_exact.sql` | Suppression index inutilisés |
| `migration_B_drop_unused_no_concurrent.sql` | Variante sans CONCURRENTLY |
| `migration_C_consolidate_policies_exact.sql` | Consolidation politiques RLS |
| `migration_auth_rls_v2.sql` | Corrections auth RLS (policy-centric) |
| `supabase_migration_emploi_v2.sql` | Module Emploi Local |
| `supabase/migrations/20260409_emploi_local.sql` | Schéma Emploi (local Supabase CLI) |

### Correctifs ponctuels
`sql/fixes/` — correctifs d'urgence appliqués :
- `fix-forum-rls.sql` — RLS forum posts & comments
- `fix_job_demands_rls_active.sql` — page détail demande
- `migration_enable_rls_categories.sql` — activation RLS tables catégories

### Archive
`sql/archive/` — brouillons et variantes intermédiaires (conservés pour historique, non à réexécuter).

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/DEPLOY.md` | Guide de déploiement Vercel |
| `docs/db/SCHEMA.md` | Documentation base de données |
| `docs/specs/EMPLOI_LOCAL.md` | Spécifications module Emploi |
| `docs/specs/EMPLOI_V1.1_CORRECTIONS.md` | Corrections v1.1 Emploi |
| `docs/archive/` | Guides de session et vérifications passées |

---

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side uniquement
```

> Ne jamais committer `.env.local`. La clé service role ne doit jamais être exposée côté client.

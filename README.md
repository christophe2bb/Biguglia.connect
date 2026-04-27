# Biguglia Connect

Plateforme communautaire locale — Next.js 14 · Supabase · Tailwind CSS · TypeScript

---

## Démarrage rapide

```bash
npm install
cp .env.local.example .env.local   # renseigner au minimum : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL
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

## Base de données (Supabase)

### Source canonique des migrations

**`supabase/migrations/`** est la seule source de vérité.
Exécuter dans l'ordre dans Supabase → SQL Editor :

| # | Fichier | Description |
|---|---------|-------------|
| 1 | `20260407_baseline_rls_indexes.sql` | Index FK, performances, RLS corrigée, consolidation politiques |
| 2 | `20260408_fixes_rls_categories.sql` | Fix RLS forum, emploi, tables catégories |
| 3 | `20260409_emploi_local.sql` | Module Emploi Local |
| 4 | `20260411_events_cdc_fields.sql` | Évènements — champs CDC, event_saves, event_comments |
| 5 | `20260411_associations_cdc.sql` | Associations — asso_comments, needs, memberships_interest |
| 6 | `20260411_group_outings_enriched.sql` | Sorties — outing_photos, outing_comments |
| 7 | `20260411_help_requests_cdc.sql` | Coups de main — help_requests, photos, comments, participants |
| 8 | `20260411_lost_found_cdc.sql` | Perdu/Trouvé — lost_found_items, lf_photos, lf_comments, lf_matches |
| 9 | `20260411_annonces_cdc.sql` | Petites Annonces — enrichissement listings + 4 tables CDC |

> Pour déployer sur une nouvelle instance Supabase, commencer par `docs/db/schema.sql` (snapshot initial) puis appliquer les migrations dans l'ordre.

### Documentation base de données

| Fichier | Contenu |
|---------|---------|
| `docs/db/SCHEMA.md` | Référence complète de toutes les tables, colonnes, pièges courants |
| `docs/db/schema.sql` | Snapshot initial du schéma (avant migrations CDC) |

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/DEPLOY.md` | Guide de déploiement complet (Supabase + Vercel) |
| `docs/db/SCHEMA.md` | Documentation base de données |
| `docs/specs/EMPLOI_LOCAL.md` | Spécifications module Emploi |
| `docs/archive/` | Guides de session passés (référence uniquement) |

---

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=https://votre-domaine.vercel.app
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side uniquement
```

> ⚠️ Ne jamais committer `.env.local`.
> La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être exposée côté client.

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
| `/admin` | Administration | ✅ v1 |

---

## Règles de discipline du projet

- **Zéro fichier SQL à la racine** — toujours dans `supabase/migrations/`
- **Zéro fichier temporaire à la racine** — utiliser `docs/` pour la documentation
- **Zéro clé secrète commitée** — `.env.local` est dans `.gitignore`
- **`supabase/migrations/` = seule source de vérité SQL**
- **`docs/db/SCHEMA.md` = seule référence du schéma**

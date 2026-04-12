# Schéma Supabase — Biguglia Connect
> Dernière mise à jour : 2026-04-12
> Ce document décrit les tables **réellement présentes** en base de données.
> Mettre à jour après chaque migration SQL exécutée.

---

## 📋 Index des migrations (source canonique : `supabase/migrations/`)

| Fichier | Date | Contenu |
|---------|------|---------|
| `20260407_baseline_rls_indexes.sql` | 2026-04-07 | Index FK manquants, index performances (lots 1-4), suppression index inutilisés, consolidation RLS dupliquées, correction initplan `auth.uid()` |
| `20260408_fixes_rls_categories.sql` | 2026-04-08 | Fix RLS forum, fix job_demands détail, activation RLS tables catégories |
| `20260409_emploi_local.sql` | 2026-04-09 | Module Emploi Local : `job_offers`, `job_demands`, `job_applications` |
| `20260411_events_cdc_fields.sql` | 2026-04-11 | Champs CDC évènements + tables `event_saves`, `event_comments` |
| `20260411_associations_cdc.sql` | 2026-04-11 | Tables CDC associations : `asso_comments`, `association_needs`, `association_memberships_interest` |
| `20260411_group_outings_enriched.sql` | 2026-04-11 | Tables enrichies sorties : `outing_photos`, `outing_comments` |
| `20260411_help_requests_cdc.sql` | 2026-04-11 | Module Coups de main : `help_requests`, `help_photos`, `help_comments`, `help_request_participants`, `help_request_status_history` |
| `20260411_lost_found_cdc.sql` | 2026-04-11 | Module Perdu/Trouvé : `lost_found_items`, `lf_photos`, `lf_comments`, `lf_matches` |
| `20260411_annonces_cdc.sql` | 2026-04-11 | Enrichissement `listings` (6 types, 10 statuts, 12 colonnes CDC) + `listing_favorites`, `listing_saved_searches`, `listing_reports`, `listing_status_history` |

> **Règle** : `supabase/migrations/` est la **seule source de vérité**.
> Le dossier `sql/` a été supprimé. Ne plus créer de fichiers SQL à la racine.

---

## ⚠️ Pièges récurrents à éviter

| Piège | Bonne pratique |
|---|---|
| `sector` n'existe pas | Toujours `sector_id` (TEXT, slug) |
| `lost_found_items.status` différent du `type` | `type` = `perdu`/`trouve`, `status` = `active`/`identifie`/… |
| `listings` → auteur | `user_id` (pas `author_id`) |
| `equipment_items` → auteur | `owner_id` (pas `author_id`) |
| `group_outings` → auteur | `organizer_id` (pas `author_id`) |
| FK nommées en jointure | Utiliser `profiles(...)` sans `!fk_name` — la plupart n'existent pas |
| `events_author_id_fkey` | N'existe pas en DB |
| `help_requests.status` | Valeur par défaut = `active` (pas `ouvert`) |
| `forum_topics.status` | Valeur = `ouvert` (pas `open`) |
| `events.status` | Valeur = `a_venir` (pas `upcoming`) |
| `equipment_items.status` | Valeur = `disponible` (pas `active`) |

---

## 📋 Tables par module

### Noyau applicatif

#### `profiles`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | text | |
| full_name | text | |
| avatar_url | text | nullable |
| phone | text | nullable |
| role | text | `resident`, `admin`, `artisan_verified`, `artisan_pending`, `moderator` |
| status | text | `active` |
| legal_consent | bool | |
| legal_consent_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |
| publication_count | int | |
| reports_received | int | |
| last_conversation_at | timestamp | nullable |
| conversation_count_today | int | |
| trust_level | text | `nouveau` |
| moderation_note | text | nullable |
| home_sector_id | text | slug secteur, nullable |

#### `sectors`
| id (slug) | name | slug | icon | color | display_order | description | is_active |
Valeurs : `les-collines`, `figabruna`, `village`, `casatorra`, `ortale`, `la-plaine`, `la-marana`

#### `messages` / `conversations` / `conversation_participants`
Tables de messagerie interne. Voir code `src/app/messages/`.

#### `notifications`
| id | user_id | type | title | message | link | is_read | created_at |

#### `reports`
Table générique de signalement. Colonnes : `id, reporter_id, target_type, target_id, reason, status, created_at`.

---

### Module Forum

#### `forum_topics`
| Colonne | Notes |
|---|---|
| **sector_id** | FK → `forum_sectors.id` — ⚠️ distinct de `sectors` |
| **status** | ⚠️ `ouvert` (pas `open`) |
| author_id, title, content, category_id | |
| is_pinned, is_hot, views, reply_count, reaction_count | |
| tags, visibility, search_vector | |

#### `forum_categories`
Valeurs : Général, Travaux & Artisans, Entraide, Événements locaux, Annonces officielles

#### `forum_sectors`
Table distincte de `sectors` (quartiers spécifiques au forum).

---

### Module Événements

#### `events`
| Colonne | Notes |
|---|---|
| **status** | ⚠️ `a_venir` (pas `upcoming`) |
| author_id, title, description, event_date, event_time | |
| location, location_area, location_city, location_detail | |
| category, organizer_name, max_participants, is_free, price | |
| cover_photo_url, sector_id | |
| capacity, is_unlimited, registration_open, price_type | |
| start_time, end_time, event_end_date | |
| tags, is_official, accessibility, target_audience | |
| external_link, contact_info, subtitle | |
| cancel_reason, postpone_reason, archived_at | |

#### `event_participants`
| id | event_id | user_id | status | joined_at | confirmed_at | cancelled_at |

#### `event_saves` *(CDC 2026-04-11)*
Favoris évènements : `id, event_id, user_id, created_at`

#### `event_comments` *(CDC 2026-04-11)*
Commentaires évènements : `id, event_id, author_id, content, created_at`

---

### Module Promenades / Sorties

#### `promenades`
Fiches de promenades. Colonnes réelles à confirmer via SQL Editor.

#### `group_outings`
| Colonne | Notes |
|---|---|
| **organizer_id** | ⚠️ PAS `author_id` |
| **meeting_point** | ⚠️ PAS `location` |
| **status** | ⚠️ `ouverte` (pas `active`) |
| title, description, outing_date, outing_time | |
| max_participants, difficulty, parking_info | |
| kids_friendly, dogs_allowed, stroller_accessible | |
| is_registration_open, location_area, location_city | |
| duration_estimate, cover_photo_url, notes | |

#### `outing_participants`
| id | outing_id | user_id | status | joined_at | confirmed_at | cancelled_at |

#### `outing_photos` *(CDC 2026-04-11)*
Photos de sorties : `id, outing_id, url, display_order, created_at`

#### `outing_comments` *(CDC 2026-04-11)*
Commentaires sorties : `id, outing_id, author_id, content, created_at`

---

### Module Associations

#### `associations`
| Colonne | Notes |
|---|---|
| author_id, name, slogan, category | |
| pub_type, **status** (`active`) | |
| description_short, description_full | |
| contact_*, show_phone, declared, rna_number | |
| sector_id, is_citywide | |
| needs[], activities[], tags[], public_target[] | |
| pmr_accessible, families_welcome, animals_ok | |
| urgent_need, places_limited, registration_required | |

#### `asso_comments` *(CDC 2026-04-11)*
Commentaires associations : `id, asso_id, author_id, content, created_at`

#### `association_needs` *(CDC 2026-04-11)*
Besoins publiés : `id, asso_id, author_id, type, title, description, status, created_at`

#### `association_memberships_interest` *(CDC 2026-04-11)*
Intérêts adhésion : `id, asso_id, user_id, message, status, created_at`

---

### Module Coups de main / Entraide *(CDC 2026-04-11)*

#### `help_requests`
| Colonne | Notes |
|---|---|
| author_id | FK → profiles |
| help_type | `demande`, `offre`, `echange` |
| **status** | `active`, `in_progress`, `paused`, `resolved`, `closed`, `archived`, `draft` |
| title, category, description | |
| urgency | `flexible`, `cette_semaine`, `rapidement`, `urgent` |
| help_date, help_time | |
| sector_id, location_area, location_city, location_detail | |
| duration, persons_needed | |
| compensation, compensation_detail | |
| equipment[], conditions[], for_who | |
| visibility, contact_mode, display_name | |

#### `help_photos`
Photos demandes : `id, help_id, url, display_order, created_at`

#### `help_comments`
Commentaires : `id, help_id, author_id, content, created_at`

#### `help_request_participants`
Participants : `id, help_id, user_id, role, state, message, created_at`

#### `help_request_status_history`
Journal statuts : `id, help_request_id, old_status, new_status, changed_by, note, changed_at`

---

### Module Perdu / Trouvé *(CDC 2026-04-11)*

#### `lost_found_items`
| Colonne | Notes |
|---|---|
| author_id | FK → profiles |
| type | `perdu`, `trouve` |
| **status** | `draft`, `perdu`, `trouve`, `identifie`, `restitue`, `clos`, `archive` |
| title, category, description | |
| brand, color, distinctive_sign | nullable |
| keep_secret, is_sensitive | bool |
| lost_date, lost_time | |
| sector_id, location_area, location_detail | |
| contact_name, contact_phone, contact_email, contact_mode | |
| show_phone, reward, sentimental_value | |
| declared_authorities, deposited_at, proof_required | |
| need_community_help, matched_item_id | |
| expires_at, closed_at, archived_at | |

#### `lf_photos`
Photos objets : `id, item_id, url, display_order, is_cover, created_at`

#### `lf_comments`
Commentaires : `id, item_id, author_id, content, created_at`

#### `lf_matches`
Correspondances suggérées : `id, lost_item_id, found_item_id, match_score (0-100), match_status, suggested_by, created_at`

---

### Module Petites Annonces *(enrichi CDC 2026-04-11)*

#### `listings`
| Colonne | Notes |
|---|---|
| **user_id** | ⚠️ PAS `author_id` |
| category_id | FK → listing_categories |
| listing_type | `sale`, `wanted`, `free`, `service`, `exchange`, `rental` |
| **status** | `draft`, `active`, `reserved`, `sold`, `given`, `exchanged`, `closed`, `expired`, `archived`, `hidden` |
| title, description, location | |
| price, is_negotiable, price_type | |
| condition, condition_state | |
| sector_id, is_urgent | |
| exchange_preferences, pickup_notes, availability_window | |
| quick_pickup, boost_until, reserved_by_user_id | |
| views_count, expires_at | |
| search_vector, moderation_status | |

#### `listing_photos`
Photos annonces : `id, listing_id, url, display_order`

#### `listing_favorites` *(CDC 2026-04-11)*
Favoris : `id, listing_id, user_id, created_at` — UNIQUE(listing_id, user_id)

#### `listing_saved_searches` *(CDC 2026-04-11)*
Alertes recherche : `id, user_id, label, query, category_id, listing_type, sector_id, price_max, condition, notify, created_at`

#### `listing_reports` *(CDC 2026-04-11)*
Signalements : `id, listing_id, reporter_id, reason, comment, status, created_at`

#### `listing_status_history` *(CDC 2026-04-11)*
Journal statuts : `id, listing_id, old_status, new_status, changed_by, note, changed_at`

---

### Module Emploi Local *(20260409)*

#### `job_offers`
Offres d'emploi : `id, author_id, title, company, category, contract_type, description, location, sector_id, status, created_at`

#### `job_demands`
Demandes d'emploi : `id, author_id, title, category, skills[], description, sector_id, status, created_at`

#### `job_applications`
Candidatures : `id, offer_id, applicant_id, cover_letter, status, created_at`

---

### Module Matériel / Prêt

#### `equipment_items`
| **owner_id** | ⚠️ PAS `author_id` |
| **status** | ⚠️ `disponible` (pas `active`) |
| category_id, title, description, condition | |
| deposit_amount, is_free, daily_rate | |
| pickup_location, rules, location_area, sector_id | |
| is_available, availability_notes | |

#### `equipment_categories`
Catégories matériel.

#### `borrow_requests`
Demandes de prêt : `id, item_id, borrower_id, start_date, end_date, status, message, created_at`

---

### Module Artisans PRO

#### `artisan_profiles`
Profils artisans. Colonnes à confirmer via SQL Editor.

#### `artisan_photos`
Photos artisans. Structure basique.

---

## 🗑️ Tables supprimées / n'existent pas

| Nom | Raison |
|---|---|
| `outings` | Renommée `group_outings` |
| `artisans` | Remplacée par `artisan_profiles` |
| `sorties` | Ancienne version |
| `artisan_services` | Dépréciée |
| `trust_scores` | Remplacée par calcul dynamique (`src/lib/trust.ts`) |
| `association_members` | Remplacée par `association_memberships_interest` |
| `help_request_responses` | Remplacée par `help_request_participants` |
| `listing_messages` | Remplacée par `conversations` |
| `material_items` | Renommée `equipment_items` |

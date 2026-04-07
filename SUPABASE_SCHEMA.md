# Schéma Supabase — Biguglia Connect
> Généré le 2026-04-07 par audit direct de la base de données.
> À mettre à jour à chaque migration SQL.

---

## 🔑 Credentials
- URL : `https://qmrkacrpncdkhofiqlrg.supabase.co`
- Anon key : dans `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role : dans `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Tables existantes et colonnes réelles

### `profiles`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | text | |
| full_name | text | |
| avatar_url | text | nullable |
| phone | text | nullable |
| role | text | `resident`, `admin`, `artisan_verified`, `artisan_pending` |
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
| home_sector_id | uuid | FK → sectors.id, nullable |

**Jointure depuis d'autres tables** : `author:profiles(...)` fonctionne sans FK nommée.

---

### `help_requests`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| author_id | uuid | FK → profiles.id |
| help_type | text | `demande` |
| **status** | text | ⚠️ **`active`** (pas `open`/`ouvert`) |
| title | text | |
| category | text | `bricolage`, etc. |
| description | text | |
| urgency | text | `flexible`, `urgent`, `medium` |
| help_date | date | |
| help_time | text | |
| location_area | text | |
| location_city | text | |
| location_detail | text | nullable |
| duration | text | |
| persons_needed | int | |
| compensation | text | |
| compensation_detail | text | nullable |
| equipment | text[] | |
| for_who | text | |
| conditions | text[] | |
| visibility | text | |
| contact_mode | text | |
| display_name | text | |
| created_at | timestamp | |
| updated_at | timestamp | |
| status_changed_at | timestamp | nullable |
| search_vector | tsvector | |
| moderation_status | text | `publie` |
| **sector_id** | uuid | FK → sectors.id, nullable — ⚠️ PAS `sector` |

---

### `events`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| author_id | uuid | FK → profiles.id |
| title | text | |
| description | text | |
| event_date | date | |
| event_time | text | |
| location | text | |
| category | text | `sport`, etc. |
| organizer_name | text | |
| max_participants | int | nullable |
| is_free | bool | |
| price | numeric | nullable |
| tags | text[] | |
| is_official | bool | |
| **status** | text | ⚠️ **`a_venir`** (pas `upcoming`) |
| created_at | timestamp | |
| updated_at | timestamp | |
| status_changed_at | timestamp | |
| search_vector | tsvector | |
| moderation_status | text | `publie` |
| capacity | int | nullable |
| is_unlimited | bool | |
| registration_open | bool | |
| price_type | text | `gratuit` |
| cancel_reason | text | nullable |
| postpone_reason | text | nullable |
| subtitle | text | |
| event_end_date | date | nullable |
| start_time | time | |
| end_time | time | nullable |
| location_area | text | |
| location_city | text | |
| location_detail | text | |
| cover_photo_url | text | nullable |
| original_event_date | date | nullable |
| accessibility | text | |
| contact_info | text | |
| external_link | text | |
| target_audience | text | |
| archived_at | timestamp | nullable |
| **sector_id** | uuid | FK → sectors.id, nullable |

**FK jointure** : `author:profiles(...)` ✅ — `profiles!events_author_id_fkey` ❌ N'EXISTE PAS.

---

### `forum_topics`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| **sector_id** | uuid | FK → forum_sectors.id — ⚠️ PAS `sector` |
| category_id | uuid | FK → forum_categories.id |
| author_id | uuid | FK → profiles.id |
| title | text | |
| content | text | |
| **status** | text | ⚠️ **`ouvert`** (pas `open`) |
| is_pinned | bool | |
| is_hot | bool | |
| views | int | |
| reply_count | int | |
| reaction_count | int | |
| last_reply_at | timestamp | nullable |
| tags | text[] | |
| visibility | text | `public` |
| search_vector | tsvector | |
| created_at | timestamp | |
| updated_at | timestamp | |

**FK jointure** : `author:profiles(...)` ✅ — `profiles!forum_topics_author_id_fkey` ✅ fonctionne aussi.

---

### `forum_categories`
| Colonne | Notes |
|---|---|
| id, name, slug, description, icon, display_order | |
Valeurs : Général, Travaux & Artisans, Entraide, Événements locaux, Annonces officielles

---

### `forum_sectors`
| Colonne | Notes |
|---|---|
| id, name, slug, description, icon, color, display_order, created_at | |
Table distincte de `sectors` (forum_sectors = quartiers pour le forum).

---

### `forum_replies`
| Colonnes | (table vide) |

---

### `lost_found_items`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| author_id | uuid | FK → profiles.id |
| type | text | ⚠️ **`perdu`** ou `trouve` (FR) |
| **status** | text | ⚠️ **`active`** (pas `perdu`/`trouve`) |
| title | text | |
| category | text | `cles`, `telephone`, etc. |
| description | text | |
| brand | text | nullable |
| color | text | nullable |
| distinctive_sign | text | nullable |
| keep_secret | bool | |
| lost_date | date | |
| lost_time | text | nullable |
| location_area | text | |
| location_detail | text | nullable |
| contact_name | text | |
| contact_phone | text | nullable |
| contact_email | text | nullable |
| contact_mode | text | |
| show_phone | bool | |
| reward | text | nullable |
| sentimental_value | bool | |
| declared_authorities | bool | |
| need_community_help | bool | |
| deposited_at | text | nullable |
| proof_required | bool | |
| expires_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |
| status_changed_at | timestamp | nullable |
| moderation_status | text | |
| **sector_id** | uuid | nullable |

**Attention** : `is_sensitive` et `matched_item_id` **absents** des colonnes réelles — le code les référence mais ils n'existent pas.
**FK jointure** : `author:profiles(...)` ✅ — `profiles!lost_found_items_author_id_fkey` ✅ fonctionne aussi.

---

### `lf_photos`
| id, item_id, url, display_order, created_at, visibility_type |

---

### `lf_comments` / `lf_status_history`
Tables vides pour l'instant, structures non connues.

---

### `listings`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| **user_id** | uuid | FK → profiles.id — ⚠️ PAS `author_id` |
| category_id | uuid | nullable |
| title | text | |
| description | text | |
| listing_type | text | `sale` |
| price | numeric | nullable |
| condition | text | nullable |
| location | text | |
| **status** | text | ⚠️ **`active`** |
| created_at | timestamp | |
| updated_at | timestamp | |
| status_changed_at | timestamp | nullable |
| expiration_date | date | nullable |
| auto_expire | bool | |
| search_vector | tsvector | |
| moderation_status | text | `publie` |
| **sector_id** | uuid | nullable |

**Jointure** : `user:profiles(...)` ✅ (FK via `user_id`) — `author:profiles(...)` ✅ fonctionne aussi.

---

### `listing_photos`
| id, listing_id, url, display_order |

---

### `equipment_items`
| Colonne | Notes |
|---|---|
| id, **owner_id** (FK profiles), category_id | ⚠️ PAS `author_id` |
| title, description, condition | |
| deposit_amount, is_free, daily_rate | |
| pickup_location, rules, is_available | |
| created_at, updated_at, status_changed_at | |
| **status** | ⚠️ **`disponible`** (pas `active`) |
| moderation_status | `publie` |
| archived_at, availability_notes | nullable |
| location_area, **sector_id** | |

**Jointure** : `owner:profiles(...)` ✅

---

### `associations`
| Colonne | Notes |
|---|---|
| id, author_id (FK profiles) | |
| pub_type, **status** | ⚠️ **`active`** |
| name, slogan, category | |
| description_short, description_full | |
| location, address, schedule | |
| public_target[], age_min, age_max | |
| membership_required, price_type, price_detail | |
| capacity, activities[], frequency, tags[], needs[] | |
| need_detail, contact_name, contact_role | |
| contact_phone, contact_email, contact_website | |
| contact_facebook, contact_instagram, contact_mode | |
| show_phone, declared, rna_number | |
| pmr_accessible, families_welcome, animals_ok | |
| indoor, parking_nearby, material_provided | |
| registration_required, places_limited, urgent_need | |
| created_at, updated_at, status_changed_at | |
| search_vector, **sector_id**, is_citywide | |

---

### `group_outings`
| Colonne | Notes |
|---|---|
| id, **organizer_id** (FK profiles) | ⚠️ PAS `author_id` |
| promenade_id (FK promenades, nullable) | |
| title, description | |
| outing_date, outing_time | |
| max_participants, **meeting_point** | ⚠️ PAS `location` |
| **status** | ⚠️ **`ouverte`** (pas `active`/`open`) |
| parking_info, difficulty | |
| kids_friendly, dogs_allowed, parking_available, stroller_accessible | |
| created_at, updated_at, status_changed_at | |
| search_vector, moderation_status | |
| is_registration_open, location_area, location_city | |
| duration_estimate, cover_photo_url, notes, archived_at | |

**Jointure** : `organizer:profiles(...)` ✅ — FK nommée `!group_outings_organizer_id_fkey` ❌ NE PAS UTILISER.

---

### `outing_participants`
| id, outing_id, user_id, created_at, status, confirmed_at, cancelled_at, attendance_marked_at, notes, updated_at, joined_at |

---

### `promenades`
Table vide. Colonnes inconnues.

---

### `event_participants`
| id, event_id, user_id, created_at, status, joined_at, confirmed_at, cancelled_at, attendance_marked_at, notes, updated_at |

---

### `notifications`
| id, user_id, type, title, message, link, is_read, created_at |

---

### `messages`
| id, conversation_id, sender_id, content, attachment_url, created_at, message_type, attachment_type, edited_at, deleted_at |

---

### `conversations`
| id, subject, related_type, related_id, created_at, updated_at, exchange_status, exchange_confirmed_by, exchange_confirmed_at, source_title, source_image, created_by, **owner_id**, status |

---

### `trust_interactions`
Table vide. Colonnes inconnues.

---

### `reports`
Table vide. Colonnes inconnues.

---

### `artisan_profiles` / `artisan_photos`
Tables vides. Colonnes inconnues.

---

### `sectors`
| id (slug), name, slug, icon, color, display_order, description, is_active, created_at |
Valeurs : les-collines, figabruna, village, casatorra, ortale + autres

---

## ⚠️ Tables qui N'EXISTENT PAS (mais référencées dans le code)
| Table | Pages qui l'utilisent |
|---|---|
| `outings` | anciens fichiers |
| `artisans` | anciens fichiers |
| `sorties` | anciens fichiers |
| `artisan_services` | anciens fichiers |
| `trust_scores` | dashboard/avis, materiel |
| `association_members` | associations page |
| `help_request_responses` | coups-de-main |
| `listing_messages` | anciens fichiers |
| `material_items` | anciens fichiers |

---

## ⚠️ Pièges récurrents à éviter

1. **`sector` n'existe pas** → toujours utiliser `sector_id`
2. **`lost_found_items.status = 'active'`** en DB → normaliser vers `perdu`/`trouve` dans le code
3. **`listings` utilise `user_id`** (pas `author_id`) pour l'auteur
4. **`equipment_items` utilise `owner_id`** (pas `author_id`)
5. **`group_outings` utilise `organizer_id`** (pas `author_id`)
6. **FK nommées** : la plupart n'existent pas → toujours utiliser la jointure simple `profiles(...)` sans `!fk_name`
7. **`events_author_id_fkey`** N'EXISTE PAS
8. **`group_outings_organizer_id_fkey`** N'EXISTE PAS

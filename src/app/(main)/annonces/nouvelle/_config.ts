/**
 * src/app/annonces/nouvelle/_config.ts
 * Static configuration for the "Nouvelle annonce" form.
 * Pure data — no React, no Supabase.
 */

// ── Listing types ─────────────────────────────────────────────────────────────

export const LISTING_TYPES = [
  { value: 'sale',     label: '🏷️ À vendre',              description: 'Vous vendez un article ou un service' },
  { value: 'free',     label: '🎁 Je donne (gratuit)',     description: 'Article offert gratuitement' },
  { value: 'wanted',   label: '🔍 Je recherche',           description: 'Vous cherchez un article ou service' },
  { value: 'exchange', label: '🔄 Échange',                description: "Troc d'articles entre voisins" },
  { value: 'service',  label: '🛠️ Service',               description: 'Prestation de service proposée' },
  { value: 'rental',   label: '🔑 Location courte durée',  description: 'Mise en location temporaire' },
] as const;

export type ListingTypeValue = (typeof LISTING_TYPES)[number]['value'];

// ── Condition options ─────────────────────────────────────────────────────────

export const CONDITION_OPTIONS = [
  { value: '',          label: 'Sélectionner…'    },
  { value: 'neuf',      label: '✨ Neuf'           },
  { value: 'tres_bon',  label: '👍 Très bon état'  },
  { value: 'bon',       label: '👌 Bon état'        },
  { value: 'usage',     label: '🔧 Usagé'          },
  { value: 'a_reparer', label: '🔨 À réparer'      },
  { value: 'lot',       label: '📦 Lot'            },
] as const;

// ── Wizard steps ──────────────────────────────────────────────────────────────

export const WIZARD_STEPS = ["L'essentiel", 'Localisation & détails', 'Engagement'] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

// ── Engagement items ──────────────────────────────────────────────────────────

export const ENGAGEMENT_ITEMS = [
  {
    key: 'check_sincere' as const,
    label: "Je publie une annonce sincère et honnête. L'article est bien tel que décrit.",
  },
  {
    key: 'check_legal' as const,
    label: "Je certifie que cet article est légal et que j'ai le droit de le vendre/donner.",
  },
  {
    key: 'check_available' as const,
    label: "L'article est disponible et je m'engage à répondre aux acheteurs intéressés.",
  },
] as const;

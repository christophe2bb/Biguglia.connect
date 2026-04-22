/**
 * src/components/seo/JsonLd.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests unitaires pour les helpers de données structurées Schema.org.
 *
 * Couverture :
 *
 *  mapConditionToSchema()
 *   1.  'neuf'          → NewCondition
 *   2.  'excellent'     → UsedCondition
 *   3.  'tres_bon'      → UsedCondition
 *   4.  'bon'           → UsedCondition
 *   5.  'usage'         → UsedCondition
 *   6.  'passable'      → UsedCondition
 *   7.  'a_reparer'     → UsedCondition
 *   8.  'lot'           → UsedCondition
 *   9.  undefined       → UsedCondition
 *  10.  null            → UsedCondition
 *  11.  chaîne inconnue → UsedCondition (safe default)
 *
 *  productOfferSchema()  — structure de base
 *  12.  Retourne @context, @type='Product', @id, name, description, url
 *  13.  @id = absUrl + '#product'
 *  14.  url relative → préfixée par SITE_URL
 *  15.  url absolue  → inchangée
 *
 *  productOfferSchema()  — images
 *  16.  images[] fourni     → image = tableau
 *  17.  image (legacy)      → image = tableau à un élément
 *  18.  images ET image     → images[] prioritaire
 *  19.  ni images ni image  → pas de champ 'image'
 *
 *  productOfferSchema()  — Offer block
 *  20.  Annonce payante (price=50)  → Offer avec price=50
 *  21.  Annonce gratuite (isFree)   → Offer avec price=0
 *  22.  Annonce 'wanted' (price=null, isFree=false) → pas d'Offer
 *  23.  Annonce vendu (OutOfStock)  → Offer.availability = .../OutOfStock
 *  24.  Annonce active (InStock)    → Offer.availability = .../InStock
 *  25.  condition 'neuf'            → Offer.itemCondition = .../NewCondition
 *  26.  condition absente           → Offer.itemCondition = .../UsedCondition
 *  27.  validThrough fourni         → Offer.priceValidUntil présent
 *  28.  validThrough absent         → pas de priceValidUntil
 *  29.  seller fourni               → Offer.seller.name = seller
 *  30.  seller absent               → Offer.seller.name = 'Habitant de Biguglia'
 *  31.  Offer.shippingDetails présent (doesNotShip=true)
 *  32.  Offer.hasMerchantReturnPolicy présent
 *
 *  productOfferSchema()  — autres champs
 *  33.  datePosted fourni → releaseDate présent
 *  34.  datePosted absent → pas de releaseDate
 *
 *  Autres helpers
 *  35.  breadcrumbSchema — structure BreadcrumbList correcte
 *  36.  breadcrumbSchema — URL relative préfixée par SITE_URL
 *  37.  breadcrumbSchema — URL absolue inchangée
 *
 *  localBusinessSchema (fusionné LocalBusiness + Organization)
 *  38.  @type est un tableau contenant LocalBusiness et Organization
 *  39.  @id défini pour déduplication (/#organization)
 *  40.  priceRange = Gratuit
 *  41.  address.streetAddress présent
 *  42.  logo est un ImageObject avec width et height
 *  43.  openingHoursSpecification couvre les 7 jours
 *  44.  organizationSchema est un alias de localBusinessSchema
 *
 *  websiteSchema
 *  45.  @type = WebSite
 *  46.  potentialAction de type SearchAction présent
 */

import { describe, it, expect } from 'vitest';
import {
  mapConditionToSchema,
  productOfferSchema,
  breadcrumbSchema,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from './jsonld-schemas';

// SITE_URL constant used by the module (mirrors the module default)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

// ─── mapConditionToSchema ────────────────────────────────────────────────────

describe('mapConditionToSchema()', () => {
  it("1.  'neuf' → NewCondition", () => {
    expect(mapConditionToSchema('neuf')).toBe('NewCondition');
  });

  it("2.  'excellent' → UsedCondition", () => {
    expect(mapConditionToSchema('excellent')).toBe('UsedCondition');
  });

  it("3.  'tres_bon' → UsedCondition", () => {
    expect(mapConditionToSchema('tres_bon')).toBe('UsedCondition');
  });

  it("4.  'bon' → UsedCondition", () => {
    expect(mapConditionToSchema('bon')).toBe('UsedCondition');
  });

  it("5.  'usage' → UsedCondition", () => {
    expect(mapConditionToSchema('usage')).toBe('UsedCondition');
  });

  it("6.  'passable' → UsedCondition", () => {
    expect(mapConditionToSchema('passable')).toBe('UsedCondition');
  });

  it("7.  'a_reparer' → UsedCondition", () => {
    expect(mapConditionToSchema('a_reparer')).toBe('UsedCondition');
  });

  it("8.  'lot' → UsedCondition", () => {
    expect(mapConditionToSchema('lot')).toBe('UsedCondition');
  });

  it('9.  undefined → UsedCondition', () => {
    expect(mapConditionToSchema(undefined)).toBe('UsedCondition');
  });

  it('10. null → UsedCondition', () => {
    expect(mapConditionToSchema(null)).toBe('UsedCondition');
  });

  it('11. chaîne inconnue → UsedCondition (safe default)', () => {
    expect(mapConditionToSchema('quelconque')).toBe('UsedCondition');
  });
});

// ─── productOfferSchema — structure de base ──────────────────────────────────

describe('productOfferSchema() — structure de base', () => {
  const base = {
    name:        'Vélo de route 52cm',
    description: 'Très bon état, peu utilisé.',
    url:         '/annonces/abc-123',
    price:       150,
  };

  it('12. Retourne @context schema.org, @type Product', () => {
    const result = productOfferSchema(base);
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('Product');
  });

  it('13. @id = absUrl + #product', () => {
    const result = productOfferSchema(base);
    expect(result['@id']).toBe(`${SITE_URL}/annonces/abc-123#product`);
  });

  it('14. url relative → préfixée par SITE_URL', () => {
    const result = productOfferSchema(base);
    expect(result.url).toBe(`${SITE_URL}/annonces/abc-123`);
  });

  it('15. url absolue → inchangée', () => {
    const result = productOfferSchema({ ...base, url: 'https://example.com/annonces/xyz' });
    expect(result.url).toBe('https://example.com/annonces/xyz');
    expect(result['@id']).toBe('https://example.com/annonces/xyz#product');
  });
});

// ─── productOfferSchema — images ─────────────────────────────────────────────

describe('productOfferSchema() — images', () => {
  const base = { name: 'Test', description: 'Desc', url: '/annonces/x', price: 10 };

  it('16. images[] fourni → image = tableau', () => {
    const result = productOfferSchema({
      ...base,
      images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
    });
    expect(Array.isArray(result.image)).toBe(true);
    expect(result.image).toHaveLength(2);
    expect((result.image as string[])[0]).toBe('https://cdn.test/a.jpg');
  });

  it('17. image (legacy) → image = tableau à un élément', () => {
    const result = productOfferSchema({ ...base, image: 'https://cdn.test/c.jpg' });
    expect(Array.isArray(result.image)).toBe(true);
    expect((result.image as string[])[0]).toBe('https://cdn.test/c.jpg');
  });

  it('18. images[] ET image (legacy) → images[] prioritaire', () => {
    const result = productOfferSchema({
      ...base,
      images: ['https://cdn.test/a.jpg'],
      image:  'https://cdn.test/b.jpg',
    });
    expect((result.image as string[])[0]).toBe('https://cdn.test/a.jpg');
    expect((result.image as string[])).toHaveLength(1);
  });

  it("19. ni images ni image → pas de champ 'image'", () => {
    const result = productOfferSchema(base);
    expect(result.image).toBeUndefined();
  });
});

// ─── productOfferSchema — Offer block ────────────────────────────────────────

describe('productOfferSchema() — Offer block', () => {
  const base = { name: 'Test', description: 'Desc', url: '/annonces/x' };

  it('20. Annonce payante (price=50) → Offer avec price=50', () => {
    const result = productOfferSchema({ ...base, price: 50 });
    expect(result.offers).toBeDefined();
    expect((result.offers as Record<string, unknown>).price).toBe(50);
  });

  it('21. Annonce gratuite (isFree=true) → Offer avec price=0', () => {
    const result = productOfferSchema({ ...base, isFree: true });
    expect(result.offers).toBeDefined();
    expect((result.offers as Record<string, unknown>).price).toBe(0);
  });

  it("22. Annonce 'wanted' (price=null, isFree=false) → pas d'Offer", () => {
    const result = productOfferSchema({ ...base, price: null, isFree: false });
    expect(result.offers).toBeUndefined();
  });

  it('23. Annonce vendu (OutOfStock) → Offer.availability = .../OutOfStock', () => {
    const result = productOfferSchema({ ...base, price: 0, availability: 'OutOfStock' });
    expect((result.offers as Record<string, unknown>).availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('24. Annonce active (InStock) → Offer.availability = .../InStock', () => {
    const result = productOfferSchema({ ...base, price: 10, availability: 'InStock' });
    expect((result.offers as Record<string, unknown>).availability).toBe(
      'https://schema.org/InStock',
    );
  });

  it("25. condition 'NewCondition' → Offer.itemCondition = .../NewCondition", () => {
    const result = productOfferSchema({ ...base, price: 10, condition: 'NewCondition' });
    expect((result.offers as Record<string, unknown>).itemCondition).toBe(
      'https://schema.org/NewCondition',
    );
  });

  it('26. condition absente → Offer.itemCondition = .../UsedCondition', () => {
    const result = productOfferSchema({ ...base, price: 10 });
    expect((result.offers as Record<string, unknown>).itemCondition).toBe(
      'https://schema.org/UsedCondition',
    );
  });

  it('27. validThrough fourni → Offer.priceValidUntil présent', () => {
    const result = productOfferSchema({ ...base, price: 10, validThrough: '2026-12-31T00:00:00Z' });
    expect((result.offers as Record<string, unknown>).priceValidUntil).toBe('2026-12-31T00:00:00Z');
  });

  it('28. validThrough absent → pas de priceValidUntil', () => {
    const result = productOfferSchema({ ...base, price: 10 });
    expect((result.offers as Record<string, unknown>).priceValidUntil).toBeUndefined();
  });

  it('29. seller fourni → Offer.seller.name = seller', () => {
    const result = productOfferSchema({ ...base, price: 10, seller: 'Jean Dupont' });
    const offer = result.offers as Record<string, unknown>;
    expect((offer.seller as Record<string, unknown>).name).toBe('Jean Dupont');
  });

  it("30. seller absent → Offer.seller.name = 'Habitant de Biguglia'", () => {
    const result = productOfferSchema({ ...base, price: 10 });
    const offer = result.offers as Record<string, unknown>;
    expect((offer.seller as Record<string, unknown>).name).toBe('Habitant de Biguglia');
  });

  it('31. Offer.shippingDetails présent avec doesNotShip=true', () => {
    const result = productOfferSchema({ ...base, price: 10 });
    const offer = result.offers as Record<string, unknown>;
    const shipping = offer.shippingDetails as Record<string, unknown>;
    expect(shipping).toBeDefined();
    expect(shipping.doesNotShip).toBe(true);
  });

  it('32. Offer.hasMerchantReturnPolicy présent', () => {
    const result = productOfferSchema({ ...base, price: 10 });
    const offer = result.offers as Record<string, unknown>;
    const policy = offer.hasMerchantReturnPolicy as Record<string, unknown>;
    expect(policy).toBeDefined();
    expect(policy.returnPolicyCategory).toBe(
      'https://schema.org/MerchantReturnNotPermitted',
    );
  });
});

// ─── productOfferSchema — autres champs ──────────────────────────────────────

describe('productOfferSchema() — autres champs', () => {
  const base = { name: 'Test', description: 'Desc', url: '/annonces/x', price: 10 };

  it('33. datePosted fourni → releaseDate présent', () => {
    const result = productOfferSchema({ ...base, datePosted: '2026-04-01T10:00:00Z' });
    expect(result.releaseDate).toBe('2026-04-01T10:00:00Z');
  });

  it('34. datePosted absent → pas de releaseDate', () => {
    const result = productOfferSchema(base);
    expect(result.releaseDate).toBeUndefined();
  });
});

// ─── breadcrumbSchema ────────────────────────────────────────────────────────

describe('breadcrumbSchema()', () => {
  it('35. Structure BreadcrumbList correcte', () => {
    const result = breadcrumbSchema([
      { name: 'Accueil', url: '/' },
      { name: 'Annonces', url: '/annonces' },
    ]);
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(result.itemListElement)).toBe(true);
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0]).toMatchObject({ '@type': 'ListItem', position: 1, name: 'Accueil' });
    expect(result.itemListElement[1]).toMatchObject({ '@type': 'ListItem', position: 2, name: 'Annonces' });
  });

  it('36. URL relative → préfixée par SITE_URL', () => {
    const result = breadcrumbSchema([{ name: 'Annonces', url: '/annonces' }]);
    expect(result.itemListElement[0].item).toBe(`${SITE_URL}/annonces`);
  });

  it('37. URL absolue → inchangée', () => {
    const result = breadcrumbSchema([{ name: 'Ext', url: 'https://example.com/foo' }]);
    expect(result.itemListElement[0].item).toBe('https://example.com/foo');
  });
});

// ─── localBusinessSchema (merged LocalBusiness + Organization) ───────────────

describe('localBusinessSchema — schéma fusionné LocalBusiness + Organization', () => {
  it('38. @type est un tableau contenant LocalBusiness et Organization', () => {
    const types = localBusinessSchema['@type'] as string[];
    expect(Array.isArray(types)).toBe(true);
    expect(types).toContain('LocalBusiness');
    expect(types).toContain('Organization');
  });

  it('39. @id défini pour déduplication (/#organization)', () => {
    expect(localBusinessSchema['@id']).toBe(`${SITE_URL}/#organization`);
  });

  it('40. priceRange = Gratuit', () => {
    expect(localBusinessSchema.priceRange).toBe('Gratuit');
  });

  it('41. address.streetAddress présent', () => {
    expect(localBusinessSchema.address.streetAddress).toBe('Village de Biguglia');
  });

  it('42. logo est un ImageObject avec width et height', () => {
    const logo = localBusinessSchema.logo as Record<string, unknown>;
    expect(logo['@type']).toBe('ImageObject');
    expect(typeof logo.width).toBe('number');
    expect(typeof logo.height).toBe('number');
  });

  it('43. openingHoursSpecification couvre les 7 jours', () => {
    const ohs = localBusinessSchema.openingHoursSpecification as Record<string, unknown>;
    expect(Array.isArray(ohs.dayOfWeek)).toBe(true);
    expect((ohs.dayOfWeek as string[]).length).toBe(7);
  });

  it('44. organizationSchema est un alias de localBusinessSchema (même référence)', () => {
    expect(organizationSchema).toBe(localBusinessSchema);
  });
});

// ─── websiteSchema ───────────────────────────────────────────────────────────

describe('websiteSchema', () => {
  it('45. @type = WebSite', () => {
    expect(websiteSchema['@type']).toBe('WebSite');
  });

  it('46. potentialAction de type SearchAction présent', () => {
    const action = websiteSchema.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('SearchAction');
  });
});

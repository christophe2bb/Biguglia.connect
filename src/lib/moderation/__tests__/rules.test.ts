/**
 * Tests unitaires — moderation/rules.ts
 *
 * Couverture :
 *  - Structure de VALIDATION_RULES (tous les ContentType présents)
 *  - Règle titleRule : longueur min 10, type string, trim
 *  - Règle descRule : longueur min 30, type string, trim
 *  - Règle categoryRule : valeur truthy requise
 *  - Règles spécifiques par type : listing, equipment, help_request,
 *    outing, event, lost_found, collection_item, association, forum_post
 *  - Chaque règle possède field, label, message, weight corrects
 *  - Fonctions check() : cas valides et invalides pour chaque règle
 */

import { describe, it, expect } from 'vitest';
import { VALIDATION_RULES, type ValidationRule } from '../rules';
import type { ContentType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Trouve la règle d'un champ donné dans un tableau de règles */
function findRule(rules: ValidationRule[], field: string): ValidationRule | undefined {
  return rules.find(r => r.field === field);
}

/** Asserts qu'une règle existe et retourne-la */
function getRule(rules: ValidationRule[], field: string): ValidationRule {
  const rule = findRule(rules, field);
  expect(rule, `Règle "${field}" introuvable`).toBeDefined();
  return rule!;
}

// ─── Structure générale ───────────────────────────────────────────────────────

describe('VALIDATION_RULES — structure globale', () => {
  const ALL_CONTENT_TYPES: ContentType[] = [
    'listing', 'equipment', 'help_request', 'outing', 'event',
    'lost_found', 'collection_item', 'association', 'forum_post',
  ];

  it('contient toutes les ContentType', () => {
    for (const ct of ALL_CONTENT_TYPES) {
      expect(VALIDATION_RULES).toHaveProperty(ct);
    }
  });

  it('chaque ContentType a au moins une règle', () => {
    for (const ct of ALL_CONTENT_TYPES) {
      expect(VALIDATION_RULES[ct].length, `${ct} sans règle`).toBeGreaterThan(0);
    }
  });

  it('chaque règle possède les propriétés requises', () => {
    for (const ct of ALL_CONTENT_TYPES) {
      for (const rule of VALIDATION_RULES[ct]) {
        expect(rule).toHaveProperty('field');
        expect(rule).toHaveProperty('label');
        expect(rule).toHaveProperty('check');
        expect(rule).toHaveProperty('message');
        expect(rule).toHaveProperty('weight');
        expect(typeof rule.field).toBe('string');
        expect(typeof rule.label).toBe('string');
        expect(typeof rule.check).toBe('function');
        expect(typeof rule.message).toBe('string');
        expect(typeof rule.weight).toBe('number');
        expect(rule.weight).toBeGreaterThanOrEqual(1);
        expect(rule.weight).toBeLessThanOrEqual(3);
      }
    }
  });

  it('les labels et messages ne sont pas vides', () => {
    for (const ct of ALL_CONTENT_TYPES) {
      for (const rule of VALIDATION_RULES[ct]) {
        expect(rule.label.trim().length, `label vide pour ${ct}.${rule.field}`).toBeGreaterThan(0);
        expect(rule.message.trim().length, `message vide pour ${ct}.${rule.field}`).toBeGreaterThan(0);
      }
    }
  });
});

// ─── titleRule ────────────────────────────────────────────────────────────────

describe('titleRule (min 10 chars)', () => {
  // Utilisée par : listing, equipment, help_request, outing, event, lost_found,
  //                collection_item, forum_post
  const TYPES_WITH_TITLE: ContentType[] = [
    'listing', 'equipment', 'help_request', 'outing', 'event',
    'lost_found', 'collection_item', 'forum_post',
  ];

  for (const ct of TYPES_WITH_TITLE) {
    it(`${ct} — accepte un titre de 10 caractères ou plus`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'title');
      expect(rule.check('Titre valide !')).toBe(true);
      expect(rule.check('1234567890')).toBe(true); // exactement 10
    });

    it(`${ct} — rejette un titre de moins de 10 caractères`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'title');
      expect(rule.check('Court')).toBe(false);
      expect(rule.check('')).toBe(false);
      expect(rule.check('123456789')).toBe(false); // 9 chars
    });

    it(`${ct} — rejette si non-string`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'title');
      expect(rule.check(null)).toBe(false);
      expect(rule.check(undefined)).toBe(false);
      expect(rule.check(12345678901)).toBe(false);
    });

    it(`${ct} — le trim est appliqué (espaces ne comptent pas)`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'title');
      // 10 espaces → trim → '' (longueur 0) → invalide
      expect(rule.check('          ')).toBe(false);
    });

    it(`${ct} — titleRule a un weight de 3`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'title');
      expect(rule.weight).toBe(3);
    });
  }
});

// ─── descRule ─────────────────────────────────────────────────────────────────

describe('descRule (min 30 chars)', () => {
  // forum_post uses 'content' field, not 'description'
  const TYPES_WITH_DESC: ContentType[] = [
    'listing', 'equipment', 'help_request', 'outing', 'event',
    'collection_item', 'association',
  ];

  for (const ct of TYPES_WITH_DESC) {
    it(`${ct} — accepte une description de 30 chars ou plus`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'description');
      const desc30 = 'a'.repeat(30);
      expect(rule.check(desc30)).toBe(true);
      expect(rule.check('Cette description est suffisamment longue pour passer la validation.')).toBe(true);
    });

    it(`${ct} — rejette une description de moins de 30 chars`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'description');
      expect(rule.check('Trop courte')).toBe(false);
      expect(rule.check('')).toBe(false);
      expect(rule.check('a'.repeat(29))).toBe(false);
    });

    it(`${ct} — rejette si non-string`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'description');
      expect(rule.check(null)).toBe(false);
      expect(rule.check(undefined)).toBe(false);
    });
  }
});

// ─── categoryRule ─────────────────────────────────────────────────────────────

describe('categoryRule', () => {
  const TYPES_WITH_CATEGORY: ContentType[] = [
    'listing', 'equipment', 'collection_item', 'association',
  ];

  for (const ct of TYPES_WITH_CATEGORY) {
    it(`${ct} — accepte une catégorie non-vide`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'category');
      expect(rule.check('mobilier')).toBe(true);
      expect(rule.check('electroménager')).toBe(true);
    });

    it(`${ct} — rejette une catégorie falsy`, () => {
      const rule = getRule(VALIDATION_RULES[ct], 'category');
      expect(rule.check('')).toBe(false);
      expect(rule.check(null)).toBe(false);
      expect(rule.check(undefined)).toBe(false);
      expect(rule.check(0)).toBe(false);
    });
  }
});

// ─── listing ──────────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.listing', () => {
  const rules = VALIDATION_RULES.listing;

  it('contient les règles : title, description, category, price', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('category');
    expect(fields).toContain('price');
  });

  it('price — accepte 0 comme valeur valide', () => {
    const rule = getRule(rules, 'price');
    // 0 est une valeur explicite (article gratuit)
    expect(rule.check(0)).toBe(true);
  });

  it('price — rejette undefined, null et chaîne vide', () => {
    const rule = getRule(rules, 'price');
    expect(rule.check(undefined)).toBe(false);
    expect(rule.check(null)).toBe(false);
    expect(rule.check('')).toBe(false);
  });

  it('price — accepte un nombre positif', () => {
    const rule = getRule(rules, 'price');
    expect(rule.check(150)).toBe(true);
    expect(rule.check('150 €')).toBe(true);
  });

  it('price a un weight de 2', () => {
    const rule = getRule(rules, 'price');
    expect(rule.weight).toBe(2);
  });
});

// ─── help_request ─────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.help_request', () => {
  const rules = VALIDATION_RULES.help_request;

  it('contient les règles : title, description, help_type, category', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('help_type');
    expect(fields).toContain('category');
  });

  it('help_type — accepte "demande", "offre", "échange"', () => {
    const rule = getRule(rules, 'help_type');
    expect(rule.check('demande')).toBe(true);
    expect(rule.check('offre')).toBe(true);
    expect(rule.check('échange')).toBe(true);
  });

  it('help_type — rejette une valeur falsy', () => {
    const rule = getRule(rules, 'help_type');
    expect(rule.check('')).toBe(false);
    expect(rule.check(null)).toBe(false);
    expect(rule.check(undefined)).toBe(false);
  });

  it('help_type a un weight de 2', () => {
    const rule = getRule(rules, 'help_type');
    expect(rule.weight).toBe(2);
  });

  it('category a un weight de 1 (allégé par rapport au défaut)', () => {
    const rule = getRule(rules, 'category');
    expect(rule.weight).toBe(1);
  });
});

// ─── outing ───────────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.outing', () => {
  const rules = VALIDATION_RULES.outing;

  it('contient les règles : title, description, date, location', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('date');
    expect(fields).toContain('location');
  });

  it('date — accepte toute valeur truthy', () => {
    const rule = getRule(rules, 'date');
    expect(rule.check('2026-05-15')).toBe(true);
    expect(rule.check(new Date().toISOString())).toBe(true);
  });

  it('date — rejette undefined/null/chaîne vide', () => {
    const rule = getRule(rules, 'date');
    expect(rule.check(undefined)).toBe(false);
    expect(rule.check(null)).toBe(false);
    expect(rule.check('')).toBe(false);
  });

  it('location — accepte un lieu de plus de 3 caractères', () => {
    const rule = getRule(rules, 'location');
    expect(rule.check('Biguglia')).toBe(true);
    expect(rule.check('Parc municipal de Biguglia')).toBe(true);
  });

  it('location — rejette 3 chars ou moins', () => {
    const rule = getRule(rules, 'location');
    expect(rule.check('Ici')).toBe(false);  // 3 chars → not > 3
    expect(rule.check('')).toBe(false);
    expect(rule.check(null)).toBe(false);
  });

  it('date et location ont un weight de 3', () => {
    expect(getRule(rules, 'date').weight).toBe(3);
    expect(getRule(rules, 'location').weight).toBe(3);
  });
});

// ─── event ────────────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.event', () => {
  const rules = VALIDATION_RULES.event;

  it('contient les règles : title, description, date, location', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('date');
    expect(fields).toContain('location');
  });

  it('location — plus de 3 caractères requis', () => {
    const rule = getRule(rules, 'location');
    expect(rule.check('Salle des fêtes')).toBe(true);
    expect(rule.check('Ok')).toBe(false); // 2 chars
  });

  it('date — rejette les valeurs falsy', () => {
    const rule = getRule(rules, 'date');
    expect(rule.check(null)).toBe(false);
    expect(rule.check('')).toBe(false);
    expect(rule.check('2026-06-01')).toBe(true);
  });
});

// ─── lost_found ───────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.lost_found', () => {
  const rules = VALIDATION_RULES.lost_found;

  it('contient les règles : title, description, type, location', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('type');
    expect(fields).toContain('location');
  });

  it('description — min 20 caractères (allégé vs défaut 30)', () => {
    const rule = getRule(rules, 'description');
    expect(rule.check('a'.repeat(20))).toBe(true);
    expect(rule.check('a'.repeat(19))).toBe(false);
    expect(rule.check('Description courte.')).toBe(false); // 19 chars
  });

  it('type — accepte "perdu" ou "trouve" uniquement', () => {
    const rule = getRule(rules, 'type');
    expect(rule.check('perdu')).toBe(true);
    expect(rule.check('trouve')).toBe(true);
    expect(rule.check('lost')).toBe(false);
    expect(rule.check('found')).toBe(false);
    expect(rule.check('')).toBe(false);
    expect(rule.check(null)).toBe(false);
    expect(rule.check('PERDU')).toBe(false); // case-sensitive
  });

  it('type a un weight de 3', () => {
    const rule = getRule(rules, 'type');
    expect(rule.weight).toBe(3);
  });

  it('location — accepte un lieu de plus de 3 chars', () => {
    const rule = getRule(rules, 'location');
    expect(rule.check('Marché de Biguglia')).toBe(true);
    expect(rule.check('non')).toBe(false); // 3 chars → not > 3
  });
});

// ─── association ──────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.association', () => {
  const rules = VALIDATION_RULES.association;

  it('contient les règles : name, description, category', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('name');
    expect(fields).toContain('description');
    expect(fields).toContain('category');
  });

  it('name — min 5 caractères', () => {
    const rule = getRule(rules, 'name');
    expect(rule.check('Amis')).toBe(false);   // 4 chars
    expect(rule.check('Amics')).toBe(true);   // 5 chars
    expect(rule.check('Les amis de Biguglia')).toBe(true);
  });

  it('name — rejette si non-string', () => {
    const rule = getRule(rules, 'name');
    expect(rule.check(null)).toBe(false);
    expect(rule.check(undefined)).toBe(false);
  });

  it('name a un weight de 3', () => {
    const rule = getRule(rules, 'name');
    expect(rule.weight).toBe(3);
  });

  it('n\'a pas de règle "title"', () => {
    const fields = rules.map(r => r.field);
    expect(fields).not.toContain('title');
  });
});

// ─── forum_post ───────────────────────────────────────────────────────────────

describe('VALIDATION_RULES.forum_post', () => {
  const rules = VALIDATION_RULES.forum_post;

  it('contient les règles : title, content', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('content');
  });

  it('n\'a pas de règle "description"', () => {
    const fields = rules.map(r => r.field);
    expect(fields).not.toContain('description');
  });

  it('content — min 30 caractères', () => {
    const rule = getRule(rules, 'content');
    expect(rule.check('a'.repeat(30))).toBe(true);
    expect(rule.check('a'.repeat(29))).toBe(false);
    expect(rule.check('Texte court')).toBe(false);
  });

  it('content a un weight de 3', () => {
    const rule = getRule(rules, 'content');
    expect(rule.weight).toBe(3);
  });
});

// ─── collection_item ──────────────────────────────────────────────────────────

describe('VALIDATION_RULES.collection_item', () => {
  const rules = VALIDATION_RULES.collection_item;

  it('contient les règles : title, description, category', () => {
    const fields = rules.map(r => r.field);
    expect(fields).toContain('title');
    expect(fields).toContain('description');
    expect(fields).toContain('category');
  });

  it('category — message mentionne "collection"', () => {
    const rule = getRule(rules, 'category');
    expect(rule.message.toLowerCase()).toContain('collection');
  });
});

// ─── Immutabilité des règles ──────────────────────────────────────────────────

describe('VALIDATION_RULES — cohérence inter-types', () => {
  it('check() est une fonction pure (même résultat sur appels répétés)', () => {
    const rule = getRule(VALIDATION_RULES.listing, 'title');
    const val = 'Titre valide pour test';
    expect(rule.check(val)).toBe(rule.check(val));
  });

  it('les fonctions check() acceptent un second param data sans erreur', () => {
    const rule = getRule(VALIDATION_RULES.listing, 'price');
    const data = { price: 50, category: 'mobilier' };
    expect(() => rule.check(50, data)).not.toThrow();
    expect(rule.check(50, data)).toBe(true);
  });
});

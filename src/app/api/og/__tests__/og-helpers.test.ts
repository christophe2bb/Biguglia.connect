/**
 * Tests unitaires pour les helpers purs de /api/og/route.tsx
 *
 * On importe uniquement les fonctions pures (pas de JSX, pas de Edge runtime)
 * — elles sont exportées directement depuis route.tsx.
 */

import { describe, it, expect } from 'vitest';
import {
  truncateTitle,
  formatPriceBadge,
  parseOgParams,
  buildOgUrl,
  TYPE_META,
  CONDITION_LABELS_SHORT,
} from '../og-helpers';

// ─── truncateTitle ────────────────────────────────────────────────────────────

describe('truncateTitle', () => {
  it('retourne le titre tel quel quand il est court', () => {
    expect(truncateTitle('Vélo de course')).toBe('Vélo de course');
  });

  it('tronque à 72 caractères par défaut avec ellipse', () => {
    const long = 'A'.repeat(80);
    const result = truncateTitle(long);
    expect(result.length).toBe(72);
    expect(result.endsWith('…')).toBe(true);
  });

  it('respecte un max personnalisé', () => {
    const result = truncateTitle('Hello World!', 5);
    expect(result).toBe('Hell…');
    expect(result.length).toBe(5);
  });

  it('retourne exactement 72 chars si le titre fait exactement 72', () => {
    const exact = 'B'.repeat(72);
    expect(truncateTitle(exact)).toBe(exact);
    expect(truncateTitle(exact).length).toBe(72);
  });

  it('supprime les espaces en début/fin avant de tronquer', () => {
    expect(truncateTitle('  Vélo  ')).toBe('Vélo');
  });

  it('gère une chaîne vide', () => {
    expect(truncateTitle('')).toBe('');
  });
});

// ─── formatPriceBadge ────────────────────────────────────────────────────────

describe('formatPriceBadge', () => {
  it('retourne chaîne vide pour null', () => {
    expect(formatPriceBadge(null)).toBe('');
  });

  it('retourne chaîne vide pour chaîne vide', () => {
    expect(formatPriceBadge('')).toBe('');
  });

  it('retourne "Gratuit" pour 0', () => {
    expect(formatPriceBadge('0')).toBe('Gratuit');
  });

  it('formate un prix entier en euros', () => {
    const result = formatPriceBadge('150');
    expect(result).toContain('150');
    expect(result).toContain('€');
  });

  it('formate un prix décimal', () => {
    const result = formatPriceBadge('99.5');
    expect(result).toContain('€');
  });

  it('retourne chaîne vide pour un nombre négatif', () => {
    expect(formatPriceBadge('-10')).toBe('');
  });

  it('retourne chaîne vide pour une chaîne non numérique', () => {
    expect(formatPriceBadge('abc')).toBe('');
  });

  it('gère les grands prix (séparateur de milliers)', () => {
    const result = formatPriceBadge('1500');
    expect(result).toContain('€');
    expect(result).toContain('1');
  });
});

// ─── parseOgParams ────────────────────────────────────────────────────────────

describe('parseOgParams', () => {
  function makeParams(obj: Record<string, string>): URLSearchParams {
    return new URLSearchParams(obj);
  }

  it('retourne null si title est absent', () => {
    expect(parseOgParams(makeParams({}))).toBeNull();
  });

  it('retourne null si title est vide', () => {
    expect(parseOgParams(makeParams({ title: '   ' }))).toBeNull();
  });

  it('parse un titre seul avec valeurs par défaut', () => {
    const result = parseOgParams(makeParams({ title: 'Canapé cuir' }));
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Canapé cuir');
    expect(result!.type).toBe('sale'); // valeur par défaut
    expect(result!.price).toBeNull();
    expect(result!.cat).toBeNull();
    expect(result!.cond).toBeNull();
  });

  it('parse tous les paramètres', () => {
    const result = parseOgParams(makeParams({
      title: 'Vélo VTT',
      type:  'sale',
      price: '200',
      cat:   'Sport',
      cond:  'bon',
    }));
    expect(result).toMatchObject({
      title: 'Vélo VTT',
      type:  'sale',
      price: '200',
      cat:   'Sport',
      cond:  'bon',
    });
  });

  it('tronque automatiquement un titre trop long', () => {
    const long = 'X'.repeat(100);
    const result = parseOgParams(makeParams({ title: long }));
    expect(result).not.toBeNull();
    expect(result!.title.length).toBe(72);
    expect(result!.title.endsWith('…')).toBe(true);
  });

  it('accepte le type "free"', () => {
    const result = parseOgParams(makeParams({ title: 'Chaise', type: 'free' }));
    expect(result!.type).toBe('free');
  });
});

// ─── buildOgUrl ──────────────────────────────────────────────────────────────

describe('buildOgUrl', () => {
  const BASE = 'https://biguglia-connect.vercel.app';

  it('construit une URL minimale avec seulement le titre', () => {
    const url = buildOgUrl(BASE, { title: 'Canapé' });
    expect(url).toContain('/api/og');
    expect(url).toContain('title=');
    expect(url).toContain('Cana');
  });

  it('inclut le type dans l\'URL', () => {
    const url = buildOgUrl(BASE, { title: 'T', type: 'free' });
    expect(url).toContain('type=free');
  });

  it('inclut le prix dans l\'URL si fourni', () => {
    const url = buildOgUrl(BASE, { title: 'T', price: 150 });
    expect(url).toContain('price=150');
  });

  it('n\'inclut pas le prix dans l\'URL si null', () => {
    const url = buildOgUrl(BASE, { title: 'T', price: null });
    expect(url).not.toContain('price=');
  });

  it('n\'inclut pas le prix dans l\'URL si undefined', () => {
    const url = buildOgUrl(BASE, { title: 'T' });
    expect(url).not.toContain('price=');
  });

  it('inclut la catégorie', () => {
    const url = buildOgUrl(BASE, { title: 'T', cat: 'Électronique' });
    expect(url).toContain('cat=');
    expect(decodeURIComponent(url)).toContain('Électronique');
  });

  it('inclut la condition', () => {
    const url = buildOgUrl(BASE, { title: 'T', cond: 'neuf' });
    expect(url).toContain('cond=neuf');
  });

  it('n\'inclut pas cat si null', () => {
    const url = buildOgUrl(BASE, { title: 'T', cat: null });
    expect(url).not.toContain('cat=');
  });

  it('utilise le bon domaine de base', () => {
    const url = buildOgUrl('https://localhost:3000', { title: 'T' });
    expect(url.startsWith('https://localhost:3000/api/og')).toBe(true);
  });

  it('price 0 est inclus (article gratuit)', () => {
    const url = buildOgUrl(BASE, { title: 'T', price: 0 });
    expect(url).toContain('price=0');
  });
});

// ─── TYPE_META & CONDITION_LABELS_SHORT ──────────────────────────────────────

describe('TYPE_META', () => {
  const EXPECTED_TYPES = ['sale', 'wanted', 'free', 'service', 'exchange', 'rental'];

  it.each(EXPECTED_TYPES)('contient les métadonnées pour le type "%s"', (type) => {
    expect(TYPE_META[type]).toBeDefined();
    expect(TYPE_META[type].label).toBeTruthy();
    expect(TYPE_META[type].emoji).toBeTruthy();
    expect(TYPE_META[type].accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('couvre exactement les 6 types de listing', () => {
    expect(Object.keys(TYPE_META)).toHaveLength(6);
  });
});

describe('CONDITION_LABELS_SHORT', () => {
  const EXPECTED_CONDITIONS = ['neuf', 'excellent', 'tres_bon', 'bon', 'usage', 'a_reparer', 'lot', 'passable'];

  it.each(EXPECTED_CONDITIONS)('contient un libellé pour "%s"', (cond) => {
    expect(CONDITION_LABELS_SHORT[cond]).toBeTruthy();
  });

  it('couvre les 8 conditions', () => {
    expect(Object.keys(CONDITION_LABELS_SHORT)).toHaveLength(8);
  });
});

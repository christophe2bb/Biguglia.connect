/**
 * Tests unitaires — moderation/scoring.ts
 *
 * Couverture :
 *  validateContent()
 *    - Contenu valide → valid=true, errors=[], riskLevel='low'
 *    - Champ obligatoire manquant → erreur sur le bon champ
 *    - Plusieurs champs manquants → plusieurs erreurs, shouldBlock
 *    - Texte spam dans title → warning ajouté, riskScore += 40 ou 15
 *    - Texte spam dans description → même logique
 *    - completeness : 0% si tous les champs poids-fort manquent
 *    - riskLevel : low / medium / high / critical selon riskScore
 *    - shouldBlock : true si erreur weight=3 ou riskScore >= 60
 *
 *  getModerationStatus()
 *    - admin → 'publie'
 *    - moderator → 'publie'
 *    - resident niveau 'de_confiance' → 'publie'
 *    - resident niveau 'nouveau' → 'en_attente_validation'
 *    - resident niveau 'fiable' → 'en_attente_validation'
 *    - resident niveau 'surveille' → 'en_attente_validation'
 *
 *  computeTrustLevel()
 *    - trust_level fixé manuellement → respecté
 *    - reports > 3 → 'surveille'
 *    - age >= 180j + pubCount >= 10 + reports === 0 → 'de_confiance'
 *    - age >= 30j + pubCount >= 3 + reports <= 1 → 'fiable'
 *    - sinon → 'nouveau'
 *
 *  computeTrustScore()
 *    - score augmente avec l'ancienneté, avatar, téléphone, rôle, publications
 *    - score diminue avec les signalements
 *    - score plafonné à 100, plancher 0
 *    - badges correctement attribués
 *    - retourne le bon level/label/color/emoji
 *
 *  isNewMember()
 *    - créé il y a < 7 jours → true
 *    - créé il y a > 7 jours → false
 *
 *  needsModeration()
 *    - admin/moderator → false
 *    - 'de_confiance' → false
 *    - 'nouveau' → true
 *    - 'fiable' → true
 */

import { describe, it, expect } from 'vitest';
import {
  validateContent,
  getModerationStatus,
  computeTrustLevel,
  computeTrustScore,
  isNewMember,
  needsModeration,
} from '../scoring';

// ─── Helpers date ─────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 3600 * 1000);
  return d.toISOString();
}

// ─── validateContent ──────────────────────────────────────────────────────────

describe('validateContent()', () => {

  // ── Contenu valide ──────────────────────────────────────────────────────────

  describe('listing — contenu valide', () => {
    const validListing = {
      title: 'Table basse en bois massif',
      description: 'Belle table basse en bois massif, très bon état général, peu utilisée. Dimensions : 120x60x45 cm.',
      category: 'mobilier',
      price: 80,
    };

    it('retourne valid=true pour un listing complet', () => {
      const result = validateContent('listing', validListing);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('riskLevel="low" et riskScore=0 pour un listing propre', () => {
      const result = validateContent('listing', validListing);
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(0);
    });

    it('completeness=100 pour un listing complet', () => {
      const result = validateContent('listing', validListing);
      expect(result.completeness).toBe(100);
    });

    it('shouldBlock=false pour un listing valide', () => {
      const result = validateContent('listing', validListing);
      expect(result.shouldBlock).toBe(false);
    });

    it('warnings=[] et suggestions=[] pour un listing propre', () => {
      const result = validateContent('listing', validListing);
      expect(result.warnings).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  // ── Champs manquants ────────────────────────────────────────────────────────

  describe('listing — champs manquants', () => {
    it('titre manquant → erreur sur field="title"', () => {
      const result = validateContent('listing', {
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        category: 'mobilier',
        price: 50,
      });
      const titleError = result.errors.find(e => e.field === 'title');
      expect(titleError).toBeDefined();
      expect(titleError?.weight).toBe(3);
    });

    it('description manquante → erreur sur field="description"', () => {
      const result = validateContent('listing', {
        title: 'Titre valide test',
        category: 'mobilier',
        price: 50,
      });
      const descError = result.errors.find(e => e.field === 'description');
      expect(descError).toBeDefined();
    });

    it('price manquant → erreur sur field="price"', () => {
      const result = validateContent('listing', {
        title: 'Titre valide test',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        category: 'mobilier',
      });
      const priceError = result.errors.find(e => e.field === 'price');
      expect(priceError).toBeDefined();
    });

    it('tous les champs manquants → valid=false, shouldBlock=true', () => {
      const result = validateContent('listing', {});
      expect(result.valid).toBe(false);
      expect(result.shouldBlock).toBe(true);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('completeness < 100 si des champs manquent', () => {
      const result = validateContent('listing', { price: 50 });
      expect(result.completeness).toBeLessThan(100);
      expect(result.completeness).toBeGreaterThanOrEqual(0);
    });

    it('completeness = 0 si tous les champs weight-3 manquent', () => {
      // listing : title(w3), description(w3), category(w2), price(w2) → total=10
      // si title+desc manquent : errorWeight = 6 → completeness = (10-6)/10*100 = 40%... pas 0
      // Pour 0, il faut que TOUS les champs manquent
      const result = validateContent('listing', {});
      // totalWeight = 3+3+2+2=10, errorWeight=10 → completeness=0
      expect(result.completeness).toBe(0);
    });
  });

  // ── riskLevel thresholds ────────────────────────────────────────────────────

  describe('riskLevel selon riskScore', () => {
    it('riskScore < 20 → riskLevel="low"', () => {
      const result = validateContent('listing', {
        title: 'Titre valide test',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        category: 'mobilier',
        price: 50,
      });
      expect(result.riskLevel).toBe('low');
    });

    it('riskScore >= 20 et < 40 → riskLevel="medium"', () => {
      // category manquante (weight=2) → riskScore += 20
      // price fourni, title + description OK
      const result = validateContent('listing', {
        title: 'Titre valide test',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        price: 50,
        // category absente → riskScore += 2*10 = 20
      });
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
      expect(result.riskScore).toBeLessThan(40);
      expect(result.riskLevel).toBe('medium');
    });

    it('riskScore >= 40 et < 60 → riskLevel="high"', () => {
      // category(w2, +20) + price(w2, +20) = 40
      const result = validateContent('listing', {
        title: 'Titre valide test',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        // category et price manquants
      });
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(['high', 'critical']).toContain(result.riskLevel);
    });

    it('riskScore >= 60 → riskLevel="critical"', () => {
      // title(w3,+30) + description(w3,+30) = 60 → critical
      const result = validateContent('listing', { price: 50, category: 'mobilier' });
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.riskLevel).toBe('critical');
    });
  });

  // ── Détection spam dans les champs texte ────────────────────────────────────

  describe('détection spam via validateContent', () => {
    it('titre spam "blocked" → warning ajouté, riskScore += 40', () => {
      // bitcoin(20) + URL(30) = 50 → blocked
      const result = validateContent('listing', {
        title: 'Achetez bitcoin sur https://crypto.fr maintenant !',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        category: 'divers',
        price: 0,
      });
      expect(result.warnings.some(w => w.includes('title'))).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('description spam "warning" → suggestion ajoutée, riskScore += 15', () => {
      // email(+20) + phone(+25) dans description → score=45 → warning level
      // (warning = score >= 25 dans checkSpam)
      const result = validateContent('listing', {
        title: 'Titre valide pour annonce de test',
        description: 'Contactez-moi sur test@exemple.com ou au 06 12 34 56 78 pour plus informations.',
        category: 'divers',
        price: 50,
      });
      // email(20) + phone(25) = 45 >= 25 → warning → suggestions
      expect(result.suggestions.some(s => s.includes('description'))).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('spam dans name (association) → warnings ou suggestions', () => {
      const result = validateContent('association', {
        name: 'bitcoin ethereum crypto association',
        description: 'Description suffisamment longue pour passer la validation de contenu minimum.',
        category: 'culturel',
      });
      // 3 mots suspects → 60 → blocked
      expect(result.warnings.length + result.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ── shouldBlock ─────────────────────────────────────────────────────────────

  describe('shouldBlock', () => {
    it('true si au moins une erreur weight=3', () => {
      // title manquant (weight=3)
      const result = validateContent('listing', {
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        category: 'mobilier',
        price: 50,
      });
      expect(result.shouldBlock).toBe(true);
    });

    it('true si riskScore >= 60', () => {
      // title + description manquants → riskScore=60
      const result = validateContent('listing', { price: 50, category: 'mobilier' });
      expect(result.shouldBlock).toBe(true);
    });

    it('false si erreurs seulement weight <= 1 et riskScore < 60', () => {
      // Pour help_request : category a weight=1 → si seulement category manque
      // riskScore += 1*10=10 (weight < 2 → pas de riskScore ajouté) → pas de shouldBlock
      // Note : seuls les weight >= 2 ajoutent du riskScore
      const result = validateContent('help_request', {
        title: 'Titre valide pour test help',
        description: 'Description suffisamment longue pour passer la validation minimale requise.',
        help_type: 'demande',
        // category manquante (weight=1) → pas de riskScore ajouté car weight < 2
      });
      expect(result.errors.some(e => e.field === 'category')).toBe(true);
      expect(result.shouldBlock).toBe(false);
    });
  });

  // ── Autres types de contenu ─────────────────────────────────────────────────

  describe('forum_post — contenu valide', () => {
    it('title + content suffisants → valid=true', () => {
      const result = validateContent('forum_post', {
        title: 'Titre du post de forum',
        content: 'Contenu du post suffisamment long pour passer la validation du forum de Biguglia.',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('lost_found — type requis', () => {
    it('type="perdu" → pas d\'erreur sur type', () => {
      const result = validateContent('lost_found', {
        title: 'Clé perdue au parc',
        description: 'Clé perdue hier soir au parc municipal de Biguglia.',
        type: 'perdu',
        location: 'Parc municipal',
      });
      expect(result.errors.find(e => e.field === 'type')).toBeUndefined();
    });

    it('type invalide → erreur sur type', () => {
      const result = validateContent('lost_found', {
        title: 'Clé perdue au parc',
        description: 'Clé perdue hier soir au parc municipal de Biguglia.',
        type: 'lost', // invalide
        location: 'Parc municipal',
      });
      expect(result.errors.find(e => e.field === 'type')).toBeDefined();
    });
  });
});

// ─── getModerationStatus ──────────────────────────────────────────────────────

describe('getModerationStatus()', () => {
  it('admin → "publie" (bypass)', () => {
    expect(getModerationStatus('nouveau', 'admin')).toBe('publie');
    expect(getModerationStatus('surveille', 'admin')).toBe('publie');
  });

  it('moderator → "publie" (bypass)', () => {
    expect(getModerationStatus('nouveau', 'moderator')).toBe('publie');
    expect(getModerationStatus('fiable', 'moderator')).toBe('publie');
  });

  it('de_confiance + resident → "publie" (autoPublish=true)', () => {
    expect(getModerationStatus('de_confiance', 'resident')).toBe('publie');
  });

  it('nouveau + resident → "en_attente_validation"', () => {
    expect(getModerationStatus('nouveau', 'resident')).toBe('en_attente_validation');
  });

  it('fiable + resident → "en_attente_validation" (partialReview, pas autoPublish)', () => {
    expect(getModerationStatus('fiable', 'resident')).toBe('en_attente_validation');
  });

  it('surveille + resident → "en_attente_validation"', () => {
    expect(getModerationStatus('surveille', 'resident')).toBe('en_attente_validation');
  });

  it('de_confiance + artisan_verified → "publie"', () => {
    expect(getModerationStatus('de_confiance', 'artisan_verified')).toBe('publie');
  });
});

// ─── computeTrustLevel ────────────────────────────────────────────────────────

describe('computeTrustLevel()', () => {

  it('trust_level manuel "de_confiance" → respecté', () => {
    const profile = {
      created_at: daysAgo(1), // très récent, mais niveau fixé
      role: 'resident',
      trust_level: 'de_confiance',
    };
    expect(computeTrustLevel(profile)).toBe('de_confiance');
  });

  it('trust_level manuel "surveille" → respecté même si profil ancien', () => {
    const profile = {
      created_at: daysAgo(500),
      role: 'resident',
      trust_level: 'surveille',
      publication_count: 50,
      reports_received: 0,
    };
    expect(computeTrustLevel(profile)).toBe('surveille');
  });

  it('trust_level invalide → calculé dynamiquement', () => {
    const profile = {
      created_at: daysAgo(500),
      role: 'resident',
      trust_level: 'super_member', // valeur inconnue
      publication_count: 20,
      reports_received: 0,
    };
    // Doit calculer 'de_confiance' dynamiquement
    expect(computeTrustLevel(profile)).toBe('de_confiance');
  });

  it('reports > 3 → "surveille" (priorité sur autres critères)', () => {
    const profile = {
      created_at: daysAgo(400),
      role: 'resident',
      publication_count: 50,
      reports_received: 4,
    };
    expect(computeTrustLevel(profile)).toBe('surveille');
  });

  it('age >= 180j + pubCount >= 10 + reports === 0 → "de_confiance"', () => {
    const profile = {
      created_at: daysAgo(181),
      role: 'resident',
      publication_count: 10,
      reports_received: 0,
    };
    expect(computeTrustLevel(profile)).toBe('de_confiance');
  });

  it('age < 180j même avec pubCount >= 10 → pas "de_confiance"', () => {
    const profile = {
      created_at: daysAgo(179),
      role: 'resident',
      publication_count: 15,
      reports_received: 0,
    };
    expect(computeTrustLevel(profile)).not.toBe('de_confiance');
  });

  it('age >= 30j + pubCount >= 3 + reports <= 1 → "fiable"', () => {
    const profile = {
      created_at: daysAgo(31),
      role: 'resident',
      publication_count: 3,
      reports_received: 1,
    };
    expect(computeTrustLevel(profile)).toBe('fiable');
  });

  it('age >= 30j + pubCount >= 3 + reports = 0 → "fiable"', () => {
    const profile = {
      created_at: daysAgo(45),
      role: 'resident',
      publication_count: 5,
      reports_received: 0,
    };
    expect(computeTrustLevel(profile)).toBe('fiable');
  });

  it('age >= 30j + pubCount >= 3 + reports = 2 → pas "fiable" (> 1)', () => {
    const profile = {
      created_at: daysAgo(45),
      role: 'resident',
      publication_count: 5,
      reports_received: 2,
    };
    expect(computeTrustLevel(profile)).not.toBe('fiable');
  });

  it('nouveau membre, peu de publications → "nouveau"', () => {
    const profile = {
      created_at: daysAgo(5),
      role: 'resident',
      publication_count: 0,
      reports_received: 0,
    };
    expect(computeTrustLevel(profile)).toBe('nouveau');
  });

  it('absence de publication_count et reports_received → défaut 0', () => {
    const profile = {
      created_at: daysAgo(10),
      role: 'resident',
      // pas de publication_count ni reports_received
    };
    expect(computeTrustLevel(profile)).toBe('nouveau');
  });

  it('reports strictement > 3 (4 signalements) → "surveille"', () => {
    expect(computeTrustLevel({
      created_at: daysAgo(365),
      role: 'resident',
      publication_count: 100,
      reports_received: 4,
    })).toBe('surveille');
  });

  it('reports = 3 exactement → pas "surveille" (seuil strict > 3)', () => {
    // 3 reports, age OK, pubCount OK → devrait être fiable ou de_confiance
    const result = computeTrustLevel({
      created_at: daysAgo(400),
      role: 'resident',
      publication_count: 20,
      reports_received: 3,
    });
    expect(result).not.toBe('surveille');
  });
});

// ─── computeTrustScore ────────────────────────────────────────────────────────

describe('computeTrustScore()', () => {

  it('retourne la structure complète attendue', () => {
    const profile = {
      created_at: daysAgo(10),
      role: 'resident',
    };
    const result = computeTrustScore(profile);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('emoji');
    expect(result).toHaveProperty('badges');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.badges)).toBe(true);
  });

  it('admin → score += 40, badge "Équipe Biguglia"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(10),
      role: 'admin',
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.badges.some(b => b.includes('Biguglia'))).toBe(true);
  });

  it('artisan_verified → score += 30', () => {
    const result = computeTrustScore({
      created_at: daysAgo(10),
      role: 'artisan_verified',
    });
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.badges.some(b => b.includes('Artisan'))).toBe(true);
  });

  it('membre depuis > 365j → score += 30, badge "1 an"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
    });
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.badges.some(b => b.includes('1 an'))).toBe(true);
  });

  it('membre depuis > 90j → score += 20, badge "3 mois"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(100),
      role: 'resident',
    });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.badges.some(b => b.includes('3 mois'))).toBe(true);
  });

  it('membre depuis > 30j → score += 10, badge "1 mois"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(35),
      role: 'resident',
    });
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.badges.some(b => b.includes('1 mois'))).toBe(true);
  });

  it('nouveau membre → badge "Nouveau membre" (pas de score ancienneté)', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
    });
    expect(result.badges.some(b => b.includes('Nouveau'))).toBe(true);
  });

  it('avatar_url présent → score += 10, badge "Photo de profil"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
      avatar_url: 'https://storage.supabase.co/avatar.jpg',
    });
    expect(result.badges.some(b => b.includes('Photo'))).toBe(true);
  });

  it('phone présent → score += 15, badge "Téléphone"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
      phone: '+33600000000',
    });
    expect(result.badges.some(b => b.includes('Téléphone'))).toBe(true);
  });

  it('publication_count >= 20 → badge "Membre actif"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
      publication_count: 20,
    });
    expect(result.badges.some(b => b.includes('actif'))).toBe(true);
  });

  it('publication_count >= 5 et < 20 → badge "Contributeur"', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
      publication_count: 7,
    });
    expect(result.badges.some(b => b.includes('Contributeur'))).toBe(true);
  });

  it('reports_received > 5 → score -= 30', () => {
    const withReports = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 6,
    });
    const withoutReports = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 0,
    });
    expect(withReports.score).toBeLessThan(withoutReports.score);
    expect(withoutReports.score - withReports.score).toBe(30);
  });

  it('reports_received > 2 et <= 5 → score -= 15', () => {
    const withReports = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 3,
    });
    const withoutReports = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 0,
    });
    expect(withoutReports.score - withReports.score).toBe(15);
  });

  it('reports_received = 1 → score -= 5', () => {
    const withReport = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 1,
    });
    const noReport = computeTrustScore({
      created_at: daysAgo(400),
      role: 'resident',
      reports_received: 0,
    });
    expect(noReport.score - withReport.score).toBe(5);
  });

  it('score plancher à 0 (jamais négatif)', () => {
    const result = computeTrustScore({
      created_at: daysAgo(1),
      role: 'resident',
      reports_received: 100, // forcer score négatif
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('score plafonné à 100', () => {
    const result = computeTrustScore({
      created_at: daysAgo(400),
      role: 'admin',
      avatar_url: 'https://url.com/img.jpg',
      phone: '+33600000000',
      publication_count: 50,
      reports_received: 0,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('level et label correspondent à TRUST_LEVEL_CONFIG', () => {
    const result = computeTrustScore({
      created_at: daysAgo(5),
      role: 'resident',
    });
    // Nouveau membre → level='nouveau'
    expect(result.level).toBe('nouveau');
    expect(result.label).toBe('Nouveau');
    expect(result.emoji).toBe('🌱');
  });
});

// ─── isNewMember ──────────────────────────────────────────────────────────────

describe('isNewMember()', () => {
  it('créé il y a 1 jour → true', () => {
    expect(isNewMember(daysAgo(1))).toBe(true);
  });

  it('créé il y a 6 jours → true', () => {
    expect(isNewMember(daysAgo(6))).toBe(true);
  });

  it('créé il y a exactement 7 jours → false (seuil strict < 7j)', () => {
    // 7 jours exactement n'est pas < 7 jours
    expect(isNewMember(daysAgo(7))).toBe(false);
  });

  it('créé il y a 8 jours → false', () => {
    expect(isNewMember(daysAgo(8))).toBe(false);
  });

  it('créé il y a 365 jours → false', () => {
    expect(isNewMember(daysAgo(365))).toBe(false);
  });

  it('date de "maintenant" → true (vient de créer le compte)', () => {
    expect(isNewMember(new Date().toISOString())).toBe(true);
  });
});

// ─── needsModeration ─────────────────────────────────────────────────────────

describe('needsModeration()', () => {
  it('admin → false (toujours publie direct)', () => {
    expect(needsModeration({
      created_at: daysAgo(1),
      role: 'admin',
    })).toBe(false);
  });

  it('moderator → false', () => {
    expect(needsModeration({
      created_at: daysAgo(1),
      role: 'moderator',
    })).toBe(false);
  });

  it('niveau "de_confiance" → false (autoPublish=true)', () => {
    expect(needsModeration({
      created_at: daysAgo(200),
      role: 'resident',
      trust_level: 'de_confiance',
      publication_count: 20,
    })).toBe(false);
  });

  it('niveau "nouveau" → true', () => {
    expect(needsModeration({
      created_at: daysAgo(3),
      role: 'resident',
    })).toBe(true);
  });

  it('niveau "fiable" → true (partialReview mais pas autoPublish)', () => {
    expect(needsModeration({
      created_at: daysAgo(45),
      role: 'resident',
      publication_count: 5,
      reports_received: 0,
    })).toBe(true);
  });

  it('niveau "surveille" → true', () => {
    expect(needsModeration({
      created_at: daysAgo(400),
      role: 'resident',
      trust_level: 'surveille',
      reports_received: 5,
    })).toBe(true);
  });

  it('artisan_pending sans trust_level elevé → true', () => {
    expect(needsModeration({
      created_at: daysAgo(5),
      role: 'artisan_pending',
    })).toBe(true);
  });
});

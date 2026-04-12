/**
 * Tests unitaires — moderation/spam.ts
 *
 * Couverture :
 *  - Texte propre (niveau "ok", isSpam false)
 *  - Mots suspects individuels et combinés (score cumulatif)
 *  - Détection numéro de téléphone + option allowPhone
 *  - Détection URL + option allowUrl
 *  - Détection email + option allowEmail
 *  - Répétitions excessives
 *  - Trop de majuscules
 *  - Texte trop court
 *  - Score capped à 100
 *  - Niveaux 'ok' / 'warning' / 'blocked'
 *  - Combinaisons (plusieurs signaux → score cumulatif)
 */

import { describe, it, expect } from 'vitest';
import { checkSpam } from '../spam';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Génère une répétition de caractère : 'aaaaaa' (6 fois) */
function repeat(char: string, n: number) {
  return char.repeat(n);
}

// ─── Texte propre ─────────────────────────────────────────────────────────────

describe('checkSpam — texte propre', () => {
  it('retourne isSpam=false, level="ok", score=0 pour un texte ordinaire', () => {
    const result = checkSpam('Bonjour, je vends une table en bois en très bon état.');
    expect(result.isSpam).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it('texte vide — retourne "texte trop court" mais pas isSpam si score < 50', () => {
    const result = checkSpam('');
    // score = 10 (trop court), level = 'ok' car < 25, isSpam = false
    expect(result.isSpam).toBe(false);
    expect(result.score).toBe(10);
    expect(result.reasons).toContain('Texte trop court');
  });

  it('texte court de 9 caractères — score += 10', () => {
    const result = checkSpam('Salut !  ');  // length trimmed = 8 < 10
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.reasons.some(r => r.includes('court'))).toBe(true);
  });

  it('texte exactement 10 caractères — pas de pénalité court', () => {
    const result = checkSpam('Abcdefghij'); // 10 chars
    expect(result.reasons.some(r => r.includes('court'))).toBe(false);
  });
});

// ─── Mots suspects ────────────────────────────────────────────────────────────

describe('checkSpam — mots suspects', () => {
  it('détecte "bitcoin" → score += 20', () => {
    const result = checkSpam('Je veux investir en bitcoin et gagner gros.');
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.reasons.some(r => r.includes('bitcoin'))).toBe(true);
  });

  it('détecte "crypto" (insensible à la casse)', () => {
    const result = checkSpam('Achetez des CRYPTO maintenant pour votre avenir.');
    expect(result.reasons.some(r => r.toLowerCase().includes('suspects'))).toBe(true);
  });

  it('deux mots suspects → score += 40', () => {
    const result = checkSpam("Investissement garanti en bitcoin — devenez millionnaire !");
    // 'investissement garanti' = +20, 'bitcoin' = +20, 'millionnaire' = +20 → 60
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('trois mots suspects → score >= 60 → level=blocked, isSpam=true', () => {
    const result = checkSpam("bitcoin ethereum millionnaire gratuit immédiatement revenus passifs");
    // ≥3 mots suspects → score ≥ 60
    expect(result.isSpam).toBe(true);
    expect(result.level).toBe('blocked');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('détecte "western union" (expression multi-mots)', () => {
    const result = checkSpam('Envoyez votre paiement via western union rapidement.');
    expect(result.reasons.some(r => r.toLowerCase().includes('western union'))).toBe(true);
  });

  it('détecte "paypal friends"', () => {
    const result = checkSpam('Paiement uniquement via paypal friends, merci.');
    expect(result.reasons.some(r => r.toLowerCase().includes('paypal friends'))).toBe(true);
  });

  it('détecte "travail dissimulé" et "au noir"', () => {
    const r1 = checkSpam('Je cherche travail dissimulé dans le bâtiment.');
    const r2 = checkSpam('Je travaille au noir pour arrondir les fins de mois.');
    expect(r1.reasons.some(r => r.includes('suspects'))).toBe(true);
    expect(r2.reasons.some(r => r.includes('suspects'))).toBe(true);
  });

  it('les raisons ne listent que les 3 premiers mots suspects au maximum', () => {
    const text = 'bitcoin ethereum nft investissement garanti millionnaire';
    const result = checkSpam(text);
    // Le message liste au plus 3 mots
    const motsSuspectsReason = result.reasons.find(r => r.startsWith('Mots suspects'));
    expect(motsSuspectsReason).toBeDefined();
    const listedWords = motsSuspectsReason!.replace('Mots suspects : ', '').split(', ');
    expect(listedWords.length).toBeLessThanOrEqual(3);
  });
});

// ─── Numéros de téléphone ─────────────────────────────────────────────────────

describe('checkSpam — numéros de téléphone', () => {
  it('détecte un numéro de téléphone français → score += 25', () => {
    const result = checkSpam('Appelez-moi au 06 12 34 56 78 pour plus d\'infos.');
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.reasons).toContain('Numéro de téléphone dans le texte');
  });

  it('détecte un numéro au format +33', () => {
    const result = checkSpam('Contactez le +33 6 12 34 56 78 dès que possible.');
    expect(result.reasons).toContain('Numéro de téléphone dans le texte');
  });

  it('détecte un numéro au format 0033', () => {
    const result = checkSpam('Tel : 0033 6 12 34 56 78 — appelez-moi.');
    expect(result.reasons).toContain('Numéro de téléphone dans le texte');
  });

  it('option allowPhone=true → ne pénalise pas le numéro', () => {
    const result = checkSpam('Appelez au 06 12 34 56 78.', { allowPhone: true });
    expect(result.reasons).not.toContain('Numéro de téléphone dans le texte');
    expect(result.score).toBeLessThan(25);
  });

  it('option allowPhone=false (défaut) → pénalise le numéro', () => {
    const result = checkSpam('Appelez au 06 12 34 56 78.', { allowPhone: false });
    expect(result.reasons).toContain('Numéro de téléphone dans le texte');
  });
});

// ─── URLs ─────────────────────────────────────────────────────────────────────

describe('checkSpam — URLs', () => {
  it('détecte une URL http → score += 30', () => {
    const result = checkSpam('Visitez notre site http://exemple.fr pour commander.');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.reasons).toContain('Lien externe détecté');
  });

  it('détecte une URL https', () => {
    const result = checkSpam('Plus d\'infos sur https://www.site.com/promo');
    expect(result.reasons).toContain('Lien externe détecté');
  });

  it('détecte une URL www sans protocole', () => {
    const result = checkSpam('Voir www.monsite.net pour les détails.');
    expect(result.reasons).toContain('Lien externe détecté');
  });

  it('option allowUrl=true → ne pénalise pas les URLs', () => {
    const result = checkSpam('Voir https://exemple.com pour plus d\'infos.', { allowUrl: true });
    expect(result.reasons).not.toContain('Lien externe détecté');
  });
});

// ─── Emails ───────────────────────────────────────────────────────────────────

describe('checkSpam — adresses email', () => {
  it('détecte une adresse email → score += 20', () => {
    const result = checkSpam('Contactez-moi à contact@exemple.fr pour un devis.');
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.reasons).toContain('Adresse email dans le texte');
  });

  it('option allowEmail=true → ne pénalise pas les emails', () => {
    const result = checkSpam('Mon email : test@test.com', { allowEmail: true });
    expect(result.reasons).not.toContain('Adresse email dans le texte');
  });

  it('option allowEmail=false (défaut) → pénalise l\'email', () => {
    const result = checkSpam('Mon email : test@test.com', { allowEmail: false });
    expect(result.reasons).toContain('Adresse email dans le texte');
  });
});

// ─── Répétitions excessives ───────────────────────────────────────────────────

describe('checkSpam — répétitions excessives', () => {
  it('> 2 séquences de 5+ caractères répétés → score += 15', () => {
    // 3 groupes de répétitions de 5+ chars
    const text = `Bonne affaire !!! ${repeat('a', 6)} ${repeat('!', 6)} ${repeat('z', 6)} venez vite`;
    const result = checkSpam(text);
    expect(result.reasons).toContain('Répétitions excessives');
    expect(result.score).toBeGreaterThanOrEqual(15);
  });

  it('exactement 2 répétitions → pas de pénalité', () => {
    const text = `Très bonne affaire ${repeat('!', 5)} ${repeat('?', 5)} vraiment super`;
    const result = checkSpam(text);
    expect(result.reasons).not.toContain('Répétitions excessives');
  });

  it('une seule répétition → pas de pénalité', () => {
    const text = `Super offre ${repeat('!', 7)} venez voir`;
    const result = checkSpam(text);
    expect(result.reasons).not.toContain('Répétitions excessives');
  });
});

// ─── Majuscules excessives ────────────────────────────────────────────────────

describe('checkSpam — majuscules excessives', () => {
  it('> 5 mots en majuscules (4+ lettres) → score += 10', () => {
    const text = 'VENTE RAPIDE URGENT SUPER PRIX INCROYABLE ACHETER MAINTENANT disponible';
    const result = checkSpam(text);
    expect(result.reasons).toContain('Trop de majuscules');
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it('5 mots en majuscules → pas de pénalité (seuil strict > 5)', () => {
    const text = 'VENTE RAPIDE URGENT SUPER PRIX disponible maintenant ici bientôt';
    const result = checkSpam(text);
    expect(result.reasons).not.toContain('Trop de majuscules');
  });

  it('moins de 4 lettres en majuscules ne compte pas', () => {
    const text = 'Je vends UN BEL objet EN BON état TRE solide';
    const result = checkSpam(text);
    // UN, EN, BON, BEL, TRE = < 4 lettres chacun → ne déclenche pas
    expect(result.reasons).not.toContain('Trop de majuscules');
  });
});

// ─── Score capped à 100 ───────────────────────────────────────────────────────

describe('checkSpam — plafonnement du score à 100', () => {
  it('score brut > 100 → score retourné = 100 (max)', () => {
    // bitcoin(20) + ethereum(20) + nft(20) + millionnaire(20) + "gagner de l'argent"(20)
    // + url(30) + phone(25) + email(20) = 175
    const text = "bitcoin ethereum nft millionnaire gagner de l'argent https://arnaque.fr 06 12 34 56 78 arnaque@crypto.com";
    const result = checkSpam(text);
    expect(result.score).toBe(100);
    expect(result.isSpam).toBe(true);
    expect(result.level).toBe('blocked');
  });
});

// ─── Niveaux de score ─────────────────────────────────────────────────────────

describe('checkSpam — niveaux ok / warning / blocked', () => {
  it('score < 25 → level="ok"', () => {
    // seul un email : +20 → ok
    const result = checkSpam('Contactez test@test.com pour plus d\'informations détaillées.');
    expect(result.level).toBe('ok');
    expect(result.isSpam).toBe(false);
  });

  it('score entre 25 et 49 → level="warning", isSpam=false', () => {
    // email(20) + phone(25) = 45 → warning
    const result = checkSpam('Appel 06 12 34 56 78 ou mail test@test.com pour info.');
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(50);
    expect(result.level).toBe('warning');
    expect(result.isSpam).toBe(false);
  });

  it('score >= 50 → level="blocked", isSpam=true', () => {
    // bitcoin(20) + url(30) = 50
    const result = checkSpam('Achetez du bitcoin sur https://crypto-site.fr dès maintenant.');
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.level).toBe('blocked');
    expect(result.isSpam).toBe(true);
  });
});

// ─── Combinaisons avancées ────────────────────────────────────────────────────

describe('checkSpam — combinaisons de signaux', () => {
  it('texte propre long avec majuscules normales → level="ok"', () => {
    const text = 'Je vends une table en bois massif. Prix : 50 euros. Bon état. Disponible le week-end à Biguglia.';
    const result = checkSpam(text);
    expect(result.level).toBe('ok');
    expect(result.isSpam).toBe(false);
    expect(result.score).toBe(0);
  });

  it('allowPhone + allowEmail + allowUrl → phone/url/email ignorés', () => {
    const text = 'Contactez 06 12 34 56 78 ou test@test.com ou https://site.fr';
    const result = checkSpam(text, { allowPhone: true, allowEmail: true, allowUrl: true });
    expect(result.score).toBe(0);
    expect(result.level).toBe('ok');
  });

  it('mot suspect + email → cumul des scores', () => {
    const result = checkSpam('Offre bitcoin à saisir, écrivez à promo@arnaque.com');
    // bitcoin(20) + email(20) = 40 → warning
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('retourne un tableau reasons vide quand aucun signal', () => {
    const result = checkSpam('Vente de livres en bon état, disponible à Biguglia.');
    expect(result.reasons).toEqual([]);
  });

  it('structure de retour correcte dans tous les cas', () => {
    const result = checkSpam('Test de texte normal avec assez de caractères.');
    expect(result).toHaveProperty('isSpam');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('level');
    expect(typeof result.isSpam).toBe('boolean');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(['ok', 'warning', 'blocked']).toContain(result.level);
  });
});

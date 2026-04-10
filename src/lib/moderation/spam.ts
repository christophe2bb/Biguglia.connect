/**
 * moderation/spam.ts
 * Détection de contenu suspect / spam.
 */
import type { SpamCheckResult } from './types';

// ─── Mots/expressions suspects ────────────────────────────────────────────────
const SPAM_WORDS = [
  'bitcoin', 'crypto', 'ethereum', 'nft', 'investissement garanti',
  "gagner de l'argent", 'revenus passifs', 'millionnaire',
  'cliquez ici', 'offre limitée', 'gratuit immédiatement',
  'sans engagement', 'meilleur prix garanti',
  'travail dissimulé', 'sans déclaration', 'au noir',
  'faux papiers', 'document officiel', 'wiring', 'money transfer',
  'western union', 'moneygram', 'escrow', 'paypal friends',
];

const PHONE_REGEX  = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const URL_REGEX    = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const EMAIL_REGEX  = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const REPEAT_REGEX = /(.)\1{4,}/g;
const CAPS_REGEX   = /\b[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]{4,}\b/g;

// ─── checkSpam ────────────────────────────────────────────────────────────────
export function checkSpam(
  text: string,
  options?: { allowPhone?: boolean; allowUrl?: boolean; allowEmail?: boolean },
): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;
  const lower = text.toLowerCase();

  const foundWords = SPAM_WORDS.filter(w => lower.includes(w));
  if (foundWords.length > 0) {
    score += foundWords.length * 20;
    reasons.push(`Mots suspects : ${foundWords.slice(0, 3).join(', ')}`);
  }

  if (!options?.allowPhone && text.match(PHONE_REGEX)) {
    score += 25;
    reasons.push('Numéro de téléphone dans le texte');
  }

  if (!options?.allowUrl && text.match(URL_REGEX)) {
    score += 30;
    reasons.push('Lien externe détecté');
  }

  if (!options?.allowEmail && text.match(EMAIL_REGEX)) {
    score += 20;
    reasons.push('Adresse email dans le texte');
  }

  const repeats = text.match(REPEAT_REGEX);
  if (repeats && repeats.length > 2) {
    score += 15;
    reasons.push('Répétitions excessives');
  }

  const capsWords = text.match(CAPS_REGEX);
  if (capsWords && capsWords.length > 5) {
    score += 10;
    reasons.push('Trop de majuscules');
  }

  if (text.trim().length < 10) {
    score += 10;
    reasons.push('Texte trop court');
  }

  const level: SpamCheckResult['level'] =
    score >= 50 ? 'blocked' : score >= 25 ? 'warning' : 'ok';

  return { isSpam: score >= 50, score: Math.min(score, 100), reasons, level };
}

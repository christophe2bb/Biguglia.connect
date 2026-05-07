/**
 * moderation/spam.ts
 * Détection de contenu suspect / spam + mots absolument interdits.
 */
import type { SpamCheckResult } from './types';

// ─── Mots absolument interdits — bloquent la publication ─────────────────────
// Ces mots/expressions entraînent un refus immédiat, quel que soit le contexte.
export const BANNED_WORDS: string[] = [
  // Armes
  'arme', 'armes', 'pistolet', 'revolver', 'fusil', 'kalashnikov', 'ak47', 'ak-47',
  'carabine', 'mitraillette', 'sniper', 'silencieux', 'munitions', 'balle calibre',
  'grenade', 'explosif', 'dynamite', 'détonateur', 'couteau cran', 'couteau papillon',
  'matraque', 'taser', 'électrochoc', 'bombe artisanale', 'arme à feu',
  // Drogues
  'drogue', 'drogues', 'cannabis', 'marijuana', 'weed', 'shit', 'beuh',
  'cocaïne', 'cocaine', 'coke', 'crack', 'héroïne', 'heroine', 'opium',
  'ecstasy', 'mdma', 'lsd', 'champignon magique', 'champignons magiques',
  'speed', 'amphétamine', 'crystal meth', 'méthamphétamine', 'ketamine',
  'tramadol', 'fentanyl', 'acheter drogue', 'vendre drogue',
  // Contenu adulte / exploitation
  'pornographie', 'pornographique', 'porno', 'xxx', 'escort', 'escorte',
  'prostituée', 'prostitution', 'call girl', 'massage érotique', 'nu intégral',
  'vidéo intime', 'contenu adulte', 'onlyfans vente',
  // Contrefaçon / faux documents
  'faux passeport', 'faux permis', 'faux papiers', 'carte identité fausse',
  'document falsifié', 'diplôme faux', 'certificat faux', 'contrefaçon',
  // Activités illégales
  'blanchiment', 'blanchir argent', 'financement terrorisme',
  'hawala', 'dark web', 'darkweb', 'tor browser vente',
  'données volées', 'carte bancaire volée', 'compte piraté',
  'hacker service', 'piratage compte',
];

// ─── BannedCheckResult ────────────────────────────────────────────────────────
export interface BannedCheckResult {
  blocked: boolean;
  foundWords: string[];
  message: string;
}

/**
 * checkBannedWords — vérifie si un texte contient des mots absolument interdits.
 * Retourne { blocked: true, foundWords, message } si trouvé.
 * À appeler AVANT tout insert en base, côté client ET serveur.
 */
export function checkBannedWords(text: string): BannedCheckResult {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const foundWords = BANNED_WORDS.filter(word => {
    const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(normalizedWord);
  });

  if (foundWords.length === 0) {
    return { blocked: false, foundWords: [], message: '' };
  }

  return {
    blocked: true,
    foundWords,
    message: `Ce contenu contient des termes interdits sur Biguglia Connect et ne peut pas être publié.`,
  };
}

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

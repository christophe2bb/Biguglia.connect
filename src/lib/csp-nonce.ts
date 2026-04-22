/**
 * src/lib/csp-nonce.ts — Générateur de nonce CSP (Edge Runtime compatible)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Génère un nonce cryptographiquement sûr pour la Content-Security-Policy.
 * Compatible avec l'Edge Runtime Next.js (pas de Buffer, pas de Node:crypto).
 *
 * Utilise Web Crypto API (`crypto.getRandomValues`) disponible dans :
 *   - Edge Runtime (Vercel / Cloudflare Workers)
 *   - Node.js >= 15 (via globalThis.crypto)
 *   - Navigateur (Web Crypto API standard)
 *
 * Format de sortie : base64url, 128 bits d'entropie (16 bytes → 22 chars).
 * La spec HTML5 recommande ≥ 128 bits pour les nonces CSP.
 * Ref: https://www.w3.org/TR/CSP3/#nonce_value
 *
 * ─── Utilisation ─────────────────────────────────────────────────────────────
 *
 *   // Dans le middleware :
 *   import { generateNonce } from '@/lib/csp-nonce';
 *   const nonce = generateNonce();
 *   // → 'abc123...' (22 chars base64url)
 *
 *   // Dans la CSP header :
 *   `script-src 'nonce-${nonce}' 'strict-dynamic'`
 *
 *   // Dans les composants serveur :
 *   import { headers } from 'next/headers';
 *   const nonce = (await headers()).get('x-nonce') ?? '';
 *
 * ─── Sécurité ────────────────────────────────────────────────────────────────
 *
 *   • JAMAIS exposé côté client (header request x-nonce → interne seulement)
 *   • Un nouveau nonce par requête (jamais réutilisé)
 *   • 128 bits d'entropie : résistant aux attaques par force brute
 *   • base64url : pas de caractères spéciaux problématiques dans les headers HTTP
 */

/**
 * Génère un nonce cryptographiquement sûr de 128 bits encodé en base64url.
 *
 * Compatible Edge Runtime : utilise `crypto.getRandomValues` (Web Crypto API).
 * Ne nécessite pas Node:crypto / Buffer.
 *
 * @returns Chaîne base64url de 22 caractères (128 bits d'entropie)
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16); // 16 bytes = 128 bits
  crypto.getRandomValues(bytes);

  // Encoder en base64url (RFC 4648 §5) sans padding
  // On utilise btoa() + remplacement des caractères non URL-safe
  // btoa() est disponible dans tous les runtimes modernes (Edge, Node 15+, Browser)
  let base64 = '';
  for (let i = 0; i < bytes.length; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  return btoa(base64)
    .replace(/\+/g, '-')  // base64+ → base64url-
    .replace(/\//g, '_')  // base64/ → base64url_
    .replace(/=/g, '');   // Supprimer le padding
}

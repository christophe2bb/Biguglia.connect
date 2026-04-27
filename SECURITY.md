# Biguglia Connect — Security Policy & Decisions

## 1. Reporting Vulnerabilities

Please report security vulnerabilities to the project maintainer via private message.  
Do **not** open public GitHub issues for security bugs.

---

## 2. Resolved Security Alerts

| Alert | Severity | Resolution | PR |
|---|---|---|---|
| Next.js 14.2.35 → 7 CVE (DoS, SSRF, smuggling) | Critical/High | Upgraded to `next@15.5.15` | #355, #356 |
| XSS `dangerouslySetInnerHTML` in `JsonLd.tsx` | High | Replaced with `safeJsonLd()` sanitizer | #354 |
| CWE-22 path traversal in Supabase uploads (18 files) | High | `safeImageExt()`, `safeDocExt()`, `safeStoragePath()`, `safeRelativePath()` | #354, #357, #359, #361 |
| Stale cookie format `@supabase/ssr` 0.3→0.6 | Medium | `purgeStaleSupabaseCookies()` in middleware | #360 |
| Exposed JWT tokens in `middleware.test.ts` | Low | Replaced with `none/TEST` algorithm dummy tokens | #355 |
| `npm install` in `vercel.json` | Low | Replaced with `npm ci` for reproducible builds | #358 |
| `window.location.href` open redirect (ArtisanCard, ArtisanDrawer) | Medium | Replaced with `router.push()` — path is server-controlled | #362 |
| CSP `connect-src` missing `browser.sentry-cdn.com` | Low | Added domain to `connect-src` | #360 |
| CSP `unsafe-inline` on `supabase.com/dashboard` URL | High | **Out-of-scope** — Supabase's own CSP, not this repo | §3.0 |
| CSP missing / weak CSP on `supabase.com/dashboard` URL | Critical | **Out-of-scope** — same third-party URL, different rule | §3.0 |
| `dangerouslySetInnerHTML` in `JsonLd.tsx` (Aikido re-scan) | Medium | `// nosec` added — Aikido AI confirmed false positive | #363 |
| CWE-22 path traversal in uploads — 2 missed files | High | `safeImageExt()` applied to `artisan-profil` + `materiel/nouveau` | #371 |
| CSP `script-src` `'unsafe-inline'` (app) | Medium | **Résolu** — nonce + strict-dynamic livré dans `middleware.ts` (PR #425/#427) | §3.1 |
| CSP `style-src` `'unsafe-inline'` (app) | Low | **Accepted** — React `style={{}}` dynamiques (79 cas restants) ; `style-src-elem` noncé livré (PR #427) | §3.1 |

---

## 3. Accepted Risks & Documented Decisions

### 3.0 All CSP Alerts on `supabase.com/dashboard` — Out-of-Scope (Third-Party Infrastructure)

**Status**: Out-of-scope — third-party infrastructure, zero action possible in this repo  
**Flagged URL**: `https://supabase.com/dashboard/org/gbztkviooqrvlrykujlv`  
**Severities reported**: Critical (missing CSP / weak CSP) + High (`unsafe-inline`)  
**First seen**: PR #364 (2026-04-22) — recurring alerts documented here

#### Root Cause

Aikido scanner crawls **`https://supabase.com/dashboard/org/…`** — the **Supabase SaaS dashboard** — and attributes its CSP weaknesses to this project. This is wrong: `supabase.com` is a **third-party service** this project depends on; its HTTP headers are 100% outside our control.

Two distinct alerts have been raised, both about the same external URL:

| Alert variant | Severity Aikido assigned | What it actually is |
|---|---|---|
| `script-src` includes `unsafe-inline` | High | Supabase dashboard's own CSP (`unsafe-eval` + `unsafe-inline`) |
| CSP header missing / weak CSP | Critical | Aikido re-scan of same URL with a different rule trigger |

#### Evidence — Supabase's actual CSP header (verified 2026-04-22)

```bash
curl -sI "https://supabase.com/dashboard/org/gbztkviooqrvlrykujlv" \
  | grep -i content-security-policy

# Output (Supabase's own header — not ours):
# content-security-policy:
#   default-src 'self' https://api.supabase.com ...;
#   script-src  'self' 'unsafe-eval' 'unsafe-inline'
#               https://cdnjs.cloudflare.com https://js.hcaptcha.com
#               https://js.stripe.com https://frontend-assets.supabase.com ...;
#   style-src   'self' 'unsafe-inline' ...;
#   ...
```

Supabase intentionally uses `'unsafe-inline'` and `'unsafe-eval'` on their own dashboard  
(Next.js-based SaaS app with Stripe, hCaptcha, real-time features, etc.).

#### Biguglia Connect app — Our CSP is correctly configured

```bash
# Our app sets a strict CSP via src/middleware.ts → buildCsp(nonce) (served by Vercel Edge):
# script-src 'nonce-{nonce}' 'strict-dynamic' blob:
#             https://vercel.live https://*.vercel-scripts.com
#             https://browser.sentry-cdn.com
# (unsafe-eval absent in production — isDev flag in buildCsp() — see §3.1 for full rationale)
# style-src-elem 'nonce-{nonce}' 'self' fonts.googleapis.com   (CSP Level 3, PR #427)
# style-src-attr 'unsafe-inline'                               (React dynamic style= attributes)
```

No code change in this repository can affect headers served by `supabase.com`.

#### Permanent fix — Exclude `supabase.com` from scanner scope

In Aikido: **Settings → Scope → Excluded URLs** → add `https://supabase.com/*`

This domain is a third-party SaaS tool. Its security posture is Supabase's responsibility,  
documented at https://supabase.com/security.

#### Why this will keep recurring without scope exclusion

Every time Aikido re-scans, it will find `unsafe-inline` on `supabase.com/dashboard` and raise  
a new alert. The only permanent fix is the scope exclusion above — not a code change.

---

### 3.1 CSP — État actuel (mis à jour post-PR #425/#427)

#### `script-src` — **Résolu** (PR #425, 2026-04-27)

**Status**: ✅ Résolu — `'unsafe-inline'` retiré de `script-src` en production.  
**Implémentation** : `src/middleware.ts` → `buildCsp(nonce)` — nonce par requête + `'strict-dynamic'`.  
**Fichier source** : `src/lib/csp-nonce.ts` + `src/middleware.ts`.

La migration nonce (§4 ci-dessous) est **entièrement livrée** :
- Phase 1 : nonce généré par requête dans le middleware ✅
- Phase 2 : nonce propagé via header `x-nonce` aux Server Components ✅
- Phase 3 : `'nonce-{nonce}' 'strict-dynamic'` dans `script-src` (pas d'`'unsafe-inline'`) ✅
- Phase 4 : `JsonLd.tsx` utilise `nonce={nonce}` sur la balise `<script>` ✅

`'unsafe-eval'` conservé uniquement en développement (`isDev`) pour le HMR Next.js — absent en production.

Scanner Aikido/Semgrep : si l'alerte `script-src unsafe-inline` réapparaît, vérifier que la page testée
est bien servie par Vercel (le middleware s'exécute en Edge). En local sans middleware, la CSP statique
de `next.config.js` est utilisée comme fallback.

#### `style-src 'unsafe-inline'` — conservé (risque Low)

**Status**: Accepted / assumed — React `style={{}}` dynamiques non migrables en classe Tailwind.  
**Risk level**: Low (style injection uniquement, pas d'exécution JS)  
**Directive concernée**: `style-src 'unsafe-inline'` (fallback legacy) · `style-src-attr 'unsafe-inline'`

**CSP Level 3 livré (PR #427)** : `style-src-elem 'nonce-{nonce}' 'self' fonts.googleapis.com`
bloque les `<style>` injectés sans nonce. `style-src-attr` conserve `'unsafe-inline'` pour les
attributs `style=""` générés par React (`width: ${pct}%`, etc.).

#### `style-src 'unsafe-inline'` — état de la migration

**Statut migration (2026-04-23)** : sprint 1 terminé — 90 `style={{}}` supprimés (169 → 79, −53 %).

**Répartition initiale** : 169 occurrences dans 69 fichiers (PR #409).  
**Répartition après sprint 1** : 79 occurrences dans 40 fichiers.

##### Ce qui a été migré (sprint 1)

| Catégorie | Occurrences supprimées | Méthode |
|---|---|---|
| Motif grille de points `radial-gradient(circle, white 1px …)` | 28 | Classes CSS utilitaires `bg-dot-grid-{sm\|md\|lg\|xl\|22\|18}` dans `globals.css` |
| Boutons gradient statiques `linear-gradient(135deg,…)` | 14 | Classes `btn-gradient-{orange\|emerald\|violet\|blue\|…}` dans `globals.css` |
| `CalendarView.tsx` (45 → 7) | 38 | Refactoring vers classes CSS `.cal-*` |
| `AnimatedEventCell.tsx` (23 → 18) | 5 | Refactoring partiel + CSS custom properties |
| Positionnement/z-index statiques | 5 | Classes Tailwind (`fixed inset-0 z-0`, `z-[1]`, etc.) |
| `aspectRatio: '16/9'` | 1 | `aspect-video` Tailwind |
| `width: '60%'` statique | 1 | `w-[60%]` Tailwind |

##### Occurrences légitimes restantes (79) — ne peuvent pas utiliser `className`

1. **Valeurs calculées à l'exécution** (47 cas) : `width: ${pct}%`, `height: ${n}px`,  
   `transform: scale(${zoom})`, etc. — Tailwind ne peut pas générer des classes pour des valeurs inconnues à la compilation.

2. **Couleurs dynamiques de catégorie d'événement** (18 cas dans `AnimatedEventCell`) :  
   `background: pastel?.bg`, `color: pastel?.ring`, etc. — injectées via CSS custom properties  
   (`--aec-ring`, `--aec-ring-22`, …) pour réduire l'impact CSP.

3. **Styles SVG/canvas** (4 cas) : `stroke-dasharray` animé, transitions SVG.

4. **API Route OG** (`/api/og`) (14 cas) : composant `ImageResponse` Vercel — rendu côté serveur,  
   pas exposé au navigateur → sans impact sur la CSP du client.

##### Plan sprint 2 (post-lancement)

- Extraire les `px` calculés (progress bars) vers un composant `<ProgressBar value={n} />` dédié  
  avec `style={{ width }}` isolé et documenté.
- Tester la suppression de `'unsafe-inline'` de `style-src` une fois les 79 cas restants  
  évalués — seules les valeurs vraiment dynamiques la nécessitent.

2. **Tailwind CSS JIT** génère des classes à la demande et peut injecter une balise  
   `<style>` dans le `<head>` en développement. En production le CSS est statique,  
   mais la valeur reste requise pour la compatibilité build.

> **Décision** : `style-src 'unsafe-inline'` conservé comme fallback legacy + `style-src-attr 'unsafe-inline'`  
> pour les attributs `style=""` React dynamiques. Sprint 1 a réduit la surface de 53 % (169 → 79).  
> Ce choix est assumé, documenté ici et dans `src/middleware.ts`. Voir PR #409, #427.

#### Atténuations déjà en place

| Atténuation | Détail |
|-------------|--------|
| `script-src` nonce + strict-dynamic | ✅ Livré en prod — `unsafe-inline` retiré (PR #425) |
| `style-src-elem` noncé | ✅ Livré en prod — bloque les `<style>` non noncés (PR #427) |
| `'unsafe-eval'` retiré en prod | Conservé uniquement en dev (`isDev`) pour le HMR Next.js |
| Entrées utilisateur échappées | `safeJsonLd()`, `safeImageExt()`, `safeDocExt()` |
| Pas de wildcard script | CSP restreint à `'self'` + domaines explicites |
| `X-Frame-Options: DENY` | Actif |
| `X-Content-Type-Options: nosniff` | Actif |
| HSTS (`max-age=63072000`) | Déployé |
| `Cross-Origin-Opener-Policy: same-origin` | Déployé |
| `Cross-Origin-Resource-Policy: cross-origin` | Déployé |

### 3.2 setup.py — SSRF False Positive

**Status**: Confirmed false positive  
**File**: `scripts/setup.py`

The `SUPABASE_URL` is a **hardcoded constant** (`https://qmrkacrpncdkhofiqlrg.supabase.co`).  
No user input flows into the URL passed to `urllib.request.urlopen()`.  
This is an **admin-only** setup script, not exposed to end users.

The scanner incorrectly identifies `urllib.request.urlopen()` calls as SSRF risk  
because it cannot trace the URL's origin statically.

### 3.3 `dangerouslySetInnerHTML` in `JsonLd.tsx` — Low Risk / False Positive

**Status**: Confirmed false positive — downgraded by Aikido AI triage — **classified Low risk, non-blocking**  
**File**: `src/components/seo/JsonLd.tsx`  
**Suppression**: `// nosec react/no-danger` + `// eslint-disable-next-line react/no-danger`

**Why Low risk (not Medium/High)** — four independent controls in place:
1. **Dedicated SEO component** — `JsonLd.tsx` serves a single purpose: JSON-LD structured data for Google Rich Results. No other use of `dangerouslySetInnerHTML` exists in the codebase.
2. **`safeJsonLd()` sanitizer** — escapes all HTML injection vectors before serialisation.
3. **CSP nonce** — the `<script>` tag carries `nonce={nonce}` read from `headers()`. Even if sanitisation were bypassed, the browser CSP (`'nonce-{nonce}' 'strict-dynamic'`) would block execution of any injected script without the correct nonce.
4. **No user-controlled data** — JSON-LD schemas are constructed server-side from typed TypeScript objects; raw user input never flows into this component unescaped.

`dangerouslySetInnerHTML` is used **only** for `<script type="application/ld+json">` —  
a requirement for Google Rich Results (Schema.org). It cannot be replaced with textContent  
because React does not support that pattern for `<script>` tags.

The output is passed through `safeJsonLd()` which escapes:
- `</script>` → `<\/script>` (prevents premature tag closure)
- `<!--` → `<\!--` (blocks HTML comment injection)
- `-->` → `--\>` (defense in depth)

No user-controlled data reaches this tag unescaped.

**Aikido AI triage quote**: *"La chaîne JSON-LD est convertie en JSON.stringify et échappe  
explicitement `</script>`, `<!--` et `-->`, donc cette utilisation de `dangerouslySetInnerHTML`  
est sûre dans cet extrait de code."* AutoFix was impossible: *"le code implémente déjà une  
désinfection HTML appropriée"*.

---

## 4. Nonce CSP Migration — ✅ Complétée (PR #425 + #427, 2026-04-27)

Toutes les phases sont livrées en production. Cette section documente l'implémentation réelle.

### Phase 1 — Nonce par requête dans le middleware ✅ LIVRÉ

```typescript
// src/middleware.ts — buildCsp(nonce) + src/lib/csp-nonce.ts
// Le nonce est généré par generateNonce() (128 bits, base64url)
// et injecté dans le header x-nonce (request) + Content-Security-Policy (response).
export function buildCsp(nonce: string): string {
  const scriptSrc = isDev
    ? `'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob: https://vercel.live ...`
    : `'nonce-${nonce}' 'strict-dynamic' blob: https://vercel.live ...`;
  // ...
}
```

### Phase 2 — Propagation nonce aux Server Components ✅ LIVRÉ

Le nonce est lu via `(await headers()).get('x-nonce')` dans :
- `src/components/seo/JsonLd.tsx` (nonce sur `<script type="application/ld+json">`)
- `src/app/layout.tsx` (nonce sur les scripts tiers si applicable)

### Phase 3 — `'nonce-{nonce}' 'strict-dynamic'` en production ✅ LIVRÉ

`script-src` en production : `'nonce-{nonce}' 'strict-dynamic' blob: https://vercel.live https://*.vercel-scripts.com https://browser.sentry-cdn.com`

`'unsafe-inline'` est **absent** de `script-src` en production.

### Phase 4 — `JsonLd.tsx` nonce-aware ✅ LIVRÉ

```typescript
// src/components/seo/JsonLd.tsx — implémentation actuelle
export async function JsonLd({ data, nonce: nonceProp }: JsonLdProps) {
  let nonce = nonceProp;
  if (!nonce) {
    const headersList = await headers();
    nonce = headersList.get('x-nonce') ?? undefined;
  }
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} // nosec
    />
  );
}
```

### CSP Level 3 style-src granulaire — ✅ LIVRÉ (PR #427)

| Directive | Valeur | Rôle |
|---|---|---|
| `style-src-elem` | `'nonce-{nonce}' 'self' fonts.googleapis.com` | Bloque les `<style>` sans nonce |
| `style-src-attr` | `'unsafe-inline'` | Attributs `style=""` React dynamiques |
| `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | Fallback navigateurs sans CSP3 |

---

## 5. Security Headers Summary

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Généré par `src/middleware.ts` (nonce par requête) | XSS, clickjacking, injection prevention |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing prevention |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Cross-Origin-Opener-Policy` | `same-origin` | Spectre/side-channel |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Resource isolation |
| `Permissions-Policy` | Défini dans `next.config.js` | Feature restriction |

---

*Last updated: 2026-04-27 — §3.1 mis à jour : script-src nonce+strict-dynamic livré (PR #425) ; style-src-elem noncé livré (PR #427) ; §4 roadmap remplacée par l'implémentation réelle ; §5 CSP source corrigée (middleware.ts, pas next.config.js).*

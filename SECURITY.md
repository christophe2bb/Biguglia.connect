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
| CSP `script-src` + `style-src` `'unsafe-inline'` (app) | Medium | **Accepted** — Next.js 15 SSR constraint; nonce migration post-prod | §3.1 |

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
# Our app sets a strict CSP via next.config.js (served by Vercel):
# script-src 'self' 'unsafe-inline' blob:
#             https://vercel.live https://*.vercel-scripts.com
#             https://browser.sentry-cdn.com
# (unsafe-eval removed in production — see §3.1 for full rationale)
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

### 3.1 CSP `script-src` + `style-src` — `'unsafe-inline'` Retained (Biguglia Connect app)

**Status**: Assumed / accepted — contrainte technique Next.js 15 App Router.  
Migration nonces = chantier séparé, planifié post-production (voir §4).  
**Risk level**: Medium  
**Directives concernées**: `script-src 'unsafe-inline'` · `style-src 'unsafe-inline'`  
**Scanner**: signale CSP faible sur ces deux directives

#### `script-src 'unsafe-inline'` — pourquoi obligatoire

1. **Next.js App Router** injecte des balises `<script>` inline non-noncées pour l'hydratation SSR :
   - `__NEXT_DATA__` (props initiales)
   - React Server Components payload
   - Route prefetch manifests

   Sans `'unsafe-inline'`, l'application entière s'arrête (écran blanc).  
   Référence : https://github.com/vercel/next.js/issues/15840

2. **`JsonLd.tsx`** utilise `dangerouslySetInnerHTML` pour les balises  
   `<script type="application/ld+json">` requises par les Rich Results Google.  
   La sortie est sanitisée via `safeJsonLd()` (voir §3.3).

3. **Vercel Live** injecte des scripts inline de monitoring/preview.

#### `style-src 'unsafe-inline'` — pourquoi obligatoire

1. **154 occurrences de `style={{...}}`** réparties dans 67 composants React :  
   les styles inline JSX sont émis par React comme attributs `style=""` sur les éléments DOM,  
   mais les animations CSS-in-JS et les transitions dynamiques (ex. `{ width: progress + '%' }`)  
   passent aussi par des balises `<style>` injectées au runtime.  
   Supprimer `'unsafe-inline'` de `style-src` casse ces composants.

2. **Tailwind CSS JIT** génère des classes à la demande et peut injecter une balise  
   `<style>` dans le `<head>` en développement. En production le CSS est statique,  
   mais la valeur reste requise pour la compatibilité build.

3. **Refactoring requis** : migrer 154 `style={{}}` vers des classes Tailwind statiques  
   ou des variables CSS représente un chantier UI complet, distinct du nonce CSP.

> **Décision** : les deux directives conservent `'unsafe-inline'` jusqu'à la migration  
> nonces (§4). Ce choix est assumé, documenté ici et dans `next.config.js`.

#### Atténuations déjà en place

| Atténuation | Détail |
|-------------|--------|
| `'unsafe-eval'` retiré en prod | Conservé uniquement en dev pour le HMR Next.js |
| Entrées utilisateur échappées | `safeJsonLd()`, `safeImageExt()`, `safeDocExt()`, DOMPurify |
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

### 3.3 `dangerouslySetInnerHTML` in `JsonLd.tsx` — False Positive

**Status**: Confirmed false positive — downgraded by Aikido AI triage  
**File**: `src/components/seo/JsonLd.tsx` line 53  
**Suppression**: `// nosec react/no-danger` + `// eslint-disable-next-line react/no-danger`

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

## 4. Nonce CSP Migration Roadmap

**Goal**: Replace `'unsafe-inline'` with `'nonce-{nonce}' 'strict-dynamic'`

### Phase 1 — Generate nonce per request (middleware)

```typescript
// src/middleware.ts
import { nanoid } from 'nanoid';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(nanoid()).toString('base64');
  const cspHeader = `script-src 'nonce-${nonce}' 'strict-dynamic'; ...`;
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);
  
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
```

### Phase 2 — Propagate nonce to layout

```typescript
// src/app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html>
      <head>
        <Script nonce={nonce} ... />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Phase 3 — Replace `'unsafe-inline'` with `'nonce-{nonce}' 'strict-dynamic'`

When `'strict-dynamic'` is in CSP, scripts loaded **by** a trusted script inherit trust —  
no need to allowlist each third-party domain. The CSP becomes:

```
script-src 'nonce-{nonce}' 'strict-dynamic' https:;
```

### Phase 4 — Refactor `JsonLd.tsx`

Replace `dangerouslySetInnerHTML` with a nonce-aware approach:

```typescript
// Option A: Pass nonce prop
<script type="application/ld+json" nonce={nonce}
  dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />

// Option B: API Route with JSON response + correct headers
// GET /api/schema/[type] → returns JSON with Content-Type: application/ld+json
```

### Estimated Effort

| Phase | Complexity | Estimated Time |
|---|---|---|
| Phase 1 (middleware nonce) | Medium | 1 day |
| Phase 2 (layout propagation) | Medium | 0.5 day |
| Phase 3 (CSP update + testing) | Low | 0.5 day |
| Phase 4 (JsonLd refactor) | Low | 0.5 day |
| **Total** | | **~2.5 days** |

---

## 5. Security Headers Summary

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | See `next.config.js` | XSS, clickjacking, injection prevention |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing prevention |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Cross-Origin-Opener-Policy` | `same-origin` | Spectre/side-channel |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Resource isolation |
| `Permissions-Policy` | See `next.config.js` | Feature restriction |

---

*Last updated: 2026-04-22 — §3.1 étendu : style-src unsafe-inline documenté et assumé (contrainte Next.js 15 + 154 style={{}} JSX) ; migration nonces post-prod §4.*

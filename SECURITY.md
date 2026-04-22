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
| `dangerouslySetInnerHTML` in `JsonLd.tsx` (Aikido re-scan) | Medium | `// nosec` added — Aikido AI confirmed false positive | #363 |

---

## 3. Accepted Risks & Documented Decisions

### 3.0 CSP `script-src unsafe-inline` — Alert on Supabase Dashboard URL

**Status**: Out-of-scope — third-party infrastructure, no action possible  
**Flagged URL**: `https://supabase.com/dashboard/org/gbztkviooqrvlrykujlv`  
**Severity reported**: High

#### Root Cause

The scanner scanned the **Supabase dashboard** URL (supabase.com), **not the Biguglia Connect app**.  
Supabase's own dashboard CSP (verified by `curl -I` on 2026-04-22) includes:

```
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com ...
```

This is **Supabase's infrastructure**, outside the scope of this project.  
No code change in this repository can affect it.

#### Evidence

```bash
curl -sI "https://supabase.com/dashboard/org/gbztkviooqrvlrykujlv" | grep content-security-policy
# → script-src 'self' 'unsafe-eval' 'unsafe-inline' ... (Supabase's own CSP)
```

#### Action Required

- **None** on the code side — this is Supabase's CSP, not ours.
- If your security scanner allows URL exclusions, exclude `https://supabase.com/*` from scans,  
  as it is a third-party dependency with its own security policies.
- Report the issue to Supabase at https://supabase.com/security if desired.

---

### 3.1 CSP `script-src` — `'unsafe-inline'` Retained (Biguglia Connect app)

**Status**: Accepted — residual risk documented, migration planned  
**Risk level**: Medium  
**Scanner**: Flags CSP as weak due to `'unsafe-inline'`

#### Why `'unsafe-inline'` is REQUIRED

1. **Next.js App Router** injects inline `<script>` tags for SSR hydration:
   - `__NEXT_DATA__` (initial props)
   - React Server Components payload
   - Route prefetch manifests
   
   Without `'unsafe-inline'`, the entire application breaks (white screen).  
   Reference: https://github.com/vercel/next.js/issues/15840

2. **`JsonLd.tsx`** uses `dangerouslySetInnerHTML` for `<script type="application/ld+json">` tags  
   required by Google Rich Results. The output is sanitized via `safeJsonLd()`.

3. **Vercel Live** injects inline monitoring/preview scripts.

#### Mitigations Already in Place

- `'unsafe-eval'` **removed** in production (only kept for dev HMR)
- All user inputs are escaped (`safeJsonLd()`, `DOMPurify`)
- CSP restricted to `'self'` + explicit domains (no script wildcard)
- `X-Frame-Options: DENY` active
- `X-Content-Type-Options: nosniff` active
- `Strict-Transport-Security` (HSTS) deployed
- `Cross-Origin-Opener-Policy: same-origin` deployed
- `Cross-Origin-Resource-Policy: cross-origin` deployed

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

*Last updated: 2026-04-22*

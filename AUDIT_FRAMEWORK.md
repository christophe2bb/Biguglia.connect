# Pre-Production Audit Framework
## Universal Guide for Web Apps, SaaS, Marketplaces, Portals & Admin Systems

**Version:** 2.0  
**Date:** 2026-04-22  
**Reference implementation:** Biguglia Connect (Next.js 15 · React 18 · TypeScript · Supabase · Vercel · Sentry)  
**Applicable to:** Any web application, SaaS platform, marketplace, community portal, or admin system

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Five Core Audit Questions](#2-five-core-audit-questions)
3. [Deliverables](#3-deliverables)
4. [Methodology Layers](#4-methodology-layers)
5. [Business Scope & Role/Permission Matrix](#5-business-scope--rolepermission-matrix)
6. [Architecture](#6-architecture)
7. [Code Quality](#7-code-quality)
8. [Application Security](#8-application-security)
9. [Database Security](#9-database-security)
10. [Front-End Performance](#10-front-end-performance)
11. [Backend & API Performance](#11-backend--api-performance)
12. [SEO Technical Audit](#12-seo-technical-audit)
13. [Accessibility & UX](#13-accessibility--ux)
14. [Error Handling](#14-error-handling)
15. [Test Coverage](#15-test-coverage)
16. [Observability](#16-observability)
17. [DevOps & CI/CD](#17-devops--cicd)
18. [Data Privacy & Compliance (GDPR)](#18-data-privacy--compliance-gdpr)
19. [Resilience & Incident Management](#19-resilience--incident-management)
20. [Issue Classification P0–P4](#20-issue-classification-p0p4)
21. [Scoring System](#21-scoring-system)
22. [GO / NO-GO Decision Rules](#22-go--no-go-decision-rules)
23. [Ultra-Detailed Pre-Production Checklist](#23-ultra-detailed-pre-production-checklist)
24. [Executive Summary Template](#24-executive-summary-template)
25. [Finding Report Template](#25-finding-report-template)
26. [Audit Charter](#26-audit-charter)

---

## 1. Purpose & Scope

### Applicability

This framework applies to any production-bound digital system:

| System Type | Key Concerns | Critical Audit Areas |
|---|---|---|
| **Web App / SPA** | Auth, XSS, CSRF, bundle size, LCP | Security, Performance, Testing |
| **SaaS Platform** | Multi-tenancy isolation, billing, rate limiting | DB Security, Auth, Resilience |
| **Marketplace** | Buyer/seller isolation, payments, fraud | Auth, DB RLS, Error Handling |
| **Community Portal** | UGC moderation, spam, public SEO | Security, SEO, Moderation |
| **Admin System** | Role separation, audit logs, secrets | Auth, Access Control, Observability |
| **API-first Product** | Auth tokens, versioning, rate limiting | Security, Performance, Docs |

### What This Audit Is Not

- A penetration test (requires dedicated tooling, live environment, signed scope)
- A load test (requires realistic traffic simulation)
- A full WCAG compliance test (requires assistive technology testing with real users)
- A legal review (requires qualified legal counsel)

However, this audit **prepares** the ground for all of the above by identifying gaps and documenting baselines.

---

## 2. Five Core Audit Questions

Every finding must ultimately answer one or more of these five questions:

### Q1 — Functional Correctness
> *"Does the application do what it promises, reliably and completely?"*

- Are all user flows reachable, complete, and correct?
- Are edge cases handled (empty states, errors, network failures)?
- Are form validations consistent client ↔ server?
- Are business rules enforced at the API layer (not just UI)?

### Q2 — Security
> *"Can an attacker steal data, escalate privileges, or take down the system?"*

- Can an unauthenticated user access protected resources?
- Can user A access user B's data?
- Are inputs sanitized against XSS, injection, SSRF?
- Are secrets, tokens, and keys properly isolated?
- Are all attack surfaces (file upload, webhooks, public APIs) hardened?

### Q3 — Technical Maintainability
> *"Can the team evolve this codebase safely in 6 months?"*

- Is the codebase typed, linted, and tested?
- Are dependencies up to date and vulnerability-free?
- Is the architecture modular and documented?
- Is the deployment process reproducible?

### Q4 — Performance & Indexability
> *"Does the application load fast and appear in search results?"*

- Are Core Web Vitals (LCP, CLS, INP/FID) within passing ranges?
- Is the bundle size optimized?
- Is the sitemap accurate and complete?
- Are all public pages indexable and free from technical SEO blockers?

### Q5 — Production Risk Assessment
> *"What will break first in production, and how badly?"*

- What are the single points of failure?
- Is there monitoring to detect failures before users do?
- Is there a rollback strategy for every deployment?
- What happens when the database, CDN, or payment provider goes down?

---

## 3. Deliverables

### 3.1 Executive Summary

A single-page decision document containing:

```
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                                  │
│  Project: [Name]  Version: [x.y.z]  Date: [YYYY-MM-DD]            │
│                                                                     │
│  GLOBAL SCORE:  XX / 100                                           │
│  MATURITY:      [Prototype / Development / Pre-production /        │
│                  Production-ready / Enterprise-grade]              │
│  VERDICT:       [NO GO / GO with reservations / GO / GO solid]    │
│                                                                     │
│  BLOCKERS P0:   N    MAJOR RISKS P1:  N                           │
│  ATTENTION P2:  N    RECOMMENDED P3:  N                           │
│  COSMETIC P4:   N                                                  │
│                                                                     │
│  SUMMARY (5 lines):                                                │
│  [What works well, what is critical, what the go/no-go is, why]   │
│                                                                     │
│  TOP 3 PRIORITY ACTIONS:                                           │
│  1. [Action — Effort — Owner — Deadline]                           │
│  2. [Action — Effort — Owner — Deadline]                           │
│  3. [Action — Effort — Owner — Deadline]                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Detailed Report Per Finding

Each finding must contain:

| Field | Description |
|---|---|
| **ID** | Unique identifier (e.g., `SEC-003`, `PERF-007`) |
| **Title** | One-line summary of the finding |
| **Observation** | What was found, exactly |
| **Impact** | Business/technical consequence if not fixed |
| **Severity** | P0 → P4 (see Section 20) |
| **Evidence** | File path, line number, code snippet, or command output |
| **Affected scope** | File / route / component / infrastructure |
| **Remediation** | Exact steps to fix, including code snippet when applicable |
| **Effort** | Estimated fix time (5min / 1h / 1 day / 1 week) |
| **Owner** | Role responsible for fix (Dev / DevOps / Legal / Product) |

### 3.3 Issue Classification Table (P0–P4)

Complete cross-reference table of all findings sorted by severity. See Section 20.

### 3.4 Final Release Checklist

Ultra-detailed checklist covering all pre-production gates. See Section 23.

---

## 4. Methodology Layers

### Layer 1 — Static Code Analysis

```bash
# TypeScript strict compilation
npx tsc --noEmit

# Linting (zero warnings in production-ready code)
npx eslint src --ext .ts,.tsx --max-warnings 0

# Dead code detection
npx ts-prune --error

# Dependency vulnerability scan
npm audit --audit-level=high

# Bundle analysis
npx @next/bundle-analyzer  # or webpack-bundle-analyzer

# Structural grep sweeps
grep -r "console\.log" src --include="*.ts" --include="*.tsx" -l
grep -r "any" src --include="*.ts" --include="*.tsx" -l
grep -r "TODO\|FIXME\|HACK\|XXX" src -l
grep -r "dangerouslySetInnerHTML" src -l
grep -r "process\.env\." src/app --include="*.ts" --include="*.tsx" -l
grep -r "eslint-disable\|@ts-ignore\|@ts-nocheck" src -l
```

### Layer 2 — Dynamic Runtime Checks

```bash
# Full test suite
npm run test

# Coverage report
npm run test:coverage

# Build verification
npm run build

# Health endpoint verification
curl https://[app-url]/api/health | jq .

# Sitemap validation
curl https://[app-url]/sitemap.xml | xmllint --format -

# Security headers check
curl -I https://[app-url]/ | grep -E "Content-Security|X-Frame|X-Content|Strict-Transport|Permissions-Policy"
```

### Layer 3 — Security Review (OWASP ASVS / Top-10)

Systematic review against:

| OWASP Category | Key Checks |
|---|---|
| **A01 — Broken Access Control** | Auth guards, role checks, IDOR patterns |
| **A02 — Cryptographic Failures** | Secret exposure, HTTP vs HTTPS, hashing |
| **A03 — Injection** | SQL injection, XSS, command injection |
| **A04 — Insecure Design** | Business logic flaws, rate limiting |
| **A05 — Security Misconfiguration** | CSP, headers, debug routes, CORS |
| **A06 — Vulnerable Components** | npm audit, outdated dependencies |
| **A07 — Auth Failures** | Session management, brute force, MFA |
| **A08 — Software Integrity** | Supply chain, CI/CD pipeline security |
| **A09 — Logging & Monitoring** | Error reporting, alerting, audit logs |
| **A10 — SSRF** | External HTTP calls, webhook validation |

### Layer 4 — Exploitation & Production Readiness

Manual verification of:
- Can auth be bypassed? (test with no token, expired token, another user's token)
- Can rate limits be bypassed? (burst traffic simulation)
- Does the health endpoint return accurate status?
- Do error pages work (404, 500, global-error)?
- Does the build succeed with clean env vars?

---

## 5. Business Scope & Role/Permission Matrix

### 5.1 Business Scope Questionnaire

Before auditing code, document the business context:

```
□ What is the primary value proposition?
□ Who are the users? (public / authenticated / admin / super-admin)
□ What data is stored? (PII / financial / health / generic)
□ What are the regulatory requirements? (GDPR / HIPAA / PCI-DSS / SOC2)
□ What are the SLA targets? (uptime %, p95 latency, recovery time)
□ What are the revenue-critical paths? (signup / checkout / publish)
□ What are the catastrophic failure scenarios? (data loss / account takeover / outage)
```

### 5.2 Role/Permission Matrix Template

Document every role and its permissions:

| Resource / Action | Anonymous | Authenticated | Author/Owner | Moderator | Admin | Super-Admin |
|---|---|---|---|---|---|---|
| **View public listings** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create listing** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit own listing** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Edit any listing** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Delete own listing** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **View admin dashboard** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Manage users** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Access service-role** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 5.3 Permission Audit Checklist

```
□ Every API route has at minimum one auth check
□ Resource ownership is verified server-side (not just client-side)
□ Admin routes have dual-layer protection (middleware + layout guard)
□ IDOR patterns are tested (user A cannot access user B's resource via ID manipulation)
□ Horizontal privilege escalation tested (regular user cannot access moderator actions)
□ Vertical privilege escalation tested (moderator cannot access super-admin actions)
□ Role matrix is enforced in database (Row-Level Security) not just application layer
```

---

## 6. Architecture

### 6.1 Evaluation Criteria

| Criterion | Weight | What to Check |
|---|---|---|
| Frontend/Backend separation | 20% | Server vs client components, API route structure |
| Module coupling | 20% | Import graphs, circular dependencies, god objects |
| Folder structure clarity | 15% | Convention adherence, discoverability |
| Infrastructure as code | 15% | Config files, environment parity, deployment config |
| Scalability design | 15% | Stateless services, caching layers, queue usage |
| Dependency management | 15% | Package lock, outdated deps, security advisories |

### 6.2 Architecture Checklist

#### Frontend Structure
```
□ Route groups isolate concerns (auth / public / private / admin)
□ Layouts handle auth guards — not individual pages
□ Server Components default, Client Components opt-in with 'use client'
□ No direct database calls from client components
□ No service-role keys accessible in browser bundles
□ API routes are in /app/api/ not scattered in pages
□ Shared components live in /components/, not duplicated across pages
□ Types are centralized in /types/ and imported consistently
```

#### Backend Structure
```
□ Business logic is in services/, not inline in route handlers
□ Database queries are abstracted (not raw SQL in routes)
□ Validation schemas are shared between client and server (Zod/Yup)
□ Error types are consistent across the API surface
□ Environment variables are validated at startup, not at first use
□ No circular imports (run: npx madge --circular src)
```

#### Infrastructure
```
□ Single middleware handles cross-cutting concerns (rate limit, auth, logging)
□ No duplicate middleware (middleware.ts at root AND src/middleware.ts)
□ Build config (next.config.js / vite.config.ts) is documented
□ Docker/container config exists if self-hosted
□ Database migrations are versioned and reproducible
□ CDN configuration documented (cache TTLs, purge strategy)
```

#### God Object Detection
```bash
# Files over 500 lines (potential god objects)
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20

# Components with excessive hooks
grep -r "useEffect" src --include="*.tsx" -l | while read f; do
  count=$(grep -c "useEffect" "$f"); echo "$count $f"
done | sort -rn | head -10
```

### 6.3 Architecture Scoring Grid

| Score | Description |
|---|---|
| **90-100** | Clean separation, documented decisions, no god objects, modular |
| **75-89** | Minor coupling issues, some large files, good overall structure |
| **60-74** | Notable coupling, mixed concerns, missing abstractions |
| **40-59** | Significant structural debt, god objects, no clear patterns |
| **< 40** | Architectural refactoring required before production |

---

## 7. Code Quality

### 7.1 TypeScript Strictness Checklist

```
□ "strict": true in tsconfig.json (enables all strict checks)
□ "noUncheckedIndexedAccess": true (catches undefined array access)
□ "exactOptionalPropertyTypes": true (prevents undefined ↔ missing confusion)
□ "noImplicitReturns": true (all code paths return a value)
□ npx tsc --noEmit → 0 errors
□ No @ts-ignore comments (use @ts-expect-error with a comment if unavoidable)
□ No @ts-nocheck at file level
□ Type aliases over interfaces for mapped types
□ No any (use unknown then narrow, or proper type parameterization)
□ Generic types used correctly (no type: any as generic defaults)
```

### 7.2 ESLint Configuration Checklist

```
□ eslint:recommended or framework equivalent is the base
□ @typescript-eslint/recommended is included
□ jsx-a11y/recommended is included for React projects
□ no-explicit-any is set to "error" (not warn)
□ no-unused-vars is set to "error" with _prefix exception
□ react-hooks/exhaustive-deps is set to "error"
□ no-console is set to "error" or "warn" (with build-time stripping)
□ no-debugger is set to "error"
□ ESLint CI check blocks PRs: --max-warnings 0
□ No blanket eslint-disable comments (each disable has a justification comment)
```

### 7.3 Code Quality Sweeps

```bash
# Count and locate suppressions
grep -rn "eslint-disable\|@ts-ignore\|@ts-nocheck" src --include="*.ts" --include="*.tsx" | wc -l

# Find TODO/FIXME/HACK
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP" src --include="*.ts" --include="*.tsx"

# Find console.log in production code (warn/error may be acceptable)
grep -rn "console\.log\b\|console\.debug\b" src --include="*.ts" --include="*.tsx" \
  --exclude-dir=__tests__ --exclude="*.test.ts" --exclude="*.test.tsx"

# Find explicit any
grep -rn ": any\b\|as any\b\| any " src --include="*.ts" --include="*.tsx" \
  --exclude-dir=__tests__ --exclude="*.test.ts"

# Find hardcoded credentials (basic)
grep -rn "password\s*=\s*['\"][^'\"]\|api_key\s*=\s*['\"]" src

# Find dead exports (requires ts-prune)
npx ts-prune --error 2>&1 | head -30
```

### 7.4 Code Quality Scoring Grid

| Area | Maximum | Scoring Criteria |
|---|---|---|
| TypeScript strictness | 25 pts | 0 errors = 25; < 10 errors = 15; > 10 = 5 |
| ESLint compliance | 25 pts | 0 warnings = 25; < 5 = 20; > 20 = 5 |
| No suppression abuse | 20 pts | < 5 suppressions = 20; < 20 = 10; > 20 = 0 |
| No dead code/console | 15 pts | 0 instances = 15; < 10 = 10; > 10 = 5 |
| Dependency hygiene | 15 pts | 0 high vulns = 15; 1 high = 5; critical = 0 |

---

## 8. Application Security

### 8.1 Authentication & Session Management

```
□ All private routes require authentication
□ Session tokens are HttpOnly cookies or short-lived JWTs
□ Token refresh is handled transparently (no user logout on expiry)
□ Logout invalidates the session server-side
□ No auth state stored in localStorage (vulnerable to XSS)
□ Auth errors return generic messages (no user enumeration)
□ Password reset tokens are single-use and expire in < 1 hour
□ MFA is available for admin/privileged accounts
□ Concurrent session limits are enforced if required
□ Auth audit log records login, logout, failed attempts, role changes
```

### 8.2 Authorization & Access Control

```
□ Authorization checks are in route handlers (not just middleware)
□ Object-level authorization: user ID from session, not from request body
□ Function-level authorization: role from session, not from request header
□ Every admin API verifies admin role server-side
□ Sensitive operations require re-authentication (password change, delete account)
□ IDOR test: GET /api/resource/[other-user-id] returns 403/404
□ Mass assignment prevented: only allowed fields are updated
□ Direct object references use UUIDs, not sequential integers
```

### 8.3 Input Validation & Injection Prevention

```
□ All inputs validated server-side with typed schemas (Zod / Joi / Yup)
□ Client-side validation is supplementary, never the only layer
□ SQL injection: parameterized queries or ORM (never string concatenation)
□ XSS: no dangerouslySetInnerHTML except for sanitized, controlled content
□ XSS: output encoding applied for any user-generated content displayed as HTML
□ SSRF: external URLs validated against allowlist before fetch
□ Command injection: no shell exec with user input
□ Path traversal (CWE-22): file paths sanitized, no "../" allowed
□ Integer overflow: numeric inputs have min/max validation
□ Type coercion: explicit type checking (=== not ==)
```

### 8.4 File Upload Security

```
□ File type validated by MIME type + magic bytes (not just extension)
□ Extension allowlist enforced (whitelist, not blacklist)
□ Maximum file size enforced server-side
□ Files stored outside web root (S3/CDN, not /public/)
□ File names sanitized (no ../../../etc/passwd)
□ Malware scanning if user-generated files (ClamAV or cloud scanning)
□ Image processing in isolated worker (SSRF via SVG/EXIF)
□ Archive bombs prevented (max extracted size check)
□ Content-Disposition: attachment for downloaded files
```

### 8.5 Security Headers Checklist

```
□ Content-Security-Policy (CSP) — strict policy, no unsafe-eval in prod
□ Strict-Transport-Security (HSTS) — max-age ≥ 31536000, includeSubDomains
□ X-Frame-Options: DENY (or SAMEORIGIN if iframes needed)
□ X-Content-Type-Options: nosniff
□ Referrer-Policy: strict-origin-when-cross-origin
□ Permissions-Policy: camera=(), microphone=(), geolocation=()
□ Cross-Origin-Resource-Policy: same-origin
□ Cross-Origin-Opener-Policy: same-origin
□ X-DNS-Prefetch-Control: off (optional, reduces info leakage)
□ Server / X-Powered-By headers suppressed
□ Cache-Control: no-store for sensitive endpoints (auth, health)
```

### 8.6 CSRF Protection

```
□ State-changing operations (POST/PUT/PATCH/DELETE) require CSRF protection
□ SameSite=Strict or SameSite=Lax on session cookies
□ Origin/Referer header validation for cookie-auth mutations
□ Bearer token auth is CSRF-exempt (correct — tokens are not sent automatically)
□ Double-submit cookie pattern or synchronizer token pattern implemented
```

### 8.7 Rate Limiting & Abuse Prevention

```
□ Authentication endpoints: ≤ 5 attempts/min per IP
□ Account creation: ≤ 3/min per IP
□ API endpoints: appropriate limits per route group
□ Rate limits are distributed (Redis), not in-memory per instance
□ 429 response includes Retry-After header
□ Bot detection (User-Agent blacklist + behavioral patterns)
□ CAPTCHA on high-risk forms (login, registration, password reset)
□ Account lockout after N failed attempts (with unlock mechanism)
```

### 8.8 Secrets & Environment Variables

```
□ No secrets committed in git (check: git log -p | grep -i "secret\|key\|password\|token")
□ .env* files in .gitignore
□ Secrets injected via CI/CD environment, not build args
□ Service-role / admin keys only on server-side (never in NEXT_PUBLIC_* variables)
□ Different secrets for dev / staging / production
□ Secret rotation plan documented
□ No secrets in error messages or logs
□ No secrets in client-side bundle (verify with: npx next bundle-analyzer)
```

### 8.9 Debug & Development Routes

```
□ No /api/debug, /api/diagnostic, /api/dev-only routes in production
□ Test/seed routes disabled in production (NODE_ENV check)
□ Debug logging disabled in production
□ Error messages generic in production (no stack traces to clients)
□ Admin-only diagnostic endpoints require admin auth
□ Health endpoint exposes no sensitive data (no env vars, no internal IPs)
```

### 8.10 Security Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Auth & session | 25 pts | All routes protected, no bypass found |
| Authorization | 25 pts | IDOR tests pass, role checks enforced |
| Input validation | 20 pts | Server-side validation on all inputs |
| Security headers | 15 pts | All 9 critical headers present and correct |
| Secrets hygiene | 15 pts | No secrets in client bundle or git history |

---

## 9. Database Security

### 9.1 Row-Level Security (Supabase / PostgreSQL)

```
□ RLS enabled on all tables containing user data
□ Policies verified: users can only read/write their own rows
□ No policy gaps: tables without any policy default to DENY
□ Admin queries use service-role client (bypasses RLS by design — isolated)
□ Anon key never used for admin operations
□ RLS policies versioned in repository (supabase/migrations/ or schema.sql)
□ CI runs supabase db diff --check to catch accidental policy changes
□ Soft deletes or audit tables protected by RLS
□ Function security: SECURITY DEFINER vs INVOKER documented per function
□ Scheduled jobs (pg_cron) run with appropriate role
```

### 9.2 Least-Privilege Roles

```
□ Application uses anon role for public reads
□ Application uses authenticated role for user operations
□ Service-role used only for admin server-side operations
□ Database users have minimal permissions (no superuser in app code)
□ Read replicas used for analytics/reporting (no write on replica)
□ Separate database users for migrations vs runtime
```

### 9.3 Data Validation at DB Level

```
□ NOT NULL constraints where required
□ CHECK constraints for enum-like fields
□ Foreign key constraints prevent orphaned records
□ Unique constraints enforce business uniqueness
□ Triggers validate complex business rules
□ Column-level type validation (proper types, not TEXT for everything)
```

### 9.4 Migrations & Schema Management

```
□ All schema changes are in versioned migration files
□ Migrations are applied in CI before tests
□ Rollback scripts exist for destructive changes
□ Schema dump committed and kept current
□ No manual DDL in production (all changes via migration)
□ Migration testing on staging before production
```

### 9.5 Database Security Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| RLS coverage | 35 pts | RLS on all user tables, policies verified |
| Least privilege | 25 pts | No service-role in client code |
| Schema versioning | 20 pts | Migrations committed, CI-applied |
| Data integrity | 20 pts | Constraints, triggers, validation |

---

## 10. Front-End Performance

### 10.1 Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5s – 4.0s | > 4.0s |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200 – 500ms | > 500ms |
| **TTFB** (Time to First Byte) | ≤ 800ms | 800ms – 1800ms | > 1800ms |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8s – 3.0s | > 3.0s |

### 10.2 Bundle Size Checklist

```
□ Total First Load JS < 300 KB gzipped
□ Main page bundle < 100 KB gzipped
□ Third-party scripts audited and deferred/lazy-loaded
□ Tree-shaking verified (no entire lodash/moment imported)
□ optimizePackageImports configured for icon libraries
□ Code splitting: dynamic() for heavy components (charts, editors, maps)
□ No duplicate dependencies (check with npm ls --all | grep -E "dupe|deduped")
□ Route-level code splitting active (Next.js App Router default)
□ Fonts: preconnect + display=swap or display=optional
```

### 10.3 Image Optimization Checklist

```
□ All images use <Image> (Next.js) or equivalent framework component
□ width/height attributes on all images (prevent CLS)
□ priority/fetchpriority="high" on LCP hero image
□ Lazy loading on below-fold images (loading="lazy")
□ Responsive sizes (sizes attribute) on variable-width images
□ Next-gen formats: WebP/AVIF served (not JPEG/PNG for photos)
□ Aspect ratio container (aspect-[4/3]) instead of fixed height (h-44)
□ Cache-Control on image CDN: max-age=2592000 (30 days)
□ blur placeholder on large images (blurDataURL or blur prop)
□ No CLS from dynamically-loaded images (skeleton placeholders)
```

### 10.4 CLS Prevention Checklist

```
□ Fonts don't cause layout shift (font-display: swap or fallback metrics)
□ Ads/embeds have reserved space (aspect-ratio or min-height)
□ Dynamic content inserts above fold: only prepend, never insert mid-page
□ Scrollbar gutter stable: html { scrollbar-gutter: stable; }
□ Modal open: overflow:hidden applied via CSS class, not JS style mutation
□ Skeleton loaders match final layout dimensions exactly
□ No layout-triggering CSS properties in animations (no width/height transitions)
□ transformX/Y/scale for animations (GPU-composited, no layout)
```

### 10.5 Loading States Checklist

```
□ Every page with async data has a loading.tsx skeleton
□ Every async component has a Suspense fallback
□ Skeleton dimensions match the actual content (prevent CLS on hydration)
□ animate-pulse or animate-shimmer on skeletons
□ Error boundaries around data-fetching components
□ Optimistic updates for user actions (post, like, reply)
□ No full-page spinner — progressive loading preferred
```

### 10.6 Performance Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Core Web Vitals | 35 pts | All 3 green = 35; 2 green = 20; 1 = 10 |
| Bundle size | 25 pts | < 200KB = 25; < 300KB = 15; > 300KB = 5 |
| Images | 20 pts | All optimized = 20; partial = 10; none = 0 |
| Loading states | 20 pts | All pages covered = 20; < 80% = 10; < 50% = 0 |

---

## 11. Backend & API Performance

### 11.1 N+1 Query Detection

```
□ No N+1 queries: use joins or batch loading (Promise.all)
□ Pagination on all list endpoints (no SELECT * FROM table)
□ Database indexes on all JOIN and WHERE column combinations
□ Query plans reviewed for slow queries (EXPLAIN ANALYZE)
□ Connection pooling configured (PgBouncer or Supabase connection pool)
□ Prepared statements or parameterized queries (security + performance)
```

### 11.2 API Response Size

```
□ API responses return only needed fields (no SELECT *)
□ Pagination: cursor-based for large datasets, offset for small
□ Compression: gzip/br enabled on API responses
□ Response caching: Cache-Control headers on GET endpoints
□ ISR/SSG for mostly-static content (Next.js revalidate)
□ Edge caching configured where appropriate
```

### 11.3 Timeout & Circuit Breaker

```
□ All external API calls have explicit timeout (≤ 5s for user-facing, ≤ 30s for background)
□ Database queries have timeout (≤ 3s for health checks, ≤ 10s for complex queries)
□ Graceful degradation: app works in degraded mode when non-critical services fail
□ Circuit breaker pattern for frequently-failing external dependencies
□ Queue system for heavy background tasks (email, image processing, reports)
□ Dead letter queue for failed queue items
```

### 11.4 Backend Performance Checklist

```bash
# Check for SELECT * (often signals N+1 or over-fetching)
grep -rn "select\(\*\)\|\.select('*')\|\.from\|supabase\.from" src/app/api --include="*.ts" | grep -v test

# Check for missing pagination
grep -rn "\.from\|supabase\.from" src/app/api --include="*.ts" | grep -v "\.limit\|\.range\|\.count"

# Check timeouts on fetch
grep -rn "fetch(" src --include="*.ts" --include="*.tsx" | grep -v "signal\|AbortController\|timeout" | head -20
```

---

## 12. SEO Technical Audit

### 12.1 Metadata Coverage

```
□ Root layout has metadataBase, title template, description, OG, Twitter card
□ Every public page has unique title (< 60 chars)
□ Every public page has unique description (120-160 chars)
□ Dynamic pages use generateMetadata (not static metadata export)
□ OG image (1200x630) exists for all shareable pages
□ canonical URL set on all pages (prevents duplicate content)
□ Form/creation pages have robots: { index: false, follow: false }
□ Admin/dashboard pages have robots: { index: false, follow: false }
□ Auth pages have robots: { index: false, follow: false }
```

### 12.2 Sitemap

```
□ /sitemap.xml is accessible and returns valid XML
□ Priority scores reflect actual page importance (home=1.0, legal=0.3)
□ changefreq reflects actual update frequency
□ Only public pages in sitemap (no auth/admin/dashboard)
□ Dynamic pages (articles, products, profiles) included with correct URLs
□ lastmod provided for dynamic pages (from database updatedAt)
□ Sitemap revalidation matches content update frequency
□ Split sitemap for > 50,000 URLs (sitemap index)
□ Images included in sitemap if image SEO is important
```

### 12.3 Robots.txt

```
□ /robots.txt is accessible and valid
□ User-agent: * block applies to generic crawlers
□ Disallow: /admin/, /dashboard/, /api/, /auth/
□ Allow: / (or explicit allowlist)
□ Sitemap: [URL] referenced
□ AI crawlers blocked if desired: GPTBot, ChatGPT-User, Google-Extended, CCBot
□ Crawl-delay if server is resource-constrained
□ Host directive set to production URL (prevents staging indexation)
```

### 12.4 Structured Data (JSON-LD)

```
□ Schema.org types appropriate to content (Product, Article, FAQPage, LocalBusiness)
□ Required fields present for each schema type
□ No XSS via user content in JSON-LD (safeJsonLd() or equivalent)
□ Validation: https://validator.schema.org/
□ Rich results eligibility verified: https://search.google.com/test/rich-results
□ BreadcrumbList on all detail pages
□ Organization/LocalBusiness on homepage
□ SearchAction on homepage (if search functionality exists)
```

### 12.5 Core SEO Checklist

```
□ All public pages render complete HTML server-side (SSR or SSG, not CSR-only)
□ JavaScript-rendered content is not SEO-critical without SSR
□ No redirect chains (A → B → C) — max 1 redirect
□ 404 page returns HTTP 404 (not 200 with "not found" content)
□ Soft-404 detection: thin content pages excluded from sitemap
□ No www vs non-www duplication (canonical or redirect)
□ HTTPS enforced (no HTTP content on HTTPS pages)
□ Page speed: LCP < 2.5s (Google ranking factor)
```

### 12.6 SEO Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Metadata coverage | 30 pts | All public pages = 30; > 80% = 20; < 80% = 5 |
| Sitemap accuracy | 25 pts | Valid + all public pages = 25; partial = 15 |
| Structured data | 25 pts | Appropriate schemas, validated = 25 |
| Robots/crawl config | 20 pts | Correct disallow/allow, AI blocking = 20 |

---

## 13. Accessibility & UX

### 13.1 Keyboard Navigation

```
□ Tab order follows visual reading order
□ Skip-to-content link at start of page
□ All interactive elements reachable by keyboard (Tab)
□ Enter/Space activate buttons and links
□ Arrow keys navigate dropdowns and menus
□ Escape closes modals, dropdowns, and drawers
□ Focus trap inside open modals (focus doesn't escape to background)
□ Focus restored to trigger element after modal closes
□ No keyboard traps (cannot get stuck in a component)
```

### 13.2 ARIA & Semantic HTML

```
□ Semantic HTML: <nav>, <main>, <header>, <footer>, <section>, <article>
□ Headings form a logical hierarchy (h1 → h2 → h3, no skipping)
□ Images have descriptive alt text (or alt="" for decorative)
□ Form inputs have associated <label> (not just placeholder)
□ Error messages are associated with inputs (aria-describedby)
□ Buttons have accessible names (text or aria-label)
□ Icon-only buttons have aria-label
□ Modals have role="dialog", aria-modal="true", aria-labelledby
□ Loading states announced (role="status", aria-live="polite")
□ Toast notifications are accessible (role="alert", aria-live="assertive")
```

### 13.3 Color & Contrast

```
□ Normal text: contrast ratio ≥ 4.5:1 (WCAG AA)
□ Large text (18pt+ or 14pt+ bold): contrast ratio ≥ 3:1
□ UI components (buttons, inputs): contrast ratio ≥ 3:1
□ Disabled state conveyed by more than color alone
□ Error state conveyed by more than color alone (icon + text)
□ Focus indicators visible with ≥ 3:1 contrast
□ Check: https://webaim.org/resources/contrastchecker/
```

### 13.4 Responsive Design

```
□ Tested at 320px (iPhone SE), 375px, 390px, 768px, 1024px, 1280px, 1440px
□ No horizontal scroll at any breakpoint
□ Touch targets ≥ 44x44px (minimum, 48x48px recommended)
□ Tap targets spaced ≥ 8px apart
□ Text readable without zooming (≥ 16px base)
□ Images scale with viewport (not overflow)
□ Navigation usable on touch devices
□ Forms usable with virtual keyboard (no viewport shift)
```

### 13.5 UX / Product Ergonomics

```
□ Value proposition clear on homepage (≤ 5 second comprehension)
□ Call-to-action buttons prominent and clear
□ Loading feedback on all user-initiated actions (spinner, skeleton, progress)
□ Error messages are human-readable (not "Error 500" or technical stack trace)
□ Success feedback after form submission
□ Confirmation dialog for destructive actions (delete, deactivate)
□ Form validation errors shown inline (not only on submit)
□ Empty states have actionable guidance (not just "Nothing here")
□ Breadcrumbs or back navigation on detail pages
□ Search works and returns relevant results
```

### 13.6 Accessibility Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Keyboard navigation | 30 pts | Full keyboard access, focus management = 30 |
| ARIA & semantics | 30 pts | All interactive elements labeled = 30 |
| Color contrast | 20 pts | All text passes WCAG AA = 20 |
| Responsive design | 20 pts | All breakpoints tested = 20 |

---

## 14. Error Handling

### 14.1 Global Error Handling

```
□ global-error.tsx exists (React error boundary for root layout errors)
□ app/error.tsx exists (error boundary for route-level errors)
□ 404 (not-found.tsx) returns styled, helpful page with navigation
□ 500 errors show generic message, not technical details
□ Error pages have correct HTTP status codes (not 200)
□ Error boundaries log to error monitoring (Sentry / Datadog)
□ All API routes have try/catch with appropriate HTTP status codes
□ Unhandled promise rejections monitored and alerted
```

### 14.2 API Error Consistency

```
□ Consistent error response format:
   { "error": "Human message", "code": "MACHINE_CODE", "details": {} }
□ HTTP status codes used correctly:
   400 — validation error
   401 — not authenticated
   403 — not authorized
   404 — resource not found
   409 — conflict (duplicate resource)
   422 — unprocessable entity
   429 — rate limited
   500 — internal server error
□ Error messages don't expose: stack traces, file paths, SQL queries, env vars
□ Validation errors return field-level details (which field, why)
□ Timeout errors return 504 (not 500)
```

### 14.3 Client-Side Error Handling

```
□ Fetch errors caught and handled (network failure, timeout)
□ User-facing error messages are actionable ("Try again", "Contact support")
□ Offline state detected and communicated to user
□ Form submission errors displayed inline (not just console.error)
□ No silent failures (errors always surfaced somewhere — UI or monitoring)
□ Retry logic for transient errors (network, rate limit)
```

### 14.4 Logging

```
□ console.log removed from production code (or stripped by build)
□ console.warn/error used appropriately (not for debug statements)
□ Structured logging (JSON) for production (easy to parse by log aggregators)
□ Log levels: ERROR (monitoring), WARN (investigate), INFO (audit), DEBUG (dev only)
□ Sensitive data never logged (passwords, tokens, full credit card numbers)
□ Request IDs included in logs (correlation across services)
□ Log retention policy defined and implemented
```

---

## 15. Test Coverage

### 15.1 Test Pyramid Checklist

```
□ Unit tests: pure functions, utilities, validators (fast, many)
□ Integration tests: API routes, database queries, service logic (medium)
□ Component tests: UI components with user interaction (medium)
□ E2E tests: critical user flows (slow, few, high value)
```

### 15.2 Coverage Requirements by Area

| Area | Minimum Coverage | Priority |
|---|---|---|
| Business logic functions | 90% | Critical |
| Auth/authorization code | 100% | Critical |
| API route handlers | 80% | High |
| Validation schemas | 90% | High |
| Error handling paths | 80% | High |
| Data transformation | 85% | High |
| UI components (happy path) | 70% | Medium |
| UI components (error states) | 60% | Medium |
| Admin functions | 95% | Critical |

### 15.3 Security-Specific Tests

```
□ Auth bypass test: request protected route without token → 401
□ Auth bypass test: request protected route with expired token → 401
□ IDOR test: user A requests user B's resource → 403/404
□ Role escalation test: regular user calls admin API → 403
□ Rate limit test: exceed limit → 429 with Retry-After
□ Validation test: malformed input → 400 with clear error
□ Upload test: file with wrong extension rejected
□ Upload test: oversized file rejected
□ XSS test: user input with <script> tags stored safely
□ CSRF test: state-changing request without CSRF protection → 403
```

### 15.4 Database/RLS Tests

```
□ User A cannot read user B's private records
□ Unauthenticated user cannot read authenticated-only records
□ Admin can read all records via service-role client
□ Insert with wrong user_id rejected by RLS
□ Update to another user's record rejected by RLS
□ Soft-delete policy verified (deleted records invisible to non-admin)
```

### 15.5 CI Test Execution

```bash
# Full CI command
npm run typecheck && npm run lint && npm run test

# Coverage report (check uncovered API routes)
npm run test:coverage

# Watch for regressions
npm run test:watch

# Specific suite
npx vitest run src/app/api/__tests__/
```

### 15.6 Test Coverage Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Auth/permission tests | 30 pts | 100% auth code tested = 30; < 80% = 10 |
| Business logic tests | 25 pts | > 85% coverage = 25; > 70% = 15 |
| API route tests | 25 pts | > 80% routes tested = 25; > 60% = 15 |
| E2E / smoke tests | 20 pts | Critical flows covered = 20; partial = 10 |

---

## 16. Observability

### 16.1 Error Monitoring (Sentry / Datadog / etc.)

```
□ Error monitoring SDK configured and sending events
□ DSN set in environment (not committed)
□ Source maps uploaded at build time (stack traces are readable)
□ Source maps deleted from public bundle after upload
□ beforeSend filter removes PII (emails, passwords, tokens from URLs)
□ User ID set without PII (use UUID, not email)
□ Release version set (git commit SHA or semver tag)
□ Environment tag set (production / staging / development)
□ Sampling rate appropriate (not 100% in production — use 10-20%)
□ Session replay: maskAllInputs: true, maskAllText evaluated
□ Alert rules configured for error spike detection
□ Performance monitoring: transactions and spans capturing key operations
□ Navigation tracing: onRouterTransitionStart exported (Next.js + Sentry v10+)
```

### 16.2 Logging Infrastructure

```
□ Structured logs (JSON) sent to log aggregation (Vercel, Datadog, Loki)
□ Log levels appropriate (no debug logs in production)
□ Request/response logged for API errors (not for all requests — avoid PII)
□ Database slow query log configured (threshold: 1s)
□ Rate limit events logged (for abuse analysis)
□ Auth events logged (login, logout, failed attempts, role changes)
□ Log retention policy: ≥ 90 days for production
```

### 16.3 Health Check Endpoint

```
□ GET /api/health exists and is publicly accessible
□ Returns JSON: { status, version, env, timestamp, uptime_s, checks[] }
□ Checks include: database connectivity, cache connectivity (Redis), external APIs
□ Returns 200 with status:"ok" when all checks pass
□ Returns 200 with status:"degraded" when non-critical checks fail
□ Returns 503 when critical checks fail (database unavailable)
□ Response includes no sensitive data (no env vars, no internal IPs)
□ Cache-Control: no-store on health endpoint
□ Latency < 3s (database check has timeout)
□ Monitored by external uptime service (UptimeRobot, Better Uptime, Pingdom)
```

### 16.4 Alerting

```
□ Alert: error rate > 1% over 5 minutes → PagerDuty / Slack
□ Alert: P95 latency > 3s over 5 minutes → Slack
□ Alert: health endpoint returning degraded → immediate Slack
□ Alert: health endpoint returning error/503 → PagerDuty (critical)
□ Alert: database connection pool > 80% utilized
□ Alert: deployment failure → Slack
□ Alert: SSL certificate expiry < 30 days
□ On-call rotation documented and tested
```

### 16.5 Observability Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Error monitoring | 35 pts | Sentry configured, source maps, sampling = 35 |
| Health endpoint | 25 pts | Exists, checks DB, no sensitive data = 25 |
| Logging | 20 pts | Structured, no PII, retention policy = 20 |
| Alerting | 20 pts | Error rate, latency, health alerts configured = 20 |

---

## 17. DevOps & CI/CD

### 17.1 Build Process

```
□ Build succeeds with zero warnings in production mode
□ Install command uses npm ci (not npm install)
□ Build is reproducible (same input → same output)
□ Build artifacts are not committed to git
□ Environment variables are validated at build time for NEXT_PUBLIC_*
□ Source maps generated and uploaded to error monitoring
□ Source maps not served publicly (only uploaded to Sentry)
□ Build time < 5 minutes (or justified for large monorepo)
□ Output directory correct (.next, dist, out)
```

### 17.2 Environment Management

```
□ Separate environments: development / staging (preview) / production
□ Environment-specific configs (.env.development, .env.production)
□ All required env vars documented in .env.example (no values, only keys)
□ Missing env vars cause startup failure (not silent undefined)
□ Secrets differ between staging and production
□ NEXT_PUBLIC_SITE_URL set correctly per environment
□ Preview deployments use staging database (not production)
□ Environment verified: console.log(process.env.NODE_ENV) matches expectations
```

### 17.3 CI/CD Pipeline Checklist

```
□ CI pipeline runs on every PR (not just on merge)
□ Pipeline steps in order: install → typecheck → lint → test → build
□ Pipeline fails fast on first step failure
□ Pipeline runs in parallel where safe (typecheck || lint, then test)
□ Secrets injected from CI environment, not from committed files
□ Dependency cache configured (npm cache between runs)
□ Build artifacts deployed automatically on main branch merge
□ Preview deployment created automatically for each PR
□ Deployment URL posted as PR comment
□ Production deployment requires explicit approval (not auto on push)
```

### 17.4 Rollback Strategy

```
□ Instant rollback available: Vercel instant rollback or blue/green deployment
□ Rollback procedure documented (runbook, < 5 minutes to execute)
□ Database migrations are backward-compatible (no breaking migrations without 2-phase deploy)
□ Feature flags can disable new features without redeployment
□ Rollback tested at least once (not just documented)
□ Post-rollback verification steps documented
□ Database backup taken before each production deployment
```

### 17.5 Dependency Management

```
□ npm audit --audit-level=high passes (no high/critical vulnerabilities)
□ Dependency update strategy documented (Renovate, Dependabot, or manual monthly)
□ Major version upgrades planned and tested in staging first
□ No packages with known critical vulnerabilities (check: snyk test)
□ Lock file (package-lock.json / yarn.lock) committed and up-to-date
□ No version ranges in production dependencies (exact or caret with lockfile)
```

### 17.6 DevOps Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| CI pipeline | 30 pts | All gates present, runs on PR = 30 |
| Environment management | 25 pts | Separate envs, validated vars = 25 |
| Rollback strategy | 25 pts | Documented + tested procedure = 25 |
| Dependency hygiene | 20 pts | No high vulns, lock file committed = 20 |

---

## 18. Data Privacy & Compliance (GDPR)

### 18.1 Data Inventory

```
□ Personal data inventory documented:
   - What data is collected (name, email, IP, behavior)
   - Why it is collected (legal basis: consent / contract / legitimate interest)
   - Where it is stored (Supabase, Sentry, Redis, analytics)
   - How long it is retained (retention schedule)
   - Who has access (developers, admins, third parties)
   - Where it is transferred (Supabase EU region, Sentry US/EU, Vercel CDG1)
```

### 18.2 Consent Management

```
□ Explicit consent obtained for non-essential data collection
□ Consent checkboxes pre-unchecked (no pre-ticked consent)
□ Cookie banner for analytics/tracking cookies
□ Session replay (Sentry Replay) requires or discloses consent
□ Consent can be withdrawn (unsubscribe, delete account)
□ Consent records stored (who, when, what they consented to)
□ Privacy policy linked at signup and in footer
□ Terms of service linked at signup
□ Age verification if content requires it (COPPA / child protection)
```

### 18.3 Data Subject Rights

```
□ Right to access: users can export their data
□ Right to rectification: users can update their profile data
□ Right to erasure: users can delete their account (all data removed/anonymized)
□ Right to portability: data export in machine-readable format (JSON/CSV)
□ Right to object: users can opt out of processing
□ DPO contact information published in privacy policy
□ Response time commitment: 30 days (GDPR requirement)
```

### 18.4 Legal Pages Checklist

```
□ Privacy Policy (/confidentialite or /privacy-policy):
   - Last updated date (static, not dynamic)
   - DPO name and contact (email or form)
   - Data categories collected
   - Legal basis for each processing activity
   - Data retention periods
   - Third-party processors listed
   - International data transfers documented
   - User rights and how to exercise them
   - Supervisory authority (CNIL in France)

□ Terms of Service (/cgu):
   - Last updated date (static)
   - Acceptance mechanism documented
   - Prohibited uses
   - Content ownership and licensing
   - Limitation of liability
   - Governing law and jurisdiction
   - Account termination conditions

□ Legal Notice (/mentions-legales):
   - Publisher name and address
   - Hosting provider details
   - Editor/director information (French law requirement)
   - VAT number if applicable
```

### 18.5 Technical Compliance

```
□ Sentry: sendDefaultPii: false
□ Sentry Replay: maskAllInputs: true
□ No email addresses in error logs
□ No passwords (even hashed) in logs or monitoring
□ Database backups encrypted at rest
□ Data in transit: HTTPS enforced (HSTS)
□ User IDs in analytics are pseudonymous (UUID, not email)
□ IP addresses not logged beyond rate limiting necessity
□ Data processing agreements (DPA) signed with Sentry, Supabase, Vercel, etc.
```

### 18.6 GDPR Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Legal pages completeness | 30 pts | All 3 pages complete with required info = 30 |
| Consent management | 30 pts | Explicit consent, revocable, recorded = 30 |
| Data subject rights | 25 pts | All rights exercisable = 25 |
| Technical compliance | 15 pts | PII masked in monitoring, HTTPS = 15 |

---

## 19. Resilience & Incident Management

### 19.1 Backup Strategy

```
□ Database automated backups: daily, 30-day retention minimum
□ Database point-in-time recovery (PITR): ≥ 7 days
□ Backup restoration tested (not just configured)
□ File storage backups (user uploads)
□ Configuration backup (env vars, secrets in a vault)
□ Backup offsite / cross-region storage
□ Recovery time objective (RTO) defined and tested
□ Recovery point objective (RPO) defined and communicated
```

### 19.2 Incident Runbooks

Each critical component needs a runbook:

```
□ Database outage runbook:
   1. Identify: check /api/health → supabase check failing
   2. Escalate: alert on-call DBA/DevOps
   3. Mitigate: enable maintenance page, disable DB-dependent features
   4. Recover: Supabase dashboard → check connection limits, restart if needed
   5. Verify: /api/health back to "ok"
   6. Post-mortem: within 48h

□ Deployment failure runbook:
   1. Identify: build failed in CI / deployment health check failed
   2. Rollback: Vercel instant rollback to previous deployment
   3. Investigate: check build logs, identify breaking change
   4. Fix: revert commit or apply hotfix
   5. Redeploy: with fix

□ Security incident runbook:
   1. Identify: unusual auth patterns, data access spike
   2. Contain: rotate compromised keys, disable affected accounts
   3. Eradicate: patch vulnerability, revoke sessions
   4. Recover: verify integrity, restore from backup if needed
   5. Notify: affected users within 72h (GDPR requirement)
   6. Document: incident report, regulatory notification if required
```

### 19.3 Admin Audit Logs

```
□ All admin actions logged: who, what, when, what changed
□ User management actions logged (role changes, bans, deletions)
□ Content moderation actions logged
□ Log entries are immutable (append-only)
□ Audit logs retained ≥ 1 year
□ Audit log access restricted to super-admin
□ Suspicious pattern alerts (admin accessing many records rapidly)
```

### 19.4 Feature Flags & Progressive Rollout

```
□ Feature flags in place for high-risk features
□ Flags can be toggled without redeployment
□ Canary deployment possible (% of traffic to new version)
□ Kill switch for new features (disable instantly if problems detected)
□ Dark launch possible (code deployed but not user-visible)
```

### 19.5 Resilience Scoring Grid

| Area | Maximum | Criteria |
|---|---|---|
| Backup strategy | 35 pts | Automated, tested, offsite = 35; partial = 15 |
| Incident runbooks | 35 pts | DB, deployment, security runbooks = 35 |
| Audit logs | 20 pts | Admin actions logged, immutable = 20 |
| Feature flags | 10 pts | Kill switch available = 10 |

---

## 20. Issue Classification P0–P4

### P0 — Critical Blocker (STOP EVERYTHING)

**Definition:** Immediate risk of data loss, security breach, complete service failure, or legal violation.

**Response:** Fix before any deployment. No exceptions.

| Example | Category |
|---|---|
| Auth bypass: unauthenticated access to user data | Security |
| Service-role key exposed in client bundle | Security |
| Build fails in CI | DevOps |
| All tests failing | Testing |
| Database credentials committed to git | Security |
| PII exposed in public API response | GDPR |
| XSS vulnerability in production | Security |
| SSRF vulnerability in file upload | Security |
| Admin route accessible without auth | Security |

### P1 — Major Risk (Fix Before Launch)

**Definition:** Significant impact on security, performance, UX, or reliability. Not immediately exploitable but likely to cause production incidents.

**Response:** Fix within 24 hours, before Go-Live.

| Example | Category |
|---|---|
| document.body.style.overflow causing reflows + iOS bugs | Performance |
| Missing loading.tsx skeletons causing blank screens | UX / Performance |
| onRouterTransitionStart missing (Sentry navigation gaps) | Observability |
| No health endpoint for uptime monitoring | Observability |
| Rate limiting in-memory only (not distributed) | Security |
| No error boundary on critical user flows | Error Handling |
| Server-side validation missing for key form | Security |

### P2 — Important (Fix Within 1 Week)

**Definition:** Impacts code quality, maintainability, SEO, or compliance. No immediate user impact but creates technical debt or risk.

**Response:** Fix within 1 week of launch.

| Example | Category |
|---|---|
| ESLint rules set to warn instead of error | Code Quality |
| Form pages missing robots: noindex | SEO |
| ListingCard fixed height instead of aspect-ratio | Performance |
| Non-null assertions (!) on env vars | Code Quality |
| Dynamic date in GDPR pages (must be static) | Compliance |
| Sentry Replay maskAllInputs not verified | GDPR |
| RLS policies not versioned in repository | Database |
| Missing DPO contact in privacy policy | GDPR |
| API timeout not set on external calls | Reliability |

### P3 — Recommended Improvement (Backlog)

**Definition:** Good practice that improves long-term maintainability, monitoring, or quality. No immediate risk.

**Response:** Schedule in next sprint.

| Example | Category |
|---|---|
| next lint deprecated → migrate to ESLint CLI | Architecture |
| Coverage limited to API routes (extend to hooks/lib) | Testing |
| Token optional in test-sentry route | Security |
| Admin guard bypass not tested | Testing |
| Legal pages missing data retention details | Compliance |
| No E2E tests (Playwright) | Testing |
| Missing loading.tsx on low-traffic pages | Performance |
| CSP nonce not yet migrated to Level 3 style-src-elem | Security |

### P4 — Technical Debt / Cosmetic (Future Consideration)

**Definition:** Minor quality issues that don't affect production stability or security.

**Response:** Address in periodic tech debt sprints.

| Example | Category |
|---|---|
| any types in auto-generated Supabase types | Code Quality |
| instrumentation-client.ts at root instead of src/ | Architecture |
| Framework polyfills (UNFIXABLE in Next.js) | Performance |
| Rollback not automated (Vercel manual rollback available) | DevOps |
| No Playwright E2E tests yet | Testing |
| 10 occurrences of transition-all vs transition-colors | Performance |

---

## 21. Scoring System

### 21.1 Domain Scores

| Domain | Weight | Score Range | Scoring Criteria |
|---|---|---|---|
| Architecture | 8% | 0-100 | See Section 6.3 |
| Code Quality | 10% | 0-100 | See Section 7.4 |
| Application Security | 20% | 0-100 | See Section 8.10 |
| Database Security | 12% | 0-100 | See Section 9.5 |
| Front-End Performance | 12% | 0-100 | See Section 10.6 |
| Backend Performance | 5% | 0-100 | Weighted sub-scores |
| SEO Technical | 8% | 0-100 | See Section 12.6 |
| Accessibility & UX | 8% | 0-100 | See Section 13.6 |
| Error Handling | 4% | 0-100 | Sub-scores |
| Test Coverage | 5% | 0-100 | See Section 15.6 |
| Observability | 4% | 0-100 | See Section 16.5 |
| DevOps & CI/CD | 4% | 0-100 | See Section 17.6 |

> **Note:** Security domains (Application + Database) carry 32% combined weight because a single security vulnerability can invalidate all other positive aspects of the audit.

### 21.2 Global Score Calculation

```
Global Score = Σ(domain_score × domain_weight)

Penalty multipliers:
  × 0.5  if any P0 issue exists (critical blocker)
  × 0.8  if any P1 issue exists (major risk unresolved)
  × 0.95 if > 5 P2 issues exist
```

### 21.3 Verdict Categories

| Global Score | Verdict | Description |
|---|---|---|
| **< 50** | 🔴 **NO GO** | Critical issues must be resolved |
| **50 – 69** | 🟠 **NO GO** | Too many risks for production launch |
| **70 – 79** | 🟡 **GO with reservations** | Launch possible with a remediation plan |
| **80 – 89** | 🟢 **GO** | Production-ready with minor issues |
| **90 – 100** | ✅ **GO solid** | Excellent quality, ready for scale |

### 21.4 Score Adjustment for Critical Findings

Regardless of the numerical score, apply these overrides:

| Condition | Override |
|---|---|
| Any P0 finding | **NO GO** (score capped at 49) |
| Build fails | **NO GO** |
| > 3 P1 findings unresolved | **GO with reservations** (max 79) |
| 0 test coverage on auth code | **Score -20 points** |
| No error monitoring configured | **Score -10 points** |
| GDPR pages missing | **Score -10 points** |
| Service-role in client bundle | **NO GO** |

---

## 22. GO / NO-GO Decision Rules

### 22.1 Automatic NO-GO Conditions

**Any single one of these triggers NO-GO:**

```
❌ Build (npm run build) fails
❌ TypeScript: npx tsc --noEmit returns errors
❌ Test suite: any test failing
❌ Service-role / admin key accessible in browser bundle
❌ Any unauthenticated route accessing private data (IDOR)
❌ Admin routes accessible without authentication
❌ CSP header absent in production
❌ Secrets committed in git repository
❌ Database without RLS on user data tables
❌ GDPR: no consent mechanism for personal data collection
❌ GDPR: no privacy policy published
❌ Application completely unusable on mobile (viewport issues)
❌ Payment processing without HTTPS (if applicable)
```

### 22.2 GO with Reservations Conditions

**These conditions allow launch with a committed remediation timeline:**

```
⚠️ P1 issues present but not exploitable immediately
⚠️ Missing loading states on non-critical pages
⚠️ ESLint warnings > 0 but no errors
⚠️ Test coverage < 70% on non-auth code
⚠️ Legal pages exist but incomplete (missing DPO, retention periods)
⚠️ No E2E tests (but unit + integration tests pass)
⚠️ Rate limiting in-memory (not distributed) — acceptable for low traffic
⚠️ No Playwright tests (post-launch backlog planned)
⚠️ GDPR compliance partial (pages exist, some details missing)
```

**For each reservation, require:**
- Written commitment to fix within X days
- Named owner
- Monitoring in place to detect if the issue causes an incident

### 22.3 GO Conditions

**All of the following must be true:**

```
✅ Build succeeds (npm run build → 0 errors)
✅ TypeScript: 0 errors (npx tsc --noEmit)
✅ ESLint: 0 warnings, 0 errors
✅ All tests pass (npm run test)
✅ No P0 issues
✅ All P1 issues resolved or have accepted risk documentation
✅ Auth protection verified on all private routes
✅ Security headers present and correct
✅ Error monitoring configured (Sentry or equivalent)
✅ Health endpoint accessible and accurate
✅ GDPR: Privacy policy + Terms published with required info
✅ GDPR: Consent mechanism in place
✅ SEO: Sitemap valid, robots.txt correct
✅ Performance: LCP < 4s (at minimum — target < 2.5s)
✅ Backup strategy documented
✅ Rollback procedure documented
✅ On-call notification configured
```

### 22.4 GO Solid Conditions

**Additional requirements for GO solid:**

```
✅✅ All GO conditions met
✅✅ No P1 or P2 issues
✅✅ Test coverage > 80% on critical paths
✅✅ Core Web Vitals all green (LCP < 2.5s, CLS < 0.1, INP < 200ms)
✅✅ GDPR: All pages complete with DPO, retention, legal bases
✅✅ E2E tests covering critical user flows
✅✅ Backup tested (restoration verified)
✅✅ Rollback tested (not just documented)
✅✅ Security headers at A+ on securityheaders.com
✅✅ Lighthouse score > 90 on all dimensions
✅✅ WCAG AA verified with accessibility testing tool
✅✅ Disaster recovery runbook tested
```

---

## 23. Ultra-Detailed Pre-Production Checklist

### Phase 1 — Build & Compilation

```
□ 1.01  npm ci (not npm install) produces no errors
□ 1.02  No high/critical vulnerabilities: npm audit --audit-level=high
□ 1.03  npm run typecheck → exit code 0, 0 errors
□ 1.04  npm run lint → exit code 0, 0 warnings, 0 errors
□ 1.05  npm run test → all tests pass, 0 failures
□ 1.06  npm run build → succeeds without errors
□ 1.07  Build output in correct directory (.next / dist / out)
□ 1.08  Source maps generated and uploaded to error monitoring
□ 1.09  Source maps NOT in public build output
□ 1.10  Build reproducible: same output for same input
□ 1.11  Bundle size within target: First Load JS < 300 KB gzipped
□ 1.12  Build time < 5 minutes (or documented and accepted)
```

### Phase 2 — Environment & Configuration

```
□ 2.01  All required env vars documented in .env.example
□ 2.02  NEXT_PUBLIC_SITE_URL set to production domain
□ 2.03  NEXT_PUBLIC_SUPABASE_URL set correctly
□ 2.04  NEXT_PUBLIC_SUPABASE_ANON_KEY set correctly
□ 2.05  SUPABASE_SERVICE_ROLE_KEY set (server-only)
□ 2.06  SENTRY_DSN set (server-side)
□ 2.07  NEXT_PUBLIC_SENTRY_DSN set (client-side)
□ 2.08  UPSTASH_REDIS_REST_URL set (distributed rate limiting)
□ 2.09  UPSTASH_REDIS_REST_TOKEN set
□ 2.10  SENTRY_TEST_ENABLED absent or false in production
□ 2.11  No debug env vars set in production (DEBUG, VERBOSE)
□ 2.12  NODE_ENV=production confirmed
□ 2.13  All env vars validated at application startup (throw if missing)
□ 2.14  Staging uses staging-specific secrets (not production secrets)
```

### Phase 3 — Security Verification

```
□ 3.01  Security headers check: curl -I https://[prod-url]/ | grep CSP
□ 3.02  CSP present and non-trivial (not "default-src *")
□ 3.03  HSTS: Strict-Transport-Security with max-age ≥ 31536000
□ 3.04  X-Frame-Options: DENY
□ 3.05  X-Content-Type-Options: nosniff
□ 3.06  Permissions-Policy header present
□ 3.07  Referrer-Policy: strict-origin-when-cross-origin
□ 3.08  Server / X-Powered-By headers absent
□ 3.09  Rate limit test: 6 POST /login requests → 429 on 6th
□ 3.10  Auth test: GET /api/private-route without token → 401
□ 3.11  Auth test: GET /admin without session → redirects to /login
□ 3.12  IDOR test: access another user's resource by ID → 403/404
□ 3.13  Service-role key: grep "SERVICE_ROLE" .next/static → 0 results
□ 3.14  Secrets in git: git log -p | grep -i "secret\|password" → 0 results
□ 3.15  Debug routes absent: curl /api/debug → 404
□ 3.16  Upload test: upload .php file → rejected
□ 3.17  XSS test: input with <script>alert(1)</script> stored safely
```

### Phase 4 — Database & Data

```
□ 4.01  RLS enabled on all user data tables
□ 4.02  Test: unauthenticated client cannot read user records
□ 4.03  Test: user A cannot read user B's private records
□ 4.04  Database migrations applied to production schema
□ 4.05  Schema dump committed: supabase db dump > schema.sql
□ 4.06  Backup configured: automated daily, 30-day retention
□ 4.07  Backup tested: restoration procedure verified
□ 4.08  Connection pool configured (not default unlimited)
□ 4.09  Database indexes verified on high-traffic queries
□ 4.10  Soft-delete policies verified (deleted data not returned)
```

### Phase 5 — Front-End Quality

```
□ 5.01  LCP < 2.5s on mobile (Lighthouse or PageSpeed Insights)
□ 5.02  CLS < 0.1 (Lighthouse)
□ 5.03  INP < 200ms (measured via Web Vitals extension)
□ 5.04  All public pages render server-side (SSR/SSG — check view-source)
□ 5.05  All images use <Image> with width/height or fill
□ 5.06  Hero image has fetchpriority="high" or priority prop
□ 5.07  No layout shift on image load (aspect-ratio container)
□ 5.08  No layout shift on modal/drawer open (CSS class, not JS style)
□ 5.09  All list pages have loading.tsx skeleton
□ 5.10  All detail pages have loading.tsx skeleton
□ 5.11  Skeleton dimensions match actual content (no CLS on hydration)
□ 5.12  Error boundaries on data-fetching sections
□ 5.13  400 and 500 pages show styled error UI
□ 5.14  404 page styled with helpful navigation
□ 5.15  Font loading: preconnect + font-display=swap
□ 5.16  No render-blocking scripts in <head>
□ 5.17  Third-party scripts deferred (analytics, chat, etc.)
□ 5.18  Keyboard navigation: Tab through all interactive elements
□ 5.19  Skip-to-content link at top of page
□ 5.20  All form fields have labels
□ 5.21  All images have alt text (or alt="" for decorative)
```

### Phase 6 — SEO & Indexing

```
□ 6.01  /sitemap.xml returns 200 with valid XML
□ 6.02  Sitemap contains all public pages (verify sampling)
□ 6.03  /robots.txt returns 200, disallows admin/dashboard/api
□ 6.04  All public pages have unique <title> (< 60 chars)
□ 6.05  All public pages have unique <meta name="description">
□ 6.06  OG tags present on shareable pages
□ 6.07  Canonical URL correct on all pages (no duplicate content)
□ 6.08  Form/creation pages: robots noindex
□ 6.09  Auth/profile pages: robots noindex
□ 6.10  Admin pages: robots noindex (via layout metadata)
□ 6.11  JSON-LD valid: https://validator.schema.org/
□ 6.12  Rich results test: https://search.google.com/test/rich-results
□ 6.13  Google Search Console: submit sitemap after launch
□ 6.14  No redirect chains (A→B→C) on primary pages
□ 6.15  404 returns HTTP 404 (not HTTP 200 with "not found")
```

### Phase 7 — Monitoring & Observability

```
□ 7.01  /api/health returns { status: "ok" } in production
□ 7.02  Health check: database check passes (supabase check: ok)
□ 7.03  Sentry error monitoring active: trigger test error, verify in dashboard
□ 7.04  Sentry source maps: verify stack trace is readable in dashboard
□ 7.05  Sentry sampling: tracesSampleRate appropriate (0.1 in production)
□ 7.06  Sentry Replay: maskAllInputs: true confirmed
□ 7.07  Navigation tracing: onRouterTransitionStart exported
□ 7.08  External uptime monitoring configured (UptimeRobot, etc.)
□ 7.09  Alert configured: error rate spike → Slack/PagerDuty
□ 7.10  Alert configured: health endpoint degraded → immediate notification
□ 7.11  Vercel function logs accessible
□ 7.12  Rate limit events visible in logs (429 responses)
```

### Phase 8 — Smoke Test Scenarios

Run these manually (or automate with Playwright) immediately after deployment:

```
□ 8.01  Home page loads < 3s, no console errors
□ 8.02  Public listing page loads with data
□ 8.03  Sign-up form: complete registration flow
□ 8.04  Sign-in form: login with valid credentials
□ 8.05  Sign-in form: invalid password → error message shown
□ 8.06  Dashboard: loads correctly for authenticated user
□ 8.07  Protected route: accessing /dashboard without auth → redirect to /login
□ 8.08  Create listing: submit form, see new listing in list
□ 8.09  Upload image: photo uploads to CDN, displays correctly
□ 8.10  Messages: send a message in a conversation
□ 8.11  Admin: admin user can access /admin dashboard
□ 8.12  Admin: regular user cannot access /admin → 403/redirect
□ 8.13  Search: search query returns relevant results
□ 8.14  /sitemap.xml: returns valid XML with ≥ 10 URLs
□ 8.15  /robots.txt: returns valid content, disallows /admin
□ 8.16  /api/health: returns { status: "ok" }
□ 8.17  Rate limit: trigger 6 rapid login attempts → 429 on 6th
□ 8.18  404: navigate to /non-existent-page → styled 404 page
□ 8.19  Error boundary: manually trigger error → error UI (not blank page)
□ 8.20  Mobile: home page, listing page, form page → no horizontal scroll
```

### Phase 9 — GDPR & Legal

```
□ 9.01  /confidentialite (Privacy Policy) accessible
□ 9.02  Privacy policy: last updated date is static and recent
□ 9.03  Privacy policy: DPO contact (email or contact form)
□ 9.04  Privacy policy: data categories listed
□ 9.05  Privacy policy: legal bases for each processing activity
□ 9.06  Privacy policy: data retention periods
□ 9.07  Privacy policy: third-party processors (Supabase, Sentry, Vercel)
□ 9.08  Privacy policy: international transfer documentation
□ 9.09  Privacy policy: user rights and how to exercise them
□ 9.10  /cgu (Terms of Service) accessible with static date
□ 9.11  /mentions-legales (Legal Notice) accessible with publisher info
□ 9.12  Registration: unchecked consent checkbox for optional data
□ 9.13  Footer: links to Privacy Policy and Terms of Service
□ 9.14  Contact form or email for data subject requests
□ 9.15  DPA signed with Supabase, Sentry, and Vercel
```

### Phase 10 — Deployment & Go-Live

```
□ 10.01  Deployment to staging environment verified (all smoke tests pass)
□ 10.02  DNS configured: production domain pointing to correct service
□ 10.03  SSL certificate valid and not expiring within 30 days
□ 10.04  HTTPS redirect active (HTTP → HTTPS)
□ 10.05  Database backup taken before production deployment
□ 10.06  Rollback procedure tested on staging
□ 10.07  On-call engineer notified before deployment
□ 10.08  Deployment window chosen: low-traffic period
□ 10.09  Post-deployment: all 20 smoke tests executed
□ 10.10  Post-deployment: Sentry shows no new error spike
□ 10.11  Post-deployment: /api/health shows status: "ok"
□ 10.12  Post-deployment: Core Web Vitals measured (PageSpeed Insights)
□ 10.13  Google Search Console: verify site ownership
□ 10.14  Google Search Console: submit sitemap
□ 10.15  Monitoring dashboards reviewed at T+1h, T+24h, T+72h
```

---

## 24. Executive Summary Template

```markdown
# Audit Report — [Project Name]
**Date:** YYYY-MM-DD  
**Auditor:** [Name / Team]  
**Commit:** [SHA or branch]  
**Stack:** [Framework · Runtime · Database · Hosting · Monitoring]

---

## Executive Summary

| Indicator | Value |
|---|---|
| **Global Score** | **XX / 100** |
| **Maturity** | [Prototype / Development / Pre-production / Production-ready / Enterprise-grade] |
| **Verdict** | [🔴 NO GO / 🟡 GO with reservations / 🟢 GO / ✅ GO solid] |
| **P0 Blockers** | N |
| **P1 Major Risks** | N |
| **P2 Attention** | N |
| **P3/P4 Improvements** | N |

### 5-Line Summary
[What works well, what is the critical issue, what the verdict is and why, what the timeline to fix is]

### Domain Scorecard

| Domain | Score | Trend | Verdict |
|---|---|---|---|
| Architecture | XX/100 | ↑/→/↓ | ✅/⚠️/❌ |
| Code Quality | XX/100 | | |
| Application Security | XX/100 | | |
| Database Security | XX/100 | | |
| Front-End Performance | XX/100 | | |
| SEO Technical | XX/100 | | |
| Accessibility & UX | XX/100 | | |
| Tests & Observability | XX/100 | | |
| DevOps & CI/CD | XX/100 | | |
| GDPR Compliance | XX/100 | | |
| **GLOBAL** | **XX/100** | | **[VERDICT]** |

### Top Priority Actions

| Priority | Action | Files/Scope | Effort | Owner | Deadline |
|---|---|---|---|---|---|
| 🔴 P0 | [Action] | [Scope] | [Time] | [Role] | Immediate |
| 🔴 P1 | [Action] | [Scope] | [Time] | [Role] | Before launch |
| 🟡 P2 | [Action] | [Scope] | [Time] | [Role] | Within 1 week |
```

---

## 25. Finding Report Template

```markdown
## Finding [ID]: [Title]

**Severity:** P[0-4]  
**Category:** [Security / Performance / Code Quality / SEO / Accessibility / GDPR / Observability]  
**Status:** [Open / In Progress / Resolved / Accepted Risk]

### Observation
[Precise description of what was found. Objective, not opinionated.]

### Impact
[Business and technical consequence if not addressed. Be specific:
- "Allows user A to read user B's private messages" (not "data leak risk")
- "Causes LCP > 4s on mobile 3G" (not "slow")
- "Missing DPO contact violates GDPR Art. 13" (not "GDPR issue")]

### Evidence
```bash
# Command used to discover the issue
grep -rn "document.body.style.overflow" src --include="*.tsx"
# Output:
src/components/ui/Modal.tsx:47:    document.body.style.overflow = 'hidden'
src/app/admin/artisans/_components/ArtisanDrawer.tsx:52:    document.body.style.overflow = 'hidden'
```

Or:
```typescript
// src/components/ui/Modal.tsx — Line 47
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'; // ← ISSUE: direct style mutation causes reflow
  }
  return () => { document.body.style.overflow = ''; };
}, [isOpen]);
```

### Affected Scope
- `src/components/ui/Modal.tsx` — Line 47
- `src/app/admin/artisans/_components/ArtisanDrawer.tsx` — Line 52
- `src/app/admin/moderation/_components/ModerationDrawer.tsx` — Line 61
- `src/app/admin/utilisateurs/_components/UserDrawer.tsx` — Line 58

### Remediation

**Step 1:** Add CSS class in globals.css
```css
/* globals.css — prevents reflow by using CSS instead of JS style mutation */
.modal-open {
  overflow: hidden;
  /* scrollbar-gutter: stable already on html — avoids CLS when scrollbar disappears */
}
```

**Step 2:** Replace style mutation with class toggle in all 4 components
```typescript
// Before:
useEffect(() => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [isOpen]);

// After:
useEffect(() => {
  document.documentElement.classList.toggle('modal-open', isOpen);
  return () => document.documentElement.classList.remove('modal-open');
}, [isOpen]);
```

**Effort:** 2 hours  
**Owner:** Frontend developer  
**Deadline:** Before launch
```

---

## 26. Audit Charter

### 26.1 Objectives

The pre-production audit aims to:

1. **Validate functional completeness** — Ensure all documented features work correctly, including edge cases, error paths, and permissions.
2. **Identify security vulnerabilities** — Detect auth bypasses, data leaks, injection vectors, and misconfigurations before they are exploited in production.
3. **Assess technical quality** — Evaluate TypeScript safety, test coverage, code maintainability, and architectural soundness.
4. **Measure production readiness** — Verify that monitoring, alerting, backup, and incident response are in place.
5. **Certify compliance** — Confirm GDPR obligations, legal pages, and data handling meet regulatory requirements.
6. **Prevent regressions** — Establish a baseline checklist to prevent known classes of problems from reappearing.

### 26.2 Deliverables

| # | Deliverable | Format | Audience |
|---|---|---|---|
| 1 | Executive Summary | 1-page document | CTO, Product Owner, Legal |
| 2 | Detailed Finding Reports | Per-issue markdown | Development Team |
| 3 | P0–P4 Classification Table | Spreadsheet / table | Product Owner + Dev Lead |
| 4 | Final Release Checklist | Checklist (this document, Section 23) | Dev + DevOps |
| 5 | Audit Charter | This document | All stakeholders |
| 6 | Remediation Plan | Backlog items with priority/effort | Product Owner |
| 7 | Post-Remediation Report | Updated scores after fixes | Management |

### 26.3 Methodology Summary

| Layer | Technique | Tools |
|---|---|---|
| **Static analysis** | TypeScript compilation, linting, structural grep | `tsc`, `eslint`, `grep`, `ts-prune` |
| **Dynamic analysis** | Test execution, build verification, API testing | `vitest`, `curl`, `next build` |
| **Security review** | OWASP Top-10, ASVS L2, auth bypass testing | Manual review, `npm audit`, headers check |
| **Performance** | Lighthouse, Web Vitals, bundle analysis | Lighthouse CI, `@next/bundle-analyzer` |
| **SEO** | Sitemap validation, robots.txt, structured data | Google Search Console, validator.schema.org |
| **Accessibility** | Keyboard navigation, ARIA review, contrast | axe DevTools, contrast checker |
| **Compliance** | GDPR checklist, legal page review | Manual review against GDPR Art. 13/14 |

### 26.4 Exhaustive Checklists Summary

| Section | # Checks | Priority Focus |
|---|---|---|
| Architecture | 18 | Separation of concerns, module coupling |
| Code Quality | 22 | TypeScript strictness, lint compliance |
| Application Security | 47 | Auth, injection, headers, secrets, upload |
| Database Security | 22 | RLS, least privilege, migrations |
| Front-End Performance | 34 | CWV, images, loading states, bundle |
| Backend Performance | 12 | N+1 queries, pagination, timeouts |
| SEO | 28 | Metadata, sitemap, structured data |
| Accessibility | 24 | Keyboard, ARIA, contrast, responsive |
| Error Handling | 18 | Global errors, API consistency, logging |
| Test Coverage | 22 | Auth tests, security tests, RLS tests |
| Observability | 20 | Error monitoring, health, alerting |
| DevOps / CI/CD | 24 | Build, env, pipeline, rollback |
| GDPR / Legal | 26 | Legal pages, consent, data rights |
| Resilience | 16 | Backups, runbooks, feature flags |
| **Pre-Production Checklist** | **154 gates** | **All of the above combined** |

### 26.5 Audit Scope Boundaries

**In Scope:**
- All source code in the repository
- All public-facing API routes
- Authentication and authorization flows
- Database schema and RLS policies (if accessible)
- Build and deployment configuration
- Legal and compliance pages
- Monitoring and observability setup

**Out of Scope:**
- Penetration testing of production infrastructure
- Physical security of data centers
- Social engineering / phishing resistance
- Compliance certifications (SOC2, ISO27001)
- Full legal review of terms and contracts
- Performance under production load (requires load testing)
- Third-party service security (Supabase, Vercel, Sentry internal security)

### 26.6 Risk Acceptance Policy

When a finding cannot be immediately fixed (due to technical constraints, cost, or timeline), the **Risk Acceptance** process requires:

1. **Written documentation** of the accepted risk (file, issue tracker, or SECURITY.md)
2. **Impact assessment** — worst-case scenario if exploited
3. **Mitigation in place** — compensating controls (rate limiting, monitoring, input validation)
4. **Owner** — named person responsible for tracking and resolving
5. **Review date** — commitment to reassess within 90 days
6. **Escalation path** — who to notify if the risk materializes

**Example from reference project (Biguglia Connect):**

```
Risk: style-src 'unsafe-inline' retained (79 legitimate dynamic React style={{}} attributes)
Impact: Style injection only (no JS execution). Risk level: Low.
Mitigation: script-src uses nonce+strict-dynamic (no unsafe-inline in production),
            style-src-elem is nonce-protected (blocks injected <style> tags),
            style-src-attr 'unsafe-inline' covers only attribute-level styles,
            X-Frame-Options: DENY, HSTS active, rate limiting on auth endpoints
Owner: Lead developer
Review date: 2026-07-01 (sprint 2 — evaluate removing unsafe-inline from style-src)
Escalation: CTO within 4 hours if CSP violation detected in Sentry
Documentation: src/middleware.ts buildCsp(), SECURITY.md §3.1
```

### 26.7 Continuous Audit — Beyond the Pre-Production Snapshot

This audit is a point-in-time assessment. To maintain quality over time:

**Automated (every commit / PR):**
- TypeScript: `tsc --noEmit` (CI)
- ESLint: `--max-warnings 0` (CI)
- Tests: `vitest run` (CI)
- Security scan: `npm audit --audit-level=high` (CI)
- Bundle analysis: size regression alerts

**Weekly:**
- Dependency update review (Renovate / Dependabot PRs)
- Sentry error rate dashboard review
- Core Web Vitals monitoring (Search Console)

**Monthly:**
- Full manual smoke test of critical user flows
- Security header check (`securityheaders.com`)
- Certificate expiry check (automated alert recommended)
- Access control review (who has admin access, who shouldn't)

**Quarterly:**
- Full re-audit against this framework
- Penetration test (if budget permits)
- GDPR compliance review (new data processing, new vendors)
- Disaster recovery drill (test backup restoration)
- Dependency major version assessment

**Annually:**
- Legal pages review (update dates, update third-party processors, regulatory changes)
- Full GDPR Data Protection Impact Assessment (DPIA) if new high-risk processing
- Architecture review (scalability for next 12 months)
- Threat model update

---

## Appendix A — Quick Reference Card

### 🚨 Automatic NO-GO

```
Build fails | TypeScript errors | Tests failing | Service-role in client bundle
Auth bypass | No RLS on user data | No GDPR consent | Admin route open
Secrets in git | CSP missing | HTTPS not enforced
```

### ⚡ P1 — Fix Before Launch (< 24h)

```
document.body.style.overflow in JS → use CSS class
Missing loading.tsx → blank screens during navigation
onRouterTransitionStart missing → Sentry navigation gaps
No /api/health endpoint → no uptime monitoring
Rate limiting in-memory → not distributed, bypassable
Missing server-side validation → client-only checks
No error boundary on critical flows → silent failures
```

### 📋 Minimum Viable Audit (30 minutes)

```bash
# 1. Static checks (5 min)
npm ci && npm run typecheck && npm run lint && npm run test

# 2. Security headers (2 min)
curl -I https://[app-url]/ | grep -E "Content-Security|X-Frame|Strict-Transport"

# 3. Auth bypass (3 min)
curl https://[app-url]/api/[private-route]  # → should be 401
curl -b "faketoken=abc" https://[app-url]/api/admin/  # → should be 401/403

# 4. Bundle secret scan (2 min)
grep -r "SERVICE_ROLE\|private_key" .next/static/ 2>/dev/null | wc -l  # → 0

# 5. Health check (1 min)
curl https://[app-url]/api/health | jq .status  # → "ok"

# 6. Sitemap (1 min)
curl https://[app-url]/sitemap.xml | head -5  # → valid XML

# 7. Rate limit (2 min)
for i in {1..6}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://[app-url]/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"wrong"}')
  echo "Request $i: $status"
done  # → 6th request should be 429
```

### 📊 Scoring Quick Reference

| Score | Verdict | Action |
|---|---|---|
| < 50 | 🔴 NO GO | Stop. Fix blockers. |
| 50-69 | 🔴 NO GO | Too many risks. 2-week remediation sprint. |
| 70-79 | 🟡 GO with reservations | Launch with plan. Fix P1/P2 within 1 week. |
| 80-89 | 🟢 GO | Production-ready. P2/P3 in next sprint. |
| 90+ | ✅ GO solid | Excellent. Maintain with continuous audit. |

---

*Framework version 2.1 — 2026-04-27*  
*Reference implementation: Biguglia Connect (Next.js 15 · React 18 · TypeScript strict · Supabase · Vercel · Sentry)*  
*Based on: OWASP Top-10 2021, OWASP ASVS L2, WCAG 2.1 AA, GDPR (EU) 2016/679, Core Web Vitals (Google), Next.js best practices*  
*2026-04-27: Updated risk acceptance example (CSP script-src resolved — nonce+strict-dynamic in prod, PR #425/#427); P3 example updated to CSP Level 3 style-src-elem.*

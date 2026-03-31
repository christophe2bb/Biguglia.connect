import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER — en mémoire (Edge-compatible, réinitialisé au redémarrage)
// Structure : Map<ip, { count, firstReq, blocked }>
// ─────────────────────────────────────────────────────────────────────────────
interface RateBucket {
  count: number;
  firstReq: number;
  blocked: boolean;
  blockedUntil: number;
}
const rateBuckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS   = 60_000;  // fenêtre glissante : 1 minute
const RATE_LIMIT_MAX   = 120;     // max requêtes/minute par IP (pages normales)
const RATE_LIMIT_API   = 30;      // max requêtes/minute par IP sur /api/*
const BLOCK_DURATION   = 5 * 60_000; // blocage 5 minutes après dépassement

// Nettoyage périodique des buckets expirés (évite fuite mémoire)
let lastCleanup = Date.now();
function cleanBuckets() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  const toDelete: string[] = [];
  rateBuckets.forEach((b, ip) => {
    if (now > b.blockedUntil && now - b.firstReq > RATE_WINDOW_MS * 2) {
      toDelete.push(ip);
    }
  });
  toDelete.forEach(ip => rateBuckets.delete(ip));
}

function checkRateLimit(ip: string, isApi: boolean): boolean {
  cleanBuckets();
  const now   = Date.now();
  const limit = isApi ? RATE_LIMIT_API : RATE_LIMIT_MAX;
  let bucket  = rateBuckets.get(ip);

  if (!bucket) {
    bucket = { count: 1, firstReq: now, blocked: false, blockedUntil: 0 };
    rateBuckets.set(ip, bucket);
    return true; // OK
  }

  // Toujours bloqué ?
  if (bucket.blocked && now < bucket.blockedUntil) return false;

  // Débloquer si le temps est écoulé
  if (bucket.blocked && now >= bucket.blockedUntil) {
    bucket.blocked = false;
    bucket.count   = 1;
    bucket.firstReq = now;
    return true;
  }

  // Réinitialiser la fenêtre si elle est expirée
  if (now - bucket.firstReq > RATE_WINDOW_MS) {
    bucket.count   = 1;
    bucket.firstReq = now;
    return true;
  }

  bucket.count++;
  if (bucket.count > limit) {
    bucket.blocked      = true;
    bucket.blockedUntil = now + BLOCK_DURATION;
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-BOT — User-Agent basique
// ─────────────────────────────────────────────────────────────────────────────
const BAD_BOT_PATTERNS = [
  /sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /zgrab/i, /nuclei/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i, /havij/i,
  /python-requests\/[01]\./i,  // vieilles versions souvent utilisées pour scraping/attaque
  /curl\/[0-6]\./i,
  /libwww-perl/i, /lwp-trivial/i,
  /\bbot\b(?!.*(?:google|bing|yahoo|duckduck|slurp|baidu|yandex|semrush|ahrefs|msnbot))/i,
];

function isBadBot(ua: string): boolean {
  if (!ua || ua.length < 5) return true; // UA vide ou trop court = suspect
  for (const pat of BAD_BOT_PATTERNS) {
    if (pat.test(ua)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATHS protégés — seuls les admins y ont accès
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_PATHS = ['/admin'];

// ─────────────────────────────────────────────────────────────────────────────
// HEADERS DE SÉCURITÉ injectés sur chaque réponse
// (doublonnent next.config mais garantissent la couverture même sur les routes
//  API et les redirections de session Supabase)
// ─────────────────────────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':        'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection':       '1; mode=block',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip  = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           || request.headers.get('x-real-ip')
           || 'unknown';
  const ua  = request.headers.get('user-agent') || '';
  const isApi = pathname.startsWith('/api/');

  // ── 1. Bloquer les bots malveillants (sauf routes statiques) ────────────────
  if (!pathname.startsWith('/_next') && !pathname.startsWith('/favicon')) {
    if (isBadBot(ua)) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────────────
  if (!pathname.startsWith('/_next') && !pathname.startsWith('/favicon')) {
    const allowed = checkRateLimit(ip, isApi);
    if (!allowed) {
      const retryAfter = Math.ceil(BLOCK_DURATION / 1000).toString();
      return new NextResponse(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
        {
          status: 429,
          headers: {
            'Content-Type':    'application/json',
            'Retry-After':     retryAfter,
            'X-RateLimit-Limit': isApi ? String(RATE_LIMIT_API) : String(RATE_LIMIT_MAX),
          },
        }
      );
    }
  }

  // ── 3. Protection des routes /admin ─────────────────────────────────────────
  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p));
  if (isAdminPath) {
    // Vérifier le cookie de session Supabase (présence suffit ici,
    // la page admin vérifie elle-même le rôle 'admin')
    const hasSession = request.cookies.getAll()
      .some(c => c.name.includes('supabase') || c.name.includes('sb-'));

    if (!hasSession) {
      const loginUrl = new URL('/connexion', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 4. Session Supabase + réponse normale ────────────────────────────────────
  const response = await updateSession(request);

  // ── 5. Injecter les headers de sécurité sur la réponse ──────────────────────
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Toutes les routes sauf fichiers statiques Next.js et images optimisées
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};

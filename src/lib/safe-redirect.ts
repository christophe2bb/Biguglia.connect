/** Keep post-login navigation on this site and avoid returning to the login form. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  try {
    const base = 'https://biguglia.invalid';
    const url = new URL(value, base);
    const path = url.pathname.replace(/\/+$/, '');
    if (url.origin !== base || path === '/connexion' || path === '/auth/callback') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

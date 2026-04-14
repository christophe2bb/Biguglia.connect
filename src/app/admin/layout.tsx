/**
 * src/app/admin/layout.tsx — Server Component
 *
 * Layout pour toutes les pages /admin/*.
 *
 * IMPORTANT : La protection admin est gérée UNIQUEMENT côté client par
 * ProtectedPage (adminOnly=true) dans src/app/admin/page.tsx.
 *
 * Pourquoi pas de vérification serveur ici ?
 * ─────────────────────────────────────────
 * Le client Supabase (createBrowserClient) stocke la session dans des cookies
 * httpOnly. Dans certaines configurations Vercel/Next.js 14 App Router, le
 * createServerClient ne reçoit pas ces cookies correctement lors du premier
 * rendu SSR (timing, SameSite, domaine). Résultat : auth.getUser() retourne
 * "Auth session missing" même si l'utilisateur est connecté → redirection
 * incorrecte vers /connexion.
 *
 * La protection côté client (ProtectedPage) est suffisante car :
 * - Elle lit la session depuis le store Zustand (hydraté par AuthProvider)
 * - Elle force un rechargement du profil depuis Supabase si nécessaire
 * - Les API routes admin (/api/admin/**) ont leur propre vérification JWT
 *
 * Si la session serveur devient nécessaire, utiliser un Server Action ou
 * l'en-tête Authorization avec le token JWT client.
 */

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}

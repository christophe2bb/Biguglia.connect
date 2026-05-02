'use client';

/**
 * Navbar — orchestrateur.
 *
 * Responsabilités de ce fichier :
 *   - état global (scroll, menus ouverts, recherche)
 *   - gestion auth (signOut, lecture du profil)
 *   - composition des sous-composants
 *
 * Sous-composants (src/components/layout/navbar/) :
 *   UniversDropdown — bouton + panel desktop pour un univers
 *   UserMenu        — avatar + dropdown utilisateur
 *   MobileNav       — menu mobile accordéon
 *   UnreadBadge     — badge rouge compteur non-lus
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, MessageSquare, Bell, Search, PenLine, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';
import GlobalSearch from '@/components/ui/GlobalSearch';
import UniversDropdown from './navbar/UniversDropdown';
import UserMenu from './navbar/UserMenu';
import MobileNav from './navbar/MobileNav';
import UnreadBadge from './navbar/UnreadBadge';
import { UNIVERS } from './navbar/univers';

export default function Navbar() {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openUnivers, setOpenUnivers] = useState<string | null>(null);
  const [scrolled, setScrolled]       = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);

  const pathname = usePathname();
  const router   = useRouter();
  const { profile, isAdmin } = useAuthStore();
  const unread   = useUnreadCounts();

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ferme tous les menus au changement de route
  useEffect(() => {
    setMenuOpen(false);
    setOpenUnivers(null);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isUniversActive = (paths: readonly string[]) =>
    paths.some(p => pathname.startsWith(p));

  return (
    <nav className={cn(
      'sticky top-0 z-40 transition-colors duration-300',
      scrolled
        ? 'bg-white/97 backdrop-blur-xl shadow-sm border-b border-gray-200/60'
        : 'bg-white/90 backdrop-blur-xl border-b border-gray-100/80'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" showText={true} />
          </Link>

          {/* Desktop nav — 3 univers */}
          <div className="hidden lg:flex items-center gap-1">
            {UNIVERS.map((univers) => (
              <UniversDropdown
                key={univers.id}
                univers={univers}
                isOpen={openUnivers === univers.id}
                onToggle={() => setOpenUnivers(openUnivers === univers.id ? null : univers.id)}
                onClose={() => setOpenUnivers(null)}
                isActive={isUniversActive(univers.paths)}
              />
            ))}
          </div>

          {/* Barre de recherche desktop */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-3">
            {searchOpen ? (
              <GlobalSearch
                size="sm"
                placeholder="Rechercher…"
                className="w-full"
                autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                onSearch={(q) => {
                  setSearchOpen(false);
                  router.push(`/recherche?q=${encodeURIComponent(q)}`);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Ouvrir la recherche"
                className="flex items-center gap-2 w-full px-3 h-9 rounded-2xl border border-gray-200 bg-gray-50 text-gray-400 text-sm hover:bg-white hover:border-gray-300 hover:text-gray-600 transition-colors shadow-sm"
              >
                <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate" aria-hidden="true">Rechercher…</span>
              </button>
            )}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                {/* Messages (desktop) */}
                <Link
                  href="/messages"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/messages')
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                  aria-label={unread.messages > 0 ? `Messages — ${unread.messages} non lu(s)` : 'Messages'}
                >
                  <MessageSquare className="w-5 h-5" aria-hidden="true" />
                  <UnreadBadge count={unread.messages} />
                </Link>

                {/* Favoris (desktop) */}
                <Link
                  href="/favoris"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/favoris')
                      ? 'bg-rose-50 text-rose-500'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                  aria-label="Mes favoris"
                >
                  <Heart className={`w-5 h-5 ${pathname.startsWith('/favoris') ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
                </Link>

                {/* Notifications (desktop) */}
                <Link
                  href="/notifications"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/notifications')
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                  aria-label={unread.notifications > 0 ? `Notifications — ${unread.notifications} non lue(s)` : 'Notifications'}
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  <UnreadBadge count={unread.notifications} />
                </Link>

                {/* Menu utilisateur */}
                <UserMenu
                  profile={profile}
                  isAdmin={isAdmin()}
                  unread={unread}
                  isOpen={userMenuOpen}
                  onToggle={() => setUserMenuOpen(!userMenuOpen)}
                  onClose={() => setUserMenuOpen(false)}
                  onSignOut={handleSignOut}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/artisans/demande"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-bold rounded-xl hover:from-brand-600 hover:to-brand-700 transition-[color,border-color,box-shadow,transform] shadow-sm hover:shadow-md hover:-translate-y-px"
                >
                  <PenLine className="w-4 h-4" /> Déposer une demande
                </Link>
                <Link href="/connexion" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Connexion
                </Link>
                <Link href="/inscription" className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-[color,border-color,box-shadow,transform] shadow-sm hover:shadow-md hover:-translate-y-px">
                  S&apos;inscrire
                </Link>
              </div>
            )}

            {/* Icône recherche mobile */}
            <Link
              href="/recherche"
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </Link>

            {/* Burger mobile */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu de navigation'}
            >
              {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <MobileNav
            profile={profile}
            pathname={pathname}
            unread={unread}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </nav>
  );
}

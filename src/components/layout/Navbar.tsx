'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Bell, MessageSquare, User, LogOut, Shield, Home, Wrench, BookOpen, Package, ChevronDown, PenLine, Drill } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';

const navLinks = [
  { href: '/artisans', label: 'Artisans', icon: Wrench },
  { href: '/annonces', label: 'Annonces', icon: Package },
  { href: '/materiel', label: 'Matériel', icon: Drill },
  { href: '/forum', label: 'Forum', icon: BookOpen },
];

// Badge rouge avec compteur
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse-once">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useAuthStore();
  const unread = useUnreadCounts();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Quand on visite /messages, signaler que les messages sont lus
  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      window.dispatchEvent(new Event('messages-read'));
    }
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className={cn(
      'sticky top-0 z-40 transition-all duration-300',
      scrolled
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-orange-100/50'
        : 'bg-white/80 backdrop-blur-xl border-b border-gray-100/80'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" showText={true} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                {/* Bouton Messages avec badge */}
                <Link
                  href="/messages"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/messages') ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100'
                  )}
                  title={unread.messages > 0 ? `${unread.messages} message(s) non lu(s)` : 'Messages'}
                >
                  <MessageSquare className="w-5 h-5" />
                  <UnreadBadge count={unread.messages} />
                </Link>

                {/* Bouton Notifications avec badge */}
                <Link
                  href="/notifications"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/notifications') ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100'
                  )}
                  title={unread.notifications > 0 ? `${unread.notifications} notification(s)` : 'Notifications'}
                >
                  <Bell className="w-5 h-5" />
                  <UnreadBadge count={unread.notifications} />
                </Link>

                {/* Menu utilisateur */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="relative">
                      <Avatar
                        src={profile.avatar_url}
                        name={profile.full_name || profile.email}
                        size="sm"
                      />
                      {/* Point rouge si messages ou notifs non lus */}
                      {unread.total > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {profile.full_name?.split(' ')[0] || 'Compte'}
                    </span>
                    <ChevronDown className={cn(
                      'hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                      userMenuOpen && 'rotate-180'
                    )} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-fade-in-down">
                        {/* Header du menu */}
                        <div className="p-4 bg-gradient-to-r from-brand-50 to-orange-50 border-b border-orange-100/50">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={profile.avatar_url}
                              name={profile.full_name || profile.email}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{profile.full_name || 'Utilisateur'}</p>
                              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                            <Home className="w-4 h-4 text-brand-500" /> Tableau de bord
                          </Link>
                          <Link href="/profil" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <User className="w-4 h-4 text-gray-400" /> Mon profil
                          </Link>
                          {/* Messages dans le menu avec badge */}
                          <Link href="/messages" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                            <div className="flex items-center gap-2.5">
                              <MessageSquare className="w-4 h-4 text-gray-400" /> Messages
                            </div>
                            {unread.messages > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                                {unread.messages > 99 ? '99+' : unread.messages}
                              </span>
                            )}
                          </Link>
                          {/* Notifications dans le menu avec badge */}
                          <Link href="/notifications" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                            <div className="flex items-center gap-2.5">
                              <Bell className="w-4 h-4 text-gray-400" /> Notifications
                            </div>
                            {unread.notifications > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                                {unread.notifications > 99 ? '99+' : unread.notifications}
                              </span>
                            )}
                          </Link>
                          {profile.role === 'artisan_verified' && (
                            <Link href="/dashboard/artisan" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Wrench className="w-4 h-4 text-gray-400" /> Espace artisan
                            </Link>
                          )}
                          {isAdmin() && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-brand-700 hover:bg-brand-50 transition-colors">
                              <Shield className="w-4 h-4" /> Administration
                            </Link>
                          )}
                          <div className="my-1.5 border-t border-gray-100" />
                          <Link href="/confiance" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Shield className="w-4 h-4 text-emerald-500" /> Confiance & Sécurité
                          </Link>
                          <div className="my-1.5 border-t border-gray-100" />
                          <button
                            onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Se déconnecter
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/artisans/demande"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-bold rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px"
                >
                  <PenLine className="w-4 h-4" /> Déposer une demande
                </Link>
                <Link
                  href="/connexion"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100 animate-fade-in-down">
            <div className="space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    pathname.startsWith(href) ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              {!profile && (
                <Link
                  href="/artisans/demande"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-700 bg-brand-50 transition-colors"
                >
                  <PenLine className="w-4 h-4" /> Déposer une demande
                </Link>
              )}
            </div>
            {profile && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                <Link href="/messages" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4" /> Messages
                  </div>
                  {unread.messages > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {unread.messages}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" /> Notifications
                  </div>
                  {unread.notifications > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {unread.notifications}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Home className="w-4 h-4" /> Tableau de bord
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

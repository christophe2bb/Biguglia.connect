'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, X, Bell, MessageSquare, User, LogOut, Shield, Home,
  Wrench, ChevronDown, PenLine, Drill, TreePine, Gem, PartyPopper,
  Package, BookOpen, Calendar, Footprints, ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';

// ─── Structure des 3 univers ───────────────────────────────────────────────────
const UNIVERS = [
  // ── 1. SERVICES ────────────────────────────────────────────────────────────
  {
    id: 'services',
    label: 'Services',
    icon: Wrench,
    color: 'text-orange-600',
    activeBg: 'bg-orange-50 text-orange-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-orange-500',
    gradFrom: 'from-orange-500',
    gradTo: 'to-amber-500',
    headerBg: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100',
    paths: ['/artisans'],
    items: [
      {
        href: '/artisans',
        icon: Wrench,
        label: 'Artisans',
        desc: 'Artisans vérifiés près de chez vous',
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
      },
      {
        href: '/artisans/demande',
        icon: ClipboardList,
        label: 'Poster une demande',
        desc: 'Déposez votre besoin en 2 min',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100',
      },
      {
        href: '/demandes',
        icon: MessageSquare,
        label: 'Tableau des demandes',
        desc: 'Consulter et répondre aux habitants',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100',
      },
    ],
  },

  // ── 2. VIE PRATIQUE ─────────────────────────────────────────────────────────
  {
    id: 'viepratique',
    label: 'Vie pratique',
    icon: Package,
    color: 'text-blue-600',
    activeBg: 'bg-blue-50 text-blue-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-blue-500',
    gradFrom: 'from-blue-500',
    gradTo: 'to-teal-500',
    headerBg: 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-100',
    paths: ['/annonces', '/materiel', '/collectionneurs'],
    items: [
      {
        href: '/annonces',
        icon: Package,
        label: 'Annonces',
        desc: 'Vendez et achetez local',
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
      },
      {
        href: '/materiel',
        icon: Drill,
        label: 'Matériel',
        desc: 'Prêt et emprunt d\'outils',
        iconColor: 'text-teal-500',
        iconBg: 'bg-teal-100',
      },
      {
        href: '/collectionneurs',
        icon: Gem,
        label: 'Collectionneurs',
        desc: 'Timbres, vinyles, objets rares',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-100',
      },
    ],
  },

  // ── 3. VIE LOCALE ───────────────────────────────────────────────────────────
  {
    id: 'vielocale',
    label: 'Vie locale',
    icon: PartyPopper,
    color: 'text-purple-600',
    activeBg: 'bg-purple-50 text-purple-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-purple-500',
    gradFrom: 'from-purple-500',
    gradTo: 'to-pink-500',
    headerBg: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100',
    paths: ['/evenements', '/promenades', '/forum'],
    items: [
      {
        href: '/evenements',
        icon: Calendar,
        label: 'Événements',
        desc: 'Concerts, matchs, fêtes de quartier',
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-100',
      },
      {
        href: '/promenades',
        icon: Footprints,
        label: 'Promenades',
        desc: 'Sentiers, nature, sorties groupées',
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-100',
      },
      {
        href: '/forum',
        icon: BookOpen,
        label: 'Forum',
        desc: 'Discussions entre habitants',
        iconColor: 'text-violet-500',
        iconBg: 'bg-violet-100',
      },
    ],
  },
] as const;

// ─── Badge non-lus ─────────────────────────────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── Dropdown Univers ──────────────────────────────────────────────────────────
function UniversDropdown({
  univers,
  isOpen,
  onToggle,
  onClose,
  isActive,
}: {
  univers: typeof UNIVERS[number];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  isActive: boolean;
}) {
  const Icon = univers.icon;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
          isActive ? univers.activeBg : `text-gray-600 ${univers.hoverBg}`
        )}
      >
        <Icon className={cn('w-4 h-4', isActive ? '' : univers.color)} />
        {univers.label}
        <ChevronDown className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          isOpen ? 'rotate-180' : '',
          isActive ? 'opacity-70' : 'text-gray-400'
        )} />
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div className="fixed inset-0 z-10" onClick={onClose} />

          {/* Dropdown panel */}
          <div className="absolute left-0 mt-2.5 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-fade-in-down">

            {/* Header univers */}
            <div className={cn('px-5 py-4 border-b', univers.headerBg)}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-sm',
                  univers.gradFrom, univers.gradTo
                )}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Espace</p>
                  <p className="text-sm font-black text-gray-900">{univers.label}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="p-2">
              {univers.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-all duration-150 group"
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110', item.iconBg)}>
                      <ItemIcon className={cn('w-4 h-4', item.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Navbar principale ─────────────────────────────────────────────────────────
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openUnivers, setOpenUnivers] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  // Mobile accordion
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useAuthStore();
  const unread = useUnreadCounts();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      window.dispatchEvent(new Event('messages-read'));
    }
    // Ferme les menus au changement de page
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

  // Détermine si un univers est actif selon le pathname
  const isUniversActive = (univers: typeof UNIVERS[number]) =>
    univers.paths.some(p => pathname.startsWith(p));

  return (
    <nav className={cn(
      'sticky top-0 z-40 transition-all duration-300',
      scrolled
        ? 'bg-white/97 backdrop-blur-xl shadow-sm border-b border-gray-200/60'
        : 'bg-white/90 backdrop-blur-xl border-b border-gray-100/80'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" showText={true} />
          </Link>

          {/* ── Desktop nav — 3 univers ── */}
          <div className="hidden lg:flex items-center gap-1">
            {UNIVERS.map((univers) => (
              <UniversDropdown
                key={univers.id}
                univers={univers}
                isOpen={openUnivers === univers.id}
                onToggle={() => setOpenUnivers(openUnivers === univers.id ? null : univers.id)}
                onClose={() => setOpenUnivers(null)}
                isActive={isUniversActive(univers)}
              />
            ))}
          </div>

          {/* ── Actions droite ── */}
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                {/* Messages */}
                <Link
                  href="/messages"
                  className={cn(
                    'hidden sm:flex relative p-2 rounded-xl transition-colors',
                    pathname.startsWith('/messages') ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100'
                  )}
                  title={unread.messages > 0 ? `${unread.messages} message(s)` : 'Messages'}
                >
                  <MessageSquare className="w-5 h-5" />
                  <UnreadBadge count={unread.messages} />
                </Link>

                {/* Notifications */}
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
                      <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="sm" />
                      {unread.total > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[90px] truncate">
                      {profile.full_name?.split(' ')[0] || 'Compte'}
                    </span>
                    <ChevronDown className={cn('hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200', userMenuOpen && 'rotate-180')} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-brand-50 to-orange-50 border-b border-orange-100/50">
                          <div className="flex items-center gap-3">
                            <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="md" />
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
                          <Link href="/messages" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                            <div className="flex items-center gap-2.5"><MessageSquare className="w-4 h-4 text-gray-400" /> Messages</div>
                            {unread.messages > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{unread.messages > 99 ? '99+' : unread.messages}</span>}
                          </Link>
                          <Link href="/notifications" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                            <div className="flex items-center gap-2.5"><Bell className="w-4 h-4 text-gray-400" /> Notifications</div>
                            {unread.notifications > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{unread.notifications > 99 ? '99+' : unread.notifications}</span>}
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
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-bold rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
                >
                  <PenLine className="w-4 h-4" /> Déposer une demande
                </Link>
                <Link href="/connexion" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Connexion
                </Link>
                <Link href="/inscription" className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-px">
                  S&apos;inscrire
                </Link>
              </div>
            )}

            {/* Burger mobile */}
            <button
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer' : 'Menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Menu mobile ── */}
        {menuOpen && (
          <div className="lg:hidden py-3 border-t border-gray-100">

            {/* 3 univers en accordéon */}
            {UNIVERS.map((univers) => {
              const UniversIcon = univers.icon;
              const isExpanded = mobileOpen === univers.id;
              const isActive = isUniversActive(univers);

              return (
                <div key={univers.id} className="mb-1">
                  {/* Entête univers */}
                  <button
                    onClick={() => setMobileOpen(isExpanded ? null : univers.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors',
                      isActive
                        ? univers.activeBg
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br',
                        univers.gradFrom, univers.gradTo
                      )}>
                        <UniversIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      {univers.label}
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </button>

                  {/* Items du sous-menu */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                      {univers.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={`mobile-${item.href}-${item.label}`}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)}>
                              <ItemIcon className={cn('w-3.5 h-3.5', item.iconColor)} />
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{item.label}</p>
                              <p className="text-xs text-gray-400">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Actions mobile (non connecté) */}
            {!profile && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 px-1">
                <Link href="/artisans/demande" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600">
                  <PenLine className="w-4 h-4" /> Déposer une demande
                </Link>
              </div>
            )}

            {/* Actions mobile (connecté) */}
            {profile && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <Link href="/messages" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</div>
                  {unread.messages > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{unread.messages}</span>}
                </Link>
                <Link href="/notifications" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center gap-3"><Bell className="w-4 h-4" /> Notifications</div>
                  {unread.notifications > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{unread.notifications}</span>}
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

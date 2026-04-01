'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Clock, Package, BookOpen, Plus, Wrench, Bell,
  Eye, PenLine, Drill, ArrowRight, Star, Calendar, TrendingUp,
  CheckCircle, AlertCircle, LayoutGrid, Activity, HandshakeIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { ServiceRequest, Listing, ForumPost } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { STATUS_LABELS, URGENCY_LABELS, formatRelative, cn } from '@/lib/utils';

// ─── Composants ──────────────────────────────────────────────────────────────

function QuickStat({ icon: Icon, label, value, href, colorIcon, colorBg, badge }: {
  icon: React.ElementType; label: string; value: number | string;
  href: string; colorIcon: string; colorBg: string; badge?: number;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2.5 rounded-xl', colorBg)}>
            <Icon className={cn('w-4 h-4', colorIcon)} />
          </div>
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
      </div>
    </Link>
  );
}

function ActionBtn({ icon: Icon, label, href, grad }: {
  icon: React.ElementType; label: string; href: string; grad: string;
}) {
  return (
    <Link href={href}>
      <div className="group bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center text-center gap-2.5">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs font-bold text-gray-700 leading-tight">{label}</span>
      </div>
    </Link>
  );
}

function EmptyCard({ icon, title, desc, cta, href }: {
  icon: string; title: string; desc: string; cta: string; href: string;
}) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-700 mb-1 text-sm">{title}</h3>
      <p className="text-gray-400 text-xs mb-4 leading-relaxed">{desc}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> {cta}
      </Link>
    </div>
  );
}

// ─── Dashboard principal ─────────────────────────────────────────────────────

function DashboardContent() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const unread = useUnreadCounts();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState({ activeListings: 0, totalViews: 0, pendingInteractions: 0, activeInteractions: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDataLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase.from('service_requests').select('*, category:trade_categories(name, icon)').eq('resident_id', profile.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('listings').select('*, category:listing_categories(name, icon)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('forum_posts').select('*, category:forum_categories(name, icon)').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'active'),
      supabase.from('listings').select('views').eq('user_id', profile.id),
      // Interactions en attente
      supabase.from('interactions').select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .in('status', ['requested', 'pending']),
      // Interactions actives
      supabase.from('interactions').select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .in('status', ['accepted', 'in_progress']),
    ]).then(([{ data: reqs }, { data: listedItems }, { data: posts }, { count: activeCount }, { data: viewsData }, { count: pendingCount }, { count: activeIntCount }]) => {
      setRequests((reqs as ServiceRequest[]) || []);
      setListings((listedItems as Listing[]) || []);
      setForumPosts((posts as ForumPost[]) || []);
      const totalViews = (viewsData || []).reduce((s, l) => s + (l.views || 0), 0);
      setStats({
        activeListings: activeCount || 0,
        totalViews,
        pendingInteractions: pendingCount || 0,
        activeInteractions: activeIntCount || 0,
      });
    }).finally(() => setDataLoading(false));
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const isPendingArtisan  = profile.role === 'artisan_pending';
  const isVerifiedArtisan = profile.role === 'artisan_verified';
  const isAdminRole       = profile.role === 'admin';
  const firstName         = profile.full_name?.split(' ')[0] || 'vous';

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900">Bonjour, {firstName} 👋</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {isPendingArtisan  && <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-bold"><Clock className="w-3 h-3" />En cours de validation</span>}
              {isVerifiedArtisan && <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 font-bold"><CheckCircle className="w-3 h-3" />Artisan vérifié</span>}
              {isAdminRole       && <span className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1 font-bold">👑 Administrateur</span>}
              {!isPendingArtisan && !isVerifiedArtisan && !isAdminRole && <span className="text-sm text-gray-500">Habitant · Biguglia Connect</span>}
            </div>
            {isAdminRole       && <Link href="/admin"              className="text-sm text-brand-600 hover:underline font-semibold mt-0.5 block">Accéder au panneau admin →</Link>}
            {isVerifiedArtisan && <Link href="/dashboard/artisan"  className="text-sm text-brand-600 hover:underline font-semibold mt-0.5 block">Espace artisan →</Link>}
          </div>
        </div>

        {/* ── Bannière artisan en attente ─────────────────── */}
        {isPendingArtisan && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 mb-8 flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Validation de dossier en cours</h3>
              <p className="text-sm text-amber-700 mb-3 leading-relaxed">
                Notre équipe examine votre dossier artisan. Vous pouvez le compléter ou corriger des informations en attendant la réponse.
              </p>
              <Link href="/inscription/artisan-profil"
                className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                <Wrench className="w-4 h-4" /> Compléter mon dossier
              </Link>
            </div>
          </div>
        )}

        {/* ── Bannière artisan vérifié ────────────────────── */}
        {isVerifiedArtisan && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 flex items-center gap-1.5">Espace Artisan <Star className="w-4 h-4 text-amber-500" /></h3>
                <p className="text-sm text-emerald-700">Demandes clients, avis, profil public.</p>
              </div>
            </div>
            <Link href="/dashboard/artisan" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap">
              Mon espace →
            </Link>
          </div>
        )}

        {/* ── Bannière admin ──────────────────────────────── */}
        {isAdminRole && (
          <div className="bg-gradient-to-r from-brand-50 to-orange-50 border-2 border-brand-200 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-brand-900">👑 Panneau Administrateur</h3>
              <p className="text-sm text-brand-700">Artisans, contenu, statistiques, utilisateurs.</p>
            </div>
            <Link href="/admin" className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
              Admin Panel
            </Link>
          </div>
        )}

        {/* ── Quick stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <QuickStat icon={MessageSquare} label="Messages non lus"  value={unread.messages}           href="/messages"       colorIcon="text-emerald-600" colorBg="bg-emerald-50" badge={unread.messages} />
          <QuickStat icon={Bell}          label="Notifications"      value={unread.notifications}      href="/notifications"  colorIcon="text-blue-600"   colorBg="bg-blue-50"    badge={unread.notifications} />
          <QuickStat icon={Package}       label="Annonces actives"   value={dataLoading ? '…' : stats.activeListings} href="/annonces" colorIcon="text-brand-600" colorBg="bg-brand-50" />
          <QuickStat icon={Eye}           label="Vues totales"       value={dataLoading ? '…' : stats.totalViews}     href="/annonces" colorIcon="text-purple-600" colorBg="bg-purple-50" />
        </div>

        {/* ── Mes échanges ─────────────────────────────────── */}
        {(stats.pendingInteractions > 0 || stats.activeInteractions > 0) && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-sm">Mes échanges en cours</h3>
                  <div className="flex gap-3 mt-0.5">
                    {stats.pendingInteractions > 0 && (
                      <span className="text-xs text-amber-700 font-semibold">
                        {stats.pendingInteractions} en attente de réponse
                      </span>
                    )}
                    {stats.activeInteractions > 0 && (
                      <span className="text-xs text-indigo-700 font-semibold">
                        {stats.activeInteractions} actif{stats.activeInteractions > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/mes-echanges"
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Voir tout
              </Link>
            </div>
          </div>
        )}

        {/* ── Actions rapides ─────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" /> Actions rapides
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ActionBtn icon={PenLine}      label="Déposer une demande"  href="/artisans/demande"   grad="from-brand-500 to-orange-600" />
            <ActionBtn icon={Package}      label="Publier une annonce"  href="/annonces/nouvelle"  grad="from-blue-500 to-indigo-600" />
            <ActionBtn icon={Drill}        label="Prêter du matériel"   href="/materiel/nouveau"   grad="from-emerald-500 to-teal-600" />
            <ActionBtn icon={BookOpen}     label="Créer un sujet forum" href="/forum/nouveau"      grad="from-purple-500 to-violet-600" />
          </div>
        </div>

        {/* ── Mes activités ───────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Mes activités
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Mes demandes */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-brand-500" /> Mes demandes
                </h3>
                <Link href="/artisans/demande" className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold">
                  <Plus className="w-3 h-3" /> Nouvelle
                </Link>
              </div>
              <div className="p-4">
                {dataLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : requests.length === 0 ? (
                  <EmptyCard
                    icon="📝"
                    title="Aucune demande envoyée"
                    desc="Décrivez votre projet et recevez des propositions d'artisans locaux vérifiés."
                    cta="Déposer une demande"
                    href="/artisans/demande"
                  />
                ) : (
                  <div className="space-y-2">
                    {requests.map(req => (
                      <div key={req.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{req.category?.icon}</span>
                            <span className="text-xs text-gray-400">{req.category?.name}</span>
                          </div>
                          <p className="font-semibold text-gray-800 text-sm truncate">{req.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatRelative(req.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant={req.urgency === 'tres_urgent' ? 'danger' : req.urgency === 'urgent' ? 'warning' : 'default'} className="text-[10px]">{URGENCY_LABELS[req.urgency]}</Badge>
                          <Badge variant={req.status === 'completed' ? 'success' : req.status === 'cancelled' ? 'danger' : 'info'} className="text-[10px]">{STATUS_LABELS[req.status]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mes annonces */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" /> Mes annonces
                </h3>
                <Link href="/annonces/nouvelle" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                  <Plus className="w-3 h-3" /> Nouvelle
                </Link>
              </div>
              <div className="p-4">
                {dataLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : listings.length === 0 ? (
                  <EmptyCard
                    icon="📦"
                    title="Aucune annonce publiée"
                    desc="Vendez, offrez ou échangez des objets avec vos voisins de Biguglia."
                    cta="Publier une annonce"
                    href="/annonces/nouvelle"
                  />
                ) : (
                  <div className="space-y-2">
                    {listings.map(listing => (
                      <Link key={listing.id} href={`/annonces/${listing.id}`}>
                        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{listing.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{listing.category?.name}</span>
                              {(listing.views || 0) > 0 && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Eye className="w-3 h-3" />{listing.views}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant={listing.status === 'active' ? 'success' : 'default'} className="text-[10px]">
                              {listing.status === 'active' ? 'Active' : listing.status === 'sold' ? 'Vendue' : 'Archivée'}
                            </Badge>
                            <Link href={`/annonces/${listing.id}/modifier`} onClick={e => e.stopPropagation()}
                              className="text-[10px] text-brand-600 hover:underline font-semibold">Modifier</Link>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mes messages */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> Messagerie
                  {unread.messages > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{unread.messages}</span>
                  )}
                </h3>
                <Link href="/messages" className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1">
                  Voir tous <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-4">
                {unread.messages > 0 ? (
                  <Link href="/messages">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900 text-sm">{unread.messages} message{unread.messages > 1 ? 's' : ''} non lu{unread.messages > 1 ? 's' : ''}</p>
                        <p className="text-emerald-700 text-xs">Répondez à vos conversations</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-500 ml-auto" />
                    </div>
                  </Link>
                ) : (
                  <EmptyCard
                    icon="💬"
                    title="Pas de nouveaux messages"
                    desc="Vos conversations avec les artisans et les voisins apparaîtront ici."
                    cta="Voir la messagerie"
                    href="/messages"
                  />
                )}
              </div>
            </div>

            {/* Mes sujets forum */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" /> Forum
                </h3>
                <Link href="/forum/nouveau" className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                  <Plus className="w-3 h-3" /> Nouveau sujet
                </Link>
              </div>
              <div className="p-4">
                {dataLoading ? (
                  <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                ) : forumPosts.length === 0 ? (
                  <EmptyCard
                    icon="💬"
                    title="Aucun sujet publié"
                    desc="Posez une question, partagez un conseil ou lancez une discussion avec la communauté."
                    cta="Créer un sujet"
                    href="/forum/nouveau"
                  />
                ) : (
                  <div className="space-y-2">
                    {forumPosts.map(post => (
                      <Link key={post.id} href={`/forum/${post.id}`}>
                        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{post.title}</p>
                            <p className="text-xs text-gray-400">{post.category?.name} · {formatRelative(post.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(post.views || 0) > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Liens rapides en bas ─────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { icon: Activity,    label: 'Mes échanges',        desc: 'Suivre vos interactions',    href: '/mes-echanges', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { icon: Wrench,      label: 'Trouver un artisan',  desc: 'Voir les profils vérifiés',  href: '/artisans',     color: 'text-brand-600',  bg: 'bg-brand-50' },
            { icon: HandshakeIcon, label: 'Matériel disponible', desc: 'Emprunter chez un voisin',  href: '/materiel',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: AlertCircle, label: 'Centre de confiance', desc: 'Sécurité & vérifications',  href: '/confiance',    color: 'text-sky-600',    bg: 'bg-sky-50' },
          ].map(({ icon: Icon, label, desc, href, color, bg }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition-all">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <ProtectedPage><DashboardContent /></ProtectedPage>;
}

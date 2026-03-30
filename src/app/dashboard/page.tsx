'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Clock, Package, BookOpen, Plus, Wrench, Bell, TrendingUp, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { ServiceRequest, Listing, ForumPost } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { STATUS_LABELS, URGENCY_LABELS, formatRelative, cn } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, href, color, badge }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  href: string;
  color: string;
  badge?: number;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2 rounded-xl', color)}>
            <Icon className="w-4 h-4" />
          </div>
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      </div>
    </Link>
  );
}

function DashboardContent() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const unread = useUnreadCounts();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState({
    activeListings: 0,
    totalViews: 0,
    forumComments: 0,
  });
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDataLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase.from('service_requests')
        .select('*, category:trade_categories(name, icon)')
        .eq('resident_id', profile.id)
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('listings')
        .select('*, category:listing_categories(name, icon)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('forum_posts')
        .select('*, category:forum_categories(name, icon)')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false }).limit(3),
      // Stats: annonces actives
      supabase.from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'active'),
      // Stats: vues total des annonces
      supabase.from('listings')
        .select('views')
        .eq('user_id', profile.id),
    ]).then(([
      { data: reqs },
      { data: listedItems },
      { data: posts },
      { count: activeCount },
      { data: viewsData },
    ]) => {
      setRequests((reqs as ServiceRequest[]) || []);
      setListings((listedItems as Listing[]) || []);
      setForumPosts((posts as ForumPost[]) || []);
      const totalViews = (viewsData || []).reduce((sum, l) => sum + (l.views || 0), 0);
      setStats({
        activeListings: activeCount || 0,
        totalViews,
        forumComments: 0,
      });
    }).finally(() => setDataLoading(false));
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const isPendingArtisan = profile.role === 'artisan_pending';
  const isVerifiedArtisan = profile.role === 'artisan_verified';
  const isAdminRole = profile.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {profile.full_name?.split(' ')[0] || 'vous'} 👋
          </h1>
          <p className="text-gray-500 text-sm">
            {isPendingArtisan && '⏳ Profil artisan en cours de validation'}
            {isVerifiedArtisan && '✅ Artisan vérifié'}
            {isAdminRole && '👑 Administrateur de Biguglia Connect'}
            {!isPendingArtisan && !isVerifiedArtisan && !isAdminRole && 'Bienvenue sur Biguglia Connect'}
          </p>
          {isAdminRole && <Link href="/admin" className="text-sm text-brand-600 hover:underline font-medium">Accéder au panneau admin →</Link>}
          {isVerifiedArtisan && <Link href="/dashboard/artisan" className="text-sm text-brand-600 hover:underline font-medium">Espace artisan →</Link>}
        </div>
      </div>

      {isPendingArtisan && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8 flex gap-3">
          <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800 mb-1">Validation en cours</h3>
            <p className="text-sm text-orange-700">Votre inscription artisan est en cours de vérification.</p>
          </div>
        </div>
      )}

      {isVerifiedArtisan && (
        <div className="bg-gradient-to-r from-green-50 to-brand-50 border-2 border-green-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-green-800 mb-1 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Espace Artisan
            </h3>
            <p className="text-sm text-green-700">Consultez vos demandes clients, gérez vos avis et votre profil.</p>
          </div>
          <Link href="/dashboard/artisan" className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors whitespace-nowrap">
            Mon espace →
          </Link>
        </div>
      )}

      {isAdminRole && (
        <div className="bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-brand-800 mb-1">👑 Panneau Administrateur</h3>
            <p className="text-sm text-brand-700">Gérez artisans, annonces et utilisateurs.</p>
          </div>
          <Link href="/admin" className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
            Admin Panel
          </Link>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard
          icon={MessageSquare}
          label="Messages non lus"
          value={unread.messages}
          href="/messages"
          color="bg-green-100 text-green-600"
          badge={unread.messages}
        />
        <StatCard
          icon={Bell}
          label="Notifications"
          value={unread.notifications}
          href="/notifications"
          color="bg-blue-100 text-blue-600"
          badge={unread.notifications}
        />
        <StatCard
          icon={Package}
          label="Annonces actives"
          value={dataLoading ? '...' : stats.activeListings}
          href="/annonces"
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          icon={Eye}
          label="Vues totales"
          value={dataLoading ? '...' : stats.totalViews}
          href="/annonces"
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Wrench, label: 'Trouver un artisan', href: '/artisans', color: 'bg-blue-50 text-blue-600' },
            { icon: Package, label: 'Nouvelle annonce', href: '/annonces/nouvelle', color: 'bg-orange-50 text-orange-600' },
            { icon: TrendingUp, label: 'Matériel', href: '/materiel/nouveau', color: 'bg-maquis-50 text-maquis-600' },
            { icon: BookOpen, label: 'Nouveau sujet', href: '/forum/nouveau', color: 'bg-purple-50 text-purple-600' },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link key={href} href={href}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all text-center">
                <div className={`inline-flex p-2.5 rounded-xl ${color} mb-2`}><Icon className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes demandes</h2>
            <Link href="/artisans/demande" className="text-sm text-brand-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nouvelle</Link>
          </div>
          {dataLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <EmptyState icon="📝" title="Aucune demande" description="Pas encore de demande envoyée." />
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{req.category?.icon}</span>
                        <span className="text-xs text-gray-500">{req.category?.name}</span>
                      </div>
                      <p className="font-medium text-gray-800 text-sm truncate">{req.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelative(req.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={req.urgency === 'tres_urgent' ? 'danger' : req.urgency === 'urgent' ? 'warning' : 'default'}>{URGENCY_LABELS[req.urgency]}</Badge>
                      <Badge variant={req.status === 'completed' ? 'success' : req.status === 'cancelled' ? 'danger' : 'info'}>{STATUS_LABELS[req.status]}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes annonces</h2>
            <Link href="/annonces/nouvelle" className="text-sm text-brand-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nouvelle</Link>
          </div>
          {dataLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : listings.length === 0 ? (
            <EmptyState icon="📦" title="Aucune annonce" description="Pas encore d'annonce publiée." action={{ label: 'Publier', onClick: () => router.push('/annonces/nouvelle') }} />
          ) : (
            <div className="space-y-3">
              {listings.map(listing => (
                <Link key={listing.id} href={`/annonces/${listing.id}`}>
                  <Card hover className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{listing.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{listing.category?.name}</p>
                          {(listing.views || 0) > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />{listing.views}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={listing.status === 'active' ? 'success' : 'default'}>
                          {listing.status === 'active' ? 'Active' : listing.status === 'sold' ? 'Vendue' : 'Archivée'}
                        </Badge>
                        <Link
                          href={`/annonces/${listing.id}/modifier`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Modifier
                        </Link>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {forumPosts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes sujets forum</h2>
            <Link href="/forum/nouveau" className="text-sm text-brand-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nouveau</Link>
          </div>
          <div className="space-y-3">
            {forumPosts.map(post => (
              <Link key={post.id} href={`/forum/${post.id}`}>
                <Card hover className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{post.title}</p>
                      <p className="text-xs text-gray-400">{post.category?.name} · {formatRelative(post.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(post.views || 0) > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views}</span>
                      )}
                      <BookOpen className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <ProtectedPage><DashboardContent /></ProtectedPage>;
}

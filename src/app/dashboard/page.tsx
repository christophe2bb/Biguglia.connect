'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Clock, Package, Heart, BookOpen, Plus, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ServiceRequest, Listing, ForumPost } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { STATUS_LABELS, URGENCY_LABELS, URGENCY_COLORS, formatRelative } from '@/lib/utils';

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { 
      // Attendre un peu que l'auth se charge avant de rediriger
      const timer = setTimeout(() => {
        if (!profile) router.push('/connexion');
      }, 2000);
      return () => clearTimeout(timer);
    }

    const fetchData = async () => {
      const supabase = createClient();

      const [{ data: reqs }, { data: listedItems }, { data: posts }] = await Promise.all([
        supabase.from('service_requests')
          .select('*, category:trade_categories(name, icon), artisan:artisan_profiles(business_name)')
          .eq('resident_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('listings')
          .select('*, category:listing_categories(name, icon)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('forum_posts')
          .select('*, category:forum_categories(name, icon)')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      setRequests((reqs as ServiceRequest[]) || []);
      setListings((listedItems as Listing[]) || []);
      setForumPosts((posts as ForumPost[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [profile, router]);

  if (!profile) return null;

  const quickActions = [
    { icon: Wrench, label: 'Trouver un artisan', href: '/artisans', color: 'bg-blue-50 text-blue-600' },
    { icon: MessageSquare, label: 'Mes messages', href: '/messages', color: 'bg-green-50 text-green-600' },
    { icon: Package, label: 'Publier une annonce', href: '/annonces/nouvelle', color: 'bg-orange-50 text-orange-600' },
    { icon: BookOpen, label: 'Forum', href: '/forum', color: 'bg-purple-50 text-purple-600' },
  ];

  const isPendingArtisan = profile.role === 'artisan_pending';
  const isVerifiedArtisan = profile.role === 'artisan_verified';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Accueil utilisateur */}
      <div className="flex items-center gap-4 mb-10">
        <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {profile.full_name?.split(' ')[0] || 'vous'} 👋
          </h1>
          <p className="text-gray-500">
            {isPendingArtisan && '⏳ Votre profil artisan est en cours de validation'}
            {isVerifiedArtisan && '✅ Artisan vérifié — '}
            {!isPendingArtisan && !isVerifiedArtisan && 'Bienvenue sur Biguglia Connect'}
          </p>
          {isVerifiedArtisan && (
            <Link href="/dashboard/artisan" className="text-sm text-brand-600 hover:underline font-medium">
              Accéder à l&apos;espace artisan →
            </Link>
          )}
        </div>
      </div>

      {/* Alerte artisan en attente */}
      {isPendingArtisan && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800 mb-1">Validation en cours</h3>
              <p className="text-sm text-orange-700">
                Votre inscription en tant qu&apos;artisan est en cours de vérification par l&apos;administrateur.
                Vous recevrez une notification dès que votre profil sera validé.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {quickActions.map(({ icon: Icon, label, href, color }) => (
          <Link key={href} href={href}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all duration-200 text-center">
              <div className={`inline-flex p-2.5 rounded-xl ${color} mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mes demandes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes demandes</h2>
            <Link href="/artisans/demande" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nouvelle
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <EmptyState icon="📝" title="Aucune demande" description="Vous n'avez pas encore envoyé de demande." />
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
                      <Badge variant={req.urgency === 'tres_urgent' ? 'danger' : req.urgency === 'urgent' ? 'warning' : 'default'}>
                        {URGENCY_LABELS[req.urgency]}
                      </Badge>
                      <Badge variant={req.status === 'completed' ? 'success' : req.status === 'cancelled' ? 'danger' : 'info'}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Mes annonces */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes annonces</h2>
            <Link href="/annonces/nouvelle" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nouvelle
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : listings.length === 0 ? (
            <EmptyState icon="📦" title="Aucune annonce" description="Vous n'avez pas encore publié d'annonce." action={{ label: 'Publier', onClick: () => router.push('/annonces/nouvelle') }} />
          ) : (
            <div className="space-y-3">
              {listings.map(listing => (
                <Link key={listing.id} href={`/annonces/${listing.id}`}>
                  <Card hover className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{listing.title}</p>
                        <p className="text-xs text-gray-400">{listing.category?.name}</p>
                      </div>
                      <Badge variant={listing.status === 'active' ? 'success' : 'default'}>
                        {listing.status === 'active' ? 'Active' : listing.status === 'sold' ? 'Vendue' : 'Archivée'}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mes sujets forum */}
      {forumPosts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes sujets forum</h2>
            <Link href="/forum/nouveau" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nouveau
            </Link>
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
                    <BookOpen className="w-4 h-4 text-gray-300" />
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

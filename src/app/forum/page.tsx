'use client';

import { useState, useEffect } from 'react';
import { Plus, MessageCircle, Eye, Pin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ForumCategory, ForumPost } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';

export default function ForumPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: cats } = await supabase.from('forum_categories').select('*').order('display_order');
      setCategories(cats || []);

      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles!forum_posts_author_id_fkey(id, full_name, avatar_url, role),
          category:forum_categories(*),
          comment_count:forum_comments(count)
        `)
        .eq('is_closed', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data } = await query;
      setPosts((data as unknown as ForumPost[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forum communautaire</h1>
          <p className="text-gray-500">Échangez avec les habitants de Biguglia</p>
        </div>
        {profile && (
          <Button onClick={() => router.push('/forum/nouveau')}>
            <Plus className="w-4 h-4" /> Nouveau sujet
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar catégories */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-20">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Catégories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${!selectedCategory ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Tous les sujets
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste posts */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon="💬"
              title="Aucun sujet pour le moment"
              description="Soyez le premier à lancer une discussion !"
              action={profile ? { label: 'Créer un sujet', onClick: () => router.push('/forum/nouveau') } : { label: 'S\'inscrire', onClick: () => router.push('/inscription') }}
            />
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <ForumPostCard key={post.id} post={post} currentUserId={profile?.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ForumPostCard({ post, currentUserId }: { post: ForumPost; currentUserId?: string }) {
  const commentCount = (post as ForumPost & { comment_count?: Array<{ count: number }> }).comment_count;
  const count = Array.isArray(commentCount) ? (commentCount[0] as { count: number })?.count || 0 : 0;

  return (
    <Link href={`/forum/${post.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all duration-200 p-5">
        <div className="flex items-start gap-3">
          <Avatar src={post.author?.avatar_url} name={post.author?.full_name || '?'} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                  <Pin className="w-3 h-3" /> Épinglé
                </span>
              )}
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {post.category?.icon} {post.category?.name}
              </span>
              {post.author?.role === 'artisan_verified' && (
                <Badge variant="success">Artisan</Badge>
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-brand-600 transition-colors">
              {post.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.content}</p>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{post.author?.full_name}</span>
              <span>·</span>
              <span>{formatRelative(post.created_at)}</span>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {count} réponse{count > 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.views}
              </div>
              {currentUserId && currentUserId !== post.author?.id && (
                <ReportButton targetType="post" targetId={post.id} targetTitle={post.title} variant="icon" />
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

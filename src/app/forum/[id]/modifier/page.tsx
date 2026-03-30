'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';

interface Category { id: string; name: string; icon: string; }

export default function ModifierForumPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category_id: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();

      const [{ data: post }, { data: cats }] = await Promise.all([
        supabase.from('forum_posts').select('*').eq('id', id as string).single(),
        supabase.from('forum_categories').select('*').order('display_order'),
      ]);

      if (!post) { toast.error('Sujet introuvable'); router.push('/forum'); return; }
      if (post.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
        toast.error('Non autorisé'); router.push(`/forum/${id}`); return;
      }

      setForm({ title: post.title || '', content: post.content || '', category_id: post.category_id || '' });
      setCategories(cats || []);
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs'); return;
    }
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('forum_posts').update({
      title: form.title.trim(),
      content: form.content.trim(),
      category_id: form.category_id,
    }).eq('id', id as string);

    if (error) { toast.error('Erreur lors de la sauvegarde'); setSaving(false); return; }

    toast.success('Sujet modifié !');
    router.push(`/forum/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/forum/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au sujet
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Modifier le sujet</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <Select
          label="Catégorie *"
          value={form.category_id}
          onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
          required
        >
          <option value="">Choisir une catégorie</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </Select>

        <Input
          label="Titre *"
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Titre de votre sujet..."
          required
          maxLength={200}
        />

        <Textarea
          label="Contenu *"
          value={form.content}
          onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Rédigez votre message..."
          required
          className="min-h-[200px]"
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            Enregistrer les modifications
          </Button>
          <Link href={`/forum/${id}`}>
            <Button type="button" variant="ghost">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

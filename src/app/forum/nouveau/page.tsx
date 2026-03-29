'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';

export default function NouveauSujetPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category_id: '' });

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('forum_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetch();
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title || !form.content || !form.category_id) {
      toast.error('Remplissez tous les champs');
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({ category_id: form.category_id, author_id: profile.id, title: form.title, content: form.content })
      .select()
      .single();

    if (error) { toast.error('Erreur lors de la publication'); setLoading(false); return; }

    toast.success('Sujet publié !');
    router.push(`/forum/${post.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Nouveau sujet</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Select label="Catégorie" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))} required>
            <option value="">Sélectionner une catégorie...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Input label="Titre du sujet" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Quel est votre sujet ?" required />
          <Textarea label="Contenu" value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Décrivez votre sujet en détail..." required className="min-h-[200px]" />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" className="flex-2" loading={loading}>Publier le sujet</Button>
        </div>
      </form>
    </div>
  );
}

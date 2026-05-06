'use client';

import { useState, useEffect, useRef } from 'react';
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
interface Sector   { id: string; name: string; icon: string; slug: string; }

export default function ModifierForumPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { profile, phase } = useAuthStore();
  const authReady = phase !== 'initializing';

  const isV2Ref = useRef(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors,    setSectors]    = useState<Sector[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({
    title:       '',
    content:     '',
    category_id: '',
    sector_id:   '',
  });

  useEffect(() => {
    if (!authReady) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();
      const topicId  = id as string;

      const [{ data: cats }, { data: secs }] = await Promise.all([
        supabase.from('forum_categories').select('id, name, icon').order('display_order'),
        supabase.from('forum_sectors').select('id, name, icon, slug').order('display_order'),
      ]);
      setCategories(cats || []);
      setSectors(secs || []);

      // Chercher d'abord dans forum_topics (v2)
      const { data: topicV2 } = await supabase
        .from('forum_topics')
        .select('id, title, content, category_id, sector_id, author_id')
        .eq('id', topicId)
        .maybeSingle();

      if (topicV2) {
        isV2Ref.current = true;
        if (topicV2.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
          toast.error('Non autorisé');
          router.push(`/forum/${topicId}`);
          return;
        }
        setForm({
          title:       topicV2.title       || '',
          content:     topicV2.content     || '',
          category_id: topicV2.category_id || '',
          sector_id:   topicV2.sector_id   || '',
        });
        setLoading(false);
        return;
      }

      // Fallback forum_posts (v1)
      const { data: postV1 } = await supabase
        .from('forum_posts')
        .select('id, title, content, category_id, author_id')
        .eq('id', topicId)
        .maybeSingle();

      if (!postV1) {
        toast.error('Sujet introuvable');
        router.push('/forum');
        return;
      }
      if (postV1.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
        toast.error('Non autorisé');
        router.push(`/forum/${topicId}`);
        return;
      }
      isV2Ref.current = false;
      setForm({
        title:       postV1.title       || '',
        content:     postV1.content     || '',
        category_id: postV1.category_id || '',
        sector_id:   '',
      });
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authReady, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setSaving(true);

    const supabase = createClient();
    const topicId  = id as string;
    const table    = isV2Ref.current ? 'forum_topics' : 'forum_posts';

    const payload: Record<string, unknown> = {
      title:       form.title.trim(),
      content:     form.content.trim(),
      category_id: form.category_id || null,
      updated_at:  new Date().toISOString(),
    };

    if (isV2Ref.current) {
      payload.sector_id = form.sector_id || null;
    }

    const { data: updated, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', topicId)
      .select('id');

    if (error) {
      if (error.code === '42501' || error.message?.includes('policy')) {
        toast.error("Vous n'êtes pas autorisé à modifier ce sujet.");
      } else {
        toast.error(`Erreur : ${error.message}`);
      }
      setSaving(false);
      return;
    }

    if (!updated || updated.length === 0) {
      toast.error('Modification impossible — vérifiez vos droits sur ce sujet.');
      setSaving(false);
      return;
    }

    toast.success('Sujet modifié avec succès ✅');
    router.push(`/forum/${topicId}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <Link
        href={`/forum/${id}`}
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
      >
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
          <option value="">Choisir une catégorie…</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </Select>

        {isV2Ref.current && sectors.length > 0 && (
          <Select
            label="Secteur (optionnel)"
            value={form.sector_id}
            onChange={(e) => setForm(f => ({ ...f, sector_id: e.target.value }))}
          >
            <option value="">Toute la commune</option>
            {sectors.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.icon} {sec.name}</option>
            ))}
          </Select>
        )}

        <Input
          label="Titre *"
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Titre de votre sujet…"
          required
          maxLength={200}
        />

        <Textarea
          label="Contenu *"
          value={form.content}
          onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Rédigez votre message…"
          required
          className="min-h-[200px]"
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {saving ? 'Enregistrement…' : '✅ Enregistrer les modifications'}
          </Button>
          <Link href={`/forum/${id}`}>
            <Button type="button" variant="ghost">Annuler</Button>
          </Link>
        </div>

      </form>
    </div>
  );
}

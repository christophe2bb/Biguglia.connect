'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Tag, X, Globe, Users, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface Category { id: string; name: string; icon: string; }
interface Sector    { id: string; name: string; icon: string; slug: string; }

// ─── Visibilité ───────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS = [
  { value: 'public',  icon: Globe,  label: 'Public',      desc: 'Visible par tous (même non connectés)' },
  { value: 'membres', icon: Users,  label: 'Membres',     desc: 'Visible uniquement par les membres connectés' },
  { value: 'secteur', icon: MapPin, label: 'Mon secteur', desc: 'Visible uniquement dans mon secteur' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModifierForumPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { profile, phase } = useAuthStore();
  const authReady = phase !== 'initializing';

  // Source v2 (forum_topics) ou v1 (forum_posts)
  const isV2Ref = useRef(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors,    setSectors]    = useState<Sector[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  // ── Formulaire ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title:       '',
    content:     '',
    category_id: '',
    sector_id:   '',
    visibility:  'public',
  });

  // ── Tags ──────────────────────────────────────────────────────────────────
  const [tags,     setTags]     = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  // ── Chargement des données ────────────────────────────────────────────────

  useEffect(() => {
    if (!authReady) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();
      const topicId  = id as string;

      // Catégories et secteurs (indépendant du schéma)
      const [{ data: cats }, { data: secs }] = await Promise.all([
        supabase.from('forum_categories').select('id, name, icon').order('display_order'),
        supabase.from('forum_sectors').select('id, name, icon, slug').order('display_order'),
      ]);
      setCategories(cats || []);
      setSectors(secs || []);

      // ── Chercher d'abord dans forum_topics (v2) ──────────────────────────
      const { data: topicV2 } = await supabase
        .from('forum_topics')
        .select('id, title, content, category_id, sector_id, author_id, visibility, tags')
        .eq('id', topicId)
        .maybeSingle();

      if (topicV2) {
        isV2Ref.current = true;

        // Vérification autorisation
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
          visibility:  topicV2.visibility  || 'public',
        });
        setTags(Array.isArray(topicV2.tags) ? topicV2.tags : []);
        setLoading(false);
        return;
      }

      // ── Fallback forum_posts (v1) ────────────────────────────────────────
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
        visibility:  'public',
      });
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authReady, router]);

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Le contenu est obligatoire');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const topicId  = id as string;
    const table    = isV2Ref.current ? 'forum_topics' : 'forum_posts';

    // Payload de base (compatible v1 et v2)
    const payload: Record<string, unknown> = {
      title:       form.title.trim(),
      content:     form.content.trim(),
      category_id: form.category_id || null,
      updated_at:  new Date().toISOString(),
    };

    // Champs v2 uniquement
    if (isV2Ref.current) {
      payload.sector_id  = form.sector_id  || null;
      payload.visibility = form.visibility || 'public';
      payload.tags       = tags;
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

  // ── Skeleton loading ──────────────────────────────────────────────────────

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

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/forum/${id}`}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le sujet</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Modifiez les informations de votre sujet de forum
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Bloc principal ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Informations principales
          </h2>

          {/* Catégorie */}
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

          {/* Secteur (v2 uniquement) */}
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

          {/* Titre */}
          <Input
            label="Titre *"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titre de votre sujet…"
            required
            maxLength={200}
          />
          <p className="text-xs text-gray-400 -mt-2">
            {form.title.length}/200 caractères
          </p>

          {/* Contenu */}
          <Textarea
            label="Contenu *"
            value={form.content}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Rédigez votre message…"
            required
            className="min-h-[200px]"
          />
        </div>

        {/* ── Visibilité (v2 uniquement) ─────────────────────────────────── */}
        {isV2Ref.current && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Visibilité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VISIBILITY_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, visibility: value }))}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                    form.visibility === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${form.visibility === value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${form.visibility === value ? 'text-blue-700' : 'text-gray-700'}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tags (v2 uniquement) ──────────────────────────────────────── */}
        {isV2Ref.current && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Tags <span className="font-normal normal-case text-gray-400">(optionnel, max 5)</span>
            </h2>

            {/* Tags existants */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200"
                  >
                    <Tag className="w-3 h-3" />
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Ajout d'un tag */}
            {tags.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                    if (e.key === ',')     { e.preventDefault(); addTag(); }
                  }}
                  placeholder="Ajouter un tag… (Entrée ou virgule)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  maxLength={30}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
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

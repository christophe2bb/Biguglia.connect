'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumSector, ForumCategory } from '@/types';
import toast from 'react-hot-toast';
import {
  MapPin, Tag, Eye, ChevronRight, ChevronLeft,
  Type, FileText, Globe, Lock, Users, Send, X
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Link from 'next/link';

// ─── Secteurs par défaut ──────────────────────────────────────────────────────
const SECTORS_DEFAULT: ForumSector[] = [
  { id: 'les-collines',  name: 'Les Collines',        slug: 'les-collines',  description: '', icon: '⛰️', color: 'emerald', display_order: 1 },
  { id: 'figabruna',     name: 'Figabruna',            slug: 'figabruna',     description: '', icon: '🌊', color: 'blue',    display_order: 2 },
  { id: 'village',       name: 'Village de Biguglia',  slug: 'village',       description: '', icon: '🏘️', color: 'amber',   display_order: 3 },
  { id: 'casatorra',     name: 'Casatorra',             slug: 'casatorra',     description: '', icon: '🌿', color: 'green',   display_order: 4 },
  { id: 'ortale',        name: 'Ortale',                slug: 'ortale',        description: '', icon: '🏡', color: 'violet',  display_order: 5 },
  { id: 'la-plaine',     name: 'La Plaine',             slug: 'la-plaine',     description: '', icon: '🌾', color: 'orange',  display_order: 6 },
];

const CATEGORIES_DEFAULT: ForumCategory[] = [
  { id: 'vie-quartier',    name: 'Vie du quartier',      icon: '🏠', slug: 'vie-quartier',    description: '', display_order: 1 },
  { id: 'infos-pratiques', name: 'Infos pratiques',      icon: 'ℹ️', slug: 'infos-pratiques', description: '', display_order: 2 },
  { id: 'entraide',        name: 'Entraide',              icon: '🤝', slug: 'entraide',        description: '', display_order: 3 },
  { id: 'securite',        name: 'Sécurité',              icon: '🚨', slug: 'securite',        description: '', display_order: 4 },
  { id: 'commerces',       name: 'Commerces & Services',  icon: '🛒', slug: 'commerces',       description: '', display_order: 5 },
  { id: 'enfants-ecoles',  name: 'Enfants & Écoles',      icon: '🎒', slug: 'enfants-ecoles',  description: '', display_order: 6 },
  { id: 'nature-animaux',  name: 'Nature & Animaux',      icon: '🌿', slug: 'nature-animaux',  description: '', display_order: 7 },
  { id: 'travaux',         name: 'Travaux & Chantiers',   icon: '🔧', slug: 'travaux',         description: '', display_order: 8 },
  { id: 'evenements',      name: 'Événements locaux',     icon: '🎉', slug: 'evenements',      description: '', display_order: 9 },
  { id: 'libre',           name: 'Discussion libre',      icon: '💬', slug: 'libre',           description: '', display_order: 10 },
];

const VISIBILITY_OPTIONS = [
  { value: 'public',   icon: Globe,  label: 'Public',   description: 'Visible par tous (même non connectés)' },
  { value: 'membres',  icon: Users,  label: 'Membres',  description: 'Visible uniquement par les membres connectés' },
  { value: 'secteur',  icon: MapPin, label: 'Mon secteur', description: 'Visible uniquement dans mon secteur' },
];

type Step = 1 | 2 | 3 | 4;

// ─── Indicateur étapes ─────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = (i + 1) as Step;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step < current ? 'bg-green-500 text-white' :
              step === current ? 'bg-brand-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step < current ? '✓' : step}
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 w-8 transition-colors ${step < current ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function NouveauSujetPage() {
  const { profile } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    sector_id:   '',
    category_id: '',
    title:       '',
    content:     '',
    tags:        [] as string[],
    visibility:  'public' as 'public' | 'membres' | 'secteur',
  });

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    const fetchOptions = async () => {
      const supabase = createClient();
      const { data: sectorData } = await supabase.from('forum_sectors').select('*').order('display_order');
      setSectors(sectorData && sectorData.length > 0 ? sectorData : SECTORS_DEFAULT);
      const { data: catData } = await supabase.from('forum_categories').select('*').order('display_order');
      setCategories(catData && catData.length > 0 ? catData : CATEGORIES_DEFAULT);
    };
    fetchOptions();
  }, [profile, router]);

  // ── Tags ──────────────────────────────────────────────────────────────────
  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùüÿœæ-]/g, '').slice(0, 25);
    if (!cleaned || form.tags.includes(cleaned) || form.tags.length >= 5) return;
    setForm(f => ({ ...f, tags: [...f.tags, cleaned] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  // ── Navigation étapes ─────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 1) return !!form.sector_id;
    if (step === 2) return !!form.category_id;
    if (step === 3) return form.title.trim().length >= 5 && form.content.trim().length >= 10;
    return true;
  };

  const nextStep = () => { if (canGoNext()) setStep(s => Math.min(4, s + 1) as Step); };
  const prevStep = () => setStep(s => Math.max(1, s - 1) as Step);

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();

    // Essayer forum_topics (v2) sinon forum_posts (v1)
    const { data: topicData, error } = await supabase
      .from('forum_topics')
      .insert({
        sector_id:   form.sector_id   || null,
        category_id: form.category_id || null,
        author_id:   profile.id,
        title:       form.title.trim(),
        content:     form.content.trim(),
        status:      'ouvert',
        visibility:  form.visibility,
        tags:        form.tags,
        is_pinned:   false,
        is_hot:      false,
        views:       0,
        reply_count: 0,
        reaction_count: 0,
      })
      .select()
      .single();

    if (error) {
      // Fallback v1 forum_posts
      const { data: postData, error: err2 } = await supabase
        .from('forum_posts')
        .insert({
          category_id: form.category_id || null,
          author_id:   profile.id,
          title:       form.title.trim(),
          content:     form.content.trim(),
        })
        .select()
        .single();

      if (err2) { toast.error('Erreur lors de la publication'); setLoading(false); return; }
      toast.success('Sujet publié !');
      router.push(`/forum/${postData.id}`);
      return;
    }

    // Insérer les tags si la table forum_topic_tags existe
    if (form.tags.length > 0) {
      for (const tagName of form.tags) {
        // Upsert tag
        const { data: tagData } = await supabase
          .from('forum_tags')
          .upsert({ name: tagName, slug: tagName }, { onConflict: 'slug' })
          .select('id')
          .single();
        if (tagData) {
          try {
            await supabase.from('forum_topic_tags').insert({
              topic_id: topicData.id,
              tag_id:   tagData.id,
            });
          } catch { /* Table optionnelle */ }
        }
      }
    }

    toast.success('Sujet publié !');
    router.push(`/forum/${topicData.id}`);
  };

  // ── Sélection secteur ─────────────────────────────────────────────────────
  const SECTOR_COLORS: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    blue:    'bg-blue-50 border-blue-300 text-blue-800',
    amber:   'bg-amber-50 border-amber-300 text-amber-800',
    green:   'bg-green-50 border-green-300 text-green-800',
    violet:  'bg-violet-50 border-violet-300 text-violet-800',
    orange:  'bg-orange-50 border-orange-300 text-orange-800',
    gray:    'bg-gray-50 border-gray-300 text-gray-800',
  };

  const selectedSector = sectors.find(s => s.id === form.sector_id || s.slug === form.sector_id);
  const selectedCategory = categories.find(c => c.id === form.category_id || c.slug === form.category_id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Retour */}
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au forum
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau sujet</h1>
      <p className="text-gray-500 text-sm mb-6">Partagez une info, posez une question ou lancez une discussion avec vos voisins.</p>

      {/* Indicateur étapes */}
      <StepIndicator current={step} total={4} />

      {/* ── ÉTAPE 1 : Secteur ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Choisissez votre secteur</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Le forum est organisé par secteurs géographiques de Biguglia.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sectors.map(sector => {
              const colors = SECTOR_COLORS[sector.color || 'gray'];
              const isSelected = form.sector_id === sector.id || form.sector_id === sector.slug;
              return (
                <button
                  key={sector.id}
                  onClick={() => setForm(f => ({ ...f, sector_id: sector.id || sector.slug }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected ? `${colors} border-2 ring-2 ring-offset-1 ring-brand-300` : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{sector.icon}</span>
                  <span className="text-xs font-medium text-gray-700 leading-tight">{sector.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => { setForm(f => ({ ...f, sector_id: 'general' })); setStep(2); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              🗺️ Toute la commune (sujet général)
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : Catégorie ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Choisissez une catégorie</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Aidez la communauté à retrouver votre sujet facilement.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map(cat => {
              const isSelected = form.category_id === cat.id || form.category_id === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setForm(f => ({ ...f, category_id: cat.id || cat.slug }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'bg-brand-50 border-brand-300 text-brand-800'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 : Contenu ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Rédigez votre sujet</h2>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Un titre clair et descriptif..."
              maxLength={120}
            />
            <div className="text-right text-xs text-gray-400 mt-1">{form.title.length}/120</div>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contenu <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Décrivez votre sujet en détail. Plus vous êtes précis, plus les réponses seront pertinentes..."
              className="min-h-[180px]"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{form.content.length} caractères</div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags (optionnel — max 5)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl bg-gray-50 min-h-[44px]">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-lg">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-brand-400 hover:text-brand-700 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {form.tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={form.tags.length === 0 ? 'Ajouter un tag... (Entrée)' : ''}
                  className="flex-1 min-w-24 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée ou virgule pour ajouter un tag</p>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 : Récapitulatif + Visibilité ── */}
      {step === 4 && (
        <div className="space-y-4">

          {/* Visibilité */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900">Visibilité du sujet</h2>
            </div>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, visibility: opt.value as 'public' | 'membres' | 'secteur' }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    form.visibility === opt.value
                      ? 'bg-brand-50 border-brand-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 flex-shrink-0 ${form.visibility === opt.value ? 'text-brand-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📋 Récapitulatif</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Secteur</dt>
                <dd className="text-gray-800 font-medium">
                  {selectedSector ? `${selectedSector.icon} ${selectedSector.name}` : '🗺️ Général'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Catégorie</dt>
                <dd className="text-gray-800 font-medium">
                  {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Titre</dt>
                <dd className="text-gray-800 font-semibold">{form.title}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Contenu</dt>
                <dd className="text-gray-600 line-clamp-3">{form.content}</dd>
              </div>
              {form.tags.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {form.tags.map(t => (
                      <span key={t} className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md">#{t}</span>
                    ))}
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Visibilité</dt>
                <dd className="text-gray-800">{VISIBILITY_OPTIONS.find(o => o.value === form.visibility)?.label}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center gap-3 mt-6">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={prevStep} className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Retour
          </Button>
        )}
        {step < 4 ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!canGoNext()}
            className="flex items-center gap-1 flex-1 justify-center"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            loading={loading}
            className="flex items-center gap-2 flex-1 justify-center"
          >
            <Send className="w-4 h-4" /> Publier le sujet
          </Button>
        )}
      </div>

      {/* Indication étape */}
      <p className="text-center text-xs text-gray-400 mt-3">
        Étape {step} sur 4
      </p>
    </div>
  );
}

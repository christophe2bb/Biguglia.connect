'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumSector, ForumCategory } from '@/types';
import toast from 'react-hot-toast';
import {
  MapPin, Tag, Eye, ChevronRight, ChevronLeft,
  FileText, Globe, Users, Send, X, Camera, Upload, Trash2
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
  { value: 'public',   icon: Globe,  label: 'Public',         description: 'Visible par tous (même non connectés)' },
  { value: 'membres',  icon: Users,  label: 'Membres',        description: 'Visible uniquement par les membres connectés' },
  { value: 'secteur',  icon: MapPin, label: 'Mon secteur',    description: 'Visible uniquement dans mon secteur' },
];

type Step = 1 | 2 | 3 | 4;

// ─── Indicateur étapes ─────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  const labels = ['Secteur', 'Catégorie', 'Rédaction', 'Finaliser'];
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = (i + 1) as Step;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-brand-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {isDone ? '✓' : step}
              </div>
              <span className={`text-xs hidden sm:block ${isActive ? 'text-brand-600 font-medium' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-3 transition-colors ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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

  // ── Gestion photos ────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) toast.error(`Maximum 5 photos — ${files.length - remaining} ignorée(s)`);

    toAdd.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} dépasse 8 Mo`); return; }
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
      setPhotos(prev => [...prev, file]);
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

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

    // Insérer le sujet (v2 sinon v1)
    let topicId: string | null = null;

    const { data: topicData, error } = await supabase
      .from('forum_topics')
      .insert({
        sector_id:      form.sector_id   || null,
        category_id:    form.category_id || null,
        author_id:      profile.id,
        title:          form.title.trim(),
        content:        form.content.trim(),
        status:         'ouvert',
        visibility:     form.visibility,
        tags:           form.tags,
        is_pinned:      false,
        is_hot:         false,
        views:          0,
        reply_count:    0,
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
      topicId = postData.id;
    } else {
      topicId = topicData.id;

      // Insérer les tags
      if (form.tags.length > 0) {
        for (const tagName of form.tags) {
          const { data: tagRow } = await supabase
            .from('forum_tags')
            .upsert({ name: tagName, slug: tagName }, { onConflict: 'slug' })
            .select('id')
            .single();
          if (tagRow) {
            try {
              await supabase.from('forum_topic_tags').insert({ topic_id: topicId, tag_id: tagRow.id });
            } catch { /* Table optionnelle */ }
          }
        }
      }
    }

    // Upload photos
    if (photos.length > 0 && topicId) {
      setUploadingPhotos(true);
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `forum/${topicId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('photos')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i + 1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          // Essayer forum_topic_photos (v2)
          try {
            await supabase.from('forum_topic_photos').insert({
              topic_id:      topicId,
              url:           u.publicUrl,
              display_order: i,
            });
          } catch {
            // Si table n'existe pas encore, on ignore
          }
        }
      }
      setUploadingPhotos(false);
    }

    toast.success('Sujet publié !');
    router.push(`/forum/${topicId}`);
  };

  // ─── Couleurs secteurs ────────────────────────────────────────────────────
  const SECTOR_COLORS: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    blue:    'bg-blue-50 border-blue-300 text-blue-800',
    amber:   'bg-amber-50 border-amber-300 text-amber-800',
    green:   'bg-green-50 border-green-300 text-green-800',
    violet:  'bg-violet-50 border-violet-300 text-violet-800',
    orange:  'bg-orange-50 border-orange-300 text-orange-800',
    gray:    'bg-gray-50 border-gray-300 text-gray-800',
  };

  const selectedSector   = sectors.find(s => s.id === form.sector_id || s.slug === form.sector_id);
  const selectedCategory = categories.find(c => c.id === form.category_id || c.slug === form.category_id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Retour */}
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au forum
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nouveau sujet</h1>
      <p className="text-gray-500 text-sm mb-6">Partagez une info, posez une question ou lancez une discussion.</p>

      {/* Indicateur étapes */}
      <StepIndicator current={step} total={4} />

      {/* ── ÉTAPE 1 : Secteur ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Dans quel secteur ?</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Le forum est organisé par secteurs de Biguglia. Choisissez le plus proche de votre sujet.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sectors.map(sector => {
              const colors = SECTOR_COLORS[sector.color || 'gray'];
              const isSelected = form.sector_id === sector.id || form.sector_id === sector.slug;
              return (
                <button
                  key={sector.id}
                  onClick={() => setForm(f => ({ ...f, sector_id: sector.id || sector.slug }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected ? `${colors} ring-2 ring-offset-1 ring-brand-300` : 'bg-white border-gray-200 hover:bg-gray-50'
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
            <h2 className="font-semibold text-gray-900">Quel type de sujet ?</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Choisissez la catégorie qui correspond le mieux à votre sujet.</p>

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

      {/* ── ÉTAPE 3 : Contenu + Photos ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2">
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
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Décrivez votre sujet en détail. Plus vous êtes précis, plus les réponses seront pertinentes..."
              className="min-h-[160px]"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{form.content.length} caractères</div>
          </div>

          {/* ── PHOTOS ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-gray-400" />
              Photos <span className="text-gray-400 font-normal">(optionnel — max 5, 8 Mo chacune)</span>
            </label>

            {/* Zone de dépôt */}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors group"
              >
                <Upload className="w-6 h-6 text-gray-300 group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm text-gray-500 group-hover:text-brand-600 transition-colors">
                  Cliquer pour ajouter des photos
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP • max 8 Mo par photo</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {/* Prévisualisations */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover rounded-xl border border-gray-200"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-brand-600/80 text-white text-xs px-1.5 py-0.5 rounded-md">
                        Couverture
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <span className="text-2xl text-gray-300">+</span>
                  </button>
                )}
              </div>
            )}
            {photos.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{photos.length}/5 photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Mots-clés <span className="text-gray-400 font-normal">(optionnel — max 5)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl bg-gray-50 min-h-[44px]">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-lg">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-brand-400 hover:text-brand-700 ml-0.5">
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
                  placeholder={form.tags.length === 0 ? 'Ex : eau, route, bruit... (Entrée pour valider)' : ''}
                  className="flex-1 min-w-32 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Entrée ou virgule pour valider un mot-clé</p>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 : Visibilité + Récapitulatif ── */}
      {step === 4 && (
        <div className="space-y-4">

          {/* Visibilité */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900">Qui peut voir ce sujet ?</h2>
            </div>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
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
                  {form.visibility === opt.value && (
                    <span className="ml-auto text-brand-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📋 Récapitulatif
            </h2>
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
                <dt className="text-gray-400 w-28 flex-shrink-0">Description</dt>
                <dd className="text-gray-600 line-clamp-3">{form.content}</dd>
              </div>
              {photos.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0">Photos</dt>
                  <dd className="flex gap-1.5 flex-wrap">
                    {photoPreviews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    ))}
                    <span className="text-xs text-gray-500 self-center">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
                  </dd>
                </div>
              )}
              {form.tags.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0">Mots-clés</dt>
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
            loading={loading || uploadingPhotos}
            className="flex items-center gap-2 flex-1 justify-center"
          >
            <Send className="w-4 h-4" />
            {uploadingPhotos ? 'Envoi des photos...' : 'Publier le sujet'}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">Étape {step} sur 4</p>
    </div>
  );
}

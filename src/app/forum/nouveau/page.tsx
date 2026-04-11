'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ForumSector, ForumCategory } from '@/types';
import toast from 'react-hot-toast';
import {
  MapPin, Tag, Eye, ChevronRight, ChevronLeft,
  FileText, Globe, Users, Send, X, Camera, Upload, Trash2,
  HelpCircle, Megaphone, Lightbulb, ThumbsUp, Heart,
  AlertTriangle, BookOpen, Star, AlertCircle, CheckCircle2,
  Search, ExternalLink, Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Secteurs par défaut ──────────────────────────────────────────────────────
const SECTORS_DEFAULT: ForumSector[] = [
  { id: 'les-collines',  name: 'Les Collines',        slug: 'les-collines',  description: 'Quartier résidentiel sur les hauteurs', icon: '⛰️', color: 'emerald', display_order: 1 },
  { id: 'figabruna',     name: 'Figabruna',            slug: 'figabruna',     description: 'Secteur sud de Biguglia',               icon: '🌊', color: 'blue',    display_order: 2 },
  { id: 'village',       name: 'Village de Biguglia',  slug: 'village',       description: 'Cœur historique du village',            icon: '🏘️', color: 'amber',   display_order: 3 },
  { id: 'casatorra',     name: 'Casatorra',             slug: 'casatorra',     description: 'Secteur Casatorra',                     icon: '🌿', color: 'green',   display_order: 4 },
  { id: 'ortale',        name: 'Ortale',                slug: 'ortale',        description: 'Quartier Ortale',                       icon: '🏡', color: 'violet',  display_order: 5 },
  { id: 'la-plaine',     name: 'La Plaine',             slug: 'la-plaine',     description: 'Zone de la plaine et étang',            icon: '🌾', color: 'orange',  display_order: 6 },
  { id: 'la-marana',     name: 'La Marana',             slug: 'la-marana',     description: 'Zone de La Marana',                     icon: '🏖️', color: 'cyan',    display_order: 7 },
];

const CATEGORIES_DEFAULT: ForumCategory[] = [
  { id: 'vie-quartier',    name: 'Vie du quartier',      icon: '🏠', slug: 'vie-quartier',    description: 'Vie de quartier au quotidien',     display_order: 1 },
  { id: 'infos-pratiques', name: 'Infos pratiques',      icon: 'ℹ️', slug: 'infos-pratiques', description: 'Informations locales utiles',       display_order: 2 },
  { id: 'entraide',        name: 'Entraide',              icon: '🤝', slug: 'entraide',        description: 'Covoiturage, aide ponctuelle',     display_order: 3 },
  { id: 'securite',        name: 'Sécurité',              icon: '🚨', slug: 'securite',        description: 'Sécurité, vigilance de quartier',  display_order: 4 },
  { id: 'commerces',       name: 'Commerces & Services',  icon: '🛒', slug: 'commerces',       description: 'Commerces et services locaux',     display_order: 5 },
  { id: 'enfants-ecoles',  name: 'Enfants & Écoles',      icon: '🎒', slug: 'enfants-ecoles',  description: 'Enfants, écoles, activités',       display_order: 6 },
  { id: 'nature-animaux',  name: 'Nature & Animaux',      icon: '🌿', slug: 'nature-animaux',  description: 'Nature, animaux, environnement',   display_order: 7 },
  { id: 'travaux',         name: 'Travaux & Chantiers',   icon: '🔧', slug: 'travaux',         description: 'Travaux, chantiers, bricolage',    display_order: 8 },
  { id: 'evenements',      name: 'Événements locaux',     icon: '🎉', slug: 'evenements',      description: 'Événements, sorties locales',      display_order: 9 },
  { id: 'libre',           name: 'Discussion libre',      icon: '💬', slug: 'libre',           description: 'Discussion libre entre habitants', display_order: 10 },
];

const VISIBILITY_OPTIONS = [
  { value: 'public',  icon: Globe,  label: 'Public',       description: 'Visible par tous (même non connectés)' },
  { value: 'membres', icon: Users,  label: 'Membres',      description: 'Visible uniquement par les membres connectés' },
  { value: 'secteur', icon: MapPin, label: 'Mon secteur',  description: 'Visible uniquement dans mon secteur' },
];

// ─── Types de post ─────────────────────────────────────────────────────────────
const POST_TYPES = [
  { value: 'question',       icon: HelpCircle,     label: 'Question',         desc: 'Je cherche une info ou un conseil',         color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-300'    },
  { value: 'information',    icon: Megaphone,      label: 'Information',      desc: 'Je partage une info utile',                 color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300'   },
  { value: 'idee',           icon: Lightbulb,      label: 'Idée / Suggestion',desc: 'Je propose une amélioration',               color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-300' },
  { value: 'avis',           icon: ThumbsUp,       label: 'Avis / Retour',    desc: 'Je donne mon avis sur un sujet',            color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300'  },
  { value: 'besoin',         icon: Heart,          label: 'Besoin / Demande', desc: 'J\'ai besoin d\'aide ou d\'un service',    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-300'   },
  { value: 'alerte',         icon: AlertTriangle,  label: 'Alerte douce',     desc: 'Je signale un problème local',              color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300' },
  { value: 'retour',         icon: BookOpen,       label: 'Retour d\'expérience', desc: 'Je partage mon vécu',                   color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-300'   },
  { value: 'recommandation', icon: Star,           label: 'Recommandation',   desc: 'Je recommande un lieu, artisan, service',   color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300' },
];

// ─── Niveaux d'urgence ─────────────────────────────────────────────────────────
const URGENCY_LEVELS = [
  { value: 'basse',  emoji: '🟢', label: 'Info générale',  desc: 'Pas urgent, pour information' },
  { value: 'normal', emoji: '🟡', label: 'Normal',         desc: 'Sujet important mais pas pressé' },
  { value: 'haute',  emoji: '🔴', label: 'Urgent',         desc: 'Besoin d\'attention rapide' },
];

// ─── Couleurs secteurs ─────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  blue:    'bg-blue-50 border-blue-300 text-blue-800',
  amber:   'bg-amber-50 border-amber-300 text-amber-800',
  green:   'bg-green-50 border-green-300 text-green-800',
  violet:  'bg-violet-50 border-violet-300 text-violet-800',
  orange:  'bg-orange-50 border-orange-300 text-orange-800',
  cyan:    'bg-cyan-50 border-cyan-300 text-cyan-800',
  gray:    'bg-gray-50 border-gray-300 text-gray-800',
};

type Step = 1 | 2 | 3 | 4;

// ─── Indicateur étapes PRO ─────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  const labels = ['Localisation', 'Thème', 'Rédaction', 'Finaliser'];
  const icons  = ['📍', '🏷️', '✍️', '🚀'];
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = (i + 1) as Step;
        const isDone   = step < current;
        const isActive = step === current;
        return (
          <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm',
                isDone   ? 'bg-emerald-500 text-white scale-95' :
                isActive ? 'bg-violet-600 text-white ring-4 ring-violet-200' :
                           'bg-gray-100 text-gray-400'
              )}>
                {isDone ? '✓' : icons[i]}
              </div>
              <span className={cn('text-[11px] hidden sm:block font-semibold mt-0.5',
                isActive ? 'text-violet-600' : isDone ? 'text-emerald-600' : 'text-gray-400'
              )}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1 mb-3.5 transition-colors rounded-full', isDone ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function NouveauSujetPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Anti-doublon
  const [similarTopics, setSimilarTopics] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [showSimilar, setShowSimilar] = useState(true);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [form, setForm] = useState({
    sector_id:   '',
    category_id: '',
    post_type:   '',
    urgency:     'basse' as 'basse' | 'normal' | 'haute',
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

  // ── Anti-doublon ────────────────────────────────────────────────────────────
  const searchSimilar = useCallback(async (title: string) => {
    if (title.trim().length < 4) { setSimilarTopics([]); return; }
    setSearchingDuplicates(true);
    try {
      const supabase = createClient();
      const words = title.trim().split(' ').filter(w => w.length > 3).slice(0, 3);
      if (words.length === 0) { setSimilarTopics([]); return; }

      const { data } = await supabase
        .from('forum_topics')
        .select('id, title, created_at')
        .or(words.map(w => `title.ilike.%${w}%`).join(','))
        .not('status', 'eq', 'masque')
        .order('created_at', { ascending: false })
        .limit(3);

      setSimilarTopics((data || []).filter(t => t.title !== title));
    } catch {
      setSimilarTopics([]);
    } finally {
      setSearchingDuplicates(false);
    }
  }, []);

  // Debounce sur le titre
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 3 && form.title.trim().length >= 4) {
        searchSimilar(form.title);
        setShowSimilar(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.title, step, searchSimilar]);

  // ── Gestion photos ───────────────────────────────────────────────────────────
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ── Tags ──────────────────────────────────────────────────────────────────────
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

  // ── Navigation étapes ─────────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 1) return !!form.sector_id;
    if (step === 2) return !!form.category_id;
    if (step === 3) return form.title.trim().length >= 5 && form.content.trim().length >= 10;
    return true;
  };

  const nextStep = () => { if (canGoNext()) setStep(s => Math.min(4, s + 1) as Step); };
  const prevStep = () => setStep(s => Math.max(1, s - 1) as Step);

  // ── Soumission ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();

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
        post_type:      form.post_type   || null,
        urgency:        form.urgency,
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

      // Tags
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
          try {
            await supabase.from('forum_topic_photos').insert({
              topic_id:      topicId,
              url:           u.publicUrl,
              display_order: i,
            });
          } catch { /* ignore */ }
        }
      }
      setUploadingPhotos(false);
    }

    toast.success('Sujet publié avec succès ! 🎉');
    router.push(`/forum/${topicId}`);
  };

  const selectedSector   = sectors.find(s => s.id === form.sector_id || s.slug === form.sector_id);
  const selectedCategory = categories.find(c => c.id === form.category_id || c.slug === form.category_id);
  const selectedPostType = POST_TYPES.find(t => t.value === form.post_type);
  const selectedUrgency  = URGENCY_LEVELS.find(u => u.value === form.urgency);

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/forum" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Retour au forum
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Étape {step}/4</span>
            <div className="flex gap-0.5">
              {[1,2,3,4].map(s => (
                <div key={s} className={cn('w-5 h-1.5 rounded-full transition-all', s <= step ? 'bg-violet-500' : 'bg-gray-200')} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Titre page */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">✍️ Nouveau sujet</h1>
          <p className="text-gray-500 text-sm">Partagez une info, posez une question ou lancez une discussion — en moins de 60 secondes.</p>
        </div>

        {/* Indicateur étapes */}
        <StepIndicator current={step} total={4} />

        {/* ══════════════════════════════════════════════
            ÉTAPE 1 : Localisation
        ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-base">📍</div>
              <div>
                <h2 className="font-black text-gray-900">Dans quel secteur ?</h2>
                <p className="text-xs text-gray-400">Choisissez le secteur de Biguglia concerné</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5 mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
              💡 Le secteur permet aux voisins du même quartier de trouver facilement votre sujet.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sectors.map(sector => {
                const colors = SECTOR_COLORS[sector.color || 'gray'];
                const isSelected = form.sector_id === sector.id || form.sector_id === sector.slug;
                return (
                  <button
                    key={sector.id}
                    onClick={() => setForm(f => ({ ...f, sector_id: sector.id || sector.slug }))}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                      isSelected ? cn(colors, 'ring-2 ring-offset-1 ring-violet-400 shadow-md scale-[1.02]') : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    )}
                  >
                    <span className="text-3xl">{sector.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-tight">{sector.name}</p>
                      {sector.description && (
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{sector.description}</p>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setForm(f => ({ ...f, sector_id: 'general' })); setStep(2); }}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors font-medium"
              >
                🗺️ Toute la commune — sujet général
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ÉTAPE 2 : Catégorie + Type de post
        ══════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Catégorie */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-base">🏷️</div>
                <div>
                  <h2 className="font-black text-gray-900">Quel sujet ?</h2>
                  <p className="text-xs text-gray-400">Choisissez la catégorie la plus proche</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(cat => {
                  const isSelected = form.category_id === cat.id || form.category_id === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setForm(f => ({ ...f, category_id: cat.id || cat.slug }))}
                      className={cn('flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                        isSelected ? 'bg-violet-50 border-violet-400 text-violet-800 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                      )}
                    >
                      <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight">{cat.name}</p>
                        {cat.description && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type de post (optionnel) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-gray-800 text-sm">Type de post <span className="text-gray-400 font-normal">(optionnel)</span></h3>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POST_TYPES.map(pt => {
                  const I = pt.icon;
                  const isSelected = form.post_type === pt.value;
                  return (
                    <button
                      key={pt.value}
                      onClick={() => setForm(f => ({ ...f, post_type: isSelected ? '' : pt.value }))}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center text-xs',
                        isSelected ? cn(pt.bg, pt.border, pt.color, 'shadow-sm') : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'
                      )}
                    >
                      <I className="w-4 h-4" />
                      <span className="font-bold leading-tight">{pt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ÉTAPE 3 : Rédaction
        ══════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-base">✍️</div>
                <div>
                  <h2 className="font-black text-gray-900">Rédigez votre sujet</h2>
                  <p className="text-xs text-gray-400">Soyez précis pour obtenir de meilleures réponses</p>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Titre <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">({form.title.length}/120)</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Un titre clair et précis…"
                  maxLength={120}
                />
                {/* Anti-doublon */}
                {form.title.trim().length >= 4 && showSimilar && (
                  <div className="mt-2">
                    {searchingDuplicates && (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Search className="w-3 h-3 animate-pulse" /> Recherche de sujets similaires…
                      </p>
                    )}
                    {!searchingDuplicates && similarTopics.length > 0 && (
                      <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Sujets similaires déjà publiés
                          </p>
                          <button onClick={() => setShowSimilar(false)} className="text-amber-400 hover:text-amber-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {similarTopics.map(t => (
                            <Link key={t.id} href={`/forum/${t.id}`} target="_blank"
                              className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900 font-medium group">
                              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                              <span className="line-clamp-1">{t.title}</span>
                            </Link>
                          ))}
                        </div>
                        <p className="text-[11px] text-amber-600 mt-2">Si votre sujet est différent, continuez quand même ✓</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Urgence */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Niveau d&apos;urgence</label>
                <div className="flex gap-2">
                  {URGENCY_LEVELS.map(u => (
                    <button
                      key={u.value}
                      onClick={() => setForm(f => ({ ...f, urgency: u.value as 'basse' | 'normal' | 'haute' }))}
                      className={cn('flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all',
                        form.urgency === u.value ? 'bg-gray-800 border-gray-700 text-white shadow-md scale-[1.02]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <span className="text-lg">{u.emoji}</span>
                      <span className="text-xs font-bold">{u.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">{u.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenu */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">({form.content.length} caractères)</span>
                </label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Décrivez votre sujet en détail. Plus vous êtes précis, plus les réponses seront utiles…"
                  className="min-h-[160px]"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-gray-400" />
                  Photos <span className="text-gray-400 font-normal">(optionnel — max 5, 8 Mo)</span>
                </label>

                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-violet-300 hover:bg-violet-50 transition-colors group"
                  >
                    <Upload className="w-6 h-6 text-gray-300 group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm text-gray-500 group-hover:text-violet-600 transition-colors">
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

                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative group aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 bg-violet-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-md">
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
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-violet-300 hover:bg-violet-50 transition-colors"
                      >
                        <span className="text-2xl text-gray-300">+</span>
                      </button>
                    )}
                  </div>
                )}
                {photos.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{photos.length}/5 photo{photos.length > 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Mots-clés <span className="text-gray-400 font-normal">(optionnel — max 5)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl bg-gray-50 min-h-[44px]">
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-lg">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-violet-400 hover:text-violet-700 ml-0.5">
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
                      placeholder={form.tags.length === 0 ? 'Ex : eau, route, bruit… (Entrée pour valider)' : ''}
                      className="flex-1 min-w-32 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Entrée ou virgule pour valider un mot-clé</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ÉTAPE 4 : Visibilité + Récapitulatif
        ══════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Visibilité */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-base">🚀</div>
                <div>
                  <h2 className="font-black text-gray-900">Qui peut voir ce sujet ?</h2>
                  <p className="text-xs text-gray-400">Choisissez la visibilité de votre publication</p>
                </div>
              </div>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, visibility: opt.value as 'public' | 'membres' | 'secteur' }))}
                    className={cn('w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                      form.visibility === opt.value ? 'bg-violet-50 border-violet-400 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <opt.icon className={cn('w-5 h-5 flex-shrink-0', form.visibility === opt.value ? 'text-violet-600' : 'text-gray-400')} />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </div>
                    {form.visibility === opt.value && (
                      <CheckCircle2 className="w-5 h-5 text-violet-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Récapitulatif PRO */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2">
                📋 Récapitulatif avant publication
              </h2>

              {/* Prévisualisation */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-700">
                    {profile?.full_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedPostType && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold border', selectedPostType.bg, selectedPostType.color, selectedPostType.border)}>
                          {selectedPostType.label}
                        </span>
                      )}
                      {selectedSector && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                          {selectedSector.icon} {selectedSector.name}
                        </span>
                      )}
                      {form.urgency !== 'basse' && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold',
                          form.urgency === 'haute' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {selectedUrgency?.emoji} {selectedUrgency?.label}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{form.title || 'Titre de votre sujet'}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.content || 'Description…'}</p>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.tags.map(t => (
                          <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Détails */}
              <dl className="space-y-2.5 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Secteur</dt>
                  <dd className="text-gray-800 font-medium text-xs">
                    {selectedSector ? `${selectedSector.icon} ${selectedSector.name}` : '🗺️ Général'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Catégorie</dt>
                  <dd className="text-gray-800 font-medium text-xs">
                    {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : '—'}
                  </dd>
                </div>
                {selectedPostType && (
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Type</dt>
                    <dd className="text-gray-800 font-medium text-xs">{selectedPostType.label}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Urgence</dt>
                  <dd className="text-gray-800 font-medium text-xs">{selectedUrgency?.emoji} {selectedUrgency?.label}</dd>
                </div>
                {photos.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Photos</dt>
                    <dd className="flex gap-1.5 flex-wrap">
                      {photoPreviews.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      ))}
                    </dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Visibilité</dt>
                  <dd className="text-gray-800 font-medium text-xs">{VISIBILITY_OPTIONS.find(o => o.value === form.visibility)?.label}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────────── */}
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
              className="flex items-center gap-2 flex-1 justify-center bg-violet-600 hover:bg-violet-700"
            >
              <Send className="w-4 h-4" />
              {uploadingPhotos ? 'Envoi des photos…' : 'Publier le sujet'}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          En publiant, vous acceptez la{' '}
          <Link href="/forum/charte" className="text-violet-500 hover:underline">charte du forum</Link>.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import ReportButton from '@/components/ui/ReportButton';
import {
  ArrowLeft, MapPin, Phone, Mail, Globe, Calendar, Users,
  Handshake, Shield, CheckCircle2, Loader2, AlertCircle, Share2,
  Bookmark, BookmarkCheck, ExternalLink, Star,
  Zap, MessageSquare, Bell, BookOpen, Dumbbell, Music, Leaf,
  Baby, Dog, Building2, Clock, Tag, Heart, ChevronRight, Camera, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { SectorBadge } from '@/components/ui/SectorFilter';

// ─── Types (same as associations/page.tsx) ────────────────────────────────────
type AssoCategory =
  | 'sport' | 'culture' | 'solidarite' | 'jeunesse' | 'environnement'
  | 'loisirs' | 'animaux' | 'patrimoine' | 'sante' | 'education'
  | 'seniors' | 'autre';

type PubType =
  | 'vitrine' | 'benevoles' | 'activite' | 'adherents'
  | 'materiel' | 'evenement' | 'dons' | 'partenaires';

type Association = {
  id: string;
  author_id: string;
  author?: { full_name?: string; avatar_url?: string } | null;
  pub_type: PubType;
  status: string;
  name: string;
  slogan: string | null;
  category: AssoCategory;
  description_short: string;
  description_full: string | null;
  location: string;
  address: string | null;
  schedule: string | null;
  public_target: string[];
  age_min: number | null;
  age_max: number | null;
  membership_required: boolean;
  price_type: string;
  price_detail: string | null;
  capacity: number | null;
  activities: string[];
  frequency: string | null;
  tags: string[];
  needs: string[];
  need_detail: string | null;
  contact_name: string;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_website: string | null;
  contact_facebook: string | null;
  contact_instagram: string | null;
  contact_mode: string;
  show_phone: boolean;
  declared: boolean;
  rna_number: string | null;
  pmr_accessible: boolean;
  families_welcome: boolean;
  animals_ok: boolean;
  indoor: boolean | null;
  parking_nearby: boolean;
  material_provided: boolean;
  registration_required: boolean;
  places_limited: boolean;
  urgent_need: boolean;
  sector_id?: string | null;
  is_accepting_members?: boolean;
  is_accepting_volunteers?: boolean;
  is_accepting_donations?: boolean;
  is_accepting_partners?: boolean;
  last_activity_at?: string | null;
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
};

const CAT_CONFIG: Record<AssoCategory, { label: string; icon: React.ElementType; color: string; bg: string; emoji: string }> = {
  sport:        { label: 'Sport',         icon: Dumbbell,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',   emoji: '⚽' },
  culture:      { label: 'Culture',       icon: Music,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',   emoji: '🎭' },
  solidarite:   { label: 'Solidarité',    icon: Handshake,  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       emoji: '🤝' },
  jeunesse:     { label: 'Jeunesse',      icon: Baby,       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200',         emoji: '🧒' },
  environnement:{ label: 'Environnement', icon: Leaf,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', emoji: '🌿' },
  loisirs:      { label: 'Loisirs',       icon: Star,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     emoji: '🎯' },
  animaux:      { label: 'Animaux',       icon: Dog,        color: 'text-lime-600',    bg: 'bg-lime-50 border-lime-200',       emoji: '🐾' },
  patrimoine:   { label: 'Patrimoine',    icon: Flag,       color: 'text-stone-600',   bg: 'bg-stone-50 border-stone-200',     emoji: '🏛️' },
  sante:        { label: 'Santé',         icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         emoji: '❤️' },
  education:    { label: 'Éducation',     icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       emoji: '📚' },
  seniors:      { label: 'Seniors',       icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-200',       emoji: '🧓' },
  autre:        { label: 'Autre',         icon: Building2,  color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       emoji: '🏢' },
};

const PUB_TYPE_CONFIG: Record<PubType, { label: string; emoji: string; color: string }> = {
  vitrine:     { label: 'Présentation',       emoji: '🏛️', color: 'bg-blue-100 text-blue-700' },
  benevoles:   { label: 'Cherche bénévoles',  emoji: '🙋', color: 'bg-rose-100 text-rose-700' },
  activite:    { label: 'Activité',           emoji: '🎯', color: 'bg-amber-100 text-amber-700' },
  adherents:   { label: 'Cherche adhérents',  emoji: '👥', color: 'bg-purple-100 text-purple-700' },
  materiel:    { label: 'Cherche matériel',   emoji: '📦', color: 'bg-teal-100 text-teal-700' },
  evenement:   { label: 'Événement',          emoji: '🎉', color: 'bg-pink-100 text-pink-700' },
  dons:        { label: 'Appel aux dons',     emoji: '💝', color: 'bg-red-100 text-red-700' },
  partenaires: { label: 'Cherche partenaires',emoji: '🤝', color: 'bg-emerald-100 text-emerald-700' },
};

export default function AssociationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [asso, setAsso] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Load association
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('associations')
        .select('*, author:profiles(full_name, avatar_url), photos:asso_photos(url, display_order)')
        .eq('id', id)
        .single();
      if (err || !data) {
        setError('Association introuvable.');
      } else {
        const enriched = {
          ...data,
          public_target: Array.isArray(data.public_target) ? data.public_target : [],
          activities: Array.isArray(data.activities) ? data.activities : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          needs: Array.isArray(data.needs) ? data.needs : [],
          photos: (data.photos ?? []).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
        };
        setAsso(enriched as Association);
      }
      setLoading(false);
    })();
  }, [id]);

  // Check saved state
  useEffect(() => {
    try {
      const saved_assos: string[] = JSON.parse(localStorage.getItem('biguglia_saved_assos') ?? '[]');
      setSaved(saved_assos.includes(id));
    } catch {}
  }, [id]);

  const toggleSave = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem('biguglia_saved_assos') ?? '[]');
      const newList = saved ? list.filter(x => x !== id) : [...list, id];
      localStorage.setItem('biguglia_saved_assos', JSON.stringify(newList));
      setSaved(!saved);
      toast.success(saved ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch {}
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: asso?.name ?? 'Association', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Lien copié !'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error || !asso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600 text-lg font-medium">{error ?? 'Association introuvable'}</p>
        <Link href="/associations" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
          <ArrowLeft className="w-4 h-4" /> Retour aux associations
        </Link>
      </div>
    );
  }

  const cat = CAT_CONFIG[asso.category];
  const CatIcon = cat.icon;
  const pubConf = PUB_TYPE_CONFIG[asso.pub_type];
  const allPhotos = toPhotoItems(asso.photos ?? []);
  const coverPhoto = asso.photos?.[0]?.url;
  const isAuthor = profile?.id === asso.author_id;

  // Build needs list for structured display
  const needsPictos = [
    asso.is_accepting_members  || asso.needs.includes('Nouveaux adhérents') ? { icon: '👥', label: 'Adhérents',  color: 'bg-purple-50 text-purple-700 border-purple-200' } : null,
    asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')        ? { icon: '🙋', label: 'Bénévoles',  color: 'bg-rose-50 text-rose-700 border-rose-200' } : null,
    asso.needs.includes('Matériel')                                          ? { icon: '📦', label: 'Matériel',   color: 'bg-teal-50 text-teal-700 border-teal-200' } : null,
    asso.is_accepting_partners || asso.needs.includes('Sponsors')           ? { icon: '🤝', label: 'Partenaires',color: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : null,
    asso.is_accepting_donations || asso.needs.includes('Dons')              ? { icon: '💝', label: 'Dons',       color: 'bg-red-50 text-red-700 border-red-200' } : null,
  ].filter(Boolean) as { icon: string; label: string; color: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {/* ── HEADER / HERO ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {coverPhoto && (
          <div className="absolute inset-0 opacity-20">
            <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-violet-200 text-sm mb-6">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/associations" className="hover:text-white transition-colors">Associations</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-semibold truncate max-w-[200px]">{asso.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Logo / Emoji */}
            <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg border-2 border-white/30', cat.bg)}>
              {cat.emoji}
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full', pubConf.color)}>
                  {pubConf.emoji} {pubConf.label}
                </span>
                {asso.declared && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Déclarée
                  </span>
                )}
                {asso.urgent_need && (
                  <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-red-500 text-white animate-pulse">
                    🚨 Besoin urgent
                  </span>
                )}
                {asso.sector_id && <SectorBadge sectorId={asso.sector_id} />}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">{asso.name}</h1>
              {asso.slogan && <p className="text-violet-200 text-base italic mb-3">{asso.slogan}</p>}

              <div className="flex flex-wrap gap-4 text-violet-200 text-sm">
                {asso.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {asso.location}
                  </span>
                )}
                <span className={cn('flex items-center gap-1.5 text-white font-semibold', cat.color.replace('text-', 'bg-').replace('600', '100/30'))}>
                  <CatIcon className="w-4 h-4" /> {cat.label}
                </span>
              </div>
            </div>

            {/* Action buttons (top-right) */}
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={toggleSave}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                {saved ? <BookmarkCheck className="w-5 h-5 text-yellow-300" /> : <Bookmark className="w-5 h-5" />}
              </button>
              <button onClick={handleShare}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                title="Partager">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={() => router.back()}
                className="hidden sm:flex p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                title="Retour">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRE D'ACTIONS PERSISTANTE (CDC §5.3) ──────────────────────────── */}
      {!isAuthor && (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={profile?.id}
                size="sm"
                ctaLabel={
                  asso.pub_type === 'benevoles' ? '🙋 Devenir bénévole' :
                  asso.pub_type === 'dons' ? '💝 Faire un don' :
                  asso.pub_type === 'adherents' ? '👥 Adhérer' :
                  asso.pub_type === 'partenaires' ? '🤝 Devenir partenaire' :
                  asso.pub_type === 'materiel' ? '📦 Proposer du matériel' :
                  '✉️ Contacter'
                }
              />
              {(asso.is_accepting_members || asso.needs.includes('Nouveaux adhérents')) && asso.pub_type !== 'adherents' && (
                <ContactButton
                  sourceType="association"
                  sourceId={asso.id}
                  sourceTitle={asso.name}
                  ownerId={asso.author_id}
                  userId={profile?.id}
                  size="sm"
                  ctaLabel="👥 Rejoindre"
                />
              )}
              {(asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')) && asso.pub_type !== 'benevoles' && (
                <ContactButton
                  sourceType="association"
                  sourceId={asso.id}
                  sourceTitle={asso.name}
                  ownerId={asso.author_id}
                  userId={profile?.id}
                  size="sm"
                  ctaLabel="🙋 Je veux aider"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all">
                <Calendar className="w-3.5 h-3.5" /> Événements
              </Link>
              <Link href={`/forum?q=${encodeURIComponent(asso.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all">
                <MessageSquare className="w-3.5 h-3.5" /> Forum
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU PRINCIPAL ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── COLONNE PRINCIPALE ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Description courte */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <p className="text-gray-700 leading-relaxed text-base">{asso.description_short}</p>
            </div>

            {/* Galerie photos (CDC §Phase2) */}
            {allPhotos.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-violet-500" /> Photos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allPhotos.map((photo, idx) => (
                    <button key={photo.id ?? idx} onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                      className="aspect-video rounded-xl overflow-hidden group hover:opacity-90 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={asso.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {lightboxOpen && (
                  <PhotoViewer
                    photos={allPhotos}
                    initialIndex={lightboxIdx}
                    onClose={() => setLightboxOpen(false)}
                  />
                )}
              </div>
            )}

            {/* Besoins structurés (CDC §4.3 & §7) */}
            {needsPictos.length > 0 && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200 p-6 shadow-sm">
                <h2 className="text-sm font-black text-rose-800 mb-4 flex items-center gap-2">
                  {asso.urgent_need && <span className="w-5 h-5 flex-shrink-0 text-red-500 animate-pulse">🚨</span>}
                  <Zap className="w-4 h-4 text-rose-500" /> Besoins actuels
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {needsPictos.map(p => (
                    <span key={p.label} className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border', p.color)}>
                      {p.icon} {p.label}
                    </span>
                  ))}
                </div>
                {asso.need_detail && (
                  <p className="text-sm text-rose-700 bg-white/60 rounded-xl px-4 py-3 border border-rose-100">{asso.need_detail}</p>
                )}
                {!isAuthor && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ContactButton
                      sourceType="association"
                      sourceId={asso.id}
                      sourceTitle={asso.name}
                      ownerId={asso.author_id}
                      userId={profile?.id}
                      size="sm"
                      ctaLabel="✉️ Proposer mon aide"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Description complète */}
            {asso.description_full && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-500" /> À propos
                </h2>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{asso.description_full}</div>
              </div>
            )}

            {/* Activités & Infos pratiques */}
            {(asso.activities.length > 0 || asso.schedule || asso.frequency || asso.price_type) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" /> Activités & Infos pratiques
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {asso.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">Activités proposées</p>
                      <div className="flex flex-wrap gap-1.5">
                        {asso.activities.map(a => (
                          <span key={a} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {asso.public_target.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">Public</p>
                      <div className="flex flex-wrap gap-1.5">
                        {asso.public_target.map(p => (
                          <span key={p} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{p}</span>
                        ))}
                        {asso.age_min != null && asso.age_max != null && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{asso.age_min}–{asso.age_max} ans</span>
                        )}
                      </div>
                    </div>
                  )}
                  {asso.schedule && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Horaires</p>
                      <p className="text-sm text-gray-700 flex items-start gap-1.5"><Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />{asso.schedule}</p>
                    </div>
                  )}
                  {asso.frequency && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Fréquence</p>
                      <p className="text-sm text-gray-700">{asso.frequency}</p>
                    </div>
                  )}
                  {asso.price_type && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Tarif</p>
                      <p className="text-sm text-gray-700 font-semibold">
                        {asso.price_type === 'gratuit' ? '✅ Gratuit' : asso.price_type === 'payant' ? `💰 Payant${asso.price_detail ? ` — ${asso.price_detail}` : ''}` : asso.price_type}
                      </p>
                    </div>
                  )}
                  {asso.location && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Lieu</p>
                      <p className="text-sm text-gray-700 flex items-start gap-1.5"><MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />{asso.address ?? asso.location}</p>
                    </div>
                  )}
                </div>

                {/* Accessibility */}
                {(asso.pmr_accessible || asso.families_welcome || asso.animals_ok || asso.parking_nearby || asso.material_provided) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-2">Équipements & accessibilité</p>
                    <div className="flex flex-wrap gap-1.5">
                      {asso.pmr_accessible && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">♿ PMR</span>}
                      {asso.families_welcome && <span className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-semibold">👨‍👩‍👧 Familles</span>}
                      {asso.animals_ok && <span className="text-xs px-2.5 py-1 rounded-full bg-lime-50 text-lime-700 border border-lime-200 font-semibold">🐾 Animaux OK</span>}
                      {asso.parking_nearby && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-semibold">🅿️ Parking</span>}
                      {asso.material_provided && <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">✅ Matériel fourni</span>}
                      {asso.registration_required && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">📝 Inscription requise</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {asso.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-violet-500" /> Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {asso.tags.map(t => (
                    <Link key={t} href={`/associations?q=${encodeURIComponent(t)}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Liens liés — Événements & Forum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-purple-200 hover:shadow-md transition-all group flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-pink-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-800 group-hover:text-purple-700">Événements</p>
                  <p className="text-xs text-gray-400 truncate">Voir les événements de {asso.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link href={`/forum?q=${encodeURIComponent(asso.name)}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all group flex items-center gap-4">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-800 group-hover:text-violet-700">Forum</p>
                  <p className="text-xs text-gray-400 truncate">Discussions sur {asso.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Signaler */}
            <div className="flex items-center justify-between">
              <Link href="/associations" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors">
                <ArrowLeft className="w-4 h-4" /> Toutes les associations
              </Link>
              <ReportButton
                targetType="association"
                targetId={asso.id}
                targetTitle={asso.name}
              />
            </div>

          </div>

          {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-5">

            {/* Contact principal */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" /> Contact
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-500">Responsable</p>
                  <p className="text-sm font-semibold text-gray-800">{asso.contact_name}</p>
                  {asso.contact_role && <p className="text-xs text-gray-400">{asso.contact_role}</p>}
                </div>
                {asso.show_phone && asso.contact_phone && (
                  <a href={`tel:${asso.contact_phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{asso.contact_phone}</span>
                  </a>
                )}
                {asso.contact_email && (
                  <a href={`mailto:${asso.contact_email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{asso.contact_email}</span>
                  </a>
                )}
                {asso.contact_website && (
                  <a href={asso.contact_website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Site web</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
                {asso.contact_facebook && (
                  <a href={asso.contact_facebook} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline font-semibold">
                    Facebook →
                  </a>
                )}
                {asso.contact_instagram && (
                  <a href={asso.contact_instagram} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-pink-600 hover:underline font-semibold">
                    Instagram →
                  </a>
                )}
              </div>

              {!isAuthor && profile && (
                <div className="mt-4">
                  <ContactButton
                    sourceType="association"
                    sourceId={asso.id}
                    sourceTitle={asso.name}
                    ownerId={asso.author_id}
                    userId={profile.id}
                    size="sm"
                    ctaLabel="✉️ Envoyer un message"
                  />
                </div>
              )}
              {!profile && (
                <Link href="/connexion" className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-violet-600 transition-all">
                  Se connecter pour contacter
                </Link>
              )}
            </div>

            {/* Infos rapides */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-violet-500" /> Infos rapides
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Catégorie</span>
                  <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', cat.bg, cat.color)}>
                    {cat.emoji} {cat.label}
                  </span>
                </div>
                {asso.sector_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Secteur</span>
                    <SectorBadge sectorId={asso.sector_id} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Statut</span>
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                    asso.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    asso.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-100 text-amber-700'
                  )}>
                    {asso.status === 'active' ? '✅ Active' : asso.status === 'draft' ? '📋 Brouillon' : '⏸️ Inactive'}
                  </span>
                </div>
                {asso.declared && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Déclaration</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Préfecture
                    </span>
                  </div>
                )}
                {asso.rna_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">RNA</span>
                    <span className="text-xs text-gray-600 font-mono">{asso.rna_number}</span>
                  </div>
                )}
                {asso.membership_required && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Adhésion</span>
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      🎫 Obligatoire
                    </span>
                  </div>
                )}
                {asso.capacity && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Capacité</span>
                    <span className="text-xs font-bold text-gray-700">{asso.capacity} places</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auteur (admin only if not anonymous) */}
            {asso.author?.full_name && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-500" /> Publié par
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-black text-sm flex-shrink-0">
                    {asso.author.full_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{asso.author.full_name}</p>
                    <p className="text-xs text-gray-400">Référent association</p>
                  </div>
                </div>
                {isAuthor && (
                  <Link href="/associations" className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-gray-200 transition-all">
                    ✏️ Modifier ma fiche
                  </Link>
                )}
              </div>
            )}

            {/* Notifications */}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" /> Restez informé
              </h3>
              <p className="text-xs text-emerald-700 mb-3">Soyez alerté des mises à jour et nouveaux besoins de cette association.</p>
              <Link href={profile ? '/notifications' : '/connexion'}
                className="w-full text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> {profile ? 'Gérer mes alertes' : 'Se connecter pour les alertes'}
              </Link>
            </div>

            {/* Liens modules */}
            <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-violet-800 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-violet-500" /> Voir aussi
              </h3>
              <div className="space-y-2">
                {[
                  { href: '/associations', icon: Building2, label: 'Toutes les associations', sub: 'Retour à la liste' },
                  { href: '/coups-de-main', icon: Handshake, label: 'Coups de main', sub: 'Entraide & bénévolat' },
                  { href: '/evenements', icon: Calendar, label: 'Événements', sub: 'Agenda communautaire' },
                  { href: '/messages', icon: MessageSquare, label: 'Messages', sub: 'Messagerie directe' },
                ].map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors group">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Icon className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-violet-800 group-hover:text-violet-600 truncate">{label}</p>
                      <p className="text-[10px] text-violet-400">{sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-violet-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, MapPin, Clock, Heart, Eye, Share2,
  CheckCircle2, AlertTriangle, Star, Users, TreePine,
  Pencil, Trash2, Loader2, X, Camera, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import SectorFilter from '@/components/ui/SectorFilter';
import { DIFF_CONFIG, TYPE_CONFIG } from '../_constants';
import { formatDuration } from '../_utils';
import type { Promenade } from '../_types';
import toast from 'react-hot-toast';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

interface Props {
  promenade: Promenade;
}

export default function PromenadeDetailClient({ promenade: initial }: Props) {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  // On attend que l'auth soit initialisée avant de calculer isOwner
  // (évite le flash "pas créateur" pendant le chargement du store)
  const isOwner = !authLoading && !!profile?.id && profile.id === initial.author_id;

  // État local de la fiche (mis à jour après sauvegarde)
  const [p, setP] = useState<Promenade>(initial);

  // Modes
  const [editing, setEditing]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Formulaire d'édition
  const [editForm, setEditForm] = useState({
    title:              p.title,
    description:        p.description,
    distance_km:        p.distance_km?.toString() ?? '',
    duration_min:       p.duration_min?.toString() ?? '',
    difficulty:         p.difficulty,
    type:               p.type,
    tags:               (p.tags ?? []).join(', '),
    start_point:        p.start_point ?? '',
    dogs_allowed:       p.dogs_allowed ?? false,
    stroller_friendly:  p.stroller_friendly ?? false,
    parking_available:  p.parking_available ?? false,
    water_access:       p.water_access ?? false,
    route_loop:         p.route_loop ?? false,
    shade_level:        p.shade_level ?? 'none',
    best_time_of_day:   p.best_time_of_day ?? 'anytime',
    practical_tips:     p.practical_tips ?? '',
    safety_notes:       p.safety_notes ?? '',
    sector_id:          p.sector_id ?? '',
  });
  const [newPhotos, setNewPhotos]         = useState<File[]>([]);
  const [newPreviews, setNewPreviews]     = useState<string[]>([]);

  // ── Helpers visuels ────────────────────────────────────────────────────────
  const diff    = DIFF_CONFIG[p.difficulty];
  const type    = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.balade;
  const TypeIcon = type.icon;
  const firstPhoto = p.photos?.[0]?.url;

  const badges = [
    p.dogs_allowed      && { label: 'Chiens acceptés',  emoji: '🐕', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    p.stroller_friendly && { label: 'Poussette',         emoji: '🍼', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
    p.water_access      && { label: "Point d'eau",       emoji: '💧', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    p.parking_available && { label: 'Parking',           emoji: '🅿️', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    p.route_loop        && { label: 'Circuit en boucle', emoji: '🔄', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    p.shade_level === 'full'    && { label: 'Ombragé',         emoji: '🌳', cls: 'bg-green-50 text-green-700 border-green-200' },
    p.shade_level === 'partial' && { label: 'Mi-ombragé',      emoji: '⛅', cls: 'bg-green-50 text-green-600 border-green-200' },
    p.best_time_of_day === 'sunset'  && { label: 'Coucher soleil', emoji: '🌅', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    p.best_time_of_day === 'morning' && { label: 'Matin idéal',   emoji: '🌄', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  ].filter(Boolean) as { label: string; emoji: string; cls: string }[];

  // ── Actions ────────────────────────────────────────────────────────────────
  const share = () => {
    const url = window.location.href;
    if (navigator.share) { navigator.share({ title: p.title, url }); }
    else { navigator.clipboard.writeText(url); toast.success('Lien copié !'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Vous devez être connecté'); return; }
    setSaving(true);

    const supabase = createClient();

    const tags = editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const payload: Record<string, unknown> = {
      title:             editForm.title.trim(),
      description:       editForm.description.trim(),
      distance_km:       editForm.distance_km  ? parseFloat(editForm.distance_km)  : null,
      duration_min:      editForm.duration_min ? parseInt(editForm.duration_min)   : null,
      difficulty:        editForm.difficulty,
      type:              editForm.type,
      tags,
      start_point:       editForm.start_point.trim() || null,
      dogs_allowed:      editForm.dogs_allowed,
      stroller_friendly: editForm.stroller_friendly,
      parking_available: editForm.parking_available,
      water_access:      editForm.water_access,
      route_loop:        editForm.route_loop,
      shade_level:       editForm.shade_level,
      best_time_of_day:  editForm.best_time_of_day,
      practical_tips:    editForm.practical_tips.trim() || null,
      safety_notes:      editForm.safety_notes.trim()   || null,
      sector_id:         editForm.sector_id || null,
    };

    // Étape 1 : mettre à jour les champs de l'itinéraire
    const { error } = await supabase
      .from('promenades').update(payload).eq('id', p.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      setSaving(false);
      return;
    }

    // Étape 2 : upload des nouvelles photos + insert via API route (bypass RLS client)
    const baseOrder = p.photos?.length ?? 0;
    console.log('[DEBUG] Nombre de photos à uploader :', newPhotos.length);
    console.log('[DEBUG] promenade id :', p.id);
    console.log('[DEBUG] profile.id :', profile.id);

    for (let i = 0; i < newPhotos.length; i++) {
      const photo    = newPhotos[i];
      const ext      = safeImageExt(photo.name);
      const fileName = `promenades/${p.id}/${Date.now()}_${i}.${ext}`; // nosec
      console.log(`[DEBUG] Photo ${i + 1} — fileName: ${fileName}`);
      try {
        // Upload du fichier via /api/upload (magic-bytes validation)
        console.log(`[DEBUG] Photo ${i + 1} — Début uploadFile...`);
        const publicUrl = await uploadFile(photo, 'photos', fileName, profile.id);
        console.log(`[DEBUG] Photo ${i + 1} — uploadFile OK, url: ${publicUrl}`);

        // Insert dans promenade_photos via API route serveur (client admin, pas de RLS client)
        console.log(`[DEBUG] Photo ${i + 1} — Début insert /api/promenade-photos...`);
        const insertRes = await fetch('/api/promenade-photos', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            promenade_id:  p.id,
            url:           publicUrl,
            display_order: baseOrder + i,
          }),
        });
        console.log(`[DEBUG] Photo ${i + 1} — insert status: ${insertRes.status}`);
        if (!insertRes.ok) {
          const body = await insertRes.json().catch(() => ({})) as { error?: string };
          console.error(`[DEBUG] Photo ${i + 1} — insert ERREUR:`, body);
          throw new Error(body.error ?? `HTTP ${insertRes.status}`);
        }
        console.log(`[DEBUG] Photo ${i + 1} — insert OK ✅`);
      } catch (err) {
        console.error(`[DEBUG] Photo ${i + 1} — CATCH:`, err);
        toast.error(`Photo ${i + 1} : ${err instanceof Error ? err.message : 'Erreur upload'}`);
      }
    }
    console.log('[DEBUG] Toutes les photos traitées, rechargement dans 800ms...');

    // Nettoyage aperçus locaux
    newPreviews.forEach(u => URL.revokeObjectURL(u));
    setNewPhotos([]);
    setNewPreviews([]);

    toast.success('✅ Itinéraire mis à jour !');
    setEditing(false);
    // Rechargement pour afficher les nouvelles photos (page SSR force-dynamic)
    setTimeout(() => window.location.reload(), 800);
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('promenades').delete().eq('id', p.id);
      if (error) throw error;
      toast.success('Itinéraire supprimé');
      router.push('/promenades');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleBool = (key: string) => setEditForm(f => ({ ...f, [key]: !(f as Record<string, unknown>)[key] }));

  // ── RENDU ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero photo ── */}
      <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-200">
        {firstPhoto ? (
          <Image src={firstPhoto} alt={p.title} fill className="object-cover" priority />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${type.gradient} flex items-center justify-center`}>
            <TypeIcon className="w-32 h-32 text-white opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link href="/promenades" className="inline-flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white text-sm font-bold px-4 py-2 rounded-xl backdrop-blur-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>

        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-white/95 shadow-md', type.color)}>
            <TypeIcon className="w-3 h-3" /> {type.label}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border bg-white/95 shadow-md', diff.color)}>
            {diff.icon} {diff.label}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg leading-tight mb-2">{p.title}</h1>
          <div className="flex items-center gap-3 text-white/80 text-sm">
            {p.distance_km != null && <span className="flex items-center gap-1 font-bold"><MapPin className="w-4 h-4" />{p.distance_km} km</span>}
            {p.duration_min != null && <span className="flex items-center gap-1 font-bold"><Clock className="w-4 h-4" />{formatDuration(p.duration_min)}</span>}
            {p.avg_rating && p.avg_rating > 0 && <span className="flex items-center gap-1 font-bold text-amber-300"><Star className="w-4 h-4 fill-current" />{p.avg_rating.toFixed(1)}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Bandeau créateur ── */}
        {isOwner && !editing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
              <span className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                <TreePine className="w-4 h-4 text-white" />
              </span>
              Vous êtes le créateur de cet itinéraire
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Modifier
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FORMULAIRE DE MODIFICATION
        ══════════════════════════════════════════════════════════════════ */}
        {isOwner && editing && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50">
              <h2 className="font-black text-emerald-800 flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Modifier l&apos;itinéraire
              </h2>
              <button type="button" onClick={() => setEditing(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Titre */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Titre *</p>
                <input
                  type="text" required
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Type + Difficulté */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">Type d&apos;activité</p>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm(f => ({ ...f, type: e.target.value as 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature' | 'photo' | 'famille' | 'moto' }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">Difficulté</p>
                  <div className="flex gap-1.5">
                    {(['facile', 'moyen', 'difficile'] as const).map(d => (
                      <button key={d} type="button" onClick={() => setEditForm(f => ({ ...f, difficulty: d }))}
                        className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors',
                          editForm.difficulty === d
                            ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500'
                              : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        )}>
                        {d === 'facile' ? '🟢' : d === 'moyen' ? '🟡' : '🔴'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distance + Durée */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">Distance (km)</p>
                  <input type="number" step="0.1" min="0" placeholder="ex: 3.5"
                    value={editForm.distance_km}
                    onChange={e => setEditForm(f => ({ ...f, distance_km: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">Durée (min)</p>
                  <input type="number" min="0" placeholder="ex: 45"
                    value={editForm.duration_min}
                    onChange={e => setEditForm(f => ({ ...f, duration_min: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Point de départ */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Point de départ</p>
                <input type="text" placeholder="ex: Parking du lac de Biguglia"
                  value={editForm.start_point}
                  onChange={e => setEditForm(f => ({ ...f, start_point: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Secteur */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Secteur géographique</p>
                <SectorFilter value={editForm.sector_id || null} onChange={v => setEditForm(f => ({ ...f, sector_id: v || '' }))} showAll compact label="" />
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Description *</p>
                <textarea required rows={4}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Caractéristiques */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Caractéristiques</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'dogs_allowed',      label: '🐕 Chiens',    cls: 'amber' },
                    { key: 'stroller_friendly', label: '🍼 Poussette', cls: 'pink' },
                    { key: 'parking_available', label: '🅿️ Parking',   cls: 'blue' },
                    { key: 'water_access',      label: "💧 Eau",        cls: 'sky' },
                    { key: 'route_loop',        label: '🔄 Boucle',    cls: 'gray' },
                  ].map(({ key, label, cls }) => (
                    <button key={key} type="button" onClick={() => toggleBool(key)}
                      className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors',
                        (editForm as Record<string, unknown>)[key]
                          ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300`
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ombre */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Niveau d&apos;ombre</p>
                <div className="flex gap-2">
                  {([{ val: 'none', label: '☀️ Exposé' }, { val: 'partial', label: '⛅ Partiel' }, { val: 'full', label: '🌳 Ombragé' }] as const).map(s => (
                    <button key={s.val} type="button" onClick={() => setEditForm(f => ({ ...f, shade_level: s.val }))}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-colors',
                        editForm.shade_level === s.val ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      )}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meilleur moment */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Meilleur moment</p>
                <div className="flex gap-2">
                  {([{ val: 'morning', label: '🌄 Matin' }, { val: 'anytime', label: '🕑 Toute heure' }, { val: 'sunset', label: '🌅 Coucher soleil' }] as const).map(t => (
                    <button key={t.val} type="button" onClick={() => setEditForm(f => ({ ...f, best_time_of_day: t.val }))}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-colors',
                        editForm.best_time_of_day === t.val ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      )}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conseils + Sécurité */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Conseils pratiques</p>
                <textarea rows={2} placeholder="Équipement, parking, transport…"
                  value={editForm.practical_tips}
                  onChange={e => setEditForm(f => ({ ...f, practical_tips: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">⚠️ Notes de sécurité</p>
                <textarea rows={2} placeholder="Passages délicats, zones sensibles…"
                  value={editForm.safety_notes}
                  onChange={e => setEditForm(f => ({ ...f, safety_notes: e.target.value }))}
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50/30"
                />
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Tags (séparés par virgules)</p>
                <input type="text" placeholder="ex: étang, coucher-soleil, chien"
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Nouvelles photos */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Ajouter des photos</p>
                <div className="flex gap-2 flex-wrap">
                  {newPreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                      <Image src={src} alt="" fill className="object-cover" />
                      <button type="button" onClick={() => {
                        URL.revokeObjectURL(src);
                        setNewPhotos(p => p.filter((_, idx) => idx !== i));
                        setNewPreviews(p => p.filter((_, idx) => idx !== i));
                      }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-400 hover:bg-emerald-50 cursor-pointer transition-colors">
                    <Camera className="w-5 h-5" />
                    <span className="text-xs mt-1">Photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setNewPhotos(prev => [...prev, ...files]);
                        setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Actions formulaire */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><Save className="w-4 h-4" /> Enregistrer</>}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* ── Modal confirmation suppression ── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-black text-gray-900 text-center mb-1">Supprimer l&apos;itinéraire ?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Action <strong>irréversible</strong>. &quot;{p.title}&quot; sera définitivement supprimé.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</> : <><Trash2 className="w-4 h-4" /> Supprimer</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Vue normale (non-édition) ── */}
        {!editing && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: MapPin, val: p.distance_km != null ? `${p.distance_km} km` : '—',           label: 'Distance',      color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: Clock,  val: p.duration_min != null ? formatDuration(p.duration_min) : '—', label: 'Durée',         color: 'text-sky-600',     bg: 'bg-sky-50' },
                { icon: Users,  val: `${p.likes_count ?? 0} ❤️`,                                    label: 'Appréciations', color: 'text-rose-600',    bg: 'bg-rose-50' },
              ].map(({ icon: Icon, val, label, color, bg }) => (
                <div key={label} className={cn('rounded-2xl p-4 text-center border border-gray-100', bg)}>
                  <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
                  <p className={cn('text-lg font-black', color)}>{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
                <TreePine className="w-5 h-5 text-emerald-500" /> Description
              </h2>
              <p className="text-gray-600 leading-relaxed">{p.description}</p>
            </div>

            {/* Caractéristiques */}
            {badges.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-base font-black text-gray-900 mb-4">✅ Caractéristiques</h2>
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => (
                    <span key={b.label} className={cn('inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border', b.cls)}>
                      {b.emoji} {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Infos pratiques */}
            {(p.practical_tips || p.safety_notes || p.start_point) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <h2 className="text-base font-black text-gray-900">ℹ️ Infos pratiques</h2>
                {p.start_point && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-0.5">Point de départ</p>
                      <p className="text-sm text-gray-600">{p.start_point}</p>
                    </div>
                  </div>
                )}
                {p.practical_tips && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-0.5">Conseils pratiques</p>
                      <p className="text-sm text-gray-600">{p.practical_tips}</p>
                    </div>
                  </div>
                )}
                {p.safety_notes && (
                  <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700 mb-0.5">Notes de sécurité</p>
                      <p className="text-sm text-amber-700">{p.safety_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Galerie photos */}
            {p.photos && p.photos.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-500" /> Photos ({p.photos.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {p.photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                      <Image
                        src={photo.url}
                        alt={`Photo ${idx + 1} — ${p.title}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {p.tags && p.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-base font-black text-gray-900 mb-3">🏷️ Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {p.tags.map(t => (
                    <span key={t} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full"># {t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Barre actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="w-4 h-4" /> {p.views ?? 0} vues
                <span className="mx-1">·</span>
                <Heart className="w-4 h-4 text-rose-400" /> {p.likes_count ?? 0} j&apos;aime
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={share} className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors">
                  <Share2 className="w-4 h-4" /> Partager
                </button>
                <Link href="/promenades" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Link>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Champs spéciaux par thème ────────────────────────────────────────────────
const THEME_LABELS: Record<string, {
  bioPlaceholder: string;
  levelOptions: string[];
  offeringLabel: string;
  lookingLabel: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  availabilityLabel: string;
}> = {
  collectionneurs: {
    bioPlaceholder: 'Passionné de monnaies anciennes depuis 20 ans...',
    levelOptions: ['Débutant', 'Amateur', 'Collectionneur confirmé', 'Expert'],
    offeringLabel: 'Je propose / vends / échange',
    lookingLabel: 'Je recherche',
    tagsLabel: 'Mes collections (ex: timbres, monnaies, vinyles...)',
    tagsPlaceholder: 'monnaies',
    availabilityLabel: 'Disponibilité pour les échanges',
  },
  promenades: {
    bioPlaceholder: "J'adore les balades en forêt le matin...",
    levelOptions: ['Débutant', 'Marcheur occasionnel', 'Randonnée régulière', 'Marcheur aguerri'],
    offeringLabel: 'Je peux accompagner / guider',
    lookingLabel: 'Je cherche des compagnons de balade',
    tagsLabel: 'Type de balades (ex: forêt, mer, montagnes...)',
    tagsPlaceholder: 'forêt',
    availabilityLabel: 'Jours / horaires de disponibilité',
  },
  evenements: {
    bioPlaceholder: 'Amateur de concerts et de spectacles...',
    levelOptions: ['Participant ponctuel', 'Habitué', 'Organisateur bénévole', 'Organisateur actif'],
    offeringLabel: 'Je peux aider à organiser',
    lookingLabel: "Types d'événements qui m'intéressent",
    tagsLabel: "Mes centres d'intérêt (ex: musique, sport, culture...)",
    tagsPlaceholder: 'musique',
    availabilityLabel: 'Disponibilité pour participer',
  },
  associations: {
    bioPlaceholder: 'Bénévole passionné au service du village...',
    levelOptions: ['Curieux', 'Adhérent', 'Bénévole actif', 'Responsable'],
    offeringLabel: "Compétences / ce que j'apporte",
    lookingLabel: "Type d'association recherchée",
    tagsLabel: "Domaines (ex: sport, culture, environnement...)",
    tagsPlaceholder: 'bénévolat',
    availabilityLabel: 'Disponibilité hebdomadaire',
  },
  'coups-de-main': {
    bioPlaceholder: 'Bricoleur du dimanche, toujours prêt à aider...',
    levelOptions: ["Je cherche de l'aide", 'Je peux aider', 'Je propose & cherche'],
    offeringLabel: 'Ce que je peux faire / offrir',
    lookingLabel: "Ce dont j'ai besoin",
    tagsLabel: 'Compétences / besoins (ex: jardinage, informatique...)',
    tagsPlaceholder: 'jardinage',
    availabilityLabel: 'Disponibilité',
  },
  materiel: {
    bioPlaceholder: 'Je prête volontiers mon matériel de jardinage...',
    levelOptions: ['Emprunteur', 'Prêteur', 'Prêt & emprunt'],
    offeringLabel: 'Matériel que je prête',
    lookingLabel: 'Matériel que je cherche à emprunter',
    tagsLabel: 'Type de matériel (ex: outils, jardinage, sport...)',
    tagsPlaceholder: 'outils',
    availabilityLabel: 'Disponibilité du matériel',
  },
  annonces: {
    bioPlaceholder: 'Vendeur local de confiance...',
    levelOptions: ['Acheteur', 'Vendeur', 'Acheteur & vendeur'],
    offeringLabel: 'Ce que je vends / donne',
    lookingLabel: 'Ce que je cherche à acheter',
    tagsLabel: 'Catégories (ex: meubles, électronique, vêtements...)',
    tagsPlaceholder: 'meubles',
    availabilityLabel: 'Disponibilité pour les échanges',
  },
  'perdu-trouve': {
    bioPlaceholder: 'Habitant attentif du quartier...',
    levelOptions: ['Observateur', 'Actif dans le quartier'],
    offeringLabel: 'Zone où je circule souvent',
    lookingLabel: 'Objets perdus que je cherche',
    tagsLabel: 'Zones (ex: centre-ville, plage, forêt...)',
    tagsPlaceholder: 'plage',
    availabilityLabel: 'Disponibilité pour aider',
  },
};

const DEFAULT_LABELS = {
  bioPlaceholder: 'Parlez de vous en quelques mots...',
  levelOptions: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
  offeringLabel: 'Ce que je propose',
  lookingLabel: 'Ce que je cherche',
  tagsLabel: "Tags / centres d'intérêt",
  tagsPlaceholder: "ex: tag",
  availabilityLabel: 'Disponibilité',
};

// ─── ThemeProfileForm ─────────────────────────────────────────────────────────
interface ThemeProfileFormProps {
  userId: string;
  themeSlug: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function ThemeProfileForm({
  userId,
  themeSlug,
  onSaved,
  onCancel,
}: ThemeProfileFormProps) {
  const supabase = createClient();
  const labels = THEME_LABELS[themeSlug] ?? DEFAULT_LABELS;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState('');
  const [level, setLevel] = useState('');
  const [offering, setOffering] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [availability, setAvailability] = useState('');
  const [locationZone, setLocationZone] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Charger profil existant
  useEffect(() => {
    supabase
      .from('theme_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('theme_slug', themeSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBio(data.bio ?? '');
          setLevel(data.level ?? '');
          setOffering(data.offering ?? '');
          setLookingFor(data.looking_for ?? '');
          setAvailability(data.availability ?? '');
          setLocationZone(data.location_zone ?? '');
          setTags(data.tags ?? []);
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, themeSlug]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        theme_slug: themeSlug,
        bio: bio || null,
        level: level || null,
        offering: offering || null,
        looking_for: lookingFor || null,
        availability: availability || null,
        location_zone: locationZone || null,
        tags,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('theme_profiles')
        .upsert(payload, { onConflict: 'user_id,theme_slug' });

      if (error) throw error;
      toast.success('Profil communautaire mis à jour !');
      onSaved?.();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          À propos de vous dans ce thème
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={labels.bioPlaceholder}
          rows={3}
          maxLength={300}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <p className="text-xs text-gray-400 text-right">{bio.length}/300</p>
      </div>

      {/* Niveau */}
      {labels.levelOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Niveau / Rôle</label>
          <div className="flex flex-wrap gap-2">
            {labels.levelOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLevel(opt === level ? '' : opt)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  level === opt
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.offeringLabel}
        </label>
        <input
          type="text"
          value={offering}
          onChange={(e) => setOffering(e.target.value)}
          placeholder="Décrivez brièvement..."
          maxLength={150}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Cherche */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.lookingLabel}
        </label>
        <input
          type="text"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="Décrivez brièvement..."
          maxLength={150}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Disponibilité */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.availabilityLabel}
        </label>
        <input
          type="text"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="ex: weekends, soirées, tous les jours..."
          maxLength={100}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Zone / Quartier
        </label>
        <input
          type="text"
          value={locationZone}
          onChange={(e) => setLocationZone(e.target.value)}
          placeholder="ex: centre de Biguglia, quartier Nord..."
          maxLength={80}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.tagsLabel} <span className="text-gray-400 font-normal">(max 8)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-xs font-medium"
            >
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {tags.length < 8 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder={labels.tagsPlaceholder}
              maxLength={30}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-1.5 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 hover:bg-brand-100 transition text-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}

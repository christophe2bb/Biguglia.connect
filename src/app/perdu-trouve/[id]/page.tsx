'use client';

/**
 * Biguglia Connect — Page détail Perdu / Trouvé
 * /perdu-trouve/[id] — fiche complète avec galerie, statut, actions, impression
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Clock, Phone, Mail, Shield, Eye, EyeOff,
  Pencil, Trash2, Share2, CheckCircle2, AlertCircle, Printer,
  MessageSquare, Flag, ChevronDown, ChevronUp, Loader2,
  Package, Zap, Archive, XCircle, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import ReportButton from '@/components/ui/ReportButton';
import { TrustScoreMini } from '@/components/ui/TrustScore';

// ─── Types ────────────────────────────────────────────────────────────────────
type LFType = 'perdu' | 'trouve';
type LFStatus = 'perdu' | 'trouve' | 'identifie' | 'restitue' | 'clos' | 'archive' | 'draft';

// Normalise les statuts anglais (DB legacy) vers les statuts français attendus par l'UI
function normalizeStatus(s: string | null | undefined): LFStatus {
  const map: Record<string, LFStatus> = {
    // anglais → français
    lost: 'perdu', found: 'trouve', identified: 'identifie',
    returned: 'restitue', closed: 'clos', archived: 'archive',
    active: 'perdu', open: 'perdu', resolved: 'clos',
    // déjà français — pass-through
    perdu: 'perdu', trouve: 'trouve', identifie: 'identifie',
    restitue: 'restitue', clos: 'clos', archive: 'archive', draft: 'draft',
  };
  return map[s ?? ''] ?? 'perdu'; // fallback sûr
}

type LFItem = {
  id: string;
  type: LFType;
  status: LFStatus;
  title: string;
  category: string;
  description: string;
  brand: string | null;
  color: string | null;
  distinctive_sign: string | null;
  keep_secret: boolean;
  is_sensitive: boolean;
  lost_date: string;
  lost_time: string | null;
  location_area: string;
  location_detail: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_mode: string;
  show_phone: boolean;
  reward: string | null;
  sentimental_value: boolean;
  declared_authorities: boolean;
  deposited_at: string | null;
  proof_required: boolean;
  need_community_help: boolean;
  matched_item_id: string | null;
  closed_at: string | null;
  archived_at: string | null;
  author_id: string;
  author?: {
    full_name: string;
    avatar_url?: string | null;
    created_at?: string;
    role?: string;
    phone?: string | null;
  } | null;
  photos?: { url: string; display_order?: number; is_cover?: boolean; visibility_type?: string }[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type LFComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

type LFStatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changer?: { full_name?: string } | null;
};

const STATUS_CONFIG: Record<LFStatus, { label: string; color: string; bg: string; border: string; icon: string; dot: string }> = {
  perdu:     { label: 'Perdu',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300', icon: '🔴', dot: 'bg-orange-500' },
  trouve:    { label: 'Trouvé',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '🟢', dot: 'bg-emerald-500' },
  identifie: { label: 'Identifié', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',   icon: '🔵', dot: 'bg-blue-500' },
  restitue:  { label: 'Restitué',  color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300', icon: '✅', dot: 'bg-purple-500' },
  clos:      { label: 'Clos',      color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-300',   icon: '⚫', dot: 'bg-gray-400' },
  archive:   { label: 'Archivé',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: '📦', dot: 'bg-slate-400' },
  draft:     { label: 'Brouillon', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300', icon: '✏️', dot: 'bg-yellow-500' },
};

const ALLOWED_TRANSITIONS: Record<LFStatus, LFStatus[]> = {
  perdu:     ['identifie', 'clos'],
  trouve:    ['identifie', 'clos'],
  identifie: ['restitue', 'clos', 'perdu', 'trouve'],
  restitue:  ['archive'],
  clos:      ['archive'],
  archive:   [],
  draft:     ['perdu', 'trouve'],
};

const CATEGORIES: Record<string, string> = {
  cles: 'Clés', portefeuille: 'Portefeuille / papiers', telephone: 'Téléphone',
  sac: 'Sac / valise', bijou: 'Bijou / montre', vetement: 'Vêtement',
  lunettes: 'Lunettes', animal: 'Animal', document: 'Document officiel',
  enfant: 'Objet enfant / doudou', velo: 'Vélo / trottinette', electronique: 'Électronique',
  autre: 'Autre',
};

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = STATUS_CONFIG[normalizeStatus(status)] ?? STATUS_CONFIG.perdu;
  const sz = size === 'sm' ? 'text-xs px-2.5 py-0.5' : size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border} ${sz}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PerduTrouveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [item, setItem] = useState<LFItem | null>(null);
  const [comments, setComments] = useState<LFComment[]>([]);
  const [history, setHistory] = useState<LFStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Tentative 1 : avec FK explicite
    let { data, error } = await supabase
      .from('lost_found_items')
      .select('*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
      .eq('id', id)
      .single();

    // Tentative 2 : sans FK explicite (si la FK a un autre nom)
    if ((error || !data) && error?.message?.includes('fkey')) {
      ({ data, error } = await supabase
        .from('lost_found_items')
        .select('*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
        .eq('id', id)
        .single());
    }

    // Tentative 3 : sans jointure profiles ni lf_photos (table de base uniquement)
    if (error || !data) {
      ({ data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('id', id)
        .single());
    }

    if (error || !data) { setNotFound(true); setLoading(false); return; }

    const sorted = {
      ...data,
      // Normalise le statut DB (anglais ou français) vers les valeurs FR attendues par l'UI
      status: normalizeStatus(data.status),
      // Normalise le type aussi (DB peut stocker 'lost'/'found' au lieu de 'perdu'/'trouve')
      type: (['perdu', 'trouve'].includes(data.type) ? data.type : (data.type === 'lost' ? 'perdu' : data.type === 'found' ? 'trouve' : 'perdu')) as LFType,
      photos: (data.photos ?? []).sort((a: { display_order?: number }, b: { display_order?: number }) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)),
    };
    setItem(sorted as LFItem);

    // Fetch comments
    const { data: cData } = await supabase
      .from('lf_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('item_id', id)
      .order('created_at', { ascending: true })
      .limit(100);
    setComments((cData ?? []) as LFComment[]);

    // Fetch status history (silencieux si table absente)
    try {
      const { data: hData } = await supabase
        .from('lf_status_history')
        .select('id, old_status, new_status, changed_by, reason, created_at, changer:profiles!lf_status_history_changed_by_fkey(full_name)')
        .eq('item_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory((hData ?? []) as LFStatusHistory[]);
    } catch { /* ignore */ }

    setLoading(false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const isAuthor = profile?.id === item?.author_id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  const canEdit = isAuthor || isAdmin;

  const handleStatusChange = async (newStatus: LFStatus) => {
    if (!item) return;
    const cfg = STATUS_CONFIG[newStatus];
    if (!confirm(`Passer le dossier en "${cfg.label}" ?`)) return;
    setTransitioning(true);
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status: newStatus, updated_at: now };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos') updates.closed_at = now;
    if (newStatus === 'archive') updates.archived_at = now;

    await supabase.from('lost_found_items').update(updates).eq('id', item.id);

    try {
      await supabase.from('lf_status_history').insert({ item_id: item.id, old_status: item.status, new_status: newStatus, changed_by: profile?.id });
    } catch { /* ignore */ }

    // trust_interaction sur restitution
    if (newStatus === 'restitue' && profile && item.author_id !== profile.id) {
      try {
        await supabase.from('trust_interactions').insert({
          source_type: 'lost_found', source_id: item.id,
          requester_id: profile.id, receiver_id: item.author_id,
          interaction_type: 'transaction', status: 'done',
          requester_review_allowed: true, receiver_review_allowed: true,
          completed_at: now,
        });
      } catch { /* ignore */ }
    }

    toast.success(`${cfg.icon} Statut mis à jour : ${cfg.label}`);
    setTransitioning(false);
    fetchItem();
  };

  const handleDelete = async () => {
    if (!item || !confirm('Archiver cette annonce ?')) return;
    await supabase.from('lost_found_items').update({
      status: 'archive', archived_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    toast.success('📦 Annonce archivée');
    router.push('/perdu-trouve');
  };

  const handleSendComment = async () => {
    if (!item || !chatText.trim() || !profile || sending) return;
    setSending(true);
    await supabase.from('lf_comments').insert({ item_id: item.id, author_id: profile.id, content: chatText.trim() });
    setChatText('');
    await fetchItem();
    setSending(false);
  };

  const handlePrint = () => window.print();

  const handleShare = (mode: 'sms' | 'email' | 'copy') => {
    if (!item) return;
    const url = `${window.location.origin}/perdu-trouve/${item.id}`;
    const text = `${item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'} : ${item.title} — ${item.location_area}\n${url}`;
    if (mode === 'sms') window.open(`sms:?body=${encodeURIComponent(text)}`, '_self');
    else if (mode === 'email') window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(text)}`, '_self');
    else { navigator.clipboard.writeText(url); toast.success('Lien copié !'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  if (notFound || !item) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 font-medium text-lg">Annonce introuvable</p>
        <Link href="/perdu-trouve" className="mt-4 inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
      </div>
    </div>
  );

  // Utilise normalizeStatus pour se prémunir contre tout statut inconnu (DB legacy)
  const cfg = STATUS_CONFIG[normalizeStatus(item.status)] ?? STATUS_CONFIG.perdu;
  const allPhotos = toPhotoItems(item.photos ?? []);
  const isActive = ['perdu', 'trouve', 'identifie'].includes(item.status);
  const transitions = ALLOWED_TRANSITIONS[item.status] ?? [];
  const isSensitive = item.is_sensitive || ['portefeuille', 'document'].includes(item.category);
  const dateLabel = new Date(item.lost_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* ── Navigation ── */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/perdu-trouve" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Perdu / Trouvé</p>
            <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handlePrint}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="Imprimer la fiche">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={() => handleShare('copy')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="Partager">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── En-tête impression ── */}
      <div className="hidden print:block p-6 border-b border-gray-300 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Biguglia Connect — Perdu / Trouvé</p>
            <h1 className="text-2xl font-black text-gray-900">{item.title}</h1>
            <p className="text-sm text-gray-500">{item.type === 'perdu' ? 'Objet perdu' : 'Objet trouvé'} · {CATEGORIES[item.category] ?? item.category} · {item.location_area} · {item.lost_date}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Fiche #{item.id.slice(0, 8)}</p>
            <p>Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Galerie ── */}
        {allPhotos.length > 0 ? (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm print:shadow-none">
            <div className="relative h-72 sm:h-96 cursor-pointer" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={allPhotos[0].url} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {allPhotos.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm font-bold px-3 py-1 rounded-full">
                  +{allPhotos.length - 1} photos
                </div>
              )}
            </div>
            {allPhotos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {allPhotos.slice(1).map((p, i) => (
                  <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }} className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100 hover:border-orange-300 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm h-48 flex items-center justify-center ${
            item.type === 'perdu' ? 'bg-orange-50' : 'bg-emerald-50'
          }`}>
            <Package className="w-16 h-16 text-gray-200" />
          </div>
        )}

        {/* ── Infos principales ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:shadow-none print:border-gray-300">
          {/* Badges statut */}
          <div className="flex flex-wrap gap-2 mb-4">
            <StatusBadge status={item.status} size="lg" />
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border ${
              item.type === 'perdu' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              {CATEGORIES[item.category] ?? item.category}
            </span>
            {isSensitive && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                <Shield className="w-3.5 h-3.5" /> Sensible
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-3">{item.title}</h1>

          {/* Lieu + date */}
          <div className="flex flex-col gap-1.5 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span className="font-medium">{item.location_area}{item.location_detail ? ` — ${item.location_detail}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>{dateLabel}{item.lost_time ? ` à ${item.lost_time}` : ''}</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Détails de l'objet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {item.color && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium">Couleur</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.color}</p>
              </div>
            )}
            {item.brand && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium">Marque / Modèle</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.brand}</p>
              </div>
            )}
            {item.distinctive_sign && (
              <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2">
                <p className="text-xs text-gray-400 font-medium">Signe distinctif</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.distinctive_sign}</p>
              </div>
            )}
          </div>

          {/* Badges infos */}
          <div className="flex flex-wrap gap-2 mb-4">
            {item.sentimental_value && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200">💝 Valeur sentimentale</span>
            )}
            {item.declared_authorities && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">🏛️ Déclaré aux autorités</span>
            )}
            {item.deposited_at && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">📍 Déposé : {item.deposited_at}</span>
            )}
            {item.reward && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🏆 {item.reward}</span>
            )}
            {item.proof_required && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">🔒 Preuve de propriété requise</span>
            )}
          </div>

          {/* Contact */}
          {!item.keep_secret ? (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</p>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-gray-800">{item.contact_name}</p>
                {item.show_phone && item.contact_phone && (
                  <a href={`tel:${item.contact_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" />{item.contact_phone}
                  </a>
                )}
                {item.contact_email && (
                  <a href={`mailto:${item.contact_email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Mail className="w-3.5 h-3.5" />{item.contact_email}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4 flex items-center gap-2 text-sm text-slate-500">
              <EyeOff className="w-4 h-4" />
              Certains détails sont confidentiels pour sécuriser la restitution.
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="flex flex-wrap gap-2">
            {!isAuthor && isActive && (
              <ContactButton
                sourceType="lost_found"
                sourceId={item.id}
                sourceTitle={item.title}
                ownerId={item.author_id}
                userId={profile?.id}
                size="md"
                ctaLabel={item.type === 'trouve' ? "C'est le mien" : "J'ai une info"}
                prefillMsg={item.type === 'trouve'
                  ? `Bonjour, l'objet "${item.title}" trouvé à ${item.location_area} pourrait m'appartenir.`
                  : `Bonjour, j'ai peut-être une information concernant votre "${item.title}" perdu à ${item.location_area}.`}
              />
            )}
            {canEdit && transitions.length > 0 && transitions.map(t => {
              const tCfg = STATUS_CONFIG[t];
              return (
                <button key={t} onClick={() => handleStatusChange(t)} disabled={transitioning}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                  {tCfg.icon} → {tCfg.label}
                </button>
              );
            })}
            <button onClick={() => handleShare('sms')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
              💬 SMS
            </button>
            <button onClick={() => handleShare('email')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
              📧 Email
            </button>
            <button onClick={() => handleShare('copy')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
              🔗 Copier le lien
            </button>
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            {canEdit && (
              <>
                <Link href={`/perdu-trouve?edit=${item.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                  <Pencil className="w-4 h-4" /> Modifier
                </Link>
                <button onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                  <Trash2 className="w-4 h-4" /> Archiver
                </button>
              </>
            )}
            {!isAuthor && (
              <ReportButton targetType="lost_found" targetId={item.id} targetTitle={item.title} variant="mini" />
            )}
          </div>
        </div>

        {/* ── Forum / Discussion ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-bold text-gray-800">Discussion</p>
            {comments.length > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{comments.length}</span>
            )}
          </div>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">Aucun message — soyez le premier à laisser une info !</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: item.type === 'perdu' ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                    {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-bold text-gray-700">
                      {c.author?.full_name ?? 'Anonyme'}
                      <span className="font-normal text-gray-400 ml-2">{formatRelative(c.created_at)}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {profile ? (
            <div className="flex gap-2 mt-2">
              <textarea value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                className="flex-1 text-sm rounded-xl border border-blue-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <button onClick={handleSendComment} disabled={!chatText.trim() || sending}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 disabled:opacity-40 transition-all flex-shrink-0 flex items-center gap-1.5">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
              </button>
            </div>
          ) : (
            <Link href="/connexion" className="text-sm text-center text-blue-600 font-semibold py-2 hover:underline block">
              Connectez-vous pour répondre →
            </Link>
          )}
        </div>

        {/* ── Auteur ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-700">Publié par</p>
          </div>
          <div className="flex items-center gap-3">
            {item.author && (
              <TrustScoreMini
                profile={{
                  id: item.author_id,
                  created_at: item.author.created_at ?? item.created_at,
                  role: item.author.role ?? 'resident',
                  avatar_url: item.author.avatar_url ?? null,
                  phone: item.author.phone ?? null,
                }}
              />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.author?.full_name ?? 'Membre'}</p>
              <p className="text-xs text-gray-400">Annonce publiée {formatRelative(item.created_at)}</p>
            </div>
          </div>
        </div>

        {/* ── Historique statuts ── */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:hidden">
            <button className="w-full flex items-center gap-2 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setShowHistory(v => !v)}>
              <Eye className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-bold text-gray-700 flex-1">Historique des statuts ({history.length})</p>
              {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showHistory && (
              <div className="border-t border-gray-50 px-5 pb-4">
                <div className="space-y-2 mt-3">
                  {history.map(h => {
                    const newCfg = STATUS_CONFIG[h.new_status as LFStatus] ?? STATUS_CONFIG.perdu;
                    const oldCfg = h.old_status ? (STATUS_CONFIG[h.old_status as LFStatus] ?? null) : null;
                    return (
                      <div key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-base">{newCfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700">
                            {oldCfg ? `${oldCfg.icon} ${oldCfg.label} → ` : ''}{newCfg.icon} {newCfg.label}
                          </p>
                          {h.reason && <p className="text-xs text-gray-400 italic">{h.reason}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">{formatRelative(h.created_at)}</p>
                          {h.changer?.full_name && <p className="text-xs text-gray-400">{h.changer.full_name}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bloc sécurité ── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 print:hidden">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-bold text-blue-800">Rappels de sécurité</p>
          </div>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• Ne transmettez jamais d&apos;argent avant d&apos;avoir récupéré l&apos;objet</li>
            <li>• Privilégiez les échanges dans des lieux publics ou officiels (mairie, commerce)</li>
            {item.proof_required && <li>• Ce déclarant demande une preuve de propriété avant remise</li>}
            <li>• Signalez tout comportement suspect via le bouton &quot;Signaler&quot;</li>
          </ul>
        </div>

      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

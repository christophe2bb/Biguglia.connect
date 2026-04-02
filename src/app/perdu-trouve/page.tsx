'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Search, Plus, X, Loader2, AlertCircle, Camera, MapPin, Clock,
  Phone, Mail, MessageSquare, CheckCircle2, Shield, Eye, EyeOff,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Filter,
  Dog, Key, CreditCard, Smartphone, Briefcase, Gem, Glasses,
  Shirt, FileText, Bike, Baby, Package, RefreshCw, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget, { UserRatingBadge } from '@/components/ui/RatingWidget';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import StatusBadge from '@/components/ui/StatusBadge';
import ContactButton from '@/components/ui/ContactButton';

// ─── Types ────────────────────────────────────────────────────────────────────
type LostFoundType = 'perdu' | 'trouve';

type LostFoundStatus = 'active' | 'resolved' | 'draft';

type LostFoundItem = {
  id: string;
  type: LostFoundType;
  status: LostFoundStatus;
  title: string;
  category: string;
  description: string;
  brand: string | null;
  color: string | null;
  distinctive_sign: string | null;
  keep_secret: boolean;
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
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  photos?: { url: string; display_order?: number }[];
  created_at: string;
  expires_at: string | null;
};

type LFComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'cles',        label: 'Clés',                     icon: Key },
  { value: 'portefeuille',label: 'Portefeuille / papiers',   icon: CreditCard },
  { value: 'telephone',   label: 'Téléphone',                icon: Smartphone },
  { value: 'sac',         label: 'Sac / valise',             icon: Briefcase },
  { value: 'bijou',       label: 'Bijou / montre',           icon: Gem },
  { value: 'vetement',    label: 'Vêtement',                 icon: Shirt },
  { value: 'lunettes',    label: 'Lunettes',                 icon: Glasses },
  { value: 'animal',      label: 'Animal perdu / trouvé',    icon: Dog },
  { value: 'document',    label: 'Document officiel',        icon: FileText },
  { value: 'enfant',      label: 'Objet enfant / doudou',    icon: Baby },
  { value: 'velo',        label: 'Vélo / trottinette',       icon: Bike },
  { value: 'autre',       label: 'Autre',                    icon: Package },
];

const DEPOSIT_LOCATIONS = ['Mairie', 'Commerce', 'Police municipale', 'Voisin', 'Autre'];

const LOCATION_AREAS = [
  'Centre-ville', 'Mairie', 'Parking stade', 'Parking mairie', 'Plage',
  'Stade', 'École', 'Arrêt de bus', 'Route nationale', 'Route forestière',
  'Étang', 'Marché', 'Poste', 'Église', 'Autre quartier',
];

// ─── LostFoundCard ────────────────────────────────────────────────────────────
function LostFoundCard({
  item, userId, isAuthor, onEdit, onDelete, onResolve,
}: {
  item: LostFoundItem;
  userId?: string;
  isAuthor: boolean;
  onEdit: (i: LostFoundItem) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [expanded, setExpanded] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [comments, setComments] = useState<LFComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const CatIcon = CATEGORIES.find(c => c.value === item.category)?.icon ?? Package;
  const isPerdu = item.type === 'perdu';
  const isResolved = item.status === 'resolved';
  const allPhotos = toPhotoItems(item.photos ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const dateLabel = new Date(item.lost_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  useEffect(() => {
    supabase.from('lf_comments').select('id', { count: 'exact', head: true })
      .eq('item_id', item.id)
      .then(({ count }) => setChatCount(count ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('lf_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data ?? []) as LFComment[]);
    setChatCount((data ?? []).length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('lf_comments').insert({ item_id: item.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/perdu-trouve#${item.id}`;
  const shareText = encodeURIComponent(`${item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'} : ${item.title} — ${item.location_area}\n${shareUrl}`);

  const handleShareSMS = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`sms:?body=${shareText}`, '_self');
    setOpenShare(false);
  };

  const handleShareEmail = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const subject = encodeURIComponent(`${item.type === 'perdu' ? 'Objet perdu' : 'Objet trouvé'} : ${item.title}`);
    window.open(`mailto:?subject=${subject}&body=${shareText}`, '_self');
    setOpenShare(false);
  };

  return (
    <div id={item.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
      isResolved ? 'opacity-60 border-gray-200' : isPerdu ? 'border-orange-200' : 'border-emerald-200'
    }`}>
      {/* ── Zone photo / header — hauteur fixe 44 ── */}
      <div className="relative h-44 overflow-hidden">
        {item.photos && item.photos.length > 0 ? (
          <div className="w-full h-full cursor-pointer" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photos[0].url} alt={item.title} className="w-full h-full object-cover" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-10 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                +{allPhotos.length - 1} photo{allPhotos.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isPerdu ? 'bg-gradient-to-br from-orange-50 to-amber-100' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
          }`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${isPerdu ? 'text-orange-400' : 'text-emerald-400'}`} />
          </div>
        )}
        {/* Overlay gradient bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badge type haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StatusBadge
            status={item.status}
            contentType="lost_found"
            extra={{ lostFoundType: item.type }}
            size="sm" showIcon showDot={!isResolved} className="shadow font-black"
          />
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 shadow">
            <CatIcon className="w-3.5 h-3.5" />
            {CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
          </span>
        </div>
        {/* Boutons auteur haut droite */}
        {isAuthor && (
          <div className="absolute top-3 right-3 flex gap-1">
            {!isResolved && (
              <button type="button" onClick={() => onResolve(item.id)}
                className="p-1.5 bg-white/90 text-gray-600 hover:text-emerald-600 rounded-lg transition-all shadow" title="Marquer résolu">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={() => onEdit(item)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-blue-600 rounded-lg transition-all shadow">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(item.id)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-lg transition-all shadow">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Titre en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
          <p className="text-white/75 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />{item.location_area} · {dateLabel}
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* Badges secondaires */}
        <div className="flex flex-wrap gap-2 mb-3">
          {item.sentimental_value && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
              💝 Valeur sentimentale
            </span>
          )}
          {item.keep_secret && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              <EyeOff className="w-3 h-3 inline mr-1" />Infos partielles
            </span>
          )}
        </div>

        {/* Lieu + date */}
        <div className="flex flex-col gap-1 mb-3">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            {item.location_area}{item.location_detail ? ` — ${item.location_detail}` : ''}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            {dateLabel}{item.lost_time ? ` · ${item.lost_time}` : ''}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">{item.description}</p>

        {/* Expandable details */}
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 mb-3">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Moins de détails</> : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
        </button>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5">
            {item.color && <p className="text-gray-600"><span className="font-semibold">Couleur :</span> {item.color}</p>}
            {item.brand && <p className="text-gray-600"><span className="font-semibold">Marque :</span> {item.brand}</p>}
            {item.distinctive_sign && <p className="text-gray-600"><span className="font-semibold">Signe distinctif :</span> {item.distinctive_sign}</p>}
            {item.reward && <p className="text-orange-600 font-semibold">🏆 Récompense : {item.reward}</p>}
            {item.declared_authorities && <p className="text-gray-600">✓ Déclaré en mairie / gendarmerie</p>}
            {item.deposited_at && <p className="text-gray-600">📍 Déposé à : {item.deposited_at}</p>}
            {item.proof_required && <p className="text-gray-600">🔒 Preuve de propriété requise pour restitution</p>}
            {/* Contact */}
            <div className="pt-1.5 border-t border-gray-200 space-y-1">
              <p className="font-semibold text-gray-700">Contact : {item.contact_name}</p>
              {item.show_phone && item.contact_phone && (
                <p className="flex items-center gap-1.5 text-gray-600"><Phone className="w-3 h-3" />{item.contact_phone}</p>
              )}
              {item.contact_email && (
                <p className="flex items-center gap-1.5 text-gray-600"><Mail className="w-3 h-3" />{item.contact_email}</p>
              )}
            </div>
          </div>
        )}

        {/* Photos galerie — miniatures cliquables */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {allPhotos.slice(1).map((p, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                className="flex-shrink-0 focus:outline-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-100 hover:border-brand-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {/* CTA principal via ContactButton */}
          {isAuthor ? (
            <span className="text-xs text-gray-400 italic">✉️ Les membres vous contacteront ici</span>
          ) : (
            <ContactButton
              sourceType="lost_found"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={userId}
              size="sm"
              ctaLabel={item.type === 'trouve' ? "C’est le mien" : "J’ai une info"}
            />
          )}
          {/* Message button */}
          <button type="button" onClick={handleOpenChat}
            className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border ${
              openChat ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}>
            <MessageSquare className="w-4 h-4" />
            Discussion
            {chatCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>
            )}
          </button>
          {/* Bouton Partager avec mini-menu */}
          <div ref={shareRef} className="relative">
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenShare(v => !v); }}
              className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm border transition-all ${
                openShare ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}>
              <Share2 className="w-4 h-4" /> Partager
            </button>
            {openShare && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[160px]">
                <button type="button" onClick={handleShareSMS}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="text-lg">💬</span> Par SMS
                </button>
                <div className="border-t border-gray-100" />
                <button type="button" onClick={handleShareEmail}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="text-lg">📧</span> Par Email
                </button>
              </div>
            )}
          </div>
          {isAuthor && !isResolved && (
            <button type="button" onClick={() => onResolve(item.id)}
              className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all">
              <CheckCircle2 className="w-4 h-4" /> Marquer résolu
            </button>
          )}
          {!isAuthor && (
            <ReportButton targetType="lost_found" targetId={item.id} targetTitle={item.title} variant="mini" />
          )}
        </div>

        {/* Mini-forum */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: isPerdu ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-xs font-bold text-gray-700">
                        {c.author?.full_name ?? 'Anonyme'}
                        <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {userId ? (
              <div className="flex items-end gap-1.5">
                <textarea ref={inputRef} value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                  className="flex-1 text-xs rounded-lg border border-blue-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-blue-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour répondre →
              </Link>
            )}
          </div>
        )}

        {/* Notation publique (libre pour perdu/trouvé) */}
        <div className="mt-3">
          <RatingWidget
            targetType="lost_found"
            targetId={item.id}
            authorId={item.author_id}
            userId={userId}
            compact
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 border-t border-gray-50 pt-2">
          <span>{item.author?.full_name ?? 'Membre'}</span>
          <UserRatingBadge userId={item.author_id} />
          <span>· {formatRelative(item.created_at)}</span>
        </div>
      </div>
      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}

// ─── FORM initial state ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  type: 'perdu' as LostFoundType,
  title: '',
  category: 'autre',
  description: '',
  brand: '',
  color: '',
  distinctive_sign: '',
  keep_secret: false,
  lost_date: '',
  lost_time: '',
  location_area: '',
  location_detail: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_mode: 'messagerie',
  show_phone: false,
  reward: '',
  sentimental_value: false,
  declared_authorities: false,
  need_community_help: true,
  deposited: false,
  deposited_at: '',
  proof_required: false,
  confirm_true: false,
  confirm_public: false,
  confirm_intermediary: false,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PerduTrouvePage() {
  const { profile } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'perdu' | 'trouve'>('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'resolved' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LostFoundItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const photoRef = useRef<HTMLInputElement>(null);
  // Form step (1-6)
  const [step, setStep] = useState(1);

  // ── Fetch items ──────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lost_found_items')
      .select(`*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url), photos:lf_photos(url, display_order)`)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterType !== 'all') query = query.eq('type', filterType);
    if (filterCat !== 'all') query = query.eq('category', filterCat);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);

    // Sort photos by display_order
    const enriched = (data || []).map((it: LostFoundItem & { photos?: { url: string; display_order?: number }[] }) => ({
      ...it,
      photos: (it.photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    }));

    // Filter by search
    const filtered = search.trim()
      ? enriched.filter(it =>
          it.title.toLowerCase().includes(search.toLowerCase()) ||
          it.description.toLowerCase().includes(search.toLowerCase()) ||
          it.location_area.toLowerCase().includes(search.toLowerCase())
        )
      : enriched;

    setItems(filtered as LostFoundItem[]);
    setLoading(false);
  }, [filterType, filterCat, filterStatus, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoRef.current) photoRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]); setPreviews([]);
    setEditingItem(null); setShowForm(false); setStep(1);
  };

  const startEdit = (item: LostFoundItem) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      title: item.title,
      category: item.category,
      description: item.description,
      brand: item.brand ?? '',
      color: item.color ?? '',
      distinctive_sign: item.distinctive_sign ?? '',
      keep_secret: item.keep_secret,
      lost_date: item.lost_date,
      lost_time: item.lost_time ?? '',
      location_area: item.location_area,
      location_detail: item.location_detail ?? '',
      contact_name: item.contact_name,
      contact_phone: item.contact_phone ?? '',
      contact_email: item.contact_email ?? '',
      contact_mode: item.contact_mode,
      show_phone: item.show_phone,
      reward: item.reward ?? '',
      sentimental_value: item.sentimental_value,
      declared_authorities: item.declared_authorities,
      need_community_help: item.need_community_help,
      deposited: !!item.deposited_at,
      deposited_at: item.deposited_at ?? '',
      proof_required: item.proof_required,
      confirm_true: true,
      confirm_public: true,
      confirm_intermediary: true,
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!profile) return;
    if (!form.title.trim() || !form.lost_date || !form.location_area) {
      toast.error('Titre, date et lieu sont obligatoires'); return;
    }
    if (!asDraft && (!form.confirm_true || !form.confirm_public || !form.confirm_intermediary)) {
      toast.error('Veuillez cocher les 3 cases de validation'); return;
    }

    setSubmitting(true);
    const payload = {
      author_id: profile.id,
      type: form.type,
      status: asDraft ? 'draft' : 'active',
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      brand: form.brand.trim() || null,
      color: form.color.trim() || null,
      distinctive_sign: form.distinctive_sign.trim() || null,
      keep_secret: form.keep_secret,
      lost_date: form.lost_date,
      lost_time: form.lost_time || null,
      location_area: form.location_area,
      location_detail: form.location_detail.trim() || null,
      contact_name: form.contact_name.trim() || profile.full_name || 'Anonyme',
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      reward: form.reward.trim() || null,
      sentimental_value: form.sentimental_value,
      declared_authorities: form.declared_authorities,
      need_community_help: form.need_community_help,
      deposited_at: form.deposited ? (form.deposited_at || null) : null,
      proof_required: form.proof_required,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    let itemId: string | null = null;

    if (editingItem) {
      const { error } = await supabase.from('lost_found_items').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification'); console.error(error); setSubmitting(false); return; }
      itemId = editingItem.id;
      toast.success('Annonce modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase.from('lost_found_items').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); console.error(error); setSubmitting(false); return; }
      itemId = inserted?.id ?? null;
      toast.success(asDraft ? 'Brouillon enregistré ✓' : `${form.type === 'perdu' ? '🔴 Annonce "Perdu"' : '🟢 Annonce "Trouvé"'} publiée !`, { duration: 4000 });
    }

    // Upload photos
    if (photos.length > 0 && itemId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `lost-found/${itemId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          console.error('[storage] lf photo upload error:', upErr.message);
          toast.error(`Photo ${i+1} non sauvegardée : ${upErr.message}`);
          continue;
        }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('lf_photos').insert({ item_id: itemId, url: u.publicUrl, display_order: i });
          if (dbErr) console.error('[lf_photos] insert error:', dbErr.message);
        }
      }
    }

    resetForm();
    fetchItems();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('lost_found_items').delete().eq('id', id);
    toast.success('Annonce supprimée');
    fetchItems();
  };

  const handleResolve = async (id: string) => {
    await supabase.from('lost_found_items').update({ status: 'resolved' }).eq('id', id);
    toast.success('Annonce marquée comme résolue ✓');
    fetchItems();
  };

  // ── Filtered items ────────────────────────────────────────────────────────
  const perdus = items.filter(i => i.type === 'perdu' && i.status === 'active').length;
  const trouves = items.filter(i => i.type === 'trouve' && i.status === 'active').length;

  // ── FORM RENDER ───────────────────────────────────────────────────────────
  const renderForm = () => {
    const isPerdu = form.type === 'perdu';
    return (
      <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {editingItem ? '✏️ Modifier l\'annonce' : '📢 Publier une annonce Perdu / Trouvé'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Aidez la communauté de Biguglia à retrouver ou restituer un objet rapidement</p>
          </div>
          <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {['Type', 'Objet', 'Lieu & Date', 'Photos', 'Contact', 'Validation'].map((s, i) => (
            <button key={i} onClick={() => setStep(i + 1)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === i + 1 ? (isPerdu ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white') :
                step > i + 1 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
              }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                step === i + 1 ? 'bg-white/30' : step > i + 1 ? 'bg-green-400 text-white' : 'bg-gray-300 text-gray-500'
              }`}>{step > i + 1 ? '✓' : i + 1}</span>
              {s}
            </button>
          ))}
        </div>

        {/* ── STEP 1 : Type ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Quel est le type de votre annonce ?</p>
            <div className="grid grid-cols-2 gap-4">
              {(['perdu', 'trouve'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 font-black text-lg transition-all ${
                    form.type === t
                      ? t === 'perdu' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}>
                  <span className="text-5xl">{t === 'perdu' ? '🔴' : '🟢'}</span>
                  <span className="uppercase tracking-wide">{t === 'perdu' ? "J'ai perdu" : "J'ai trouvé"}</span>
                </button>
              ))}
            </div>
            <div className={`rounded-xl p-3 text-sm ${isPerdu ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isPerdu
                ? 'Décrivez précisément l\'objet et l\'endroit où vous pensez l\'avoir perdu.'
                : 'Indiquez où et quand vous l\'avez trouvé, sans révéler tous les détails sensibles.'}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Objet ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Bloc 2 — Identification de l&apos;objet</p>
            <input type="text" placeholder="Titre de l'annonce *" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {/* Catégorie */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                        form.category === cat.value
                          ? isPerdu ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-center leading-tight text-xs">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Description */}
            <textarea placeholder="Description détaillée (couleur, marque, taille, matière, état, signes distinctifs…)" rows={3}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Couleur" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input type="text" placeholder="Marque / modèle" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <input type="text" placeholder="Signe distinctif (ex: gravure, autocollant, rayure…)" value={form.distinctive_sign}
              onChange={e => setForm(f => ({ ...f, distinctive_sign: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {/* Keep secret */}
            {!isPerdu && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.keep_secret} onChange={e => setForm(f => ({ ...f, keep_secret: e.target.checked }))} className="mt-0.5 rounded" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><EyeOff className="w-4 h-4" />Je garde volontairement certains détails confidentiels</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pour vérifier que le réclamant est le vrai propriétaire</p>
                </div>
              </label>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(3)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 : Lieu & Date ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Bloc 3 — Lieu et moment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                <input type="date" required value={form.lost_date}
                  onChange={e => setForm(f => ({ ...f, lost_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Heure approximative</label>
                <input type="time" value={form.lost_time}
                  onChange={e => setForm(f => ({ ...f, lost_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Lieu principal *</label>
              <select value={form.location_area} onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="">Choisir un lieu…</option>
                {LOCATION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Précision sur le lieu (ex: près de l'entrée principale, banc côté gauche…)"
              value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(4)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 : Photos ── */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Bloc 4 — Photos (max 5, fortement conseillées)</p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-bold">Principal</span>}
                </div>
              ))}
              {photos.length < 5 && (
                <button onClick={() => photoRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-all">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs mt-1">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            <p className="text-xs text-gray-400">
              {photos.length === 0 ? '💡 Astuce : une photo augmente fortement les chances de retrouver l\'objet !' : `${photos.length}/5 photo${photos.length > 1 ? 's' : ''} sélectionnée${photos.length > 1 ? 's' : ''}`}
            </p>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(5)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 : Contact + Infos complémentaires ── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Bloc 5 — Contact</p>
              <div className="space-y-3">
                <input type="text" placeholder="Nom ou prénom affiché *"
                  value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input type="tel" placeholder="Téléphone (optionnel)"
                    value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <input type="email" placeholder="Email (optionnel)"
                    value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode de contact préféré</label>
                  <div className="flex gap-2 flex-wrap">
                    {[{ v: 'messagerie', l: '💬 Messagerie plateforme' }, { v: 'telephone', l: '📞 Téléphone' }, { v: 'email', l: '📧 Email' }].map(m => (
                      <button key={m.v} type="button" onClick={() => setForm(f => ({ ...f, contact_mode: m.v }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.contact_mode === m.v ? (isPerdu ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300') : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Afficher mon téléphone publiquement</span>
                </label>
              </div>
            </div>

            {/* Infos complémentaires dynamiques */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">
                {isPerdu ? '📋 Infos complémentaires — Objet perdu' : '📋 Infos complémentaires — Objet trouvé'}
              </p>
              <div className="space-y-3">
                {isPerdu ? (
                  <>
                    <input type="text" placeholder="🏆 Récompense proposée (optionnel, ex: 50€)"
                      value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.sentimental_value} onChange={e => setForm(f => ({ ...f, sentimental_value: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">💝 Objet de grande valeur sentimentale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.declared_authorities} onChange={e => setForm(f => ({ ...f, declared_authorities: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">🏛️ Déclaration faite en mairie / gendarmerie</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.need_community_help} onChange={e => setForm(f => ({ ...f, need_community_help: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">📢 Besoin d&apos;aide de la communauté pour partager</span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.deposited} onChange={e => setForm(f => ({ ...f, deposited: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">📍 Objet déposé quelque part</span>
                    </label>
                    {form.deposited && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Déposé où ?</label>
                        <div className="flex gap-2 flex-wrap">
                          {DEPOSIT_LOCATIONS.map(d => (
                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, deposited_at: d }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.deposited_at === d ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.proof_required} onChange={e => setForm(f => ({ ...f, proof_required: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">🔒 Je remettrai l&apos;objet uniquement après vérification</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(6)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6 : Validation ── */}
        {step === 6 && (
          <div className="space-y-5">
            {/* Aperçu */}
            <div className={`rounded-xl border p-4 ${isPerdu ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Aperçu avant publication</p>
              <p className="text-base font-black text-gray-900">{form.title || '(sans titre)'}</p>
              <p className="text-xs text-gray-500 mt-1">{form.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'} · {CATEGORIES.find(c => c.value === form.category)?.label} · {form.location_area || '—'} · {form.lost_date || '—'}</p>
              {form.reward && <p className="text-xs text-orange-600 font-bold mt-1">🏆 {form.reward}</p>}
            </div>

            {/* Conseils sécurité */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-blue-700">Conseils sécurité</p>
              </div>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                <li>Ne publiez pas de données trop sensibles (numéro de compte, etc.)</li>
                <li>Pour un portefeuille, ne montrez pas les informations personnelles visibles</li>
                <li>Pour un objet trouvé, gardez un détail secret pour vérifier le propriétaire</li>
                <li>Privilégiez la messagerie de la plateforme plutôt que le téléphone</li>
                {form.category === 'animal' && <li>Pour un animal, indiquez si vous avez contacté un vétérinaire ou vérifié la puce</li>}
              </ul>
            </div>

            {/* Checkboxes validation */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700">Validation obligatoire</p>
              {[
                { key: 'confirm_true', label: 'Je confirme que les informations sont exactes et véridiques' },
                { key: 'confirm_public', label: 'J\'accepte que l\'annonce soit visible publiquement sur la plateforme' },
                { key: 'confirm_intermediary', label: 'Je comprends que la plateforme est uniquement un intermédiaire' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="mt-0.5 rounded" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => handleSubmit(false)} disabled={submitting || !form.confirm_true || !form.confirm_public || !form.confirm_intermediary}
                className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm disabled:opacity-50 transition-all ${
                  isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                📢 Publier l&apos;annonce
              </button>
              <button onClick={() => handleSubmit(true)} disabled={submitting}
                className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-all">
                💾 Enregistrer brouillon
              </button>
              <button onClick={() => setStep(5)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* DB warning */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Tables manquantes.</span> Exécutez le SQL de migration dans Supabase (
              <Link href="/admin/migration" className="underline">page Admin</Link>).
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-amber-100 text-sm font-semibold">Vie pratique · Perdu / Trouvé</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🔍 Perdu / Trouvé à Biguglia
              </h1>
              <p className="text-amber-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Signalez un objet perdu ou trouvé. La communauté vous aide à le retrouver.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 bg-orange-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🔴 {perdus} perdu{perdus !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🟢 {trouves} trouvé{trouves !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <RefreshCw className="w-3.5 h-3.5" /> Renouvellement 60 j
                </span>
              </div>
            </div>
            {profile && (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Form */}
        {showForm && profile && renderForm()}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 min-w-56 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>
          {/* Type filter */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm font-semibold shadow-sm">
            {([['all','Tous'],['perdu','🔴 Perdu'],['trouve','🟢 Trouvé']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFilterType(v)}
                className={`px-4 py-2.5 transition-all ${filterType === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm font-semibold shadow-sm">
            {([['active','En cours'],['resolved','Résolus'],['all','Tous']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-4 py-2.5 transition-all ${filterStatus === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {/* Category filter */}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">Aucune annonce pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Soyez le premier à publier une annonce !</p>
            {profile ? (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                <Plus className="w-4 h-4" /> Publier une annonce
              </button>
            ) : (
              <Link href="/connexion"
                className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                Se connecter pour publier
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => (
              <LostFoundCard
                key={item.id}
                item={item}
                userId={profile?.id}
                isAuthor={profile?.id === item.author_id}
                onEdit={startEdit}
                onDelete={handleDelete}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}

        {/* Login CTA */}
        {!profile && items.length > 0 && (
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <p className="text-orange-700 font-medium mb-3">Connectez-vous pour publier ou répondre aux annonces</p>
            <Link href="/connexion"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

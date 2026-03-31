'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import {
  Search, Plus, X, Loader2, AlertCircle, Camera, MapPin, Clock,
  Phone, Mail, Globe, MessageSquare, CheckCircle2, Shield, Users,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Heart, Star,
  Send, Calendar, Tag, Info, Handshake, Flag, BookOpen,
  Music, Leaf, Dumbbell, Baby, Dog, ParkingSquare, Accessibility,
  Building2, ArrowRight, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type AssoCategory =
  | 'sport' | 'culture' | 'solidarite' | 'jeunesse' | 'environnement'
  | 'loisirs' | 'animaux' | 'patrimoine' | 'sante' | 'education'
  | 'seniors' | 'autre';

type PubType =
  | 'vitrine' | 'benevoles' | 'activite' | 'adherents'
  | 'materiel' | 'evenement' | 'dons' | 'partenaires';

type AssoStatus = 'active' | 'inactive' | 'draft';

type Association = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  pub_type: PubType;
  status: AssoStatus;
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
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
};

type AssoComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const CAT_CONFIG: Record<AssoCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  sport:        { label: 'Sport',         icon: Dumbbell,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  culture:      { label: 'Culture',       icon: Music,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200' },
  solidarite:   { label: 'Solidarité',    icon: Handshake,  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200' },
  jeunesse:     { label: 'Jeunesse',      icon: Baby,       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200' },
  environnement:{ label: 'Environnement', icon: Leaf,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  loisirs:      { label: 'Loisirs',       icon: Star,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  animaux:      { label: 'Animaux',       icon: Dog,        color: 'text-lime-600',    bg: 'bg-lime-50 border-lime-200' },
  patrimoine:   { label: 'Patrimoine',    icon: Flag,       color: 'text-stone-600',   bg: 'bg-stone-50 border-stone-200' },
  sante:        { label: 'Santé',         icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  education:    { label: 'Éducation',     icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  seniors:      { label: 'Seniors',       icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-200' },
  autre:        { label: 'Autre',         icon: Building2,  color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200' },
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

const NEEDS_OPTIONS = [
  'Bénévoles', 'Nouveaux adhérents', 'Participants', 'Matériel',
  'Sponsors', 'Dons', 'Local', 'Transport', 'Encadrants',
  'Compétences spécifiques', 'Communication / visibilité',
];

const PUBLIC_OPTIONS = ['Enfants', 'Ados', 'Adultes', 'Seniors', 'Tout public', 'Familles'];

const ACTIVITY_OPTIONS = [
  'Cours', 'Sorties', 'Entraînements', 'Ateliers', 'Événements',
  'Aide sociale', 'Accompagnement', 'Permanences', 'Actions terrain',
];

const TAG_OPTIONS = [
  'bénévolat', 'sport', 'enfants', 'nature', 'musique', 'entraide',
  'quartier', 'patrimoine', 'seniors', 'culture', 'solidarité', 'loisirs',
];

// ─── AssociationCard ──────────────────────────────────────────────────────────
function AssociationCard({
  asso, userId, isAuthor, onEdit, onDelete,
}: {
  asso: Association;
  userId?: string;
  isAuthor: boolean;
  onEdit: (a: Association) => void;
  onDelete: (id: string) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [expanded, setExpanded] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [comments, setComments] = useState<AssoComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const cat = CAT_CONFIG[asso.category];
  const CatIcon = cat.icon;
  const pubConf = PUB_TYPE_CONFIG[asso.pub_type];
  const coverPhoto = asso.photos?.[0]?.url;

  useEffect(() => {
    supabase.from('asso_comments').select('id', { count: 'exact', head: true })
      .eq('asso_id', asso.id)
      .then(({ count }) => setChatCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asso.id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('asso_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('asso_id', asso.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as AssoComment[]);
    setChatCount((data ?? []).length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asso.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('asso_comments').insert({ asso_id: asso.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/associations#${asso.id}`;
  const shareText = encodeURIComponent(`${asso.name} — ${asso.description_short}\n${shareUrl}`);

  return (
    <div id={asso.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">

      {/* Cover photo ou header coloré — hauteur fixe 44 */}
      <div className="relative h-44 overflow-hidden">
        {coverPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverPhoto} alt={asso.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full ${cat.bg} flex items-center justify-center`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${cat.color}`} />
          </div>
        )}
        {/* Overlay gradient bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badges flottants haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow ${pubConf.color}`}>{pubConf.emoji} {pubConf.label}</span>
          {asso.urgent_need && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow animate-pulse">🚨 Urgent</span>}
        </div>
        {/* Boutons auteur haut droite */}
        {isAuthor && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button type="button" onClick={() => onEdit(asso)} className="p-1.5 bg-white/80 text-gray-600 hover:text-blue-600 rounded-lg transition-all backdrop-blur-sm shadow"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onDelete(asso.id)} className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-all backdrop-blur-sm shadow"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {/* Nom + slogan en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-base leading-tight drop-shadow">{asso.name}</p>
          {asso.slogan && <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{asso.slogan}</p>}
        </div>
      </div>

      <div className="p-5">
        {/* Badges catégorie + infos rapides */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${cat.bg} ${cat.color}`}>
            <CatIcon className="w-3 h-3" />{cat.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <MapPin className="w-3 h-3 text-gray-400" />{asso.location}
          </span>
          {asso.declared && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />Déclarée
            </span>
          )}
          {asso.places_limited && asso.capacity && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              👥 {asso.capacity} places
            </span>
          )}
        </div>

        {/* Description courte */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{asso.description_short}</p>

        {/* Badges besoins */}
        {asso.needs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {asso.needs.map(n => (
              <span key={n} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                🔎 {n}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {asso.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asso.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"># {t}</span>
            ))}
          </div>
        )}

        {/* Infos pratiques rapides */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs text-gray-500">
          {asso.schedule && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{asso.schedule}</span>
          )}
          {asso.price_type && (
            <span className="flex items-center gap-1">
              💶 {asso.price_type === 'gratuit' ? 'Gratuit' : asso.price_type === 'cotisation' ? `Cotisation${asso.price_detail ? ` · ${asso.price_detail}` : ''}` : asso.price_detail || 'Voir conditions'}
            </span>
          )}
          {asso.public_target.length > 0 && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-purple-400" />{asso.public_target.join(', ')}</span>
          )}
          {asso.contact_email && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{asso.contact_email}</span>
          )}
        </div>

        {/* Badges accessibilité */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {asso.pmr_accessible && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Accessibility className="w-3 h-3 inline mr-1" />PMR</span>}
          {asso.families_welcome && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200"><Baby className="w-3 h-3 inline mr-1" />Familles</span>}
          {asso.animals_ok && <span className="text-xs px-2 py-0.5 rounded-full bg-lime-50 text-lime-600 border border-lime-200"><Dog className="w-3 h-3 inline mr-1" />Animaux</span>}
          {asso.parking_nearby && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200"><ParkingSquare className="w-3 h-3 inline mr-1" />Parking</span>}
          {asso.material_provided && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200">✓ Matériel fourni</span>}
          {asso.registration_required && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">📝 Inscription requise</span>}
        </div>

        {/* Expandable */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 mb-3">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Moins de détails</> : <><ChevronDown className="w-3.5 h-3.5" />Voir la présentation complète</>}
        </button>

        {expanded && (
          <div className="space-y-4 mb-4">
            {asso.description_full && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Présentation</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{asso.description_full}</p>
              </div>
            )}
            {asso.activities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activités proposées</p>
                <div className="flex flex-wrap gap-1.5">
                  {asso.activities.map(a => <span key={a} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
                {asso.frequency && <p className="text-xs text-gray-500 mt-1.5">⏱ {asso.frequency}</p>}
              </div>
            )}
            {asso.need_detail && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Ce que nous recherchons</p>
                <p className="text-sm text-gray-700">{asso.need_detail}</p>
              </div>
            )}
            {/* Contact complet */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact</p>
              <p className="text-sm font-semibold text-gray-800">{asso.contact_name}{asso.contact_role ? ` · ${asso.contact_role}` : ''}</p>
              {asso.show_phone && asso.contact_phone && (
                <a href={`tel:${asso.contact_phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Phone className="w-3 h-3" />{asso.contact_phone}</a>
              )}
              {asso.contact_email && (
                <a href={`mailto:${asso.contact_email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Mail className="w-3 h-3" />{asso.contact_email}</a>
              )}
              {asso.contact_website && (
                <a href={asso.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Globe className="w-3 h-3" />{asso.contact_website}</a>
              )}
              <div className="flex gap-2 pt-1">
                {asso.contact_facebook && <a href={asso.contact_facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">Facebook →</a>}
                {asso.contact_instagram && <a href={asso.contact_instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline font-semibold">Instagram →</a>}
              </div>
            </div>
            {asso.rna_number && (
              <p className="text-xs text-gray-400">N° RNA : {asso.rna_number}</p>
            )}
          </div>
        )}

        {/* Galerie photos supplémentaires */}
        {asso.photos && asso.photos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {asso.photos.slice(1).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p.url} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {/* CTA principal selon pub_type */}
          {userId ? (
            <button type="button" onClick={handleOpenChat}
              className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-violet-500 text-white hover:bg-violet-600 transition-all">
              {asso.pub_type === 'benevoles' ? <><Users className="w-4 h-4" />Devenir bénévole</> :
               asso.pub_type === 'evenement' ? <><Calendar className="w-4 h-4" />Participer</> :
               asso.pub_type === 'dons' ? <><Heart className="w-4 h-4" />Faire un don</> :
               asso.pub_type === 'adherents' ? <><Users className="w-4 h-4" />Adhérer</> :
               <><MessageSquare className="w-4 h-4" />Contacter</>}
            </button>
          ) : (
            <Link href="/connexion" className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-violet-500 text-white hover:bg-violet-600 transition-all">
              <ArrowRight className="w-4 h-4" />
              {asso.pub_type === 'benevoles' ? 'Devenir bénévole' :
               asso.pub_type === 'evenement' ? 'Participer' :
               asso.pub_type === 'dons' ? 'Faire un don' :
               'Contacter'}
            </Link>
          )}
          {/* Discussion */}
          <button type="button" onClick={handleOpenChat}
            className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border ${
              openChat ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}>
            <MessageSquare className="w-4 h-4" />Forum
            {chatCount > 0 && <span className="bg-violet-100 text-violet-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
          </button>
          {/* Partager */}
          <div ref={shareRef} className="relative">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenShare(v => !v); }}
              className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm border transition-all ${
                openShare ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}>
              <Share2 className="w-4 h-4" />
            </button>
            {openShare && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[150px]">
                <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  💬 Par SMS
                </button>
                <div className="border-t border-gray-100" />
                <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(asso.name)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  📧 Par Email
                </button>
              </div>
            )}
          </div>
          {/* Like */}
          <button type="button" onClick={() => setLiked(v => !v)}
            className={`inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-sm border transition-all ${liked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </button>
          {/* Signaler */}
          {!isAuthor && (
            <ReportButton targetType="association" targetId={asso.id} targetTitle={asso.name} variant="icon" />
          )}
        </div>

        {/* Mini-forum */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">💬 Forum de l&apos;association</p>
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — soyez le premier !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
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
                  className="flex-1 text-xs rounded-lg border border-violet-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button type="button" onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-violet-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-3 border-t border-gray-50 pt-2">
          Publié par {asso.author?.full_name ?? 'Membre'} · {formatRelative(asso.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── EMPTY FORM ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  pub_type: 'vitrine' as PubType,
  name: '',
  slogan: '',
  category: 'autre' as AssoCategory,
  description_short: '',
  description_full: '',
  location: 'Biguglia',
  address: '',
  schedule: '',
  public_target: [] as string[],
  age_min: '',
  age_max: '',
  membership_required: false,
  price_type: 'gratuit',
  price_detail: '',
  capacity: '',
  activities: [] as string[],
  frequency: '',
  tags: [] as string[],
  needs: [] as string[],
  need_detail: '',
  contact_name: '',
  contact_role: '',
  contact_phone: '',
  contact_email: '',
  contact_website: '',
  contact_facebook: '',
  contact_instagram: '',
  contact_mode: 'messagerie',
  show_phone: false,
  declared: false,
  rna_number: '',
  pmr_accessible: false,
  families_welcome: false,
  animals_ok: false,
  indoor: null as boolean | null,
  parking_nearby: false,
  material_provided: false,
  registration_required: false,
  places_limited: false,
  urgent_need: false,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssociationsPage() {
  const { profile } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [assos, setAssos] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<AssoCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<PubType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAsso, setEditingAsso] = useState<Association | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [step, setStep] = useState(1);
  const photoRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAssos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('associations')
      .select(`*, author:profiles!associations_author_id_fkey(full_name, avatar_url), photos:asso_photos(url, display_order)`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterCat !== 'all') query = query.eq('category', filterCat);
    if (filterType !== 'all') query = query.eq('pub_type', filterType);

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);

    const enriched = (data || []).map((a: Association & { photos?: { url: string; display_order: number }[] }) => ({
      ...a,
      photos: (a.photos || []).sort((x, y) => (x.display_order ?? 0) - (y.display_order ?? 0)),
    }));

    const filtered = search.trim()
      ? enriched.filter(a =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description_short.toLowerCase().includes(search.toLowerCase()) ||
          a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
        )
      : enriched;

    setAssos(filtered as Association[]);
    setLoading(false);
  }, [filterCat, filterType, search]);

  useEffect(() => { fetchAssos(); }, [fetchAssos]);

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 6 - photos.length);
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

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggle = (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]); setPreviews([]);
    setEditingAsso(null); setShowForm(false); setStep(1);
  };

  const startEdit = (a: Association) => {
    setEditingAsso(a);
    setForm({
      pub_type: a.pub_type, name: a.name, slogan: a.slogan ?? '',
      category: a.category, description_short: a.description_short,
      description_full: a.description_full ?? '', location: a.location,
      address: a.address ?? '', schedule: a.schedule ?? '',
      public_target: a.public_target, age_min: a.age_min?.toString() ?? '',
      age_max: a.age_max?.toString() ?? '', membership_required: a.membership_required,
      price_type: a.price_type, price_detail: a.price_detail ?? '',
      capacity: a.capacity?.toString() ?? '', activities: a.activities,
      frequency: a.frequency ?? '', tags: a.tags, needs: a.needs,
      need_detail: a.need_detail ?? '', contact_name: a.contact_name,
      contact_role: a.contact_role ?? '', contact_phone: a.contact_phone ?? '',
      contact_email: a.contact_email ?? '', contact_website: a.contact_website ?? '',
      contact_facebook: a.contact_facebook ?? '', contact_instagram: a.contact_instagram ?? '',
      contact_mode: a.contact_mode, show_phone: a.show_phone,
      declared: a.declared, rna_number: a.rna_number ?? '',
      pmr_accessible: a.pmr_accessible, families_welcome: a.families_welcome,
      animals_ok: a.animals_ok, indoor: a.indoor, parking_nearby: a.parking_nearby,
      material_provided: a.material_provided, registration_required: a.registration_required,
      places_limited: a.places_limited, urgent_need: a.urgent_need,
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!profile) return;
    if (!form.name.trim() || !form.description_short.trim()) {
      toast.error('Nom et description courte obligatoires'); return;
    }
    setSubmitting(true);
    const payload = {
      author_id: profile.id,
      pub_type: form.pub_type,
      status: asDraft ? 'draft' : 'active',
      name: form.name.trim(),
      slogan: form.slogan.trim() || null,
      category: form.category,
      description_short: form.description_short.trim(),
      description_full: form.description_full.trim() || null,
      location: form.location || 'Biguglia',
      address: form.address.trim() || null,
      schedule: form.schedule.trim() || null,
      public_target: form.public_target,
      age_min: form.age_min ? parseInt(form.age_min) : null,
      age_max: form.age_max ? parseInt(form.age_max) : null,
      membership_required: form.membership_required,
      price_type: form.price_type,
      price_detail: form.price_detail.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      activities: form.activities,
      frequency: form.frequency.trim() || null,
      tags: form.tags,
      needs: form.needs,
      need_detail: form.need_detail.trim() || null,
      contact_name: form.contact_name.trim() || profile.full_name || 'Contact',
      contact_role: form.contact_role.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_website: form.contact_website.trim() || null,
      contact_facebook: form.contact_facebook.trim() || null,
      contact_instagram: form.contact_instagram.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      declared: form.declared,
      rna_number: form.rna_number.trim() || null,
      pmr_accessible: form.pmr_accessible,
      families_welcome: form.families_welcome,
      animals_ok: form.animals_ok,
      indoor: form.indoor,
      parking_nearby: form.parking_nearby,
      material_provided: form.material_provided,
      registration_required: form.registration_required,
      places_limited: form.places_limited,
      urgent_need: form.urgent_need,
    };

    let assoId: string | null = null;
    if (editingAsso) {
      const { error } = await supabase.from('associations').update(payload).eq('id', editingAsso.id);
      if (error) { toast.error('Erreur modification'); console.error(error); setSubmitting(false); return; }
      assoId = editingAsso.id;
      toast.success('Association modifiée ✓');
    } else {
      const { data: ins, error } = await supabase.from('associations').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); console.error(error); setSubmitting(false); return; }
      assoId = ins?.id ?? null;
      toast.success(asDraft ? '💾 Brouillon enregistré' : '🏛️ Association publiée !', { duration: 4000 });
    }

    if (photos.length > 0 && assoId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `associations/${assoId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          console.error('[storage] asso photo upload error:', upErr.message);
          toast.error(`Photo ${i+1} non sauvegardée : ${upErr.message}`);
          continue;
        }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('asso_photos').insert({ asso_id: assoId, url: u.publicUrl, display_order: i });
          if (dbErr) console.error('[asso_photos] insert error:', dbErr.message);
        }
      }
    }

    resetForm();
    fetchAssos();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fiche association ?')) return;
    await supabase.from('associations').delete().eq('id', id);
    toast.success('Fiche supprimée');
    fetchAssos();
  };

  // ── Form render ───────────────────────────────────────────────────────────
  const STEPS = ['Type', 'Identité', 'Activités', 'Besoins', 'Photos', 'Contact & Options'];
  const catConf = CAT_CONFIG[form.category];

  const renderForm = () => (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">{editingAsso ? '✏️ Modifier la fiche' : '🏛️ Référencer une association'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Faites connaître votre association à toute la communauté de Biguglia</p>
        </div>
        <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {/* Steps */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={i} type="button" onClick={() => setStep(i + 1)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === i + 1 ? 'bg-violet-500 text-white' :
              step > i + 1 ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'
            }`}>
            {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      {/* ── STEP 1 : Type de publication ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Quel est l&apos;objet de cette fiche ?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => (
              <button key={key} type="button" onClick={() => setForm(f => ({ ...f, pub_type: key }))}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all text-center ${
                  form.pub_type === key ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                <span className="text-2xl">{conf.emoji}</span>
                <span>{conf.label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2 : Identité ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 2 — Identité de l&apos;association</p>
          <input type="text" placeholder="Nom de l'association *" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input type="text" placeholder='Slogan / phrase courte (ex: "Faire vivre le sport pour tous à Biguglia")'
            value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {/* Catégorie */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
                const Icon = conf.icon;
                return (
                  <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.category === key ? `border-violet-400 bg-violet-50 text-violet-700` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon className={`w-4 h-4 ${form.category === key ? 'text-violet-600' : conf.color}`} />
                    <span className="text-center leading-tight">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea placeholder="Description courte * (1-2 phrases visibles immédiatement)" rows={2} required
            value={form.description_short} onChange={e => setForm(f => ({ ...f, description_short: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <textarea placeholder="Présentation complète — histoire, mission, actions, public, valeurs…" rows={5}
            value={form.description_full} onChange={e => setForm(f => ({ ...f, description_full: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Commune / zone</label>
              <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                {['Biguglia', 'Biguglia et alentours', 'Toute la région'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Adresse / lieu principal"
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Activités & Public ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 3 — Ce que vous proposez</p>
          {/* Public */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Public concerné</label>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => toggle('public_target', p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.public_target.includes(p) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          {/* Ages */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge minimum</label>
              <input type="number" placeholder="ex: 6" min={0} max={120} value={form.age_min}
                onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge maximum</label>
              <input type="number" placeholder="ex: 18" min={0} max={120} value={form.age_max}
                onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>
          {/* Activités */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Activités proposées</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggle('activities', a)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.activities.includes(a) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>{a}</button>
              ))}
            </div>
          </div>
          {/* Fréquence + Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fréquence</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">—</option>
                {['Chaque semaine', 'Chaque mois', 'Ponctuel', 'Selon calendrier'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Jours et horaires (ex: Lundi 18h-20h)"
              value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          {/* Tarif */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adhésion / tarif</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[['gratuit','Gratuit'],['cotisation','Cotisation annuelle'],['libre','Participation libre'],['autre','Autre']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, price_type: v }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.price_type === v ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{l}</button>
              ))}
            </div>
            {form.price_type !== 'gratuit' && (
              <input type="text" placeholder="Précisez (ex: 30€/an, 5€/séance…)"
                value={form.price_detail} onChange={e => setForm(f => ({ ...f, price_detail: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>
          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(t => (
                <button key={t} type="button" onClick={() => toggle('tags', t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.tags.includes(t) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}># {t}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(4)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4 : Besoins ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 4 — Besoins actuels</p>
          <p className="text-xs text-gray-500">L&apos;association recherche actuellement :</p>
          <div className="flex flex-wrap gap-2">
            {NEEDS_OPTIONS.map(n => (
              <button key={n} type="button" onClick={() => toggle('needs', n)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  form.needs.includes(n) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}>{n}</button>
            ))}
          </div>
          <textarea placeholder="Détail du besoin (ex: Nous cherchons 4 bénévoles pour notre tournoi le 15 juin…)" rows={3}
            value={form.need_detail} onChange={e => setForm(f => ({ ...f, need_detail: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.urgent_need} onChange={e => setForm(f => ({ ...f, urgent_need: e.target.checked }))} className="rounded" />
            <span className="text-sm font-semibold text-red-600">🚨 Besoin urgent</span>
          </label>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(5)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 5 : Photos ── */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 5 — Photos (logo, couverture, galerie — max 6)</p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-bold">Couverture</span>}
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-violet-300 flex flex-col items-center justify-center text-violet-400 hover:bg-violet-50 transition-all">
                <Camera className="w-6 h-6" /><span className="text-xs mt-1">Photo</span>
              </button>
            )}
          </div>
          <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          <p className="text-xs text-gray-400">1ère photo = couverture principale · {photos.length}/6</p>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(6)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 6 : Contact + Options ── */}
      {step === 6 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Bloc 6 — Contact</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nom du contact *" value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <select value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="">Fonction…</option>
                  {['Président(e)', 'Secrétaire', 'Trésorier(e)', 'Bénévole', 'Responsable activité'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Téléphone" value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="email" placeholder="Email" value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <input type="url" placeholder="Site web (https://…)" value={form.contact_website}
                onChange={e => setForm(f => ({ ...f, contact_website: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="url" placeholder="Facebook (https://…)" value={form.contact_facebook}
                  onChange={e => setForm(f => ({ ...f, contact_facebook: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="url" placeholder="Instagram (https://…)" value={form.contact_instagram}
                  onChange={e => setForm(f => ({ ...f, contact_instagram: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Afficher le téléphone publiquement</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Informations complémentaires</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'declared',             label: '🏛️ Association déclarée en préfecture' },
                { key: 'pmr_accessible',        label: '♿ Accessible PMR' },
                { key: 'families_welcome',      label: '👨‍👩‍👧 Accueil familles' },
                { key: 'animals_ok',            label: '🐾 Animaux acceptés' },
                { key: 'parking_nearby',        label: '🅿️ Parking à proximité' },
                { key: 'material_provided',     label: '✅ Matériel fourni' },
                { key: 'registration_required', label: '📝 Inscription obligatoire' },
                { key: 'places_limited',        label: '🔢 Places limitées' },
                { key: 'membership_required',   label: '🎫 Adhésion obligatoire' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded" />
                  <span className="text-xs text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {form.declared && (
              <input type="text" placeholder="N° RNA (optionnel)" value={form.rna_number}
                onChange={e => setForm(f => ({ ...f, rna_number: e.target.value }))}
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
            {form.places_limited && (
              <input type="number" placeholder="Nombre de places disponibles" min={1} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              🏛️ {editingAsso ? 'Enregistrer' : 'Publier la fiche'}
            </button>
            <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
              💾 Brouillon
            </button>
            <button type="button" onClick={() => setStep(5)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
          </div>
        </div>
      )}
    </div>
  );

  const totalActive = assos.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Tables manquantes.</span> Exécutez le SQL dans Supabase (
              <Link href="/admin/migration" className="underline">page Admin</Link>).
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Handshake className="w-5 h-5" />
                </div>
                <span className="text-violet-200 text-sm font-semibold">Vie locale · Associations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🏛️ Associations de Biguglia
              </h1>
              <p className="text-violet-200 text-base sm:text-lg max-w-xl leading-relaxed">
                Découvrez, rejoignez et soutenez les associations locales. Ensemble, faisons vivre la communauté.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Building2 className="w-3.5 h-3.5" /> {totalActive} association{totalActive !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Heart className="w-3.5 h-3.5" /> Sport, culture, solidarité…
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Users className="w-3.5 h-3.5" /> Bénévoles bienvenus
                </span>
              </div>
            </div>
            {profile && (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-2xl hover:bg-violet-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Référencer une association
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {showForm && profile && renderForm()}

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-56 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher une association…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            />
          </div>
          {/* Filtre type publication */}
          <select value={filterType} onChange={e => setFilterType(e.target.value as PubType | 'all')}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
            <option value="all">Tous les types</option>
            {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => (
              <option key={key} value={key}>{conf.emoji} {conf.label}</option>
            ))}
          </select>
        </div>

        {/* Filtre catégories — pills horizontales */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button type="button" onClick={() => setFilterCat('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filterCat === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}>
            Toutes
          </button>
          {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
            const Icon = conf.icon;
            return (
              <button key={key} type="button" onClick={() => setFilterCat(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filterCat === key ? `bg-violet-500 text-white border-violet-500` : `bg-white ${conf.color} border-gray-200 hover:border-violet-300`
                }`}>
                <Icon className="w-3 h-3" />{conf.label}
              </button>
            );
          })}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : assos.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">Aucune association pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Soyez la première association à se référencer !</p>
            {profile ? (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                className="mt-5 inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-violet-600 transition-all">
                <Plus className="w-4 h-4" /> Référencer une association
              </button>
            ) : (
              <Link href="/connexion" className="mt-5 inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-violet-600 transition-all">
                Se connecter pour publier
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assos.map(asso => (
              <AssociationCard
                key={asso.id}
                asso={asso}
                userId={profile?.id}
                isAuthor={profile?.id === asso.author_id}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!profile && assos.length > 0 && (
          <div className="mt-8 bg-violet-50 border border-violet-200 rounded-2xl p-6 text-center">
            <p className="text-violet-700 font-medium mb-3">Connectez-vous pour publier, contacter ou rejoindre une association</p>
            <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

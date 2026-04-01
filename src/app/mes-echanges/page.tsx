'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import {
  Activity, Clock, CheckCheck, AlertCircle, Star,
  ShoppingCart, Wrench, HandHeart, Users, MapPin, Calendar,
  MessageSquare, ChevronRight, Filter, RefreshCw, ArrowRight,
  ShoppingBag, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';

// ─── Types ────────────────────────────────────────────────────────────────────
type InteractionStatus = 'requested' | 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'done' | 'cancelled' | 'disputed';
type FilterTab = 'all' | 'pending' | 'active' | 'to_finish' | 'to_rate' | 'done' | 'cancelled';

interface InteractionRow {
  id: string;
  source_type: string;
  source_id: string;
  requester_id: string;
  receiver_id: string;
  interaction_type: string;
  status: InteractionStatus;
  review_unlocked: boolean;
  review_requester_done: boolean;
  review_receiver_done: boolean;
  conversation_id: string | null;
  started_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  status_history: Array<{ status: string; changed_at: string; note?: string }>;
  // enrichi
  source_title?: string;
  source_photo?: string;
  other_user_name?: string;
  other_user_avatar?: string;
  other_user_id?: string;
}

// ─── Config sources ───────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string; bg: string; href: (id: string) => string;
}> = {
  listing:         { label: 'Annonce',       icon: ShoppingBag,  color: 'text-blue-600',   bg: 'bg-blue-50',   href: id => `/annonces/${id}` },
  equipment:       { label: 'Matériel',      icon: Wrench,       color: 'text-teal-600',   bg: 'bg-teal-50',   href: id => `/materiel/${id}` },
  help_request:    { label: 'Coup de main',  icon: HandHeart,    color: 'text-orange-600', bg: 'bg-orange-50', href: () => `/coups-de-main` },
  association:     { label: 'Association',   icon: Users,        color: 'text-purple-600', bg: 'bg-purple-50', href: () => `/associations` },
  collection_item: { label: 'Collectionneur',icon: ShoppingCart, color: 'text-rose-600',   bg: 'bg-rose-50',   href: () => `/collectionneurs` },
  outing:          { label: 'Promenade',     icon: MapPin,       color: 'text-emerald-600',bg: 'bg-emerald-50',href: () => `/promenades` },
  event:           { label: 'Événement',     icon: Calendar,     color: 'text-indigo-600', bg: 'bg-indigo-50', href: () => `/evenements` },
  service_request: { label: 'Artisan',       icon: Wrench,       color: 'text-brand-600',  bg: 'bg-brand-50',  href: id => `/demandes/${id}` },
  lost_found:      { label: 'Perdu/Trouvé',  icon: MessageSquare,color: 'text-amber-600',  bg: 'bg-amber-50',  href: () => `/perdu-trouve` },
};

const STATUS_LABELS: Record<InteractionStatus, string> = {
  requested:   'Demande envoyée',
  pending:     'En attente',
  accepted:    'Acceptée',
  rejected:    'Refusée',
  in_progress: 'En cours',
  done:        'Terminée',
  cancelled:   'Annulée',
  disputed:    'Litige',
};

const STATUS_BADGE: Record<InteractionStatus, string> = {
  requested:   'bg-blue-100 text-blue-700',
  pending:     'bg-amber-100 text-amber-700',
  accepted:    'bg-emerald-100 text-emerald-700',
  rejected:    'bg-red-100 text-red-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  done:        'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-gray-100 text-gray-600',
  disputed:    'bg-orange-100 text-orange-700',
};

const TABS: { id: FilterTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'all',       label: 'Tout',        icon: Activity,    desc: 'Tous les échanges' },
  { id: 'pending',   label: 'En attente',  icon: Clock,       desc: 'Demandes sans réponse' },
  { id: 'active',    label: 'En cours',    icon: RefreshCw,   desc: 'Échanges actifs' },
  { id: 'to_finish', label: 'À terminer',  icon: CheckCheck,  desc: 'Confirmer la fin' },
  { id: 'to_rate',   label: 'À évaluer',   icon: Star,        desc: 'Avis débloqués' },
  { id: 'done',      label: 'Terminés',    icon: CheckCheck,  desc: 'Échanges terminés' },
  { id: 'cancelled', label: 'Annulés',     icon: XCircle,     desc: 'Refusés ou annulés' },
];

// ─── Filtrage ─────────────────────────────────────────────────────────────────
function filterInteractions(rows: InteractionRow[], tab: FilterTab, userId: string): InteractionRow[] {
  switch (tab) {
    case 'pending':   return rows.filter(r => ['requested', 'pending'].includes(r.status));
    case 'active':    return rows.filter(r => ['accepted', 'in_progress'].includes(r.status));
    case 'to_finish': return rows.filter(r => {
      if (!['accepted', 'in_progress'].includes(r.status)) return false;
      const myDone = r.requester_id === userId ? r.review_requester_done : r.review_receiver_done;
      return !myDone;
    });
    case 'to_rate':   return rows.filter(r => r.review_unlocked && r.status === 'done');
    case 'done':      return rows.filter(r => r.status === 'done');
    case 'cancelled': return rows.filter(r => ['cancelled', 'rejected'].includes(r.status));
    default:          return rows;
  }
}

// ─── Carte d'interaction ──────────────────────────────────────────────────────
function InteractionCard({ row, userId, onStatusChange }: {
  row: InteractionRow;
  userId: string;
  onStatusChange: (id: string, status: InteractionStatus) => void;
}) {
  const [acting, setActing] = useState(false);
  const supabase = createClient();
  const srcConf  = SOURCE_CONFIG[row.source_type] || SOURCE_CONFIG.listing;
  const SrcIcon  = srcConf.icon;
  const isRequester = row.requester_id === userId;
  const isReceiver  = row.receiver_id === userId;
  const myDone = isRequester ? row.review_requester_done : row.review_receiver_done;

  const act = async (newStatus: InteractionStatus) => {
    setActing(true);
    try {
      if (newStatus === 'done') {
        const { error } = await supabase.rpc('confirm_interaction_done', { p_interaction_id: row.id });
        if (error) {
          // Fallback
          const updateData = isRequester ? { review_requester_done: true } : { review_receiver_done: true };
          await supabase.from('interactions').update(updateData).eq('id', row.id);
        }
      } else {
        await supabase.from('interactions').update({ status: newStatus }).eq('id', row.id);
      }
      onStatusChange(row.id, newStatus);
    } finally { setActing(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 p-4">
        {/* Icône source */}
        <div className={cn('p-2 rounded-xl flex-shrink-0 mt-0.5', srcConf.bg)}>
          <SrcIcon className={cn('w-4 h-4', srcConf.color)} />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="text-xs text-gray-400 font-medium">{srcConf.label}</span>
              <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
                {row.source_title || 'Échange'}
              </p>
            </div>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0', STATUS_BADGE[row.status])}>
              {STATUS_LABELS[row.status]}
            </span>
          </div>

          {/* Autre participant */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">
              {row.other_user_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs text-gray-500">
              {isRequester ? 'avec' : 'de'} <strong>{row.other_user_name || 'Membre'}</strong>
            </span>
            <span className="text-xs text-gray-400">· {formatRelative(row.started_at)}</span>
          </div>

          {/* Actions contextuelles */}
          <div className="flex flex-wrap gap-2">
            {/* Destinataire : accepter/refuser */}
            {isReceiver && ['requested', 'pending'].includes(row.status) && (
              <>
                <button onClick={() => act('accepted')} disabled={acting}
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">
                  Accepter
                </button>
                <button onClick={() => act('rejected')} disabled={acting}
                  className="px-3 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 disabled:opacity-50">
                  Refuser
                </button>
              </>
            )}

            {/* Confirmer fin d'échange */}
            {['accepted', 'in_progress'].includes(row.status) && !myDone && (
              <button onClick={() => act('done')} disabled={acting}
                className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                Confirmer la fin
              </button>
            )}

            {/* Avis débloqué */}
            {row.review_unlocked && row.status === 'done' && (
              <Link href={srcConf.href(row.source_id)}
                className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Laisser un avis
              </Link>
            )}

            {/* Voir la conversation */}
            {row.conversation_id && (
              <Link href={`/messages/${row.conversation_id}`}
                className="px-3 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium hover:bg-gray-100 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Conversation
              </Link>
            )}

            {/* Voir la source */}
            <Link href={srcConf.href(row.source_id)}
              className="px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-xs hover:bg-gray-100 flex items-center gap-0.5">
              Voir <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function MesEchangesContent() {
  const { profile } = useAuthStore();
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<FilterTab>('all');
  const [tableExists, setTableExists]   = useState(true);
  const supabase = createClient();

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === '42P01') setTableExists(false);
        return;
      }

      // Enrichir avec profils et titres
      const enriched = await Promise.all((data || []).map(async (row: InteractionRow) => {
        // Profil de l'autre personne
        const otherId = row.requester_id === profile.id ? row.receiver_id : row.requester_id;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', otherId)
          .maybeSingle();

        // Titre de la source
        let sourceTitle = 'Échange';
        try {
          const tableMap: Record<string, string> = {
            listing: 'listings', equipment: 'equipment_items',
            help_request: 'help_requests', association: 'associations',
            collection_item: 'collection_items', outing: 'group_outings',
            event: 'local_events', service_request: 'service_requests',
            lost_found: 'lost_found_items',
          };
          const tableName = tableMap[row.source_type];
          const titleField = row.source_type === 'association' ? 'name' : 'title';
          if (tableName) {
            const { data: src } = await supabase
              .from(tableName)
              .select(titleField)
              .eq('id', row.source_id)
              .maybeSingle();
            if (src) sourceTitle = (src as Record<string, string>)[titleField] || 'Échange';
          }
        } catch { /* ignore */ }

        return {
          ...row,
          source_title: sourceTitle,
          other_user_name: otherProfile?.full_name || 'Membre',
          other_user_avatar: otherProfile?.avatar_url || null,
          other_user_id: otherId,
        };
      }));

      setInteractions(enriched);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (id: string, newStatus: InteractionStatus) => {
    setInteractions(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setTimeout(load, 500);
  };

  if (!profile) return null;

  const filtered = filterInteractions(interactions, activeTab, profile.id);

  // Compteurs pour badges
  const counts = {
    pending:   interactions.filter(r => ['requested', 'pending'].includes(r.status)).length,
    active:    interactions.filter(r => ['accepted', 'in_progress'].includes(r.status)).length,
    to_finish: interactions.filter(r => {
      if (!['accepted', 'in_progress'].includes(r.status)) return false;
      return !(r.requester_id === profile.id ? r.review_requester_done : r.review_receiver_done);
    }).length,
    to_rate:   interactions.filter(r => r.review_unlocked && r.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Mes échanges</h1>
            <p className="text-gray-500 text-sm">Suivi de toutes vos interactions</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Migration manquante */}
        {!tableExists && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Migration requise</p>
                <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                  La table de suivi n&apos;a pas encore été créée. Allez dans{' '}
                  <Link href="/admin/migration" className="underline font-bold">Admin → Migration DB</Link>{' '}
                  et exécutez le SQL &quot;Suivi des interactions&quot;.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglets filtre */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {TABS.map(tab => {
            const count = counts[tab.id as keyof typeof counts] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border',
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActive ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-700')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-bold text-gray-700 mb-1">
              {activeTab === 'all' ? 'Aucun échange pour le moment' : 'Aucun échange dans cette catégorie'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {activeTab === 'all'
                ? 'Commencez par contacter quelqu\'un sur une annonce, un coup de main ou une promenade.'
                : 'Changez de filtre ou attendez de nouvelles interactions.'
              }
            </p>
            {activeTab === 'all' && (
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/annonces" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Annonces <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/coups-de-main" className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1">
                  <HandHeart className="w-3.5 h-3.5" /> Coups de main <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/promenades" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Promenades <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(row => (
              <InteractionCard
                key={row.id}
                row={row}
                userId={profile.id}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MesEchangesPage() {
  return (
    <ProtectedPage>
      <MesEchangesContent />
    </ProtectedPage>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity, Clock, CheckCheck, AlertCircle, Star, ArrowLeft,
  Inbox, Send, RefreshCw, ChevronRight, MessageSquare, XCircle,
  ShoppingBag, Wrench, HandHeart, Users, MapPin, Calendar,
  ShoppingCart, Filter, Loader2, CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'pending' | 'active' | 'to_review' | 'done' | 'cancelled';

interface InteractionRow {
  id: string;
  source_type: string;
  source_id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  review_unlocked: boolean;
  conversation_id: string | null;
  started_at: string;
  updated_at?: string;
  source_title?: string;
  other_user_name?: string;
  other_user_avatar?: string;
  other_user_id?: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  listing:         { label: 'Annonce',        icon: ShoppingBag,  color: 'text-blue-600',    bg: 'bg-blue-50' },
  equipment:       { label: 'Matériel',       icon: Wrench,       color: 'text-teal-600',    bg: 'bg-teal-50' },
  help_request:    { label: 'Coup de main',   icon: HandHeart,    color: 'text-orange-600',  bg: 'bg-orange-50' },
  association:     { label: 'Association',    icon: Users,        color: 'text-purple-600',  bg: 'bg-purple-50' },
  collection_item: { label: 'Collection',     icon: ShoppingCart, color: 'text-rose-600',    bg: 'bg-rose-50' },
  outing:          { label: 'Promenade',      icon: MapPin,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
  event:           { label: 'Événement',      icon: Calendar,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  service_request: { label: 'Artisan',        icon: Wrench,       color: 'text-brand-600',   bg: 'bg-brand-50' },
  lost_found:      { label: 'Perdu/Trouvé',   icon: MessageSquare,color: 'text-amber-600',   bg: 'bg-amber-50' },
};

const STATUS_BADGE: Record<string, string> = {
  requested:   'bg-blue-100 text-blue-700',
  pending:     'bg-amber-100 text-amber-700',
  accepted:    'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  done:        'bg-teal-100 text-teal-700',
  cancelled:   'bg-gray-100 text-gray-600',
  rejected:    'bg-red-100 text-red-700',
  disputed:    'bg-orange-100 text-orange-700',
};
const STATUS_FR: Record<string, string> = {
  requested: 'Demandé', pending: 'En attente', accepted: 'Accepté',
  in_progress: 'En cours', done: 'Terminé', cancelled: 'Annulé',
  rejected: 'Refusé', disputed: 'Litige',
};

const TABS: { id: FilterTab; label: string; icon: React.ElementType; urgent?: boolean }[] = [
  { id: 'all',       label: 'Tout',       icon: Activity },
  { id: 'pending',   label: 'En attente', icon: Clock,        urgent: true },
  { id: 'active',    label: 'Actifs',     icon: RefreshCw },
  { id: 'to_review', label: 'À évaluer',  icon: Star,         urgent: true },
  { id: 'done',      label: 'Terminés',   icon: CheckCircle },
  { id: 'cancelled', label: 'Annulés',    icon: XCircle },
];

// ─── Card ─────────────────────────────────────────────────────────────────────
function InteractionCard({ row, userId }: { row: InteractionRow; userId: string }) {
  const srcConf = SOURCE_CONFIG[row.source_type] || SOURCE_CONFIG.listing;
  const SrcIcon = srcConf.icon;
  const isRequester = row.requester_id === userId;
  const needsAction = !isRequester && ['requested', 'pending'].includes(row.status);
  const toReview = row.review_unlocked && row.status === 'done';

  return (
    <div className={cn(
      'bg-white border rounded-2xl p-4 hover:shadow-sm transition-all',
      needsAction ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100',
    )}>
      <div className="flex items-start gap-3">
        <Avatar src={row.other_user_avatar} name={row.other_user_name || '?'} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-gray-900">{row.other_user_name || 'Utilisateur'}</span>
            {needsAction && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">Action requise</span>
            )}
            {toReview && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">Avis à laisser</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', srcConf.bg, srcConf.color)}>
              <SrcIcon className="w-3 h-3" />{srcConf.label}
            </span>
            {row.source_title && (
              <span className="text-xs text-gray-600 truncate max-w-[150px]">{row.source_title}</span>
            )}
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_BADGE[row.status] || 'bg-gray-100 text-gray-500')}>
              {STATUS_FR[row.status] || row.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {isRequester ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
              {isRequester ? 'Vous avez demandé' : 'Vous avez reçu'} · {formatRelative(row.started_at)}
            </span>
            <div className="flex items-center gap-1.5">
              {row.conversation_id && (
                <Link href={`/messages?conv=${row.conversation_id}`}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Message">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Link>
              )}
              <Link href="/mes-echanges"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Voir">
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MesInteractionsContent() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InteractionRow[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === '42P01') setTableExists(false);
        setLoading(false);
        return;
      }

      // Enrich with other user names and source titles
      const enriched = await Promise.all((data || []).map(async (row: Record<string, unknown>) => {
        const otherId = row.requester_id === profile.id ? row.receiver_id : row.requester_id;
        const { data: otherProfile } = await supabase
          .from('profiles').select('full_name, avatar_url').eq('id', otherId as string).maybeSingle();

        let sourceTitle = '';
        try {
          const tableMap: Record<string, string> = {
            listing: 'listings', equipment: 'equipment_items',
            help_request: 'help_requests', association: 'associations',
            outing: 'group_outings', event: 'local_events',
            service_request: 'service_requests',
          };
          const tbl = tableMap[row.source_type as string];
          if (tbl) {
            const { data: src } = await supabase.from(tbl).select('title, name').eq('id', row.source_id as string).maybeSingle();
            sourceTitle = (src as Record<string, unknown> | null)?.title as string || (src as Record<string, unknown> | null)?.name as string || '';
          }
        } catch {}

        return {
          ...row,
          other_user_name: (otherProfile?.full_name as string) || 'Utilisateur',
          other_user_avatar: otherProfile?.avatar_url as string | undefined,
          other_user_id: otherId as string,
          source_title: sourceTitle,
        } as InteractionRow;
      }));

      setItems(enriched);
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const filtered = (() => {
    switch (tab) {
      case 'pending':   return items.filter(r => ['requested', 'pending'].includes(r.status));
      case 'active':    return items.filter(r => ['accepted', 'in_progress'].includes(r.status));
      case 'to_review': return items.filter(r => r.review_unlocked && r.status === 'done');
      case 'done':      return items.filter(r => r.status === 'done');
      case 'cancelled': return items.filter(r => ['cancelled', 'rejected'].includes(r.status));
      default:          return items;
    }
  })();

  const counts: Record<FilterTab, number> = {
    all:       items.length,
    pending:   items.filter(r => ['requested', 'pending'].includes(r.status)).length,
    active:    items.filter(r => ['accepted', 'in_progress'].includes(r.status)).length,
    to_review: items.filter(r => r.review_unlocked && r.status === 'done').length,
    done:      items.filter(r => r.status === 'done').length,
    cancelled: items.filter(r => ['cancelled', 'rejected'].includes(r.status)).length,
  };

  if (!tableExists) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Système d'échanges</h2>
          <p className="text-gray-600 mb-4">
            Le tableau d'échanges sera disponible dès que vous aurez vos premières interactions.
            En attendant, utilisez la messagerie pour contacter d'autres membres.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/messages" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors">
              <MessageSquare className="w-4 h-4" /> Messages
            </Link>
            <Link href="/dashboard" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-black text-gray-900">Mes échanges</h1>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{items.length} total</span>
            {counts.pending > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {counts.pending} en attente
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon;
              const count = counts[t.id];
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border',
                    tab === t.id
                      ? t.urgent ? 'bg-red-50 text-red-700 border-red-300' : 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}>
                  <Icon className="w-3 h-3" />
                  {t.label}
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1',
                      t.urgent && count > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-bold text-gray-700 mb-1">
              {tab === 'all' ? 'Aucun échange pour le moment' : `Aucun échange dans cette catégorie`}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {tab === 'all'
                ? 'Contactez une annonce, demandez du matériel ou proposez de l\'aide pour démarrer un échange.'
                : 'Essayez un autre filtre ou attendez des nouvelles interactions.'}
            </p>
            {tab === 'all' && (
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/annonces" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                  <ShoppingBag className="w-4 h-4" /> Annonces
                </Link>
                <Link href="/materiel" className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors">
                  <Wrench className="w-4 h-4" /> Matériel
                </Link>
                <Link href="/coups-de-main" className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors">
                  <HandHeart className="w-4 h-4" /> Entraide
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(row => (
              <InteractionCard key={row.id} row={row} userId={profile!.id} />
            ))}
            <Link href="/mes-echanges"
              className="block w-full text-center py-3 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-dashed border-brand-200 rounded-2xl hover:bg-brand-50 transition-colors">
              Ouvrir le centre d'échanges complet →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MesInteractionsPage() {
  return <ProtectedPage><MesInteractionsContent /></ProtectedPage>;
}

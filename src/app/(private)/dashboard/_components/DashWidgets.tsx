

/**
 * Shared presentational micro-components for the dashboard.
 * No data-fetching here — all data is passed as props.
 */

import Link from 'next/link';
import { Star, Eye, Edit3, ChevronRight, Package, Wrench, Heart, Calendar, Footprints, BookOpen, Handshake, Trophy, HelpCircle, FileText } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import { STATUS_FR, STATUS_COLOR, STATUS_CHIPS, INTERACTION_SOURCE_LABEL } from '../_constants';
import type { StatusChip } from '../_constants';

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({ icon: Icon, label, value, href, color, bg, badge, accent }: {
  icon: React.ElementType; label: string; value: number | string;
  href: string; color: string; bg: string; badge?: number; accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={cn(
        'bg-white rounded-2xl border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer',
        accent ? 'border-brand-200 ring-1 ring-brand-100' : 'border-gray-100 hover:border-gray-200',
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2.5 rounded-xl', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
      </div>
    </Link>
  );
}

// ── StatusBreakdown ───────────────────────────────────────────────────────────

export function StatusBreakdown({ counts, type }: {
  counts: Record<string, number>;
  type: keyof typeof STATUS_CHIPS;
}) {
  const chips: StatusChip[] = STATUS_CHIPS[type] ?? [];
  const relevant = chips.filter(c => (counts[c.key] ?? 0) > 0);
  if (relevant.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-gray-50 bg-gray-50/50">
      {relevant.map(chip => (
        <span key={chip.key} className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full', chip.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', chip.dot)} />
          {counts[chip.key]} {chip.label}
        </span>
      ))}
    </div>
  );
}

// ── TodoCard ──────────────────────────────────────────────────────────────────

export function TodoCard({ item }: {
  item: { id: string; priority: string; icon: string; title: string; subtitle?: string; href: string };
}) {
  const borderColor = item.priority === 'urgent' ? 'border-l-red-400' : item.priority === 'normal' ? 'border-l-amber-400' : 'border-l-gray-300';
  const bg = item.priority === 'urgent' ? 'bg-red-50 hover:bg-red-100' : item.priority === 'normal' ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50 hover:bg-gray-100';
  return (
    <Link href={item.href}>
      <div className={cn('flex items-center gap-3 p-3 rounded-xl border-l-4 transition-colors', borderColor, bg)}>
        <span className="text-xl flex-shrink-0">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </Link>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({ icon: Icon, title, subtitle, href, linkLabel, color }: {
  icon: React.ElementType; title: string; subtitle?: string;
  href?: string; linkLabel?: string; color: string;
}) {
  const iconBg = color
    .replace('text-', 'bg-')
    .replace('-600', '-100')
    .replace('-700', '-100');
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('p-2 rounded-xl', iconBg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {href && linkLabel && (
        <Link href={href} className={cn('flex items-center gap-1 text-xs font-semibold hover:gap-2 transition-all', color)}>
          {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── ContentRow ────────────────────────────────────────────────────────────────

type ContentRowItem = {
  id: string; type: string; title: string; status: string;
  views?: number; href: string; editHref?: string;
  createdAt: string; isClosed?: boolean;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  listing:    Package,   equipment: Wrench,   help:  Heart,
  event:      Calendar,  outing:    Footprints, forum: BookOpen,
  association: Handshake, collection: Trophy,  lost_found: HelpCircle,
};

export function ContentRow({ item }: { item: ContentRowItem }) {
  const TypeIcon = TYPE_ICONS[item.type] ?? FileText;
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group',
      item.isClosed && 'opacity-60',
    )}>
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <TypeIcon className="w-4 h-4 text-gray-500" />
      </div>
      <Link href={item.href} className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-700 transition-colors">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-600')}>
            {STATUS_FR[item.status] ?? item.status}
          </span>
          {item.views !== undefined && item.views > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Eye className="w-3 h-3" />{item.views}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatRelative(item.createdAt)}</span>
        </div>
      </Link>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {item.editHref && (
          <Link href={item.editHref} title="Modifier"
            className="p-1.5 rounded-lg hover:bg-brand-50 hover:text-brand-600 text-gray-400 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </Link>
        )}
        <Link href={item.href} title="Voir"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <Eye className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── InteractionRow ────────────────────────────────────────────────────────────

type InteractionItem = {
  id: string; sourceType: string; status: string; role: string;
  otherPartyName: string; otherPartyAvatar?: string; updatedAt: string;
  reviewUnlocked?: boolean; conversationId?: string;
};

export function InteractionRow({ item }: { item: InteractionItem }) {
  const isReceiver  = item.role === 'receiver';
  const needsAction = isReceiver && ['requested', 'pending'].includes(item.status);
  const toReview    = item.reviewUnlocked && item.status === 'completed';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors',
      needsAction ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200' : 'hover:bg-gray-50',
    )}>
      <Avatar src={item.otherPartyAvatar} name={item.otherPartyName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.otherPartyName}</p>
          {needsAction && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">Action requise</span>
          )}
          {toReview && (
            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">Avis à laisser</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{INTERACTION_SOURCE_LABEL[item.sourceType] ?? item.sourceType}</span>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-600')}>
            {STATUS_FR[item.status] ?? item.status}
          </span>
          <span className="text-xs text-gray-400">{formatRelative(item.updatedAt)}</span>
        </div>
      </div>
      <Link href="/mes-echanges"
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── ProfileScoreRing ──────────────────────────────────────────────────────────

export function ProfileScoreRing({ score }: { score: number }) {
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">{score}%</span>
    </div>
  );
}

// ── StarRating ────────────────────────────────────────────────────────────────

export function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn('w-4 h-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{count} avis</span>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

export function SkeletonRows({ n = 3, h = 'h-12' }: { n?: number; h?: string }) {
  return (
    <div className="space-y-2">
      {[...Array(n)].map((_, i) => (
        <div key={i} className={cn(h, 'bg-gray-50 rounded-xl animate-pulse')} />
      ))}
    </div>
  );
}

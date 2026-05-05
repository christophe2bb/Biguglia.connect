'use client';

import { ForumSector, ForumCategory, ForumTopic } from '@/types';
import {
  Plus, MessageSquare, AlertTriangle, Flame,
  CheckCircle2, Zap, ArrowRight, MapPin, Star, Bell, BookOpen, Shield, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SECTOR_COLORS,
  MODULE_LINKS,
} from '../_config';
import { SortMode } from '../_types';
import { TopicCard } from './TopicCard';

interface Props {
  profile:          { id: string } | null;
  topics:           ForumTopic[];
  hotTopics:        ForumTopic[];
  recentlyResolved: ForumTopic[];
  sectors:          ForumSector[];
  categories:       ForumCategory[];
  selectedSector:   string | null;
  selectedCategory: string | null;
  selectedType:     string | null;
  setSelectedSector:   (v: string | null) => void;
  setSelectedCategory: (v: string | null) => void;
  setSelectedType:     (v: string | null) => void;
  setSortMode:         (v: SortMode) => void;
  setStatusFilter:     (v: 'all' | 'ouvert' | 'resolu') => void;
  setUrgencyFilter:    (v: 'all' | 'haute') => void;
}

export function ForumSidebar({
  profile, topics, hotTopics, recentlyResolved,
  sectors, categories,
  selectedSector, selectedCategory, selectedType,
  setSelectedSector, setSelectedCategory, setSelectedType,
  setSortMode, setStatusFilter, setUrgencyFilter,
}: Props) {
  const router = useRouter();

  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto pb-8">

      {/* CTA retiré — boutons déjà présents dans le hero */}

      {/* ── Sujets urgents ── */}
      {topics.some(t => (t as ForumTopic & { urgency?: string }).urgency === 'haute') && (
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Sujets urgents
          </h3>
          <div className="space-y-1">
            {topics
              .filter(t => (t as ForumTopic & { urgency?: string }).urgency === 'haute')
              .slice(0, 3)
              .map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
          </div>
        </div>
      )}

      {/* ── Sujets chauds ── */}
      {hotTopics.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Sujets actifs
          </h3>
          <div className="space-y-1">
            {hotTopics.map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
          </div>
        </div>
      )}

      {/* ── Récemment résolus ── */}
      {recentlyResolved.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Récemment résolus
          </h3>
          <div className="space-y-1">
            {recentlyResolved.map(t => <TopicCard key={t.id} topic={t} sectors={sectors} compact />)}
          </div>
        </div>
      )}

      {/* ── Inter-modules ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-500" /> Modules liés
        </h3>
        <div className="space-y-2">
          {MODULE_LINKS.map(({ href, icon: I, label, color, bg, border }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors hover:shadow-sm group', bg, border)}>
              <I className={cn('w-4 h-4 flex-shrink-0', color)} />
              <span className={cn('text-sm font-semibold flex-1', color)}>{label}</span>
              <ArrowRight className={cn('w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity', color)} />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Secteurs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-500" /> Secteurs de Biguglia
        </h3>
        <div className="space-y-1.5">
          {sectors.map(s => {
            const c = SECTOR_COLORS[s.color || 'gray'];
            const isActive = selectedSector === s.id || selectedSector === s.slug;
            return (
              <button key={s.id}
                onClick={() => setSelectedSector(isActive ? null : (s.id || s.slug))}
                className={cn('flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left',
                  isActive ? cn(c.bg, c.text, c.border, 'border font-bold') : 'text-gray-600 hover:bg-gray-50 font-medium')}>
                <span className="text-base leading-none">{s.icon}</span>
                <span className="flex-1">{s.name}</span>
                {s.topic_count ? <span className="text-xs opacity-60 bg-gray-100 px-1.5 py-0.5 rounded-full">{s.topic_count}</span> : null}
                {isActive && <CheckCircle2 className={cn('w-3.5 h-3.5', c.text)} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Accès rapide ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-violet-500" /> Accès rapide
        </h3>
        <div className="space-y-1">
          {[
            { icon: Flame,         label: 'Sujets actifs',  action: () => setSortMode('hot')              },
            { icon: Clock,         label: 'Plus récents',   action: () => setSortMode('recent')           },
            { icon: CheckCircle2,  label: 'Résolus',        action: () => setStatusFilter('resolu')       },
            { icon: AlertTriangle, label: 'Urgents',        action: () => setUrgencyFilter('haute')       },
            { icon: Bell,          label: 'Mes suivis',     action: () => router.push('/dashboard/forum') },
            { icon: BookOpen,      label: 'Mes sujets',     action: () => router.push('/dashboard/forum') },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center gap-2.5 font-medium">
              <item.icon className="w-3.5 h-3.5 text-gray-400" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charte ── */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" /> Charte du forum
        </h3>
        <ul className="space-y-2 text-xs text-gray-600">
          {[
            { icon: '✅', text: 'Restez respectueux et bienveillant' },
            { icon: '📍', text: 'Thèmes liés à la vie locale Biguglia' },
            { icon: '🔍', text: 'Vérifiez si le sujet existe déjà' },
            { icon: '📷', text: 'Photos : max 3, compressées' },
            { icon: '🚫', text: 'Pas de données personnelles sensibles' },
          ].map(r => (
            <li key={r.text} className="flex items-start gap-2">
              <span className="flex-shrink-0">{r.icon}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <Link href="/forum/charte" className="mt-3 text-xs text-violet-600 hover:text-violet-800 font-semibold inline-flex items-center gap-1">
          Lire la charte complète <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

    </aside>
  );
}

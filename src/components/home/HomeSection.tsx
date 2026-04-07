// HomeSection — Section du fil local, design moderne

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomeSection as HomeSectionType } from '@/services/home/types';
import FeedCard from './FeedCard';
import NeedCard from './NeedCard';
import EventCard from './EventCard';
import DiscussionCard from './DiscussionCard';

// Config couleur par section
const SECTION_STYLE: Record<string, { accent: string; pillBg: string; pillText: string }> = {
  now:         { accent: 'from-brand-500 to-orange-500',  pillBg: 'bg-brand-50  hover:bg-brand-100',  pillText: 'text-brand-700'  },
  needs:       { accent: 'from-red-500 to-orange-400',    pillBg: 'bg-red-50    hover:bg-red-100',     pillText: 'text-red-700'    },
  upcoming:    { accent: 'from-purple-500 to-violet-500', pillBg: 'bg-purple-50 hover:bg-purple-100', pillText: 'text-purple-700' },
  discussions: { accent: 'from-sky-500 to-blue-500',      pillBg: 'bg-sky-50    hover:bg-sky-100',     pillText: 'text-sky-700'    },
  foryou:      { accent: 'from-emerald-500 to-teal-500',  pillBg: 'bg-emerald-50 hover:bg-emerald-100', pillText: 'text-emerald-700' },
};

const GRID_CLASS: Record<string, string> = {
  now:         'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  needs:       'grid grid-cols-1 sm:grid-cols-2 gap-3',
  upcoming:    'grid grid-cols-1 sm:grid-cols-2 gap-3',
  discussions: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  foryou:      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
};

function renderCard(section: HomeSectionType, index: number) {
  const item = section.items[index];
  if (!item) return null;

  if (section.id === 'needs') return <NeedCard key={item.id} item={item} />;
  if (section.id === 'upcoming') return <EventCard key={item.id} item={item} />;
  if (section.id === 'discussions') return <DiscussionCard key={item.id} item={item} />;

  if (item.type === 'help_request') return <NeedCard key={item.id} item={item} />;
  if (item.type === 'event' || item.type === 'outing') return <EventCard key={item.id} item={item} />;
  if (item.type === 'forum_topic') return <DiscussionCard key={item.id} item={item} />;
  return <FeedCard key={item.id} item={item} />;
}

export default function HomeSection({ section }: { section: HomeSectionType }) {
  const style = SECTION_STYLE[section.id] ?? SECTION_STYLE.now;

  return (
    <section className="mb-10">
      {/* En-tête section */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Accent barre + icône */}
          <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${style.accent} flex-shrink-0`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{section.icon}</span>
              <h2 className="text-base font-black text-gray-900 leading-tight">
                {section.title}
              </h2>
              {/* Compteur items */}
              {section.items.length > 0 && (
                <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {section.items.length}
                </span>
              )}
            </div>
            {section.subtitle && (
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed ml-7">
                {section.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        {section.ctaUrl && section.ctaLabel && (
          <Link
            href={section.ctaUrl}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border transition-all ${style.pillBg} ${style.pillText} border-transparent`}
          >
            {section.ctaLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Grille de cartes */}
      <div className={GRID_CLASS[section.id] ?? 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        {section.items.map((_, i) => renderCard(section, i))}
      </div>
    </section>
  );
}

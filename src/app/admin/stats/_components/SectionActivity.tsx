

import { TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats } from '../_types';

interface Props {
  stats: AllStats;
}

export function SectionActivity({ stats }: Props) {
  const combined30 = stats.dailyUsers.map((d, i) => ({
    date:     d.date,
    Inscrits: d.value,
    Messages: stats.dailyMessages[i]?.value || 0,
    Posts:    stats.dailyPosts[i]?.value    || 0,
    Annonces: stats.dailyListings[i]?.value || 0,
  }));

  const gradients = [
    { id: 'ins', color: COLORS.blue   },
    { id: 'msg', color: COLORS.brand  },
    { id: 'pos', color: COLORS.teal   },
    { id: 'ann', color: COLORS.purple },
  ];

  return (
    <section>
      <SectionTitle icon={TrendingUp} title="Activité des 30 derniers jours" color="text-gray-900" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={combined30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {gradients.map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="Inscrits" stroke={COLORS.blue}   fill="url(#ins)" strokeWidth={2} />
            <Area type="monotone" dataKey="Messages" stroke={COLORS.brand}  fill="url(#msg)" strokeWidth={2} />
            <Area type="monotone" dataKey="Posts"    stroke={COLORS.teal}   fill="url(#pos)" strokeWidth={2} />
            <Area type="monotone" dataKey="Annonces" stroke={COLORS.purple} fill="url(#ann)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

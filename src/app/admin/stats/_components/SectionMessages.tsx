

import { MessageSquare } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionMessages({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={MessageSquare} title="Messages & Conversations" color="text-orange-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Messages envoyés 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Messages envoyés (30 jours)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.dailyMessages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={COLORS.brand}
                fill={COLORS.brand} fillOpacity={0.15} strokeWidth={2} name="Messages" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activité par heure */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Activité par heure (30j)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.activityByHour} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="messages" fill={COLORS.brand} radius={[3, 3, 0, 0]} name="Messages" />
              <Bar dataKey="posts"    fill={COLORS.teal}  radius={[3, 3, 0, 0]} name="Posts" />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

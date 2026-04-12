'use client';

import { Users } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmtTooltip } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionUsers({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={Users} title="Membres & Artisans" color="text-blue-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Répartition rôles — Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition des rôles</h3>
          {stats.roleDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.roleDistribution} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} dataKey="value" nameKey="name"
                  paddingAngle={3}
                  label={({ name, percent }: PieLabelRenderProps) =>
                    `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={fmtTooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>}
        </div>

        {/* Artisans par métier — Barre horizontale */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Artisans par métier</h3>
          {stats.tradeCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.tradeCategories} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.green} radius={[0, 6, 6, 0]} name="Artisans" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucun artisan inscrit</p>}
        </div>

        {/* Inscriptions 30j — Courbe */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvelles inscriptions (30 jours)</h3>
          <div className="flex gap-6 mb-3 text-sm">
            <span className="text-blue-600 font-semibold">+{stats.newUsersLast30} ce mois</span>
            <span className="text-gray-500">+{stats.newUsersLast7} cette semaine</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={COLORS.blue} strokeWidth={2} dot={false} name="Inscriptions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

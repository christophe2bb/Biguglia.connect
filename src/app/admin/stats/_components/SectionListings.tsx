'use client';

import { Package } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmt, fmtTooltip } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionListings({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={Package} title="Annonces & Matériel" color="text-purple-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Annonces par catégorie — Camembert */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Annonces par catégorie</h3>
          {stats.listingCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.listingCategories} cx="50%" cy="50%" outerRadius={80}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }: PieLabelRenderProps) =>
                    (((percent as number) ?? 0) > 0.05)
                      ? `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                      : ''
                  }
                >
                  {stats.listingCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={fmtTooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucune annonce</p>}
        </div>

        {/* Nouvelles annonces 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvelles annonces (30 jours)</h3>
          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-purple-600 font-semibold">
              {fmt.format(stats.listingViews)} vues total
            </span>
            <span className="text-gray-500">{stats.activeListings} actives</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.dailyListings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS.purple} radius={[3, 3, 0, 0]} name="Annonces" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

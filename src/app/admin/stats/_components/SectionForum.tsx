'use client';

import { FileText } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionForum({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={FileText} title="Forum" color="text-teal-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Posts par catégorie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Posts par catégorie</h3>
          {stats.forumCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.forumCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.teal} radius={[0, 6, 6, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucun post</p>}
        </div>

        {/* Nuage de mots — titres forum */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Mots les plus utilisés dans les titres
          </h3>
          {stats.topForumWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.topForumWords.map((w) => {
                const maxVal = stats.topForumWords[0].value;
                const size   = Math.max(11, Math.min(22, 11 + (w.value / maxVal) * 11));
                const opacity = 0.5 + (w.value / maxVal) * 0.5;
                return (
                  <span
                    key={w.name}
                    style={{ fontSize: size, opacity }}
                    className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-medium cursor-default"
                    title={`${w.value} occurrence${w.value > 1 ? 's' : ''}`}
                  >
                    {w.name}
                    <span className="text-xs ml-1 text-teal-400">{w.value}</span>
                  </span>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucun post forum</p>}
        </div>

        {/* Nouveaux posts 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouveaux posts (30 jours)</h3>
          <div className="flex gap-6 mb-3 text-sm">
            <span className="text-teal-600 font-semibold">{stats.totalPosts} posts total</span>
            <span className="text-gray-500">
              {stats.totalComments} commentaires · {stats.closedPosts} fermés
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={stats.dailyPosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={COLORS.teal} strokeWidth={2} dot={false} name="Posts" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

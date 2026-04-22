

import { Star, Flag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { SectionTitle } from './SectionTitle';
import { COLORS, fmt } from '../_helpers';
import type { AllStats } from '../_types';

export function SectionRequests({ stats }: { stats: AllStats }) {
  return (
    <>
      {/* ── Demandes artisans & Avis ─────────────────────────────── */}
      <section>
        <SectionTitle icon={Star} title="Demandes artisans & Avis" color="text-amber-700" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Demandes par statut */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Demandes par statut ({fmt.format(stats.totalRequests)} total)
            </h3>
            {stats.requestsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.requestsByStatus} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.indigo} radius={[0, 6, 6, 0]} name="Demandes" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">Aucune demande</p>}
          </div>

          {/* Avis clients */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Avis clients — {fmt.format(stats.totalReviews)} avis · Moy. {stats.avgRating}/5
            </h3>
            {stats.totalReviews > 0 ? (
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-8">{star}★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-colors"
                        style={{ width: `${Math.min(100, (stats.avgRating / 5) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {fmt.format(stats.totalReviews)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 text-center">
                  <span className="text-3xl font-bold text-amber-500">{stats.avgRating}</span>
                  <span className="text-gray-400 text-sm"> / 5</span>
                  <div className="text-xs text-gray-400 mt-1">
                    Basé sur {fmt.format(stats.totalReviews)} avis
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun avis pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Signalements ─────────────────────────────────────────── */}
      {stats.totalReports > 0 && (
        <section>
          <SectionTitle icon={Flag} title="Signalements" color="text-red-700" />
          <div className="bg-white rounded-2xl border border-red-100 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-red-600">
                  {fmt.format(stats.pendingReports)}
                </p>
                <p className="text-sm text-gray-600">signalements en attente de traitement</p>
                <p className="text-xs text-gray-400">
                  {fmt.format(stats.totalReports)} signalements au total
                </p>
              </div>
              {stats.pendingReports > 0 && (
                <Link
                  href="/admin/signalements"
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Traiter les signalements
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';

interface SqlMissingScreenProps {
  themeHref: string;
}

export default function SqlMissingScreen({ themeHref }: SqlMissingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-amber-200 shadow p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Tables communautés manquantes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Les tables <code className="bg-gray-100 px-1 rounded">theme_memberships</code> et{' '}
          <code className="bg-gray-100 px-1 rounded">theme_profiles</code> n&apos;existent pas encore dans Supabase.
        </p>
        <p className="text-sm text-gray-500 mb-5">
          Allez dans <strong>Admin → Migration DB</strong> et cliquez sur{' '}
          <strong>« Copier SQL Communautés »</strong>, puis collez-le dans Supabase → SQL Editor → Run.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/admin/migration"
            className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
          >
            Aller à la Migration DB
          </Link>
          <Link
            href={themeHref}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
          >
            Retour au thème
          </Link>
        </div>
      </div>
    </div>
  );
}

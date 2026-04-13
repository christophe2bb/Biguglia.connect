'use client';

import React from 'react';

interface ContentTableProps {
  loading: boolean;
  empty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export default function ContentTable({
  loading, empty, emptyMessage = 'Aucun résultat', children,
}: ContentTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
        {emptyMessage}
      </div>
    );
  }
  return <div className="space-y-2">{children}</div>;
}

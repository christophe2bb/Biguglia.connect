

import type { ElementType, ReactNode } from 'react';

interface Props {
  title: string;
  icon: ElementType;
  children: ReactNode;
  className?: string;
}

/** Conteneur générique : bande de titre + icône, corps blanc. */
export function Section({ title, icon: Icon, children, className }: Props) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

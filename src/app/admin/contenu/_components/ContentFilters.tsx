'use client';

import { RefreshCw, Search } from 'lucide-react';
import Input from '@/components/ui/Input';

interface SelectOption { value: string; label: string }

interface ContentFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  selectValue: string;
  onSelectChange: (v: string) => void;
  selectOptions: SelectOption[];
  onRefresh: () => void;
  count: number;
  countLabel: string;
}

export default function ContentFilters({
  search, onSearchChange, searchPlaceholder = 'Rechercher…',
  selectValue, onSelectChange, selectOptions,
  onRefresh,
  count, countLabel,
}: ContentFiltersProps) {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <select
          value={selectValue}
          onChange={e => onSelectChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {selectOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        <span className="font-semibold">{count}</span> {countLabel}
      </p>
    </>
  );
}

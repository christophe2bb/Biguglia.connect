'use client';

import { useRouter } from 'next/navigation';

interface Props {
  currentSort: string;
  currentParams: Record<string, string>;
}

const SORT_OPTIONS = [
  { value: 'date_desc',         label: 'Plus récents' },
  { value: 'date_asc',          label: 'Plus anciens' },
  { value: 'experience_desc',   label: 'Expérience ↓' },
  { value: 'completeness_desc', label: 'Profil complet' },
];

export function SortSelectClient({ currentSort, currentParams }: Props) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sp = new URLSearchParams(currentParams);
    sp.set('sortBy', e.target.value);
    sp.delete('page');
    router.push(`/emploi/demandes?${sp.toString()}`);
  };

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-400 text-gray-700 font-medium"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

'use client';

import { useRouter } from 'next/navigation';

interface SortSelectClientProps {
  currentSort: string;
  currentParams: Record<string, string>;
}

export function SortSelectClient({ currentSort, currentParams }: SortSelectClientProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(currentParams);
    params.set('sortBy', e.target.value);
    params.delete('page');
    router.push(`/emploi/offres?${params.toString()}`);
  };

  return (
    <select
      defaultValue={currentSort}
      className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-400 bg-white"
      onChange={handleChange}
    >
      <option value="date_desc">Plus récentes</option>
      <option value="date_asc">Plus anciennes</option>
      <option value="salary_desc">Salaire décroissant</option>
      <option value="completeness_desc">Mieux remplies</option>
    </select>
  );
}

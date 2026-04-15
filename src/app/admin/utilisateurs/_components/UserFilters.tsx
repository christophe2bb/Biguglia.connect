'use client';

import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface UserFiltersProps {
  search: string;
  roleFilter: string;
  statusFilter: string;
  sortBy: 'date' | 'name' | 'activity';
  totalCount: number;
  filteredCount: number;
  onSearch: (v: string) => void;
  onRoleFilter: (v: string) => void;
  onStatusFilter: (v: string) => void;
  onSortBy: (v: 'date' | 'name' | 'activity') => void;
  onRefresh: () => void;
}

export default function UserFilters({
  search, roleFilter, statusFilter, sortBy,
  totalCount, filteredCount,
  onSearch, onRoleFilter, onStatusFilter, onSortBy, onRefresh,
}: UserFiltersProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={roleFilter} onChange={(e) => onRoleFilter(e.target.value)} className="sm:w-48">
          <option value="">Tous les rôles</option>
          <option value="resident">Habitants</option>
          <option value="artisan_pending">Artisans en attente</option>
          <option value="artisan_verified">Artisans vérifiés</option>
          <option value="moderator">Modérateurs</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)} className="sm:w-44">
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </Select>
        <Select value={sortBy} onChange={(e) => onSortBy(e.target.value as 'date' | 'name' | 'activity')} className="sm:w-44">
          <option value="date">Tri : Plus récent</option>
          <option value="name">Tri : Nom A→Z</option>
          <option value="activity">Tri : + actifs</option>
        </Select>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{filteredCount}</span> utilisateur{filteredCount !== 1 ? 's' : ''}
          {search || roleFilter || statusFilter ? ` (filtré sur ${totalCount})` : ' au total'}
        </p>
        <button onClick={onRefresh} className="text-xs text-brand-600 hover:underline">Actualiser</button>
      </div>
    </>
  );
}
